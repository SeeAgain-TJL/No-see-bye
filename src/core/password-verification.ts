import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { User } from "@prisma/client";
import { authSecret, type TokenPayload } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { HttpError } from "@/core/http";
import { mailConfigured, sendPasswordCode } from "@/core/mail";
import { rateLimit } from "@/core/rate-limit";

const credentials = z.object({
  currentPassword: z.string().min(1, "请填写当前密码").max(72),
  newPassword: z.string().min(8, "新密码至少 8 位").max(72),
  email: z.string().trim().toLowerCase().email("请填写有效的验证邮箱").max(254),
});
const proof = z.object({ challengeId: z.string().uuid("请先获取邮箱验证码"), code: z.string().trim().regex(/^\d{6}$/, "请输入 6 位邮箱验证码") });

export function requiresEmailVerification() { return process.env.PASSWORD_EMAIL_VERIFICATION === "true"; }
export function recoveryEmails(user: Pick<User, "email" | "backupEmail">) {
  return [...new Set([user.email, user.backupEmail].filter((email): email is string => Boolean(email) && !/@(oauth|accounts)\.local$/i.test(email!)))];
}

export function verifiedEmails(user: Pick<User, "email" | "emailVerifiedAt" | "backupEmail" | "backupEmailVerifiedAt">) {
  return [...new Set([user.emailVerifiedAt ? user.email : null, user.backupEmailVerifiedAt ? user.backupEmail : null].filter((email): email is string => Boolean(email)))];
}
function digest(value: unknown) { return createHmac("sha256", authSecret()).update(JSON.stringify(value)).digest("hex"); }
function binding(user: User, fields: z.infer<typeof credentials>) { return digest(["password-change", user.id, user.sessionVersion, user.passwordHash, fields.email, fields.newPassword]); }
function equal(left: string, right: string) { return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right)); }
function maskEmail(email: string) { const [local, domain] = email.split("@"); return `${local.slice(0, Math.min(3, local.length))}***@${domain}`; }

async function passwordFields(session: TokenPayload, body: unknown) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.hasLocalPassword) throw new HttpError(403, "此账号使用第三方登录，请前往对应平台管理密码");
  if (user.sessionVersion !== session.sessionVersion) throw new HttpError(401, "账号已更新，请重新登录");
  // Verify the current password before requesting a mail proof. This also keeps legacy clients fail-closed.
  const current = z.object({ currentPassword: z.string().min(1, "请填写当前密码").max(72) }).parse(body);
  if (!await bcrypt.compare(current.currentPassword, user.passwordHash)) throw new HttpError(400, "当前密码不正确");
  const fields = credentials.parse(body);
  if (Buffer.byteLength(fields.newPassword) > 72) throw new HttpError(400, "密码 UTF-8 长度不能超过 72 字节");
  if (fields.currentPassword === fields.newPassword) throw new HttpError(400, "新密码不能与当前密码相同");
  if (/@(oauth|accounts)\.local$/i.test(fields.email)) throw new HttpError(400, "请填写可接收邮件的邮箱");
  const trusted = recoveryEmails(user);
  if (trusted.length && !trusted.includes(fields.email)) throw new HttpError(400, "请选择账号预设的验证邮箱");
  if (!trusted.length) {
    const collision = await prisma.user.findUnique({ where: { email: fields.email }, select: { id: true } });
    if (collision && collision.id !== user.id) throw new HttpError(409, "该邮箱已被其他账号使用");
  }
  return { user, fields, initialEmail: trusted.length === 0 };
}

export async function issuePasswordChallenge(session: TokenPayload, body: unknown) {
  if (!requiresEmailVerification()) throw new HttpError(403, "本站当前未启用邮箱验证码");
  rateLimit("password-mail:" + session.userId, 6, 60 * 60_000);
  const { user, fields } = await passwordFields(session, body);
  if (!mailConfigured()) throw new HttpError(503, "邮件验证服务尚未配置，请联系站点管理员完成发信设置");
  const now = new Date(), id = randomUUID(), code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(now.getTime() + 10 * 60_000);
  await prisma.$transaction(async tx => {
    const previous = await tx.passwordChallenge.findUnique({ where: { userId: user.id } });
    if (previous && now.getTime() - previous.createdAt.getTime() < 60_000) throw new HttpError(429, "验证码已发送，请 60 秒后再试");
    const data = { id, userId: user.id, email: fields.email, sessionVersion: user.sessionVersion, bindingHash: binding(user, fields), codeHash: digest([id, user.id, code]), expiresAt, createdAt: now, attempts: 0, usedAt: null };
    await tx.passwordChallenge.upsert({ where: { userId: user.id }, create: data, update: data });
  });
  try { await sendPasswordCode(fields.email, code); }
  catch (error) { await prisma.passwordChallenge.deleteMany({ where: { id, userId: user.id } }); throw error; }
  return { challengeId: id, maskedEmail: maskEmail(fields.email), expiresAt: expiresAt.toISOString(), retryAfterSeconds: 60 };
}

export async function changeVerifiedPassword(session: TokenPayload, body: unknown) {
  rateLimit("password-change:" + session.userId, 12);
  const { user, fields, initialEmail } = await passwordFields(session, body);
  const verification = proof.parse(body), now = new Date();
  const challenge = await prisma.passwordChallenge.findUnique({ where: { userId: user.id } });
  if (!challenge || challenge.id !== verification.challengeId || challenge.usedAt || challenge.expiresAt <= now || challenge.attempts >= 5 || challenge.sessionVersion !== user.sessionVersion) throw new HttpError(410, "验证码已失效，请重新获取");
  if (!equal(challenge.bindingHash, binding(user, fields))) throw new HttpError(400, "密码或验证邮箱已变更，请重新获取验证码");
  const valid = equal(challenge.codeHash, digest([challenge.id, user.id, verification.code]));
  const passwordHash = valid ? await bcrypt.hash(fields.newPassword, 12) : null;
  const result = await prisma.$transaction(async tx => {
    // Reserve one attempt atomically, including success; concurrent requests cannot reuse the proof.
    const reserved = await tx.passwordChallenge.updateMany({ where: { id: challenge.id, userId: user.id, usedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 }, sessionVersion: user.sessionVersion }, data: { attempts: { increment: 1 }, ...(valid ? { usedAt: now } : {}) } });
    if (!reserved.count) return "expired";
    if (!valid || !passwordHash) return "incorrect";
    const changed = await tx.user.updateMany({ where: { id: user.id, hasLocalPassword: true, passwordHash: user.passwordHash, sessionVersion: user.sessionVersion }, data: { passwordHash, sessionVersion: { increment: 1 }, ...(initialEmail ? { email: fields.email, emailVerifiedAt: now } : fields.email === user.email ? { emailVerifiedAt: now } : { backupEmailVerifiedAt: now }) } });
    if (!changed.count) throw new HttpError(409, "账号已更新，请重新登录");
    return "changed";
  });
  if (result === "expired") throw new HttpError(410, "验证码已失效，请重新获取");
  if (result === "incorrect") throw new HttpError(400, "验证码不正确，请检查邮件后重试");
  return { userId: user.id, email: initialEmail ? fields.email : user.email, sessionVersion: user.sessionVersion + 1 };
}

export async function changeAccountPassword(session: TokenPayload, body: unknown) {
  if (requiresEmailVerification()) return changeVerifiedPassword(session, body);
  rateLimit("password-change:" + session.userId, 12);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.hasLocalPassword) throw new HttpError(403, "此账号使用第三方登录，请前往对应平台管理密码");
  const fields = credentials.omit({ email: true }).parse(body);
  if (Buffer.byteLength(fields.newPassword) > 72) throw new HttpError(400, "密码 UTF-8 长度不能超过 72 字节");
  if (!await bcrypt.compare(fields.currentPassword, user.passwordHash)) throw new HttpError(400, "当前密码不正确");
  if (fields.currentPassword === fields.newPassword) throw new HttpError(400, "新密码不能与当前密码相同");
  const passwordHash = await bcrypt.hash(fields.newPassword, 12);
  const changed = await prisma.user.updateMany({ where: { id: user.id, hasLocalPassword: true, passwordHash: user.passwordHash, sessionVersion: session.sessionVersion }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  if (!changed.count) throw new HttpError(409, "账号已更新，请重新登录");
  await prisma.passwordChallenge.deleteMany({ where: { userId: user.id } });
  return { userId: user.id, email: user.email, sessionVersion: user.sessionVersion + 1 };
}

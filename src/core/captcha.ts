import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { authSecret } from "@/core/auth";

export const challengeCookie = "registration_challenge";
export const challengeCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.COOKIE_SECURE === "true", path: "/api/auth", maxAge: 600 };
function hash(value: string) { return createHmac("sha256", authSecret()).update(value).digest("hex"); }
function binding(username: string, token: string) { return hash(`registration-browser:${username}:${token}`); }
function answerHash(id: string, answer: string) { return hash(`registration-answer:${id}:${answer}`); }
export async function createRegistrationChallenge(username: string, cookie?: string) {
  const token = cookie && /^[a-f0-9]{64}$/.test(cookie) ? cookie : randomBytes(32).toString("hex");
  const id = randomUUID(), first = randomInt(2, 40), second = randomInt(2, 40);
  const bindingHash = binding(username, token);
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await prisma.$transaction(async tx => {
    await tx.registrationChallenge.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, { bindingHash }] } });
    await tx.registrationChallenge.create({ data: { id, bindingHash, answerHash: answerHash(id, String(first + second)), expiresAt } });
  });
  const noise = Array.from({ length: 5 }, () => `<path d="M${randomInt(0, 320)} ${randomInt(8, 100)} Q${randomInt(0, 320)} ${randomInt(8, 100)} ${randomInt(0, 320)} ${randomInt(8, 100)}"/>`).join("");
  const text = [String(first), "+", String(second), "=", "?"].map((character, index) => {
    const x = 43 + index * 57, y = 67 + randomInt(-4, 5);
    return `<text x="${x}" y="${y}" transform="rotate(${randomInt(-8, 9)} ${x} ${y})">${character}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="112" viewBox="0 0 320 112"><rect width="320" height="112" rx="14" fill="#edf2e7"/><g stroke="#688666" stroke-width="1" opacity=".18" fill="none">${noise}</g><g fill="#294234" font-family="Arial,sans-serif" font-size="30" font-weight="600" text-anchor="middle">${text}</g></svg>`;
  return { token, challenge: { id, image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, expiresAt: expiresAt.getTime() } };
}
// Commit failed attempts as well as successful one-time consumption in the caller's transaction.
export async function checkRegistrationChallenge(tx: Prisma.TransactionClient, username: string, token: string | undefined, id: string, answer: string) {
  const challenge = await tx.registrationChallenge.findUnique({ where: { id } });
  if (!token || !challenge || challenge.bindingHash !== binding(username, token)) return { error: "验证已失效，请换一道题后重试", status: 410 };
  if (challenge.expiresAt.getTime() <= Date.now()) return { error: "题目已过期，请换一道题后重试", status: 410 };
  if (challenge.attempts >= 5) return { error: "尝试次数较多，请换一道题后重试", status: 410 };
  await tx.registrationChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
  const expected = Buffer.from(challenge.answerHash, "hex"), actual = Buffer.from(answerHash(id, String(Number(answer))), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { error: "答案不正确，再算一下吧", status: 400 };
  return null;
}

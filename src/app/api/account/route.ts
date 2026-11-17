import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, signToken, withSession } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { apiError, checkOrigin, jsonBody } from "@/core/http";
import { quotaBytes } from "@/modules/memories/server";
import { publicUser } from "@/core/user";
import { changeAccountPassword, recoveryEmails, requiresEmailVerification, verifiedEmails } from "@/core/password-verification";
import { mailConfigured } from "@/core/mail";
const profile = z.object({ displayName: z.string().trim().min(1, "请填写昵称").max(24, "昵称最多 24 个字") });
export async function GET(req: NextRequest) {
  try {
    const session = await getUserFromRequest(req);
    const [user, used, records] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: session.userId }, include: { oauthAccounts: { select: { provider: true } } } }),
      prisma.asset.aggregate({ where: { ownerId: session.userId }, _sum: { sizeBytes: true } }),
      prisma.entry.count({ where: { userId: session.userId, deletedAt: null } }),
    ]);
    return NextResponse.json({ user: { ...publicUser(user), hasLocalPassword: user.hasLocalPassword,
      loginMethods: [...(user.hasLocalPassword ? ["password"] : []), ...user.oauthAccounts.map(a => a.provider)],
      phoneMasked: user.phone ? user.phone.slice(0, 3) + "****" + user.phone.slice(-4) : null },
      usedBytes: used._sum.sizeBytes || 0, quotaBytes: quotaBytes(), records,
      security: { mailConfigured: mailConfigured(), verifiedEmails: verifiedEmails(user), recoveryEmails: recoveryEmails(user), requiresEmailVerification: requiresEmailVerification() } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: NextRequest) {
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    const body = z.object({ action: z.enum(["profile", "password"]) }).passthrough().parse(await jsonBody(req));
    if (body.action === "password") {
      return withSession(NextResponse.json({ ok: true }), signToken(await changeAccountPassword(session, body)));
    }
    await prisma.user.update({ where: { id: session.userId }, data: profile.parse(body) });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/prisma";
import { signToken, withSession } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { publicUser } from "@/core/user";
const schema = z.object({ emailOrUsername: z.string().trim().toLowerCase().min(1, "请输入用户名或手机号").max(254), password: z.string().min(1, "请输入密码").max(72) });
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const body = schema.parse(await jsonBody(req));
    rateLimit(`login:${body.emailOrUsername}`);
    const user = await prisma.user.findFirst({ where: { OR: [{ email: body.emailOrUsername }, { username: body.emailOrUsername }, { phone: body.emailOrUsername }] }, include: { oauthAccounts: { select: { provider: true } } } });
    const hash = user?.passwordHash || "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const valid = await bcrypt.compare(body.password, hash);
    if (!user) throw new HttpError(404, "该账号尚未注册，请先创建账号");
    if (!user.hasLocalPassword) throw new HttpError(400, `该账号使用 ${user.oauthAccounts.some(a => a.provider === "github") ? "GitHub" : "第三方"} 登录，请使用下方对应入口`);
    if (!valid) throw new HttpError(401, "密码不正确，请重新输入");
    return withSession(NextResponse.json({ user: publicUser(user) }), signToken({ userId: user.id, email: user.email, sessionVersion: user.sessionVersion }));
  } catch (error) { return apiError(error); }
}

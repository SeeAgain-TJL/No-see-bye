import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/prisma";
import { signToken, withSession } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { checkRegistrationCode, phoneSchema } from "@/core/sms";
import { publicUser } from "@/core/user";
const schema = z.object({
  username: z.string().trim().toLowerCase().min(3, "用户名至少 3 位").max(20, "用户名最多 20 位").regex(/^[a-z0-9_]+$/, "用户名使用字母、数字和下划线"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最多 72 位"),
  phone: phoneSchema,
  smsCode: z.string().trim().regex(/^\d{6}$/, "请输入 6 位短信验证码"),
});
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (process.env.ALLOW_REGISTRATION === "false") throw new HttpError(403, "暂未开放注册，请联系站点主人");
    rateLimit("register:global", 30);
    const body = schema.parse(await jsonBody(req));
    if (Buffer.byteLength(body.password) > 72) throw new HttpError(400, "密码 UTF-8 长度不能超过 72 字节");
    const passwordHash = await bcrypt.hash(body.password, 12);
    const result = await prisma.$transaction(async tx => {
      const error = await checkRegistrationCode(tx, body.phone, body.smsCode);
      if (error) return { error };
      const existing = await tx.user.findFirst({ where: { OR: [{ username: body.username }, { phone: body.phone }] }, select: { username: true } });
      if (existing) return { error: existing.username === body.username ? "该用户名已注册，请直接登录或换一个用户名" : "该手机号已注册，请直接登录", conflict: true };
      const user = await tx.user.create({ data: { username: body.username, displayName: body.username, phone: body.phone,
        email: `${body.username}@accounts.local`, passwordHash, hasLocalPassword: true } });
      await tx.smsChallenge.delete({ where: { phone: body.phone } });
      return { user };
    });
    if (!result.user) throw new HttpError(result.conflict ? 409 : 400, result.error!);
    const user = result.user;
    return withSession(NextResponse.json({ user: publicUser(user) }, { status: 201 }), signToken({ userId: user.id, email: user.email, sessionVersion: user.sessionVersion }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(new HttpError(409, "用户名或手机号已注册，请直接登录"));
    return apiError(error);
  }
}

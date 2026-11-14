import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/prisma";
import { signToken, withSession } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { challengeCookie, challengeCookieOptions, checkRegistrationChallenge } from "@/core/captcha";
import { registrationCredentials } from "@/lib/registration";
import { publicUser } from "@/core/user";
const proofSchema = z.object({ challengeId: z.string().uuid("请先完成人机验证"), answer: z.string().trim().regex(/^\d{1,3}$/, "请输入计算结果") });
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (process.env.ALLOW_REGISTRATION === "false") throw new HttpError(403, "暂未开放注册，请联系站点主人");
    rateLimit("register:global", 100);
    rateLimit("register:ip:" + (req.headers.get("x-real-ip") || "direct"), 40);
    const raw = await jsonBody(req);
    const body = registrationCredentials.parse(raw), proof = proofSchema.parse(raw);
    const result = await prisma.$transaction(async tx => {
      const failed = await checkRegistrationChallenge(tx, body.username, req.cookies.get(challengeCookie)?.value, proof.challengeId, proof.answer);
      if (failed) return failed;
      if (await tx.user.findUnique({ where: { username: body.username }, select: { id: true } })) return { error: "该用户名已注册，请直接登录或换一个用户名", status: 409 };
      const passwordHash = await bcrypt.hash(body.password, 12);
      const user = await tx.user.create({ data: { username: body.username, displayName: body.username,
        email: `${body.username}@accounts.local`, passwordHash, hasLocalPassword: true } });
      await tx.registrationChallenge.delete({ where: { id: proof.challengeId } });
      return { user };
    });
    if (!("user" in result)) throw new HttpError(result.status, result.error);
    const user = result.user;
    const response = withSession(NextResponse.json({ user: publicUser(user) }, { status: 201 }), signToken({ userId: user.id, email: user.email, sessionVersion: user.sessionVersion }));
    response.cookies.set(challengeCookie, "", { ...challengeCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(new HttpError(409, "该用户名已注册，请直接登录或换一个用户名"));
    return apiError(error);
  }
}

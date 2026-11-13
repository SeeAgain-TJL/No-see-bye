import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/prisma";
import { signToken, withSession } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
const schema = z.object({
  emailOrUsername: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(72),
});
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const body = schema.parse(await jsonBody(req));
    rateLimit(`login:${body.emailOrUsername}`);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.emailOrUsername },
          { username: body.emailOrUsername },
        ],
      },
    });
    const hash =
      user?.passwordHash ||
      "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const valid = await bcrypt.compare(body.password, hash);
    if (!user || !valid) throw new HttpError(401, "账号或密码不正确");
    return withSession(
      NextResponse.json({
        user: { id: user.id, username: user.username, email: user.email },
      }),
      signToken({ userId: user.id, email: user.email, sessionVersion: user.sessionVersion }),
    );
  } catch (error) {
    return apiError(error);
  }
}

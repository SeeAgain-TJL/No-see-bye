import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/prisma";
import { signToken, withSession } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
const schema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效邮箱").max(254),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "用户名至少 3 位")
    .max(20)
    .regex(/^[a-z0-9_]+$/, "用户名使用字母、数字和下划线"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最多 72 位"),
});
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (process.env.ALLOW_REGISTRATION === "false")
      throw new HttpError(403, "暂未开放注册，请联系站点主人");
    rateLimit("register:global", 30);
    const body = schema.parse(await jsonBody(req));
    if (Buffer.byteLength(body.password) > 72)
      throw new HttpError(400, "密码 UTF-8 长度不能超过 72 字节");
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash: await bcrypt.hash(body.password, 12),
      },
    });
    return withSession(
      NextResponse.json(
        { user: { id: user.id, email: user.email, username: user.username } },
        { status: 201 },
      ),
      signToken({ userId: user.id, email: user.email, sessionVersion: user.sessionVersion }),
    );
  } catch (error) {
    return apiError(error);
  }
}

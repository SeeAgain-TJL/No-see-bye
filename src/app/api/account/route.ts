import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getUserFromRequest, signToken, withSession } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { quotaBytes } from "@/modules/memories/server";
const profile = z.object({ displayName: z.string().trim().min(1, "请填写昵称").max(24, "昵称最多 24 个字") });
const password = z.object({ currentPassword: z.string().min(1).max(72), newPassword: z.string().min(8, "新密码至少 8 位").max(72) });
export async function GET(req: NextRequest) {
  try {
    const session = await getUserFromRequest(req);
    const [user, used, records] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { username:true, displayName:true, email:true, createdAt:true } }),
      prisma.asset.aggregate({ where: { ownerId:session.userId }, _sum:{sizeBytes:true} }),
      prisma.entry.count({ where: { userId:session.userId, deletedAt:null } }),
    ]);
    return NextResponse.json({ user, usedBytes:used._sum.sizeBytes || 0, quotaBytes:quotaBytes(), records },{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: NextRequest) {
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    const body = z.object({action:z.enum(["profile","password"])}).passthrough().parse(await jsonBody(req));
    if (body.action === "password") {
      rateLimit("password:" + session.userId, 6);
      const fields = password.parse(body);
      if (Buffer.byteLength(fields.newPassword) > 72) throw new HttpError(400,"密码 UTF-8 长度不能超过 72 字节");
      const user = await prisma.user.findUniqueOrThrow({where:{id:session.userId}});
      if (!await bcrypt.compare(fields.currentPassword, user.passwordHash)) throw new HttpError(400,"当前密码不正确");
      if (fields.currentPassword === fields.newPassword) throw new HttpError(400,"新密码不能与当前密码相同");
      const passwordHash = await bcrypt.hash(fields.newPassword,12);
      const changed = await prisma.user.updateMany({where:{id:user.id,passwordHash:user.passwordHash,sessionVersion:user.sessionVersion},data:{passwordHash,sessionVersion:{increment:1}}});
      if (!changed.count) throw new HttpError(409,"账号已更新，请重新登录");
      return withSession(NextResponse.json({ok:true}),signToken({userId:user.id,email:user.email,sessionVersion:user.sessionVersion+1}));
    }
    if (body.action !== "profile") throw new HttpError(400,"无效操作");
    const fields = profile.parse(body);
    await prisma.user.update({where:{id:session.userId},data:fields});
    return NextResponse.json({ok:true});
  } catch (error) { return apiError(error); }
}

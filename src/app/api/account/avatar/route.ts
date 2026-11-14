import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";
import { apiError, checkOrigin, HttpError } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { avatarUrl } from "@/core/user";
export const runtime = "nodejs";
const max = 5 * 1024 ** 2;
export async function POST(req: NextRequest) {
  let key: string | undefined;
  let saved = false;
  const storage = getStorage();
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    rateLimit("avatar:" + session.userId, 20);
    if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes((req.headers.get("content-type") || "").split(";")[0]))
      throw new HttpError(415, "请选择 JPG、PNG、WebP、AVIF 或 GIF 图片");
    if (Number(req.headers.get("content-length")) > max) throw new HttpError(413, "头像图片不能超过 5 MB");
    const reader = req.body?.getReader();
    if (!reader) throw new HttpError(400, "请选择头像图片");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > max) { await reader.cancel(); throw new HttpError(413, "头像图片不能超过 5 MB"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let image: Buffer;
    try {
      const input = sharp(Buffer.concat(chunks), { limitInputPixels: 24_000_000, animated: false });
      const meta = await input.metadata();
      if (!["jpeg", "png", "webp", "avif", "heif", "gif"].includes(meta.format || "")) throw new Error("unsupported");
      image = await input.rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    } catch { throw new HttpError(415, "图片无法读取，请换一张有效图片"); }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { avatarKey: true } });
    key = `avatars/${session.userId}/${randomUUID()}.webp`;
    await storage.put(key, Readable.from(image));
    const changed = await prisma.user.updateMany({ where: { id: session.userId, avatarKey: user.avatarKey }, data: { avatarKey: key } });
    if (!changed.count) throw new HttpError(409, "头像刚刚已更新，请刷新后重试");
    saved = true;
    if (user.avatarKey?.startsWith(`avatars/${session.userId}/`)) await storage.delete(user.avatarKey).catch(() => {});
    return NextResponse.json({ avatarUrl: avatarUrl({ id: session.userId, avatarKey: key }) });
  } catch (error) {
    if (key && !saved) await storage.delete(key).catch(() => {});
    return apiError(error);
  }
}
export async function DELETE(req: NextRequest) {
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { avatarKey: true } });
    const changed = await prisma.user.updateMany({ where: { id: session.userId, avatarKey: user.avatarKey }, data: { avatarKey: null } });
    if (!changed.count) throw new HttpError(409, "头像刚刚已更新，请刷新后重试");
    if (user.avatarKey?.startsWith(`avatars/${session.userId}/`)) await getStorage().delete(user.avatarKey).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

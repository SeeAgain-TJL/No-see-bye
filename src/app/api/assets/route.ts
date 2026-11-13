import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/prisma";
import { getUserFromRequest } from "@/core/auth";
import { apiError, checkOrigin, HttpError } from "@/core/http";
import { getStorage, buildStorageKey } from "@/core/storage-factory";
import { imagePreview } from "@/core/previews";
import { assetDTO, quotaBytes } from "@/modules/memories/server";
export const runtime = "nodejs";
const types = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
function validSignature(b: Buffer, mime: string) {
  const hex = b.toString("hex");
  if (mime === "image/jpeg") return hex.startsWith("ffd8ff");
  if (mime === "image/png") return hex.startsWith("89504e470d0a1a0a");
  if (mime === "image/gif") return /^GIF8[79]a/.test(b.toString("ascii", 0, 6));
  if (mime === "image/webp")
    return (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    );
  if (mime === "video/webm") return hex.startsWith("1a45dfa3");
  const ftyp = b.toString("ascii", 4, 8) === "ftyp";
  if (mime === "image/avif")
    return ftyp && /avif|avis/.test(b.toString("ascii", 8));
  return ftyp && !/avif|avis|heic|heix/.test(b.toString("ascii", 8));
}
export async function POST(req: NextRequest) {
  let assetId: string | undefined;
  let key: string | undefined;
  let thumbnailKey: string | undefined;
  try {
    checkOrigin(req);
    const user = await getUserFromRequest(req);
    const mime = (req.headers.get("content-type") || "").split(";")[0];
    if (!types.has(mime))
      throw new HttpError(
        415,
        "支持 JPG、PNG、GIF、WebP、AVIF 和 MP4、WebM、MOV",
      );
    const length = Number(req.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length < 1)
      throw new HttpError(411, "无法读取文件大小，请重新选择文件");
    const max = (mime.startsWith("video/") ? 200 : 20) * 1024 * 1024;
    if (length > max)
      throw new HttpError(
        413,
        mime.startsWith("video/")
          ? "单个视频最大 200 MB"
          : "单张照片最大 20 MB",
      );
    if (!req.body) throw new HttpError(400, "文件为空");
    let filename: string;
    try {
      filename = decodeURIComponent(req.headers.get("x-file-name") || "media")
        .replace(/[\\/\x00-\x1f]/g, "_")
        .slice(0, 120);
    } catch {
      throw new HttpError(400, "文件名无效");
    }
    const storage = getStorage();
    key = buildStorageKey(user.userId, filename);
    const asset = await prisma.$transaction(async (tx) => {
      const used = await tx.asset.aggregate({
        where: { ownerId: user.userId },
        _sum: { sizeBytes: true },
      });
      if ((used._sum.sizeBytes || 0) + length > quotaBytes())
        throw new HttpError(413, "个人存储空间不足，请联系站点主人");
      if (
        (await tx.asset.count({
          where: { ownerId: user.userId, status: "pending" },
        })) >= 3
      )
        throw new HttpError(429, "请等待当前文件上传完成");
      return tx.asset.create({
        data: {
          ownerId: user.userId,
          driver: storage.driver,
          key: key!,
          filename,
          mime,
          sizeBytes: length,
        },
      });
    });
    assetId = asset.id;
    let bytes = 0;
    let prefix = Buffer.alloc(0);
    let checked = false;
    async function* checkedStream() {
      const source = Readable.fromWeb(
        req.body as NodeReadableStream<Uint8Array>,
      );
      for await (const part of source) {
        const chunk = Buffer.from(part);
        bytes += chunk.length;
        if (bytes > length || bytes > max)
          throw new HttpError(413, "文件大小超出限制");
        if (!checked) {
          prefix = Buffer.concat([
            prefix,
            chunk.subarray(0, Math.max(0, 32 - prefix.length)),
          ]);
          if (prefix.length >= 32 || bytes === length) {
            if (!validSignature(prefix, mime))
              throw new HttpError(415, "文件内容与格式不符，请重新选择");
            checked = true;
          }
        }
        yield chunk;
      }
      if (bytes !== length || !checked)
        throw new HttpError(400, "文件未传输完整，请重试");
    }
    await storage.put(key, Readable.from(checkedStream()));
    const preview = mime.startsWith("image/") ? await imagePreview(key).catch(() => null) : null;
    thumbnailKey = preview?.thumbnailKey;
    const ready = await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "ready", ...preview },
    });
    return NextResponse.json(assetDTO(ready), { status: 201 });
  } catch (error) {
    if (thumbnailKey) await getStorage().delete(thumbnailKey).catch(console.error);
    if (key) await getStorage().delete(key).catch(console.error);
    if (assetId)
      await prisma.asset
        .delete({ where: { id: assetId } })
        .catch(console.error);
    return apiError(error);
  }
}

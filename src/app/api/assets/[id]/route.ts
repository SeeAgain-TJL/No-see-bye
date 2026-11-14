import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { optionalUser } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";
import { imagePreview } from "@/core/previews";
import { apiError, HttpError } from "@/core/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
// Deduplicate first-view conversions; the database comparison also protects multiple workers.
const pending = new Map<string, Promise<string>>();
async function derivative(id: string, key: string, field: "thumbnailKey" | "coverKey", previous: string | null) {
  const lock = id + ":" + field;
  const existing = pending.get(lock);
  if (existing) return existing;
  const work = (async () => {
    const storage = getStorage();
    const generated = await imagePreview(key, field === "coverKey");
    if (!generated) throw new HttpError(503, "预览暂不可用，请稍后重试");
    try {
      const saved = await prisma.asset.updateMany({
        where: { id, [field]: previous, status: "ready" },
        data: { [field]: generated.thumbnailKey },
      });
      if (saved.count) return generated.thumbnailKey;
      await storage.delete(generated.thumbnailKey);
      const current = await prisma.asset.findUnique({ where: { id } });
      if (!current || current.status !== "ready" || !current[field]) throw new HttpError(404, "找不到该媒体");
      return current[field];
    } catch (error) {
      await storage.delete(generated.thumbnailKey).catch(() => {});
      throw error;
    }
  })();
  pending.set(lock, work);
  try { return await work; } finally { pending.delete(lock); }
}
async function serve(req: NextRequest, ctx: Context, head: boolean) {
  try {
    const { id } = await ctx.params;
    const session = await optionalUser(req);
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { attachment: { include: { entry: true } } },
    });
    const entry = asset?.attachment?.entry;
    if (
      !asset ||
      asset.status !== "ready" ||
      (asset.ownerId !== session?.userId &&
        (!entry || entry.deletedAt || entry.visibility !== "public"))
    )
      throw new HttpError(404, "找不到该媒体");
    const storage = getStorage();
    if (asset.driver !== storage.driver)
      throw new HttpError(503, "该媒体使用的存储驱动暂未配置");
    const variant = req.nextUrl.searchParams.get("variant");
    if (variant && !["preview", "display"].includes(variant)) throw new HttpError(400, "无效的图片规格");
    const preview = variant === "preview" || variant === "display";
    let mediaKey = asset.key;
    if (preview) {
      if (variant === "display" && !asset.mime.startsWith("image/")) throw new HttpError(400, "该规格仅适用于图片");
      const field = variant === "display" ? "coverKey" : "thumbnailKey";
      const savedKey = asset[field];
      if (savedKey && await storage.size(savedKey)) mediaKey = savedKey;
      else if (asset.mime.startsWith("image/")) mediaKey = await derivative(asset.id, asset.key, field, savedKey);
      else throw new HttpError(404, "暂无视频封面");
    }
    const isPreview = mediaKey !== asset.key;
    const size = await storage.size(mediaKey);
    if (!size) throw new HttpError(404, "文件已丢失，请联系站点主人");
    const headers = new Headers({
      "Content-Type": isPreview ? "image/webp" : asset.mime,
      "Content-Length": String(size),
      "X-File-Size": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": isPreview ? "private, no-cache, max-age=0, must-revalidate" : "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(isPreview ? "preview.webp" : asset.filename)}`,
    });
    if (isPreview) {
      const etag = '"' + createHash("sha256").update(mediaKey + ":" + size).digest("hex") + '"';
      headers.set("ETag", etag);
      // Authentication and current visibility are checked above, even for a cached image.
      if (!req.headers.has("range") && req.headers.get("if-none-match")?.split(",").some(value => value.trim().replace(/^W\//, "") === etag || value.trim() === "*")) {
        headers.delete("Content-Length");
        return new NextResponse(null, { status: 304, headers });
      }
    }
    let range: { start: number; end: number } | undefined;
    const requested = head ? null : req.headers.get("range");
    if (requested) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(requested);
      if (match && (match[1] || match[2])) {
        const start = match[1]
          ? Number(match[1])
          : Math.max(0, size - Number(match[2]));
        const end =
          match[1] && match[2]
            ? Math.min(Number(match[2]), size - 1)
            : size - 1;
        if (
          Number.isSafeInteger(start) &&
          Number.isSafeInteger(end) &&
          start <= end &&
          start < size &&
          (match[1] || Number(match[2]) > 0)
        )
          range = { start, end };
      }
      if (!range) {
        headers.set("Content-Range", `bytes */${size}`);
        headers.set("Content-Length", "0");
        return new NextResponse(null, { status: 416, headers });
      }
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      headers.set("Content-Length", String(range.end - range.start + 1));
    }
    if (head) return new NextResponse(null, { headers });
    const result = await storage.read(mediaKey, range);
    if (!result) throw new HttpError(404, "文件不存在");
    return new NextResponse(Readable.toWeb(result.stream) as ReadableStream, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    return apiError(error);
  }
}
export const GET = (req: NextRequest, ctx: Context) => serve(req, ctx, false);
export const HEAD = (req: NextRequest, ctx: Context) => serve(req, ctx, true);

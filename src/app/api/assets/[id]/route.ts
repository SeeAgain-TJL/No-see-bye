import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { optionalUser } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";
import { apiError, HttpError } from "@/core/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function serve(req: NextRequest, ctx: Context, head: boolean) {
  try {
    const { id } = await ctx.params;
    const session = optionalUser(req);
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
    const size = await storage.size(asset.key);
    if (!size) throw new HttpError(404, "文件已丢失，请联系站点主人");
    const headers = new Headers({
      "Content-Type": asset.mime,
      "Content-Length": String(size),
      "X-File-Size": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.filename)}`,
    });
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
    const result = await storage.read(asset.key, range);
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

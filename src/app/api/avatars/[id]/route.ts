import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";
import { apiError, HttpError } from "@/core/http";
export const runtime = "nodejs";
async function serve(req: NextRequest, ctx: { params: Promise<{ id: string }> }, head: boolean) {
  try {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id }, select: { avatarKey: true } });
    if (!user?.avatarKey?.startsWith(`avatars/${id}/`)) throw new HttpError(404, "暂无头像");
    const file = await getStorage().read(user.avatarKey);
    if (!file) throw new HttpError(404, "暂无头像");
    const etag = '"' + createHash("sha256").update(user.avatarKey).digest("hex") + '"';
    const headers = { "Content-Type": "image/webp", "Cache-Control": "public, no-cache", "X-Content-Type-Options": "nosniff", ETag: etag };
    if (req.headers.get("if-none-match") === etag) { file.stream.destroy(); return new NextResponse(null, { status: 304, headers }); }
    if (head) file.stream.destroy();
    return new NextResponse(head ? null : Readable.toWeb(file.stream) as ReadableStream, { headers: { ...headers, "Content-Length": String(file.size) } });
  } catch (error) { return apiError(error); }
}
export const GET = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => serve(req, ctx, false);
export const HEAD = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => serve(req, ctx, true);

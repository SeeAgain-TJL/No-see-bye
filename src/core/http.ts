import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (req.headers.get("sec-fetch-site") === "cross-site")
      throw new HttpError(403, "请求来源不受信任");
    return;
  }
  const configured = process.env.APP_ORIGIN;
  if (!configured) return;
  let expected: URL;
  try { expected = new URL(configured); } catch { throw new HttpError(500, "站点地址配置不正确"); }
  let actual: URL;
  try { actual = new URL(origin); } catch { throw new HttpError(403, "请求来源不受信任"); }
  // HTTP and HTTPS are intentionally both accepted for the same host during the
  // transition period. Cookie security is controlled separately by COOKIE_SECURE.
  if (actual.hostname !== expected.hostname || actual.port !== expected.port)
    throw new HttpError(403, "请求来源不受信任");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "请求来源不受信任");
}
export async function jsonBody(req: NextRequest) {
  if (Number(req.headers.get("content-length")) > 256_000)
    throw new HttpError(413, "内容太长了");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "请求内容为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 256_000) {
        await reader.cancel();
        throw new HttpError(413, "内容太长了");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "请求格式不正确");
  }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "请检查输入内容" },
      { status: 400 },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return NextResponse.json(
      { error: "账号或附件已被使用，请刷新后重试" },
      { status: 409 },
    );
  console.error(error);
  return NextResponse.json(
    { error: "暂时无法完成，请稍后重试" },
    { status: 500 },
  );
}

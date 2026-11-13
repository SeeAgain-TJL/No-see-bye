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
  const expected =
    process.env.APP_ORIGIN ||
    `${req.nextUrl.protocol}//${req.headers.get("host") || req.nextUrl.host}`;
  if (
    (origin && origin !== expected) ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
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

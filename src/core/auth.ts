import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/prisma";
import { HttpError } from "@/core/http";
export interface TokenPayload {
  userId: string;
  email: string;
  sessionVersion?: number;
}
const developmentSecret = randomBytes(48).toString("hex");
function secret() {
  const value = process.env.JWT_SECRET;
  if (
    value &&
    value.length >= 32 &&
    !/replace-with|change-this|fallback|your-secret/i.test(value)
  )
    return value;
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Set JWT_SECRET to a random secret of at least 32 characters",
    );
  return developmentSecret;
}
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "7d", algorithm: "HS256" });
}
export function verifyToken(token: string): TokenPayload {
  try {
    const value = jwt.verify(token, secret(), { algorithms: ["HS256"] });
    if (
      typeof value !== "object" ||
      typeof value.userId !== "string" ||
      typeof value.email !== "string"
    )
      throw new Error();
    return { userId: value.userId, email: value.email, sessionVersion: Number(value.sessionVersion || 0) };
  } catch {
    throw new HttpError(401, "请先登录，或重新登录后继续");
  }
}
export async function optionalUser(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get("memory_session")?.value;
  if (!token) return null;
  let session: TokenPayload;
  try { session = verifyToken(token); } catch { return null; }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { sessionVersion: true } });
  return user && user.sessionVersion === session.sessionVersion ? session : null;
}
export async function getUserFromRequest(req: NextRequest): Promise<TokenPayload> {
  const user = await optionalUser(req);
  if (!user) throw new HttpError(401, "请先登录，或重新登录后继续");
  return user;
}
export function withSession(response: NextResponse, token: string) {
  response.cookies.set("memory_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

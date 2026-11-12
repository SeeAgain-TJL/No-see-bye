import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";

if (process.env.NODE_ENV === "production" && JWT_SECRET === "fallback-dev-secret") {
  throw new Error("JWT_SECRET must be set in production");
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Extract the current user from a Next.js API route request.
 * Expects "Authorization: Bearer <token>" header.
 */
export function getUserFromRequest(request: NextRequest): TokenPayload {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7); // "Bearer " length
  return verifyToken(token);
}

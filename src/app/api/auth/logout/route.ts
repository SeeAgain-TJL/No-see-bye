import { NextRequest, NextResponse } from "next/server";
import { apiError, checkOrigin } from "@/core/http";
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("memory_session", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}

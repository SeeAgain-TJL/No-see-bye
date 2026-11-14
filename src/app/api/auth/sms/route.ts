import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { phoneSchema, sendRegistrationCode } from "@/core/sms";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (process.env.ALLOW_REGISTRATION === "false") throw new HttpError(403, "暂未开放注册");
    const { phone } = z.object({ phone: phoneSchema }).parse(await jsonBody(req));
    // X-Real-IP is overwritten by the site's Nginx reverse proxy.
    rateLimit("sms:global", 200, 24 * 60 * 60_000);
    rateLimit("sms:phone:" + phone, 5, 60 * 60_000);
    rateLimit("sms:ip:" + (req.headers.get("x-real-ip") || "direct"), 10, 60 * 60_000);
    await sendRegistrationCode(phone);
    return NextResponse.json({ ok: true, retryAfter: 60, expiresIn: 300 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

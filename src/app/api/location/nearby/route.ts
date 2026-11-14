import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/core/auth";
import { apiError, checkOrigin, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { nearbyLocation } from "@/core/location";
export const runtime = "nodejs";
const coordinates = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const user = await getUserFromRequest(req);
    rateLimit("location:" + user.userId, 30);
    const { latitude, longitude } = coordinates.parse(await jsonBody(req));
    return NextResponse.json(nearbyLocation(Math.round(latitude * 100) / 100, Math.round(longitude * 100) / 100), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

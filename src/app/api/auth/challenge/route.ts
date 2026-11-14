import { NextRequest, NextResponse } from "next/server";
import { registrationCredentials } from "@/lib/registration";
import { prisma } from "@/core/prisma";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { rateLimit } from "@/core/rate-limit";
import { challengeCookie, challengeCookieOptions, createRegistrationChallenge } from "@/core/captcha";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (process.env.ALLOW_REGISTRATION === "false") throw new HttpError(403, "暂未开放注册，请联系站点主人");
    rateLimit("challenge:global", 200);
    rateLimit("challenge:ip:" + (req.headers.get("x-real-ip") || "direct"), 40);
    const body = registrationCredentials.parse(await jsonBody(req));
    if (await prisma.user.findUnique({ where: { username: body.username }, select: { id: true } })) throw new HttpError(409, "该用户名已注册，请直接登录或换一个用户名");
    const { challenge, token } = await createRegistrationChallenge(body.username, req.cookies.get(challengeCookie)?.value);
    const response = NextResponse.json(challenge, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(challengeCookie, token, challengeCookieOptions);
    return response;
  } catch (error) { return apiError(error); }
}

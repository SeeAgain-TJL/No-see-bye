import { NextRequest, NextResponse } from "next/server";
import { HttpError } from "@/core/http";
import { authorizationUrl, callbackUrl, fetchOAuthProfile, findOrCreateOAuthUser, isOAuthConfigured, newState, stateCookieName, stateCookieOptions, type OAuthProvider } from "@/core/oauth";
import { signToken, withSession } from "@/core/auth";
const providers = new Set<OAuthProvider>(["qq", "github"]);
function validProvider(value: string): OAuthProvider {
  if (!providers.has(value as OAuthProvider)) throw new HttpError(404, "未知的登录方式");
  return value as OAuthProvider;
}
function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
function loginRedirect(req: NextRequest, error = "oauth") {
  const location = new URL("/login", process.env.APP_ORIGIN || req.nextUrl.origin);
  location.searchParams.set("error", error);
  return noStore(NextResponse.redirect(location));
}
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const provider = validProvider((await ctx.params).provider);
  if (!isOAuthConfigured(provider)) return loginRedirect(req, "unavailable");
  const stateName = stateCookieName(provider);
  const returnedState = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError || req.nextUrl.searchParams.get("error_code")) {
    const response = loginRedirect(req, "cancelled");
    response.cookies.set(stateName, "", { ...stateCookieOptions(), maxAge: 0 });
    return response;
  }
  if (!code) {
    const state = newState();
    const response = noStore(NextResponse.redirect(authorizationUrl(provider, state)));
    response.cookies.set(stateName, state, stateCookieOptions());
    return response;
  }
  try {
    const expectedState = req.cookies.get(stateName)?.value;
    if (!expectedState || !returnedState || expectedState !== returnedState)
      throw new HttpError(400, "登录状态已过期，请重新尝试");
    const profile = await fetchOAuthProfile(provider, code);
    const user = await findOrCreateOAuthUser(provider, profile);
    const response = withSession(noStore(NextResponse.redirect(new URL("/", callbackUrl(provider)))), signToken({ userId: user.id, email: user.email, sessionVersion: user.sessionVersion }));
    response.cookies.set(stateName, "", { ...stateCookieOptions(), maxAge: 0 });
    return response;
  } catch {
    const response = loginRedirect(req);
    response.cookies.set(stateName, "", { ...stateCookieOptions(), maxAge: 0 });
    return response;
  }
}

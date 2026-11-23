import type { NextRequest } from "next/server";
import { HttpError } from "@/core/http";
import type { OAuthProvider } from "@/core/oauth";
import { handleOAuthRequest } from "../oauth-handler";

const providers = new Set<OAuthProvider>(["qq", "github"]);
function validProvider(value: string): OAuthProvider {
  if (!providers.has(value as OAuthProvider)) throw new HttpError(404, "未知的登录方式");
  return value as OAuthProvider;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  return handleOAuthRequest(req, validProvider((await ctx.params).provider));
}

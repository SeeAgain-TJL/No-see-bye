import { createHash, randomBytes } from "node:crypto";
import { URLSearchParams } from "node:url";
import { prisma } from "@/core/prisma";
import { HttpError } from "@/core/http";
import bcrypt from "bcryptjs";

export type OAuthProvider = "qq" | "github";
export type OAuthProfile = {
  providerAccountId: string;
  displayName: string;
  email?: string;
};

const configs = {
  qq: {
    appId: () => process.env.QQ_APP_ID,
    secret: () => process.env.QQ_APP_KEY,
    authorization: "https://graph.qq.com/oauth2.0/authorize",
  },
  github: {
    appId: () => process.env.GITHUB_CLIENT_ID,
    secret: () => process.env.GITHUB_CLIENT_SECRET,
    authorization: "https://github.com/login/oauth/authorize",
  },
} as const;

export function isOAuthConfigured(provider: OAuthProvider) {
  const config = configs[provider];
  return Boolean(config.appId() && config.secret());
}

export function configuredProviders() {
  return (Object.keys(configs) as OAuthProvider[]).filter(isOAuthConfigured);
}

export function callbackUrl(provider: OAuthProvider) {
  const explicit = process.env[provider === "qq" ? "QQ_REDIRECT_URI" : "GITHUB_REDIRECT_URI"];
  if (explicit) return explicit;
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new HttpError(503, "站点地址尚未配置");
  return `${origin}/api/auth/${provider}`;
}

export function authorizationUrl(provider: OAuthProvider, state: string) {
  if (!isOAuthConfigured(provider)) throw new HttpError(404, "该登录方式暂未启用");
  const config = configs[provider];
  const query = new URLSearchParams({
    client_id: config.appId()!,
    redirect_uri: callbackUrl(provider),
    response_type: "code",
    state,
  });
  if (provider === "github") query.set("scope", "read:user user:email");
  return `${config.authorization}?${query.toString()}`;
}

async function requestText(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const text = await response.text();
  if (!response.ok) throw new HttpError(502, "第三方登录服务暂时不可用");
  return text;
}

async function requestJson(url: string, init?: RequestInit) {
  const text = await requestText(url, init);
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new HttpError(502, "第三方登录返回了无法识别的结果"); }
}

function providerError(payload: Record<string, unknown>) {
  if (payload.errcode || payload.error || payload.error_description || payload.message)
    throw new HttpError(502, "第三方登录授权失败，请重试");
}

async function qqProfile(code: string): Promise<OAuthProfile> {
  const tokenQuery = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: configs.qq.appId()!,
    client_secret: configs.qq.secret()!,
    code,
    redirect_uri: callbackUrl("qq"),
  });
  const tokenText = await requestText(`https://graph.qq.com/oauth2.0/token?${tokenQuery}`);
  const token = new URLSearchParams(tokenText);
  const accessToken = token.get("access_token");
  if (!accessToken || token.get("error")) throw new HttpError(502, "QQ 授权失败，请重试");
  const openIdText = await requestText(`https://graph.qq.com/oauth2.0/me?access_token=${encodeURIComponent(accessToken)}`);
  const match = openIdText.match(/callback\\(\\s*(\\{[\\s\\S]*\\})\\s*\\)/);
  if (!match) throw new HttpError(502, "QQ 用户信息获取失败");
  const openId = JSON.parse(match[1]) as { openid?: string; client_id?: string; error?: string };
  if (openId.error || openId.client_id !== configs.qq.appId() || !openId.openid)
    throw new HttpError(502, "QQ 用户信息获取失败");
  const info = await requestJson(`https://graph.qq.com/user/get_user_info?access_token=${encodeURIComponent(accessToken)}&oauth_consumer_key=${encodeURIComponent(configs.qq.appId()!)}&openid=${encodeURIComponent(openId.openid)}`);
  providerError(info);
  return {
    providerAccountId: openId.openid,
    displayName: typeof info.nickname === "string" ? info.nickname : "QQ 用户",
  };
}

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "no-see-bye",
};

async function githubProfile(code: string): Promise<OAuthProfile> {
  const token = await requestJson("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "no-see-bye" },
    body: new URLSearchParams({
      client_id: configs.github.appId()!,
      client_secret: configs.github.secret()!,
      code,
      redirect_uri: callbackUrl("github"),
    }).toString(),
  });
  providerError(token);
  const accessToken = typeof token.access_token === "string" ? token.access_token : "";
  if (!accessToken) throw new HttpError(502, "GitHub 授权失败，请重试");
  const info = await requestJson("https://api.github.com/user", {
    headers: { ...githubHeaders, Authorization: `Bearer ${accessToken}` },
  });
  providerError(info);
  const id = typeof info.id === "number" ? String(info.id) : "";
  if (!id) throw new HttpError(502, "GitHub 用户信息获取失败");
  let email = typeof info.email === "string" ? info.email : undefined;
  if (!email) {
    const emails = await requestJson("https://api.github.com/user/emails", {
      headers: { ...githubHeaders, Authorization: `Bearer ${accessToken}` },
    });
    if (Array.isArray(emails)) {
      const preferred = emails.find((item) => item && typeof item === "object" && (item as { primary?: boolean; verified?: boolean }).primary && (item as { verified?: boolean }).verified)
        || emails.find((item) => item && typeof item === "object" && (item as { verified?: boolean }).verified);
      if (preferred && typeof preferred === "object" && typeof (preferred as { email?: unknown }).email === "string") email = (preferred as { email: string }).email;
    }
  }
  return {
    providerAccountId: id,
    displayName: typeof info.name === "string" && info.name.trim() ? info.name : (typeof info.login === "string" ? info.login : "GitHub 用户"),
    email,
  };
}

export async function fetchOAuthProfile(provider: OAuthProvider, code: string) {
  return provider === "qq" ? qqProfile(code) : githubProfile(code);
}

function safeUsername(provider: OAuthProvider, providerAccountId: string) {
  const digest = createHash("sha256").update(providerAccountId).digest("hex").slice(0, 12);
  return `${provider}_${digest}`.slice(0, 20);
}

function safeEmail(provider: OAuthProvider, providerAccountId: string) {
  const digest = createHash("sha256").update(`${provider}:${providerAccountId}`).digest("hex");
  return `${provider}_${digest.slice(0, 24)}@oauth.local`;
}

export async function findOrCreateOAuthUser(provider: OAuthProvider, profile: OAuthProfile) {
  const existing = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
    include: { user: true },
  });
  if (existing) return existing.user;
  if (process.env.ALLOW_REGISTRATION === "false") throw new HttpError(403, "暂未开放新账号注册，请先使用已有登录方式");
  const username = safeUsername(provider, profile.providerAccountId);
  // Do not merge by provider email: this avoids account takeover when a provider email changes.
  const email = safeEmail(provider, profile.providerAccountId);
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  try {
    return await prisma.$transaction(async (tx) => tx.user.create({
      data: {
        email,
        username,
        displayName: profile.displayName.trim().slice(0, 80) || `${provider} 用户`,
        passwordHash,
        hasLocalPassword: false,
        oauthAccounts: { create: { provider, providerAccountId: profile.providerAccountId } },
      },
    }));
  } catch (error) {
    const retry = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });
    if (retry) return retry.user;
    throw error;
  }
}

export function stateCookieName(provider: OAuthProvider) { return `oauth_state_${provider}`; }
export function newState() { return randomBytes(32).toString("base64url"); }
export function stateCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.COOKIE_SECURE === "true", path: "/", maxAge: 600 };
}

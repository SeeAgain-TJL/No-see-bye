"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { api } from "@/lib/client";
import { Icon } from "./icons";
import { DecodedImage } from "./decoded-image";
import { BrandMark } from "./brand-mark";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const { refresh } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [smsEnabled, setSmsEnabled] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [smsNotice, setSmsNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [socialProviders, setSocialProviders] = useState<Array<"qq" | "github">>([]);
  useEffect(() => {
    fetch("/api/auth/providers").then((response) => response.json()).then((data: unknown) => {
      const providers = data && typeof data === "object" && "providers" in data && Array.isArray(data.providers)
        ? data.providers.filter((item): item is "qq" | "github" => item === "qq" || item === "github")
        : [];
      setSocialProviders(providers);
      setSmsEnabled(Boolean(data && typeof data === "object" && "smsEnabled" in data && data.smsEnabled));
    }).catch(() => {});
    if (new URLSearchParams(window.location.search).get("error"))
      window.setTimeout(() => setError("第三方登录没有完成，请重新尝试"), 0);
  }, []);
  useEffect(() => {
    if (!retryAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  async function sendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) { setError("请输入有效的 11 位手机号"); return; }
    setSending(true); setError(""); setSmsNotice("");
    try {
      const result = await api<{ retryAfter: number }>("/api/auth/sms", { method: "POST", body: JSON.stringify({ phone: phone.trim() }) });
      setRetryAt(Date.now() + result.retryAfter * 1000); setSmsNotice("验证码已发送，5 分钟内有效");
    } catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(fields),
      });
      await refresh();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <Link className="auth-back text-link" href={register ? "/login" : "/"}>
        <Icon name="back" size={17} />
        {register ? "返回登录" : "返回首页"}
      </Link>
      <div className="auth-card">
        <div className="auth-story">
          <DecodedImage className="auth-landscape" src="/visuals/lake-light.webp" alt="" loading="eager" fetchPriority="high" />
          <div className="auth-landscape-shade" />
          <Link className="auth-logo" href="/"><BrandMark />不说再见</Link>
          <div className="auth-story-copy"><span className="auth-kicker">A PERSONAL ARCHIVE</span><h2 lang="en">For the moments<br /><em>you keep.</em></h2><p lang="en">A place for life, as it happens.</p></div>
          <span className="auth-edition">EST. 2026 — NO SEE BYE</span>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <span className="auth-form-kicker"><Icon name="spark" size={18} />{register ? "YOUR STORY STARTS HERE" : "YOUR OWN LITTLE CORNER"}</span>
          <h1>{register ? "Make it yours." : "Welcome back."}</h1>
          <p className="muted">
            {register
              ? "为照片、影像和文字，留一个自己的空间。"
              : "回来看看，也留下一点新的日常。"}
          </p>
          {register ? (
            <>
              <label>
                用户名
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  autoComplete="username"
                  placeholder="3–20 位字母、数字或下划线"
                />
              </label>

            </>
          ) : (
            <label>
              用户名或手机号
              <input
                name="emailOrUsername"
                required
                maxLength={254}
                autoComplete="username"
                placeholder="输入你的用户名或手机号"
              />
            </label>
          )}
          <label>
            密码
            <div className="password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={register ? 8 : 1}
                maxLength={72}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "至少 8 位，建议使用独立密码" : "输入密码"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </label>
          {register && <fieldset className="phone-verification"><legend>手机验证</legend>
            <label className="sr-only" htmlFor="register-phone">手机号</label>
            <div className="phone-code-request"><span className="phone-prefix">+86</span><input id="register-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="输入手机号" required pattern="1[3-9][0-9]{9}" maxLength={11} value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 11)); setSmsNotice(""); }} /><button type="button" disabled={busy || sending || remaining > 0 || smsEnabled !== true} onClick={sendCode}>{sending ? "发送中…" : remaining > 0 ? `${remaining}s 后重发` : "获取验证码"}</button></div>
            <label className="sr-only" htmlFor="register-code">短信验证码</label><input id="register-code" name="smsCode" className="sms-code-input" inputMode="numeric" autoComplete="one-time-code" placeholder="6 位短信验证码" pattern="[0-9]{6}" maxLength={6} required />
            {smsNotice && <p className="auth-verification-note" role="status">{smsNotice}</p>}
            {smsEnabled === false && <p className="auth-verification-note">短信验证暂未开通，请使用 GitHub 注册。</p>}
          </fieldset>}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="button wide" disabled={busy || (register && smsEnabled !== true)}>
            {busy ? "请稍候…" : register ? "创建账号" : "登录"}
            <Icon name="arrow" size={17} />
          </button>
          <p className="auth-switch">
            {register ? "已有账号？" : "还没有账号？"}
            <Link href={register ? "/login" : "/register"}>
              {register ? "返回登录" : "创建账号"}
            </Link>
          </p>
          {socialProviders.length > 0 && (
            <div className="auth-social">
              <div className="auth-social-divider"><span>或使用其他方式继续</span></div>
              <div className="auth-social-buttons">
                {socialProviders.includes("qq") && <Link prefetch={false} className="auth-social-button qq" href="/api/auth/qq"><span>Q</span>使用 QQ {register ? "注册" : "登录"}</Link>}
                {socialProviders.includes("github") && <Link prefetch={false} className="auth-social-button github" href="/api/auth/github"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.08c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.23-1.65-1.23-1.65-1.01-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 .1.68 2.03 3.55 1.43.1-.72.4-1.2.72-1.47-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.15-3-.11-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.14a10.7 10.7 0 0 1 5.57 0c2.13-1.44 3.06-1.14 3.06-1.14.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.61 5.25-5.1 5.53.4.34.76 1 .76 2.02v3c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg>使用 GitHub {register ? "注册" : "登录"}</Link>}
              </div>
            </div>
          )}


        </form>
      </div>
    </main>
  );
}

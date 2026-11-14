"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import { api, ApiError } from "@/lib/client";
import { registrationCredentials, type RegistrationCredentials, type RegistrationChallenge } from "@/lib/registration";
import { Icon } from "./icons";
import { DecodedImage } from "./decoded-image";
import { BrandMark } from "./brand-mark";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const { refresh } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registration, setRegistration] = useState<{ credentials: RegistrationCredentials; challenge: RegistrationChallenge } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialProviders, setSocialProviders] = useState<Array<"qq" | "github">>([]);
  useEffect(() => {
    fetch("/api/auth/providers").then((response) => response.json()).then((data: unknown) => {
      const providers = data && typeof data === "object" && "providers" in data && Array.isArray(data.providers)
        ? data.providers.filter((item): item is "qq" | "github" => item === "qq" || item === "github")
        : [];
      setSocialProviders(providers);
    }).catch(() => {});
    if (new URLSearchParams(window.location.search).get("error"))
      window.setTimeout(() => setError("第三方登录没有完成，请重新尝试"), 0);
  }, []);
  async function finish() {
    setRegistration(null);
    await refresh().catch(() => {});
    router.replace("/");
    router.refresh();
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || registration) return;
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    setError("");
    if (register) {
      const result = registrationCredentials.safeParse(fields);
      if (!result.success) {
        setError(result.error.issues[0]?.message || "请检查注册信息");
        const field = result.error.issues[0]?.path[0];
        if (typeof field === "string") (e.currentTarget.elements.namedItem(field) as HTMLInputElement | null)?.focus();
        return;
      }
      setBusy(true);
      try {
        const challenge = await api<RegistrationChallenge>("/api/auth/challenge", { method: "POST", body: JSON.stringify(result.data) });
        setRegistration({ credentials: result.data, challenge });
      } catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify(fields) });
      await finish();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
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
          ) : (
            <label>
              用户名
              <input
                name="emailOrUsername"
                required
                maxLength={254}
                autoComplete="username"
                placeholder="输入你的用户名"
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
          {register && <label>
            再次确认密码
            <div className="password-field">
              <input name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} autoComplete="new-password" placeholder="再次输入密码" />
            </div>
          </label>}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="button wide" disabled={busy || registration !== null}>
            {busy ? register ? "正在准备验证…" : "请稍候…" : register ? "创建账号" : "登录"}
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
      {registration && <RegistrationVerification credentials={registration.credentials} initialChallenge={registration.challenge}
        onCancel={() => setRegistration(null)} onComplete={finish}
        onFormError={message => { setRegistration(null); setError(message); }} />}
    </main>
  );
}

function RegistrationVerification({ credentials, initialChallenge, onCancel, onComplete, onFormError }: {
  credentials: RegistrationCredentials; initialChallenge: RegistrationChallenge;
  onCancel: () => void; onComplete: () => Promise<void>; onFormError: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(initialChallenge);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; };
  }, []);
  async function anotherQuestion(note = "") {
    if (pending.current) return;
    pending.current = true;
    setLoading(true); setImageReady(false); setAnswer(""); setChallenge(null); setError("");
    try {
      const next = await api<RegistrationChallenge>("/api/auth/challenge", { method: "POST", body: JSON.stringify(credentials) });
      setChallenge(next); setError(note);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onFormError(err.message);
      else setError((err as Error).message);
    } finally { setLoading(false); pending.current = false; }
  }
  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current || !challenge || !imageReady) return;
    if (challenge.expiresAt <= Date.now()) { await anotherQuestion("题目已过期，已为你换一道新题"); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify({ ...credentials, challengeId: challenge.id, answer }) });
      await onComplete();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onFormError(err.message);
      else if (err instanceof ApiError && err.status === 410) {
        pending.current = false;
        await anotherQuestion("验证已失效，已为你换一道新题");
      } else { setError((err as Error).message); setAnswer(""); input.current?.focus({ preventScroll: true }); }
    } finally { setBusy(false); pending.current = false; }
  }
  return <dialog ref={dialog} className="registration-dialog" aria-labelledby="registration-verify-title" aria-describedby="registration-verify-description"
    onCancel={e => { e.preventDefault(); if (!busy && !loading) onCancel(); }}>
    <form onSubmit={verify} aria-busy={busy || loading}>
      <span className="registration-verify-kicker"><Icon name="spark" size={16} />ONE LAST STEP</span>
      <h2 id="registration-verify-title">最后一步，确认一下</h2>
      <p id="registration-verify-description">算出图片中的加法结果，即可完成注册。</p>
      <div className="registration-question" aria-live="polite">
        {challenge ? <DecodedImage className="registration-question-image" src={challenge.image} alt="随机加法题，请计算图中的两个数字之和" width={320} height={112}
          onReady={() => { setImageReady(true); input.current?.focus({ preventScroll: true }); }} onFailure={() => { setImageReady(false); setError("题目图片加载失败，请换一道题"); }} />
          : <span className="registration-question-loading">{loading ? "正在准备新题目…" : "题目未加载，请重试"}</span>}
      </div>
      <div className="registration-question-tools"><span>5 分钟内有效</span><button type="button" onClick={() => anotherQuestion()} disabled={busy || loading}>换一道题</button></div>
      <label className="registration-answer-label" htmlFor="registration-answer">你的答案</label>
      <input ref={input} id="registration-answer" name="answer" className="registration-answer" inputMode="numeric" autoComplete="off" placeholder="输入计算结果" required pattern="[0-9]{1,3}" maxLength={3}
        disabled={busy || loading} value={answer} onChange={e => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-invalid={Boolean(error)} aria-describedby={error ? "registration-verify-error" : undefined} />
      {error && <p id="registration-verify-error" className="notice error" role="alert">{error}</p>}
      <button className="button wide" disabled={busy || loading || !imageReady || !answer.trim()}>{busy ? "正在创建账号…" : "验证并完成注册"}<Icon name="arrow" size={17} /></button>
      <button className="registration-verify-cancel" type="button" onClick={onCancel} disabled={busy || loading}>返回修改</button>
    </form>
  </dialog>;
}

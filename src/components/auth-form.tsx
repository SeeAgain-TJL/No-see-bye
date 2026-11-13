"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "./providers";
import { api } from "@/lib/client";
import { Icon } from "./icons";
import { MemoryScene } from "./memory-scene";
import { BrandMark } from "./brand-mark";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const { refresh } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      router.push("/memories");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <Link className="auth-back text-link" href="/">
        <Icon name="back" size={17} />
        回到门户
      </Link>
      <div className="auth-card">
        <div className="auth-story">
          <MemoryScene />
          <Link className="auth-logo" href="/"><BrandMark />不说再见</Link>
          <div className="auth-story-copy"><span className="auth-kicker">属于你的，私人记忆空间</span><h2>此刻。<br /><em>值得留住。</em></h2></div>
          <span className="auth-edition">NO SEE BYE / 01</span>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <span className="auth-form-kicker">不说再见</span>
          <h1>{register ? "创建账号" : "欢迎回来"}</h1>
          <p className="muted">
            {register
              ? "从今天，开始记录。"
              : "登录，继续你的故事。"}
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
              <label>
                邮箱
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            </>
          ) : (
            <label>
              用户名或邮箱
              <input
                name="emailOrUsername"
                required
                maxLength={254}
                autoComplete="username"
                placeholder="输入你的用户名或邮箱"
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
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="button wide" disabled={busy}>
            {busy ? "请稍候…" : register ? "创建账号" : "登录"}
            <Icon name="arrow" size={17} />
          </button>
          <p className="auth-switch">
            {register ? "已有账号？" : "还没有账号？"}
            <Link href={register ? "/login" : "/register"}>
              {register ? "去登录" : "创建账号"}
            </Link>
          </p>

        </form>
      </div>
    </main>
  );
}

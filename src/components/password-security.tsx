"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "./icons";
import { useApp } from "./providers";

export type PasswordSecurityInfo = {
  mailConfigured: boolean;
  verifiedEmails: string[];
  recoveryEmails: string[];
  requiresEmailVerification: boolean;
};
type Challenge = { challengeId: string; maskedEmail: string; expiresAt: string; retryAfterSeconds: number };

export function PasswordSecurity({ security, onChanged }: { security: PasswordSecurityInfo; onChanged: () => Promise<void> }) {
  const { refresh, notify } = useApp();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => setSeconds(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);
  function fields() {
    if (!form.current) return null;
    for (const name of ["currentPassword", "newPassword", "confirmPassword", ...(security.requiresEmailVerification ? ["email"] : [])]) {
      const field = form.current.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (!field?.reportValidity()) return null;
    }
    const values = Object.fromEntries(new FormData(form.current));
    if (values.newPassword !== values.confirmPassword) { setError("两次新密码不一致"); return null; }
    return values;
  }
  async function send() {
    // The code input is optional until a challenge has been issued.
    const values = fields();
    if (!values || busy) return;
    setError(""); setBusy(true);
    try {
      const next = await api<Challenge>("/api/account/password-challenge", { method: "POST", body: JSON.stringify(values) });
      setChallenge(next); setCooldownUntil(Date.now() + next.retryAfterSeconds * 1000);
      if (codeInput.current) codeInput.current.value = "";
      window.setTimeout(() => codeInput.current?.focus(), 0);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = fields();
    if (!values || busy || (security.requiresEmailVerification && !challenge)) return;
    if (security.requiresEmailVerification && !String(values.code || "").match(/^\d{6}$/)) { setError("请输入邮件中的 6 位验证码"); codeInput.current?.focus(); return; }
    setError(""); setBusy(true);
    try {
      await api("/api/account", { method: "PATCH", body: JSON.stringify({ ...values, action: "password", ...(challenge ? { challengeId: challenge.challengeId } : {}) }) });
      setChallenge(null); form.current?.reset();
      notify("密码已更新，其他登录会话已退出");
      try { await refresh(); await onChanged(); }
      catch { setError("密码已更新，但账号资料刷新失败，请刷新页面后查看。"); }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function invalidate(event: React.ChangeEvent<HTMLFormElement>) {
    if (event.target.name !== "code") { setChallenge(null); if (codeInput.current) codeInput.current.value = ""; }
    setError("");
  }
  return <form ref={form} className="settings-card password-security" onSubmit={submit} onChange={invalidate}>
    <span className="security-eyebrow"><Icon name="lock" size={15} />ACCOUNT SECURITY</span>
    <h2>为珍藏，留一道锁。</h2>
    <p className="security-description">{security.requiresEmailVerification ? "修改密码需要当前密码与邮箱验证码。" : "以当前密码验证身份，守护你的私人卷册。"}更新后，其余设备将退出登录。</p>
    {security.requiresEmailVerification && !security.mailConfigured && <p className="security-mail-unavailable" role="status"><Icon name="lock" size={16} />验证码邮件暂不可用，需由管理员配置发信服务。</p>}
    <label>当前密码<input name="currentPassword" type="password" required maxLength={72} autoComplete="current-password" disabled={busy} /></label>
    <div className="security-password-pair">
      <label>新密码<input name="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="至少 8 位" disabled={busy} /></label>
      <label>确认新密码<input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" disabled={busy} /></label>
    </div>
    {security.requiresEmailVerification && <>{security.recoveryEmails.length > 0 ? <label>验证邮箱<select name="email" defaultValue={security.recoveryEmails[0]} disabled={busy}>{security.recoveryEmails.map(email => <option key={email} value={email}>{email}</option>)}</select></label>
      : <label>安全邮箱<input name="email" type="email" required autoComplete="email" maxLength={254} placeholder="用于接收验证码" disabled={busy} /><small>本次验证成功后，此邮箱将绑定为账号的安全邮箱。</small></label>}
    <div className="security-verification">
      <label>邮箱验证码<input ref={codeInput} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6 位验证码" disabled={busy || !challenge} /></label>
      <button type="button" className="button secondary" onClick={send} disabled={busy || seconds > 0 || !security.mailConfigured}>{busy && !challenge ? "发送中…" : seconds > 0 ? `${seconds}s 后重发` : challenge ? "重新发送" : "发送验证码"}</button>
    </div>
    {challenge && <p className="security-code-status" role="status">已发送至 {challenge.maskedEmail}，10 分钟内有效。请同时检查垃圾邮件。</p>}</>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <button className="button" disabled={busy || (security.requiresEmailVerification && (!challenge || !security.mailConfigured))}>{busy ? "更新中…" : security.requiresEmailVerification ? "验证并更新密码" : "更新密码"}<Icon name="arrow" size={16} /></button>
  </form>;
}

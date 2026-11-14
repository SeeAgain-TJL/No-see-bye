"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { api, bytes } from "@/lib/client";
type Account = { user: { username: string; displayName: string; email: string | null; avatarUrl: string | null; hasLocalPassword: boolean; loginMethods: string[]; phoneMasked: string | null }; usedBytes: number; quotaBytes: number | null; records: number };
export default function Settings() {
  const { user, loading, refresh, notify } = useApp();
  const [data, setData] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!user) return;
    const abort = new AbortController();
    api<Account>("/api/account", { signal: abort.signal }).then(setData).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [user]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = "";
    if (!selected) return;
    if (selected.size > 5 * 1024 ** 2) { setError("头像图片不能超过 5 MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(selected.type)) { setError("请选择 JPG、PNG、WebP、AVIF 或 GIF 图片"); return; }
    setError(""); setFile(selected); setPreview(URL.createObjectURL(selected));
  }
  async function updateAvatar(remove = false) {
    if (!remove && !file) return;
    setBusy("avatar"); setError("");
    try {
      await api("/api/account/avatar", { method: remove ? "DELETE" : "POST", ...(remove ? {} : { headers: { "Content-Type": file!.type }, body: file! }) });
      setFile(null); setPreview(null);
      await refresh();
      setData(await api<Account>("/api/account"));
      notify(remove ? "已恢复默认头像" : "头像已更新");
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>, action: "profile" | "password") {
    event.preventDefault(); const form = event.currentTarget; const fields = Object.fromEntries(new FormData(form));
    if (action === "password" && fields.newPassword !== fields.confirmPassword) { setError("两次新密码不一致"); return; }
    setBusy(action); setError("");
    try {
      await api("/api/account", { method: "PATCH", body: JSON.stringify({ action, ...fields }) });
      await refresh(); notify(action === "password" ? "密码已更新，其他登录会话已退出" : "昵称已更新");
      if (action === "password") form.reset();
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  return <AppShell><section className="page-heading"><h1>设置</h1></section>
    {error && <div className="notice error" role="alert">{error}</div>}
    {loading ? <div className="loading-panel">加载中…</div> : !user ? <div className="empty-state"><h2>登录后管理账号</h2><Link className="button" href="/login">登录</Link></div> : !data ? <div className="loading-panel">{error ? <button className="button secondary" onClick={() => refresh()}>重新加载</button> : "正在读取账号…"}</div> : <div className="settings-grid">
      <section className="settings-card"><h2>个人资料</h2>
        <div className="settings-avatar-row">
          <Avatar name={data.user.displayName || data.user.username} src={preview || data.user.avatarUrl} className="settings-avatar" />
          <div className="settings-avatar-controls"><strong>换个头像，换个心情</strong><p>图片不超过 5 MB，将居中裁剪为正方形</p>
            <input ref={picker} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={chooseAvatar} aria-label="选择头像图片" disabled={!!busy} />
            <div className="settings-avatar-actions"><button type="button" className="button secondary" disabled={!!busy} onClick={() => picker.current?.click()}>{file ? "重新选择" : "更换头像"}</button>
              {file ? <><button type="button" className="button" disabled={!!busy} onClick={() => updateAvatar()}>{busy === "avatar" ? "上传中…" : "保存头像"}</button><button className="text-link small" type="button" disabled={!!busy} onClick={() => { setFile(null); setPreview(null); }}>取消</button></> : data.user.avatarUrl && <button className="text-link small" type="button" disabled={!!busy} onClick={() => updateAvatar(true)}>恢复默认</button>}
            </div>
          </div>
        </div>
        <form onSubmit={e => save(e, "profile")}><label>昵称<input name="displayName" defaultValue={data.user.displayName || data.user.username} required maxLength={24} autoComplete="nickname" /></label>
          {data.user.hasLocalPassword && <label>登录账号<input value={data.user.username} disabled /></label>}
          {data.user.phoneMasked && <label>已验证手机<input value={data.user.phoneMasked} disabled /></label>}
          {data.user.email && <label>邮箱<input value={data.user.email} disabled /></label>}
          <button className="button" disabled={!!busy}>{busy === "profile" ? "保存中…" : "保存修改"}</button>
        </form>
      </section>
      {data.user.hasLocalPassword ? <form className="settings-card" onSubmit={e => save(e, "password")}><h2>修改本站密码</h2><label>当前密码<input name="currentPassword" type="password" required maxLength={72} autoComplete="current-password" /></label><label>新密码<input name="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="至少 8 位" /></label><label>确认新密码<input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label><button className="button secondary" disabled={!!busy}>{busy === "password" ? "更新中…" : "更新密码"}</button></form>
        : <section className="settings-card settings-connected"><span className="connected-symbol"><Icon name="lock" size={28} /></span><h2>登录方式</h2><strong>{data.user.loginMethods.includes("github") ? "GitHub" : "第三方账号"} 登录</strong><p>本站不保存你的第三方密码。账号密码请前往对应平台修改。</p>{data.user.loginMethods.includes("github") && <a className="button secondary" href="https://github.com/settings/security" target="_blank" rel="noopener noreferrer">管理 GitHub 账号<Icon name="arrow" size={16} /></a>}</section>}
      <section className="settings-card settings-storage"><span className="shortcut-icon"><Icon name="image" size={26} /></span><div className="storage-gauge"><h2>存储用量</h2><p>已使用 {bytes(data.usedBytes)}{data.quotaBytes !== null ? ` / ${bytes(data.quotaBytes)}` : " · 不设个人总量上限"} · {data.records} 条记录</p>{data.quotaBytes !== null && <progress aria-label="原文件存储使用量" max={data.quotaBytes} value={data.usedBytes} />}</div><Link href="/memories/trash" className="text-link small">回收站<Icon name="arrow" size={16} /></Link></section>
    </div>}
  </AppShell>;
}

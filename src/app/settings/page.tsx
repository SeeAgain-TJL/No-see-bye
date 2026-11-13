"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { api, bytes } from "@/lib/client";
type Account = { user: { username:string; displayName:string; email:string }; usedBytes:number; quotaBytes:number; records:number };
export default function Settings() {
  const { user,loading,refresh,notify }=useApp();
  const [data,setData]=useState<Account|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");
  useEffect(()=>{ if(user) api<Account>("/api/account").then(setData).catch(e=>setError(e.message)); },[user]);
  async function save(event:React.FormEvent<HTMLFormElement>,action:string) {
    event.preventDefault();const form=event.currentTarget;const fields=Object.fromEntries(new FormData(form));
    if(action==="password" && fields.newPassword!==fields.confirmPassword){setError("两次新密码不一致");return;}
    setBusy(action);setError("");
    try { await api("/api/account",{method:"PATCH",body:JSON.stringify({action,...fields})});await refresh();notify(action==="password"?"密码已更新，其他登录会话已退出":"昵称已更新");if(action==="password")form.reset(); }
    catch(e){setError((e as Error).message);}finally{setBusy("");}
  }
  return <AppShell><section className="page-heading"><h1>设置</h1></section>{error&&<div className="notice error" role="alert">{error}</div>}{loading?<div className="loading-panel">加载中…</div>:!user?<div className="empty-state"><h2>登录后管理账号</h2><Link className="button" href="/login">登录</Link></div>:!data?<div className="loading-panel">正在读取账号…</div>:<div className="settings-grid">
    <form className="settings-card" onSubmit={e=>save(e,"profile")}><h2>个人资料</h2><label>昵称<input name="displayName" defaultValue={data.user.displayName||data.user.username} required maxLength={24} autoComplete="nickname" /></label><label>登录账号<input value={data.user.username} disabled /></label><label>邮箱<input value={data.user.email} disabled /></label><button className="button" disabled={!!busy}>{busy==="profile"?"保存中…":"保存修改"}</button></form>
    <form className="settings-card" onSubmit={e=>save(e,"password")}><h2>修改密码</h2><label>当前密码<input name="currentPassword" type="password" required maxLength={72} autoComplete="current-password" /></label><label>新密码<input name="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="至少 8 位" /></label><label>确认新密码<input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label><button className="button secondary" disabled={!!busy}>{busy==="password"?"更新中…":"更新密码"}</button></form>
    <section className="settings-card settings-storage"><span className="shortcut-icon"><Icon name="image" size={26}/></span><div className="storage-gauge"><h2>存储空间</h2><p>{bytes(data.usedBytes)} / {bytes(data.quotaBytes)} · {data.records} 条记录</p><progress aria-label="原文件存储使用量" max={data.quotaBytes} value={data.usedBytes}/></div><Link href="/memories/trash" className="text-link small">回收站<Icon name="arrow" size={16}/></Link></section>
  </div>}</AppShell>;
}

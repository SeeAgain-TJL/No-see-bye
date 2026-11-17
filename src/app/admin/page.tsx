"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { api, bytes } from "@/lib/client";

type Overview = {
  summary: { users: number; activeUsers7d: number; entries: number; publicEntries: number; privateEntries: number; trashedEntries: number; assets: number; storageBytes: number; photos: number; videos: number };
  registration: { enabled: boolean }; mail: { configured: boolean };
  daily: Array<{ date: string; users: number; entries: number }>;
};
type AdminUser = {
  id: string; username: string; displayName: string; email: string | null; role: string; createdAt: string;
  lastLoginAt: string | null; lastSeenAt: string | null; loginCount: number; entries: number; publicEntries: number;
  privateEntries: number; trashedEntries: number; assets: number; storageBytes: number; photos: number; videos: number; loginMethods: string[];
};
type UserPage = { items: AdminUser[]; page: number; pageSize: number; total: number; totalPages: number };
function time(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "尚无记录";
}
const count = (value: number) => value.toLocaleString("zh-CN");

function ActivityChart({ daily }: { daily: Overview["daily"] }) {
  const highest = Math.max(1, ...daily.map(day => Math.max(day.users, day.entries)));
  return <div className="admin-activity-chart" role="img" aria-label={`最近 ${daily.length} 天新增用户 ${daily.reduce((n, day) => n + day.users, 0)} 位，新增记录 ${daily.reduce((n, day) => n + day.entries, 0)} 条；每日详情可通过图中柱条提示查看。`}>
    <div className="admin-chart-grid" aria-hidden="true"><span /><span /><span /></div>
    <div className="admin-chart-bars">{daily.map(day => <div className="admin-chart-day" key={day.date} title={`${day.date}：新增用户 ${day.users}，记录 ${day.entries}`}><i style={{ height: `${Math.max(day.users ? 3 : 0, day.users / highest * 100)}%` }} /><b style={{ height: `${Math.max(day.entries ? 3 : 0, day.entries / highest * 100)}%` }} /><span className="sr-only">{day.date}，用户 {day.users}，记录 {day.entries}</span></div>)}</div>
    <div className="admin-chart-dates"><span>{daily[0]?.date}</span><span>{daily.at(-1)?.date}</span></div>
  </div>;
}

export default function AdminPage() {
  const { user, loading } = useApp();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserPage | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (user?.role !== "admin") return;
    const abort = new AbortController();
    api<Overview>("/api/admin/overview", { signal: abort.signal }).then(data => { setOverview(data); setOverviewError(""); }).catch(e => { if (!abort.signal.aborted) setOverviewError(e.message); });
    return () => abort.abort();
  }, [user?.role, refresh]);
  useEffect(() => {
    if (user?.role !== "admin") return;
    const abort = new AbortController();
    const task = window.setTimeout(() => {
      setPending(true); setError("");
      api<UserPage>(`/api/admin/users?page=${page}&pageSize=20&q=${encodeURIComponent(search)}`, { signal: abort.signal })
        .then(data => { setUsers(data); setPage(data.page); }).catch(e => { if (!abort.signal.aborted) setError(e.message); })
        .finally(() => { if (!abort.signal.aborted) setPending(false); });
    }, 0);
    return () => { abort.abort(); window.clearTimeout(task); };
  }, [user?.role, page, search, refresh]);
  const summary = overview?.summary;
  return <AppShell><div className="admin-page">
    <header className="admin-heading"><div><span className="section-eyebrow">THE ARCHIVE / CONTROL ROOM</span><h1>卷册有数，光阴有迹。</h1><p>使用概况与用户信息</p></div><button type="button" className="button secondary" disabled={pending || !user || user.role !== "admin"} onClick={() => setRefresh(v => v + 1)}><Icon name="restore" size={16} />刷新数据</button></header>
    {loading ? <div className="loading-panel">正在核验管理权限…</div> : !user ? <div className="empty-state"><Icon name="lock" size={28} /><h2>请以管理员身份登录</h2><Link className="button" href="/login">前往登录<Icon name="arrow" size={16} /></Link></div> : user.role !== "admin" ? <div className="empty-state"><Icon name="lock" size={28} /><h2>此处仅向管理员开放</h2><Link className="button secondary" href="/">返回主页</Link></div> : <>
      {(error || overviewError) && <div className="notice error" role="alert">{[overviewError, error].filter(Boolean).join("；")}<button type="button" className="text-link" onClick={() => setRefresh(v => v + 1)}>重新加载</button></div>}
      {summary && <div className="admin-metrics">{[
        { label: "用户", value: count(summary.users), note: `近 7 天活跃 ${count(summary.activeUsers7d)}`, icon: "globe" },
        { label: "记录", value: count(summary.entries), note: `公开 ${count(summary.publicEntries)} · 私密 ${count(summary.privateEntries)}`, icon: "book" },
        { label: "媒体", value: count(summary.assets), note: `照片 ${count(summary.photos)} · 影像 ${count(summary.videos)}`, icon: "image" },
        { label: "原文件用量", value: bytes(summary.storageBytes), note: `回收站 ${count(summary.trashedEntries)} 条记录`, icon: "grid" },
      ].map((metric, index) => <section className="admin-metric motion-reveal" key={metric.label}><span className="admin-metric-index">0{index + 1}<Icon name={metric.icon} size={18} /></span><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></section>)}</div>}
      {overview && <div className="admin-overview-panels">
        <section className="admin-panel"><div className="admin-panel-heading"><div><span className="section-eyebrow">THE DAYS IN MOTION</span><h2>近日留痕</h2></div><div className="admin-chart-legend"><span>用户</span><span>记录</span></div></div><ActivityChart daily={overview.daily} /></section>
        <section className="admin-panel admin-service"><span className="section-eyebrow">AT A GLANCE</span><h2>站点状态</h2><dl><div><dt>新用户注册</dt><dd data-ok={overview.registration.enabled}>{overview.registration.enabled ? "开放" : "关闭"}</dd></div><div><dt>验证码邮件</dt><dd data-ok={overview.mail.configured}>{overview.mail.configured ? "已配置" : "待配置"}</dd></div><div><dt>数据时间</dt><dd>北京时间</dd></div></dl><p>活跃情况从本次版本起记录；历史登录次数不作推算。</p></section>
      </div>}
      <section className="admin-panel admin-user-panel" aria-busy={pending}>
        <div className="admin-users-heading"><div><span className="section-eyebrow">PEOPLE OF THE ARCHIVE</span><h2>用户卷目 <small>{users ? count(users.total) : "—"}</small></h2></div><form className="admin-search" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(query.trim()); }}><Icon name="search" size={17} /><input aria-label="搜索用户" placeholder="用户名、昵称或邮箱" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} /><button type="submit">搜索</button>{search && <button type="button" className="admin-clear" aria-label="清空搜索" onClick={() => { setQuery(""); setSearch(""); setPage(1); }}><Icon name="close" size={15} /></button>}</form></div>
        <div className="admin-table-head" aria-hidden="true"><span>用户</span><span>记录 / 媒体</span><span>存储</span><span>活跃情况</span></div>
        {!users ? <div className="loading-panel">{error ? "数据暂不可用" : "正在读取用户…"}</div> : users.items.length === 0 ? <div className="admin-no-users">没有找到匹配的用户。</div> : <ul className="admin-user-list">{users.items.map(person => <li className="admin-user" key={person.id}>
          <div className="admin-person"><Avatar name={person.displayName || person.username} /><div><strong>{person.displayName || person.username}{person.role === "admin" && <span className="admin-role">ADMIN</span>}</strong><span>@{person.username}</span><small>{person.email || "未绑定邮箱"}</small></div></div>
          <div className="admin-user-counts"><span><b>{count(person.entries)}</b> 条记录</span><small>公开 {count(person.publicEntries)} · 私密 {count(person.privateEntries)}</small><small>照片 {count(person.photos)} · 影像 {count(person.videos)} · 回收站 {count(person.trashedEntries)}</small></div>
          <div className="admin-user-storage"><strong>{bytes(person.storageBytes)}</strong><small>{count(person.assets)} 个附件</small></div>
          <div className="admin-user-activity"><span>最近活跃 <time>{time(person.lastSeenAt)}</time></span><small>最近登录 {time(person.lastLoginAt)} · {count(person.loginCount)} 次</small><small>加入于 {time(person.createdAt)} · {person.loginMethods.map(method => method === "password" ? "密码" : method === "github" ? "GitHub" : method).join(" / ")}</small></div>
        </li>)}</ul>}
        <footer className="admin-pagination"><span role="status">{pending ? "读取中…" : users ? `共 ${count(users.total)} 位用户 · 第 ${users.page} / ${Math.max(1, users.totalPages)} 页` : "—"}</span><div><button type="button" className="icon-button" aria-label="上一页" disabled={pending || page <= 1} onClick={() => setPage(v => v - 1)}><Icon name="back" size={17} /></button><button type="button" className="icon-button" aria-label="下一页" disabled={pending || !users || page >= users.totalPages} onClick={() => setPage(v => v + 1)}><Icon name="arrow" size={17} /></button></div></footer>
      </section>
    </>}
  </div></AppShell>;
}

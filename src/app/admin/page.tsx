"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { AdminParticleField } from "@/components/admin-particle-field";
import { AdminUserActions } from "@/components/admin-user-actions";
import { ADMIN_POLL_SECONDS, useAdminLiveData } from "@/components/admin-live-data";
import { bytes } from "@/lib/client";

type Overview = {
  summary: {
    users: number;
    activeUsers7d: number;
    activeUsers15m?: number;
    entries: number;
    publicEntries: number;
    privateEntries: number;
    trashedEntries: number;
    assets: number;
    storageBytes: number;
    photos: number;
    videos: number;
  };
  sampledAt?: string;
  registration: { enabled: boolean };
  mail: { configured: boolean };
  daily: Array<{ date: string; users: number; entries: number }>;
};

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  loginCount: number;
  entries: number;
  publicEntries: number;
  privateEntries: number;
  trashedEntries: number;
  assets: number;
  storageBytes: number;
  photos: number;
  videos: number;
  loginMethods: string[];
};

type UserPage = { items: AdminUser[]; page: number; total: number; totalPages: number };

const timeZone = "Asia/Shanghai";
const localDate = new Intl.DateTimeFormat("zh-CN", { timeZone, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const localTime = new Intl.DateTimeFormat("zh-CN", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

function dateTime(value: string | null) {
  return value ? localDate.format(new Date(value)) : "尚无记录";
}

const count = (value: number) => value.toLocaleString("zh-CN");

function ActivityChart({ daily }: { daily: Overview["daily"] }) {
  const [period, setPeriod] = useState<7 | 30>(30);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const days = daily.slice(-period);
  const selectedIndex = days.findIndex(day => day.date === selectedDate);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : days.length - 1;
  const active = days[activeIndex];
  const highest = Math.max(1, ...days.flatMap(day => [day.users, day.entries]));

  function selectDay(index: number, focus = false) {
    if (!days[index]) return;
    setSelectedDate(days[index].date);
    if (focus) rail.current?.querySelector<HTMLButtonElement>(`[data-day-index="${index}"]`)?.focus();
  }

  return <section className="admin-panel admin-trend" aria-labelledby="admin-trends-title">
    <div className="admin-panel-heading">
      <div><h2 id="admin-trends-title">新增趋势</h2><p>按日统计 · 北京时间</p></div>
      <div className="admin-segments" role="group" aria-label="趋势统计周期">
        {([7, 30] as const).map(days => <button type="button" key={days} aria-pressed={period === days} onClick={() => { setPeriod(days); setSelectedDate(null); }}>{days} 天</button>)}
      </div>
    </div>
    <div className="admin-chart-legend"><span>用户</span><span>记录</span></div>
    <div className="admin-activity-chart">
      <div className="admin-chart-grid" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="admin-chart-bars" ref={rail} role="group" aria-label="选择日期查看新增数据" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : activeIndex + (event.key === 'ArrowRight' ? 1 : -1);
        selectDay(Math.max(0, Math.min(days.length - 1, next)), true);
      }}>
        {days.map((day, index) => <button
          type="button"
          className="admin-chart-day"
          key={day.date}
          data-day-index={index}
          tabIndex={index === activeIndex ? 0 : -1}
          aria-pressed={index === activeIndex}
          aria-label={`${day.date}，新增用户 ${day.users}，新增记录 ${day.entries}`}
          onClick={() => selectDay(index)}
        >
          <span style={{ height: `${day.users / highest * 100}%` }} /><span style={{ height: `${day.entries / highest * 100}%` }} />
        </button>)}
      </div>
      <div className="admin-chart-dates" aria-hidden="true"><span>{days[0]?.date.slice(5)}</span><span>{days.at(-1)?.date.slice(5)}</span></div>
    </div>
    {active && <div className="admin-chart-readout">
      <div aria-live="polite">
        <time dateTime={active.date}>{active.date}</time><span>用户 <strong>{count(active.users)}</strong></span><span>记录 <strong>{count(active.entries)}</strong></span>
      </div>
      <div className="admin-chart-nav">
        <button type="button" className="admin-control" aria-label="查看前一天" disabled={activeIndex <= 0} onClick={() => selectDay(activeIndex - 1)}><Icon name="back" size={15} /></button>
        <button type="button" className="admin-control" aria-label="查看后一天" disabled={activeIndex >= days.length - 1} onClick={() => selectDay(activeIndex + 1)}><Icon name="arrow" size={15} /></button>
      </div>
    </div>}
  </section>;
}

function CurrentMetrics({ summary }: { summary: Overview["summary"] }) {
  const metrics = [
    { label: "注册用户", value: count(summary.users), note: `近 7 天活跃 ${count(summary.activeUsers7d)}`, icon: "globe" },
    { label: "日常记录", value: count(summary.entries), note: `公开 ${count(summary.publicEntries)} · 私密 ${count(summary.privateEntries)}`, icon: "book" },
    { label: "媒体附件", value: count(summary.assets), note: `照片 ${count(summary.photos)} · 影像 ${count(summary.videos)}`, icon: "image" },
    { label: "存储用量", value: bytes(summary.storageBytes), note: `回收站 ${count(summary.trashedEntries)} 条记录`, icon: "grid" },
  ];
  return <dl className="admin-metrics" aria-label="站点统计">{metrics.map(metric => <div key={metric.label} className="admin-metric">
    <dt><Icon name={metric.icon} size={17} />{metric.label}</dt><dd><strong>{metric.value}</strong><small>{metric.note}</small></dd>
  </div>)}</dl>;
}

function ServiceStatus({ overview }: { overview: Overview }) {
  const { summary } = overview;
  const publicShare = summary.entries ? summary.publicEntries / summary.entries * 100 : 0;
  return <section className="admin-panel admin-service" aria-labelledby="admin-service-title">
    <h2 id="admin-service-title">站点状态</h2>
    <dl>
      <div><dt>新用户注册</dt><dd data-ok={overview.registration.enabled}>{overview.registration.enabled ? "开放" : "关闭"}</dd></div>
      <div><dt>验证码邮件</dt><dd data-ok={overview.mail.configured}>{overview.mail.configured ? "已配置" : "待配置"}</dd></div>
    </dl>
    <div className="admin-record-share">
      <h3>记录可见性</h3>
      <div className="admin-record-share-track" aria-hidden="true"><span style={{ width: `${publicShare}%` }} /></div>
      <div className="admin-record-share-numbers"><span>公开 {count(summary.publicEntries)}</span><span>私密 {count(summary.privateEntries)}</span></div>
    </div>
  </section>;
}

function UserRow({ person, onChanged }: { person: AdminUser; onChanged: () => void }) {
  const methods = person.loginMethods.map(method => method === "password" ? "密码" : method === "github" ? "GitHub" : method);
  return <li className="admin-user">
    <div className="admin-person">
      <Avatar name={person.displayName || person.username} />
      <div><strong>{person.displayName || person.username}{person.role === "admin" && <span className="admin-role">管理员</span>}</strong><span>@{person.username}</span><small>{person.email || "未绑定邮箱"}</small></div>
    </div>
    <div className="admin-user-counts">
      <span><b>{count(person.entries)}</b> 条记录</span>
      <small>公开 {count(person.publicEntries)} · 私密 {count(person.privateEntries)} · 回收站 {count(person.trashedEntries)}</small>
      <small>照片 {count(person.photos)} · 影像 {count(person.videos)}</small>
    </div>
    <div className="admin-user-storage"><strong>{bytes(person.storageBytes)}</strong><small>{count(person.assets)} 个附件</small></div>
    <div className="admin-user-activity">
      <span>最近活跃 <time dateTime={person.lastSeenAt || undefined}>{dateTime(person.lastSeenAt)}</time></span>
      <small>最近登录 {dateTime(person.lastLoginAt)} · {count(person.loginCount)} 次</small>
      <small>加入于 {dateTime(person.createdAt)} · {methods.join(" / ")}</small>
    </div>
    <div className="admin-user-tools">{person.role !== "admin" && <AdminUserActions userId={person.id} username={person.username} onChanged={onChanged} />}</div>
  </li>;
}

function AdminDashboard() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refresh = () => setRevision(value => value + 1);
  const overviewState = useAdminLiveData<Overview>("/api/admin/overview", revision, autoRefresh);
  const userState = useAdminLiveData<UserPage>(`/api/admin/users?page=${page}&pageSize=20&q=${encodeURIComponent(search)}`, revision, autoRefresh);
  const overview = overviewState?.data;
  const userPage = userState?.data;
  const errors = [...new Set([overviewState?.error, userState?.error].filter(Boolean))];
  const denied = overviewState?.denied || userState?.denied;
  const refreshing = overviewState?.refreshing || userState?.refreshing;
  const activity = overview?.summary.activeUsers15m ?? overview?.summary.activeUsers7d;
  const activityLabel = overview?.summary.activeUsers15m === undefined ? "近 7 天活跃" : "近 15 分钟活跃";
  const refreshStatus = errors.length ? "更新暂缓" : !autoRefresh ? "自动更新已暂停" : overview ? "自动更新中" : "正在连接";
  const synced = overviewState?.updated ?? 0;
  const sampled = overview?.sampledAt && Number.isFinite(Date.parse(overview.sampledAt)) ? Date.parse(overview.sampledAt) : synced;

  if (denied) return <div className="admin-page"><div className="empty-state"><Icon name="lock" size={28} /><h1>管理权限已失效</h1><Link className="button" href="/login">重新登录<Icon name="arrow" size={16} /></Link></div></div>;

  return <div className="admin-page admin-observatory">
    <header className="admin-monitor">
      <AdminParticleField synced={synced} paused={!autoRefresh} />
      <div className="admin-monitor-content">
        <div className="admin-monitor-title">
          <p className="admin-live-state" role="status" data-state={errors.length ? 'error' : autoRefresh && overview ? 'live' : 'idle'}><i aria-hidden="true" />{refreshStatus}</p>
          <h1>站点观测</h1>
          <div className="admin-monitor-count"><strong>{activity === undefined ? "—" : count(activity)}</strong><span>{activityLabel}<small>按最近访问统计</small></span></div>
        </div>
        <div className="admin-monitor-footer">
          <div className="admin-monitor-sync"><Icon name="calendar" size={15} /><span>{sampled ? <>最后同步 <time dateTime={new Date(sampled).toISOString()} title="北京时间">{localTime.format(sampled)}</time></> : "等待首次同步"}</span>{autoRefresh && <small>每 {ADMIN_POLL_SECONDS} 秒更新</small>}</div>
          <div className="admin-monitor-actions">
            <button type="button" className="admin-control" aria-label={autoRefresh ? "暂停自动更新" : "开启自动更新"} title={autoRefresh ? "暂停自动更新" : "开启自动更新"} onClick={() => setAutoRefresh(value => !value)}><Icon name={autoRefresh ? "pause" : "play"} size={16} /><span>{autoRefresh ? "暂停" : "继续"}</span></button>
            <button type="button" className="admin-control" disabled={refreshing} onClick={refresh}><Icon name="restore" size={16} /><span>刷新</span></button>
          </div>
        </div>
      </div>
    </header>

    {errors.length > 0 && <div className="admin-data-error" role="alert"><span>{errors.join("。")}{overview ? "。正在显示上次同步的数据。" : "。"}</span><button type="button" className="admin-control" onClick={refresh}>重试</button></div>}
    {overview ? <>
      <CurrentMetrics summary={overview.summary} />
      <div className="admin-overview-panels"><ActivityChart daily={overview.daily} /><ServiceStatus overview={overview} /></div>
    </> : !overviewState?.error && <div className="admin-read-status" role="status">正在读取站点统计…</div>}

    <section className="admin-panel admin-user-panel" aria-labelledby="admin-users-title">
      <div className="admin-users-heading">
        <h2 id="admin-users-title">用户管理 {userPage && <small>{count(userPage.total)}</small>}</h2>
        <form className="admin-search" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}>
          <Icon name="search" size={17} />
          <input aria-label="搜索用户" placeholder="用户名、昵称或邮箱" value={query} onChange={event => setQuery(event.target.value)} maxLength={100} />
          <button type="submit">搜索</button>
          {search && <button type="button" className="admin-clear" aria-label="清空搜索" onClick={() => { setQuery(""); setSearch(""); setPage(1); }}><Icon name="close" size={15} /></button>}
        </form>
      </div>
      <div className="admin-table-head" aria-hidden="true"><span>用户</span><span>记录 / 媒体</span><span>存储</span><span>活跃情况</span><span>操作</span></div>
      {!userPage ? <div className="admin-read-status" role="status">{userState?.error ? "用户数据暂不可用" : "正在读取用户…"}</div>
        : userPage.items.length === 0 ? <div className="admin-read-status">没有找到匹配的用户。</div>
          : <ul className="admin-user-list">{userPage.items.map(person => <UserRow key={person.id} person={person} onChanged={refresh} />)}</ul>}
      <footer className="admin-pagination">
        <span role="status">{userPage ? `共 ${count(userPage.total)} 位用户 · 第 ${userPage.page} / ${Math.max(1, userPage.totalPages)} 页` : "—"}</span>
        <div>
          <button type="button" className="admin-control" aria-label="上一页" disabled={!userPage || userPage.page <= 1} onClick={() => { if (userPage) setPage(userPage.page - 1); }}><Icon name="back" size={17} /></button>
          <button type="button" className="admin-control" aria-label="下一页" disabled={!userPage || userPage.page >= userPage.totalPages} onClick={() => { if (userPage) setPage(userPage.page + 1); }}><Icon name="arrow" size={17} /></button>
        </div>
      </footer>
    </section>
  </div>;
}

export default function AdminPage() {
  const { user, loading } = useApp();
  return <AppShell>
    {loading ? <div className="loading-panel">正在核验管理权限…</div>
      : !user ? <div className="empty-state"><Icon name="lock" size={28} /><h1>请以管理员身份登录</h1><Link className="button" href="/login">前往登录<Icon name="arrow" size={16} /></Link></div>
        : user.role !== "admin" ? <div className="empty-state"><Icon name="lock" size={28} /><h1>此处仅向管理员开放</h1><Link className="button secondary" href="/">返回主页</Link></div>
          : <AdminDashboard key={user.id} />}
  </AppShell>;
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { AdminParticleField } from "@/components/admin-particle-field";
import { AdminUserExplorer, type AdminUserTarget } from "@/components/admin-user-explorer";
import { ADMIN_POLL_SECONDS, useAdminLiveData } from "@/components/admin-live-data";
import { AdminActivity, type ActivityDay } from "@/components/admin-activity";
import { bytes } from "@/lib/client";

type Overview = {
  summary: {
    users: number;
    activeUsers7d: number;
    activeUsers15m: number;
    entries: number;
    publicEntries: number;
    privateEntries: number;
    trashedEntries: number;
    assets: number;
    storageBytes: number;
    photos: number;
    videos: number;
  };
  sampledAt: string;
  registration: { enabled: boolean };
  mail: { configured: boolean };
  daily: ActivityDay[];
};

const localTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const count = (value: number) => value.toLocaleString("zh-CN");

function jumpTo(id: string) {
  const heading = document.getElementById(id);
  if (!heading) return;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

function CurrentMetrics({ summary }: { summary: Overview["summary"] }) {
  const [active, setActive] = useState<string | null>(null);
  const metrics = [
    { id: "users", label: "注册用户", value: count(summary.users), note: `近 7 天活跃 ${count(summary.activeUsers7d)}`, name: "globe", breakdown: [["近 15 分钟活跃", count(summary.activeUsers15m)], ["近 7 天活跃", count(summary.activeUsers7d)]] },
    { id: "records", label: "日常记录", value: count(summary.entries), note: `公开 ${count(summary.publicEntries)} · 私密 ${count(summary.privateEntries)}`, name: "book", breakdown: [["公开", count(summary.publicEntries)], ["私密", count(summary.privateEntries)], ["回收站", count(summary.trashedEntries)]] },
    { id: "media", label: "媒体附件", value: count(summary.assets), note: `照片 ${count(summary.photos)} · 影像 ${count(summary.videos)}`, name: "image", breakdown: [["照片", count(summary.photos)], ["影像", count(summary.videos)], ["总占用", bytes(summary.storageBytes)]] },
    { id: "storage", label: "存储用量", value: bytes(summary.storageBytes), note: `${count(summary.assets)} 个媒体附件`, name: "grid", breakdown: [["媒体附件", count(summary.assets)], ["回收站记录", count(summary.trashedEntries)]] },
  ];
  const selected = metrics.find(item => item.id === active);
  const target = active === "records" ? "admin-trends-title" : "admin-users-title";
  return <section className="admin-metrics-section" aria-label="站点统计">
    <div className="admin-metrics">
      {metrics.map(item => <button
        type="button"
        key={item.id}
        className="admin-metric"
        aria-expanded={active === item.id}
        aria-controls="admin-metric-breakdown"
        onClick={() => setActive(current => current === item.id ? null : item.id)}
      >
        <span className="admin-metric-label"><Icon name={item.name} size={17} />{item.label}</span>
        <strong>{item.value}</strong>
        <small>{item.note}</small>
        <Icon name="plus" size={14} className="admin-metric-reveal" />
      </button>)}
    </div>
    <div id="admin-metric-breakdown" hidden={!selected}>
      {selected && <div key={selected.id} className="admin-metric-breakdown">
        <dl>{selected.breakdown.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <button className="admin-control" type="button" onClick={() => jumpTo(target)}>
          {active === "records" ? "查看新增趋势" : "查看用户明细"}<Icon name="arrow" size={15} />
        </button>
      </div>}
    </div>
  </section>;
}

function ServiceStatus({ overview }: { overview: Overview }) {
  const { summary } = overview;
  const publicShare = summary.entries ? summary.publicEntries / summary.entries * 100 : 0;
  return <section className="admin-service" aria-labelledby="admin-service-title">
    <h2 id="admin-service-title">站点状态</h2>
    <dl>
      <div><dt>新用户注册</dt><dd data-ok={overview.registration.enabled}>{overview.registration.enabled ? "开放" : "关闭"}</dd></div>
      <div><dt>验证码邮件</dt><dd data-ok={overview.mail.configured}>{overview.mail.configured ? "已配置" : "待配置"}</dd></div>
    </dl>
    <details className="admin-record-share">
      <summary>记录可见性<Icon name="plus" size={14} /></summary>
      <div className="admin-record-share-track" aria-hidden="true"><span style={{ width: `${publicShare}%` }} /></div>
      <div className="admin-record-share-numbers"><span>公开 {count(summary.publicEntries)}</span><span>私密 {count(summary.privateEntries)}</span></div>
    </details>
  </section>;
}

function AdminDashboard() {
  const [revision, setRevision] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sceneFocused, setSceneFocused] = useState(false);
  const [accessLost, setAccessLost] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserTarget | null>(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const onDenied = useCallback(() => setAccessLost(true), []);
  const overviewState = useAdminLiveData<Overview>(accessLost ? null : "/api/admin/overview", revision, autoRefresh);
  const overview = overviewState?.data;
  const error = overviewState?.error;
  const refreshStatus = error ? "同步中断" : !autoRefresh ? "自动更新已暂停" : overview ? "自动更新中" : "正在连接";
  const synced = overviewState?.updated ?? 0;
  const sampled = overview?.sampledAt && Number.isFinite(Date.parse(overview.sampledAt)) ? Date.parse(overview.sampledAt) : synced;

  if (accessLost || overviewState?.denied) return <div className="admin-page"><div className="empty-state"><Icon name="lock" size={28} /><h1>管理权限已失效</h1><Link className="button" href="/login">重新登录<Icon name="arrow" size={16} /></Link></div></div>;

  return <div className="admin-page admin-observatory">
    <header className="admin-monitor" data-focus={sceneFocused}>
      <div className="admin-monitor-stage">
        <AdminParticleField synced={synced} paused={!autoRefresh} focused={sceneFocused} />
        <div className="admin-monitor-title">
          <p className="admin-live-state" role="status" data-state={error ? "error" : autoRefresh && overview ? "live" : "idle"}><i aria-hidden="true" />{refreshStatus}</p>
          <h1>站点观测<span aria-hidden="true">.</span></h1>
          <div className="admin-monitor-count">
            <strong>{overview ? count(overview.summary.activeUsers15m) : "—"}</strong>
            <span>近 15 分钟活跃<small>按账号最近访问统计</small></span>
          </div>
        </div>
        <button type="button" className="admin-scene-focus admin-control" aria-pressed={sceneFocused} onClick={() => setSceneFocused(value => !value)}>
          <Icon name="expand" size={17} /><span>镜头聚焦</span>
        </button>
      </div>
      <div className="admin-monitor-footer">
        <div className="admin-monitor-sync">
          <Icon name="calendar" size={16} />
          <span>{sampled ? <>最后同步 <time dateTime={new Date(sampled).toISOString()} title="北京时间">{localTime.format(sampled)}</time></> : "等待首次同步"}</span>
          {autoRefresh && <small>每 {ADMIN_POLL_SECONDS} 秒更新</small>}
        </div>
        <div className="admin-monitor-actions">
          <button type="button" className="admin-control" aria-label={autoRefresh ? "暂停自动更新" : "开启自动更新"} onClick={() => setAutoRefresh(value => !value)}><Icon name={autoRefresh ? "pause" : "play"} size={16} /><span>{autoRefresh ? "暂停" : "继续"}</span></button>
          <button type="button" className="admin-control" disabled={overviewState?.refreshing} onClick={refresh}><Icon name="restore" size={16} /><span>刷新</span></button>
        </div>
      </div>
    </header>

    {error && <div className="admin-data-error" role="alert"><span>{error}{overview ? "。正在显示上次同步的数据。" : "。"}</span><button type="button" className="admin-control" onClick={refresh}>重试</button></div>}
    {overview ? <>
      <CurrentMetrics summary={overview.summary} />
      <AdminActivity
        daily={overview.daily}
        revision={revision}
        autoRefresh={autoRefresh}
        onDenied={onDenied}
        onSelectUser={person => setSelectedUser(previous => ({ id: person.id, username: person.username, request: (previous?.request ?? 0) + 1 }))}
      />
    </> : !error && <div className="admin-read-status" role="status">正在读取站点统计…</div>}

    <AdminUserExplorer revision={revision} autoRefresh={autoRefresh} onChanged={refresh} onDenied={onDenied} target={selectedUser} />
    {overview && <ServiceStatus overview={overview} />}
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

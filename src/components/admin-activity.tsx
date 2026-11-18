"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { useAdminLiveData } from "@/components/admin-live-data";

export type ActivityDay = { date: string; users: number; entries: number };
type Person = { id: string; username: string; displayName: string };
type Registration = Person & { createdAt: string };
type Contributor = Person & { entries: number };
type ActivityPage<T> = { items: T[]; page: number; totalPages: number; total: number };
type ActivityDetail = ActivityDay & {
  registrations: ActivityPage<Registration>;
  contributors: ActivityPage<Contributor>;
};
type PageSelection = { date: string; registrations: number; contributors: number };

const beijingTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function ActivityPeople<T extends Person>({
  title, tone, total, page, meta, select, changePage,
}: {
  title: string;
  tone: "signal" | "gold";
  total: number;
  page: ActivityPage<T> | undefined;
  meta: (person: T) => string;
  select: (person: Person) => void;
  changePage: (page: number) => void;
}) {
  return <section className="admin-activity-people" data-tone={tone}>
    <h3><i aria-hidden="true" />{title}<span>{total}</span></h3>
    {page?.items.length ? <ul>{page.items.map(person => <li key={person.id}>
      <button type="button" onClick={() => select(person)} aria-label={`查看 @${person.username} 的用户明细`}>
        <span className="admin-activity-person"><strong>{person.displayName || person.username}</strong><small>@{person.username}</small></span>
        <span className="admin-activity-person-meta">{meta(person)}</span><Icon name="arrow" size={14} />
      </button>
    </li>)}</ul> : <p className="admin-activity-empty">{page ? "当天暂无新增" : "—"}</p>}
    {page && page.totalPages > 1 && <div className="admin-activity-pages">
      <button type="button" className="admin-control" aria-label={`${title}上一页`} disabled={page.page <= 1} onClick={() => changePage(page.page - 1)}><Icon name="back" size={14} /></button>
      <span>{page.page} / {page.totalPages}</span>
      <button type="button" className="admin-control" aria-label={`${title}下一页`} disabled={page.page >= page.totalPages} onClick={() => changePage(page.page + 1)}><Icon name="arrow" size={14} /></button>
    </div>}
  </section>;
}

export function AdminActivity({ daily, period, selectedDate, revision, autoRefresh, onPeriodChange, onDateChange, onDenied, onSelectUser }: {
  daily: ActivityDay[];
  period: 7 | 30;
  selectedDate: string;
  revision: number;
  autoRefresh: boolean;
  onPeriodChange: (period: 7 | 30) => void;
  onDateChange: (date: string) => void;
  onDenied: () => void;
  onSelectUser: (person: Person) => void;
}) {
  const [pages, setPages] = useState<PageSelection | null>(null);
  const [retry, setRetry] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const days = daily.slice(-period);
  const recent = days.findLast(day => day.users || day.entries);
  const active = days.find(day => day.date === selectedDate) ?? recent ?? days.at(-1);
  const activeIndex = days.findIndex(day => day === active);
  const registrationPage = pages?.date === active?.date ? pages?.registrations ?? 1 : 1;
  const contributorPage = pages?.date === active?.date ? pages?.contributors ?? 1 : 1;
  const endpoint = active ? `/api/admin/activity?date=${active.date}&registrationPage=${registrationPage}&contributorPage=${contributorPage}` : null;
  const detail = useAdminLiveData<ActivityDetail>(endpoint, revision + retry, autoRefresh);
  const denied = detail?.denied;
  useEffect(() => { if (denied) onDenied(); }, [denied, onDenied]);

  const step = Math.max(1, Math.ceil(Math.max(0, ...days.flatMap(day => [day.users, day.entries])) / 4));
  const scale = step * 4;
  const labels = [0, Math.floor((days.length - 1) / 2), days.length - 1];

  function selectDay(index: number, focus = false) {
    const day = days[index];
    if (!day) return;
    onDateChange(day.date);
    setPages(null);
    if (focus) rail.current?.querySelector<HTMLButtonElement>(`[data-day-index="${index}"]`)?.focus();
  }

  function changePage(group: "registrations" | "contributors", next: number) {
    if (!active) return;
    setPages({ date: active.date, registrations: registrationPage, contributors: contributorPage, [group]: next });
  }

  return <section className="admin-panel admin-trend" aria-labelledby="admin-trends-title">
    <div className="admin-panel-heading">
      <div><h2 id="admin-trends-title" tabIndex={-1}>新增趋势</h2><p>选择日期，查看谁注册、谁写了日常</p></div>
      <div className="admin-segments" role="group" aria-label="趋势统计周期">
        {([7, 30] as const).map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => onPeriodChange(value)}>{value} 天</button>)}
      </div>
    </div>
    {active && <div className="admin-trend-body">
      <div className="admin-trend-main">
        <div className="admin-chart-legend"><span>新增用户</span><span>新增日常</span><small>北京时间</small></div>
        <div className="admin-activity-chart">
          <div className="admin-chart-axis" aria-hidden="true">{[4, 3, 2, 1, 0].map(mark => <span key={mark}>{mark * step}</span>)}</div>
          <div className="admin-chart-plot">
            <div className="admin-chart-grid" aria-hidden="true">{[4, 3, 2, 1, 0].map(mark => <span key={mark} />)}</div>
            <div className="admin-chart-bars" ref={rail} role="group" aria-label="按日期查看新增数据" style={{
              "--chart-cursor": `${(activeIndex + 0.5) / days.length * 100}%`,
              "--chart-day-width": `${100 / days.length}%`,
            } as CSSProperties} onKeyDown={event => {
              const destination = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: days.length - 1 }[event.key];
              if (destination === undefined) return;
              event.preventDefault();
              selectDay(Math.max(0, Math.min(days.length - 1, destination)), true);
            }}>
              {days.map((day, index) => <button
                type="button"
                className="admin-chart-day"
                key={day.date}
                data-day-index={index}
                data-tooltip-edge={index < days.length * 0.22 ? "start" : index >= days.length * 0.78 ? "end" : undefined}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-pressed={index === activeIndex}
                aria-label={`${day.date}，新增用户 ${day.users}，新增日常 ${day.entries}`}
                onClick={() => selectDay(index)}
              >
                <span className="admin-chart-bar" style={{ height: `${day.users / scale * 100}%` }} />
                <span className="admin-chart-bar" style={{ height: `${day.entries / scale * 100}%` }} />
                <span className="admin-day-tooltip" aria-hidden="true">{day.date.slice(5)} <b>{day.users} 人 · {day.entries} 篇</b></span>
              </button>)}
            </div>
            <div className="admin-chart-dates" aria-hidden="true">{labels.map((index, i) => <span key={i}>{days[index]?.date.slice(5)}</span>)}</div>
          </div>
        </div>
        <div className="admin-chart-readout">
          <div className="admin-chart-nav">
            <button type="button" className="admin-control" aria-label="查看前一天" disabled={activeIndex <= 0} onClick={() => selectDay(activeIndex - 1)}><Icon name="back" size={16} /></button>
            <label className="admin-chart-date-select">
              <Icon name="calendar" size={16} />
              <select aria-label="选择查看日期" value={active.date} onChange={event => selectDay(days.findIndex(day => day.date === event.target.value))}>
                {[...days].reverse().map(day => <option key={day.date} value={day.date}>{day.date} · {day.users} 人 / {day.entries} 篇</option>)}
              </select>
            </label>
            <button type="button" className="admin-control" aria-label="查看后一天" disabled={activeIndex >= days.length - 1} onClick={() => selectDay(activeIndex + 1)}><Icon name="arrow" size={16} /></button>
          </div>
          {recent && recent !== active && <button type="button" className="admin-control admin-chart-recent" onClick={() => selectDay(days.indexOf(recent))}>最近有新增<Icon name="spark" size={14} /></button>}
        </div>
      </div>
      <section className="admin-activity-detail" aria-label="当日新增明细" aria-busy={Boolean(!detail?.data && !detail?.error)}>
        <div className="admin-activity-detail-heading"><div><h3>当日明细</h3><time dateTime={active.date}>{active.date}</time></div><span aria-hidden="true"><Icon name="list" size={19} /></span></div>
        {detail?.error && <div className="admin-activity-error" role="status"><span>{detail.data ? "暂未同步，显示上次明细" : "暂时无法加载明细"}</span><button className="admin-control" type="button" onClick={() => setRetry(value => value + 1)}>重试</button></div>}
        {!detail?.data && !detail?.error && <p className="admin-activity-loading" role="status">读取当日明细…</p>}
        <div className="admin-activity-people-list" key={active.date}>
          <ActivityPeople title="新注册" tone="signal" total={detail?.data?.users ?? active.users} page={detail?.data?.registrations} meta={person => beijingTime.format(new Date(person.createdAt))} select={onSelectUser} changePage={next => changePage("registrations", next)} />
          <ActivityPeople title="日常贡献者" tone="gold" total={detail?.data?.contributors.total ?? 0} page={detail?.data?.contributors} meta={person => `${person.entries} 篇`} select={onSelectUser} changePage={next => changePage("contributors", next)} />
        </div>
        <p className="admin-activity-footnote"><Icon name="lock" size={13} />当天新增日常 {detail?.data?.entries ?? active.entries} 篇 · 仅显示账号和数量</p>
      </section>
    </div>}
    {!active && <p className="admin-read-status">暂无趋势数据</p>}
  </section>;
}

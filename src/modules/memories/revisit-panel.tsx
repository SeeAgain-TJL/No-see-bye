"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { api } from "@/lib/client";
import { journalDate } from "@/lib/calendar";
import { moods, moodLabel } from "./moods";
import type { JournalYear, Memory } from "./types";

type Anniversaries = { anniversaries: Memory[] };
export function RevisitPanel() {
  const router = useRouter();
  const thisYear = Number(journalDate().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<{ year: number; data?: JournalYear; anniversaries?: Memory[]; error?: string }>();
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api<JournalYear>("/api/memories/revisit?year=" + year, { signal: controller.signal }), api<Anniversaries>("/api/memories/revisit", { signal: controller.signal })]).then(([data, anniversary]) => setResult({ year, data, anniversaries: anniversary.anniversaries })).catch(error => { if (!controller.signal.aborted) setResult({ year, error: error.message }); });
    return () => controller.abort();
  }, [year, retry]);
  const current = result?.year === year ? result : undefined;
  const data = current?.data;
  const dates = useMemo(() => {
    const offset = (new Date(Date.UTC(year, 0, 1)).getUTCDay() + 6) % 7;
    const count = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
    return [...Array<string | null>(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(Date.UTC(year, 0, i + 1)).toISOString().slice(0, 10))];
  }, [year]);
  const day = selected.startsWith(year + "-") ? selected : data?.today.startsWith(year + "-") ? data.today : Object.keys(data?.days || {}).sort().at(-1) || `${year}-01-01`;
  const entry = data?.days[day];
  useEffect(() => {
    const container = scroll.current;
    const today = container?.querySelector<HTMLElement>('[aria-current="date"]');
    if (container && today) container.scrollLeft = Math.max(0, today.offsetLeft - container.offsetWidth / 2);
  }, [year, data]);
  async function random() {
    if (busy) return;
    setBusy(true); setMessage("");
    try { const { item } = await api<{ item: Memory | null }>("/api/memories/revisit?mode=random"); if (item) router.push("/memories/" + item.id); else setMessage("写下第一条记录后，就能在这里重温。"); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="journal-year" aria-labelledby="calendar-title">
    <div className="year-heading"><div><span className="section-eyebrow">A YEAR IN LITTLE MOMENTS</span><h2 id="calendar-title">把日子，染上心情。</h2><p>{data ? `${year} 年，留下了 ${data.total} 条日常，点亮了 ${data.recordedDays} 天。` : "每一个色块，都是某一天留下的心情。"}</p></div><div className="year-navigation"><button type="button" aria-label="上一年" disabled={year <= 1900 || !!data && year <= data.firstYear} onClick={() => setYear(v => v - 1)}><Icon name="back" size={17} /></button><strong aria-live="polite">{year}</strong><button type="button" aria-label="下一年" disabled={year >= Math.min(2100, thisYear)} onClick={() => setYear(v => v + 1)}><Icon name="arrow" size={17} /></button><button type="button" className="year-today" onClick={() => { setYear(thisYear); setSelected(journalDate()); }}>今年</button></div></div>
    {current?.error ? <div className="home-error" role="alert">{current.error}<button type="button" onClick={() => setRetry(v => v + 1)}>重新加载年历</button></div> : <>
      <div className="year-scroll" ref={scroll}><div className="year-chart" aria-busy={!data}>
        <div className="year-months" style={{ gridTemplateColumns: `repeat(${Math.ceil(dates.length / 7)}, minmax(0, 1fr))` }} aria-hidden="true">{Array.from({ length: 12 }, (_, month) => { const position = dates.indexOf(`${year}-${String(month + 1).padStart(2, "0")}-01`); return <span key={month} style={{ gridColumn: Math.floor(position / 7) + 1 }}>{month + 1}月</span>; })}</div>
        <div className="year-days" role="group" aria-label={`${year} 年心情年历，方向键选择日期，点击查看当天记录`} onKeyDown={event => {
          const target = event.target as HTMLButtonElement;
          const index = dates.indexOf(target.dataset.day || "");
          const delta = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 }[event.key];
          if (delta === undefined || index < 0) return;
          event.preventDefault(); const next = dates[index + delta];
          if (next) { setSelected(next); event.currentTarget.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus(); }
        }}>{dates.map((date, index) => { if (!date) return <span key={"empty-" + index} />; const info = data?.days[date]; const label = `${date}，${info ? info.count + " 条记录" + (info.mood ? "，" + moodLabel(info.mood) : "，未标记心情") : "暂无记录"}`; return <button key={date} type="button" data-day={date} data-mood={info?.mood || ""} data-recorded={!!info} aria-label={label} title={label} aria-current={date === data?.today ? "date" : undefined} aria-pressed={date === day} tabIndex={date === day ? 0 : -1} disabled={!data} onClick={() => setSelected(date)} onFocus={() => setSelected(date)} />; })}</div>
      </div></div>
      <div className="year-selection" aria-live="polite"><span><strong>{day.slice(5).replace("-", " 月 ")} 日</strong>{!data ? "正在加载心情年历…" : entry ? `${entry.count} 条记录${entry.mood ? " · " + moodLabel(entry.mood) : " · 未标记心情"}` : "这一天还没有留下记录"}</span>{entry && <Link href={"/memories?day=" + day}>查看这一天<Icon name="arrow" size={15} /></Link>}</div>
      <div className="year-legend" aria-label="心情颜色图例">{moods.map(mood => <span key={mood.value}><i data-mood={mood.value} />{mood.value}</span>)}<span><i data-recorded="true" />未标记</span></div>
      <div className="year-foot"><div className="year-insights"><span>{data?.monthMood ? `本月常见心情：${moodLabel(data.monthMood)}` : "心情，随时都可以记下来。"}</span><span title={data?.streakThrough ? "截至 " + data.streakThrough + "，按上海时区计算" : "从今天开始，慢慢记录"}>{data?.currentStreak ? `已连续记录 ${data.currentStreak} 天` : "不用赶进度，按自己的步调。"}</span></div><button type="button" className="year-random" disabled={busy || !data} onClick={random}><Icon name="spark" size={16} />{busy ? "正在翻找…" : "随机重温一刻"}<Icon name="arrow" size={15} /></button></div>
      {!!current?.anniversaries?.length && <div className="year-anniversaries"><span>往年今日</span>{current.anniversaries.map(item => <Link key={item.id} href={"/memories/" + item.id}><small>{journalDate(new Date(item.happenedAt)).slice(0, 4)}</small>{item.title || item.content?.slice(0, 24) || "那天的记录"}<Icon name="arrow" size={14} /></Link>)}</div>}
      {message && <p className="calendar-hint" role="status">{message}</p>}
    </>}
  </section>;
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { api } from "@/lib/client";
import { journalDate } from "@/lib/calendar";
import type { Memory } from "./types";

type Revisit = { today: string; month: string; days: Record<string, number>; anniversaries: Memory[]; firstDate: string | null };
export function RevisitPanel() {
  const router = useRouter();
  const [month, setMonth] = useState(() => journalDate().slice(0, 7));
  const [result, setResult] = useState<{ key: string; data?: Revisit; error?: string }>();
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    api<Revisit>("/api/memories/revisit?month=" + month, { signal: abort.signal })
      .then(data => setResult({ key: month, data }))
      .catch(error => { if (!abort.signal.aborted) setResult({ key: month, error: error.message }); });
    return () => abort.abort();
  }, [month, retry]);
  const current = result?.key === month ? result : undefined;
  const data = current?.data;
  const [year, m] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  function move(delta: number) { const next = new Date(Date.UTC(year, m - 1 + delta, 1)); setMonth(next.toISOString().slice(0, 7)); }
  async function random() {
    if (busy) return;
    setBusy(true); setMessage("");
    try { const { item } = await api<{ item: Memory | null }>("/api/memories/revisit?mode=random"); if (item) router.push("/memories/" + item.id); else setMessage("写下第一条记录后，就能在这里重温。"); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="revisit-panel" aria-labelledby="calendar-title">
    <div className="section-eyebrow"><Icon name="calendar" size={15} /> DAYS TO KEEP</div>
    <div className="calendar-heading"><h2 id="calendar-title">日子有迹可循</h2><button type="button" onClick={() => setMonth(journalDate().slice(0, 7))}>本月</button></div>
    <div className="calendar-month"><button aria-label="上个月" disabled={month <= "1900-01"} onClick={() => move(-1)}><Icon name="back" size={16} /></button><strong aria-live="polite">{year} 年 {m} 月</strong><button aria-label="下个月" disabled={month >= "2100-12"} onClick={() => move(1)}><Icon name="arrow" size={16} /></button></div>
    {current?.error ? <div className="home-error" role="alert">{current.error}<button onClick={() => setRetry(v => v + 1)}>重新加载</button></div> : <div className="calendar-grid" aria-label={year + "年" + m + "月记录日历"} aria-busy={!data}>
      {["一", "二", "三", "四", "五", "六", "日"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={"blank" + i} />)}
      {Array.from({ length: days }, (_, i) => { const day = month + "-" + String(i + 1).padStart(2, "0"); const count = data?.days[day] || 0; return <button key={day} disabled={!data || !count} aria-label={day + (count ? "，" + count + "条记录，查看" : "，暂无记录")} aria-current={day === data?.today ? "date" : undefined} className={count ? "has-memory" : ""} onClick={() => router.push("/memories?day=" + day)}>{i + 1}{count > 0 && <i />}</button>; })}
    </div>}
    <p className="calendar-hint">{data ? Object.keys(data.days).length ? "有圆点的日子，藏着你的故事。" : "这个月还是空白，随时开始就好。" : "正在翻开这一页…"}</p>
    <div className="anniversary"><span><Icon name="spark" size={16} />往年今日</span>{data?.anniversaries.length ? <div>{data.anniversaries.map(item => <Link key={item.id} href={"/memories/" + item.id}><small>{journalDate(new Date(item.happenedAt)).slice(0, 4)}</small><strong>{item.title || item.content?.slice(0, 30) || "那天的记录"}</strong><Icon name="arrow" size={14} /></Link>)}</div> : <p>{data ? "今天还没有往年的记录。慢慢来，未来会有。" : "正在寻找过去的今天…"}</p>}</div>
    <button className="revisit-random" disabled={busy || !data} onClick={random}><Icon name="spark" size={17} /><span>{busy ? "正在翻找回忆…" : "随机重温一刻"}</span><Icon name="arrow" size={16} /></button>
    {message && <p className="calendar-hint" role="status">{message}</p>}
  </section>;
}

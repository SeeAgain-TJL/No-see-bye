"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { DecodedImage } from "@/components/decoded-image";
import { api, dateText } from "@/lib/client";
import type { JournalIndex } from "@/lib/journal-index";
import type { JournalSelection } from "@/lib/journal-navigation";
import { previewUrl } from "./media";
import type { Memory } from "./types";

export function JournalNavigator({ id, expanded, onClose, publicScope, ownerId, revision, items, month, type, activeFilters, onBrowse }: {
  id: string; expanded: boolean; onClose: () => void; publicScope: boolean; ownerId?: string; revision: number;
  items: Memory[]; month: string; type: string; activeFilters: boolean; onBrowse: (selection: JournalSelection) => void;
}) {
  const [result, setResult] = useState<{ key: string; data?: JournalIndex; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [year, setYear] = useState<{ value: number; forMonth: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scope = publicScope ? "public" : "mine";
  const key = `${scope}:${publicScope ? "public" : ownerId}:${revision}:${retry}`;
  const current = result?.key === key ? result : null;
  const data = current?.data;
  useEffect(() => {
    if (!expanded) return;
    const abort = new AbortController();
    api<JournalIndex>(`/api/memories/index?scope=${scope}`, { signal: abort.signal })
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!abort.signal.aborted) setResult({ key, error: error.message }); });
    return () => abort.abort();
  }, [expanded, key, scope]);
  useEffect(() => { if (expanded) heading.current?.focus({ preventScroll: true }); }, [expanded]);
  const selectedMonthYear = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? Number(month.slice(0, 4)) : null;
  const shownYear = (year?.forMonth === month ? year.value : null) ?? selectedMonthYear ?? data?.availableYears[0];
  const years = [...new Set([...(data?.availableYears || []), ...(shownYear ? [shownYear] : [])])].sort((a, b) => b - a);
  const highest = Math.max(1, ...(data?.months.filter(bucket => bucket.month.startsWith(`${shownYear}-`)).map(bucket => bucket.count) || []));
  const mediaChoices = data ? [
    { key: "all", label: "全部", count: data.total, icon: "grid" },
    { key: "photo", label: "照片", count: data.photos, icon: "image" },
    { key: "video", label: "影像", count: data.videos, icon: "video" },
    { key: "text", label: "文字", count: data.texts, icon: "edit" },
  ] as const : [];
  return <section className="journal-navigator" id={id} hidden={!expanded} aria-labelledby={id + '-title'} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className="jn-heading"><div><h2 ref={heading} tabIndex={-1} id={id + '-title'}>按月寻迹</h2><span>{publicScope ? "公开的日常" : "我的全部日常"}{data ? ` · ${data.total} 条` : ""}</span></div><div className="jn-heading-actions">{activeFilters && <button type="button" className="jn-reset" onClick={() => onBrowse({})}>清除筛选<Icon name="restore" size={14} /></button>}<button type="button" className="icon-button" aria-label="收起月份导航" onClick={onClose}><Icon name="close" size={18} /></button></div></header>
    {current?.error ? <div className="jn-state" role="alert"><p>{current.error}</p><button type="button" className="button secondary" onClick={() => setRetry(value => value + 1)}>重新加载</button></div>
      : !data ? <div className="jn-state" role="status"><span className="loading-ring" />正在整理月份…</div>
      : data.total === 0 ? <div className="jn-state"><Icon name="book" size={25} /><p>{publicScope ? "此刻，尚无公开的日常。" : "第一段时光，待你留下。"}</p>{!publicScope && <Link className="button secondary" href="/memories/new">留一页<Icon name="plus" size={16} /></Link>}</div>
      : <>
        <div className="jn-content"><div className="jn-calendar">
          <div className="jn-year-row"><label htmlFor={id + '-year'}>年份</label><select id={id + '-year'} value={shownYear} onChange={event => setYear({ value: Number(event.target.value), forMonth: month })}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select><span>选择月份，查看完整记录</span></div>
          <div className="jn-months" role="group" aria-label={`${shownYear}年月份索引`}>{Array.from({ length: 12 }, (_, i) => {
            const value = `${shownYear}-${String(i + 1).padStart(2, '0')}`;
            const bucket = data.months.find(item => item.month === value);
            return <button key={value} type="button" disabled={!bucket?.count} aria-pressed={month === value} aria-label={`${shownYear}年${i + 1}月${bucket ? `，${bucket.count}条日常` : '，无日常'}`} onClick={() => onBrowse({ month: value, ...(!bucket?.photos && !bucket?.videos ? { view: 'grid' as const } : {}) })} style={{ '--month-fill': `${(bucket?.count || 0) / highest * 100}%` } as CSSProperties}><span>{String(i + 1).padStart(2, '0')}<small>月</small></span><strong>{bucket?.count || '—'}</strong><i aria-hidden="true" /></button>;
          })}</div>
        </div><div className="jn-shortcuts"><span className="jn-small-label">按内容浏览</span><div className="jn-media-shortcuts" role="group" aria-label="浏览全部内容分类">{mediaChoices.map(choice => <button key={choice.key} type="button" disabled={!choice.count} aria-pressed={choice.key === "all" ? !activeFilters : type === choice.key && !month} onClick={() => onBrowse(choice.key === "all" ? {} : { type: choice.key })}><Icon name={choice.icon} size={17} /><span>{choice.label}</span><strong>{choice.count}</strong><Icon name="arrow" size={14} /></button>)}</div><small className="jn-count-note">整册索引 · 北京时间</small></div></div>
        {items.length > 0 && <div className="jn-current-pages"><span className="jn-small-label">眼前几页</span><div>{items.slice(0, 4).map(memory => {
          const asset = memory.assets.find(item => item.mime.startsWith('image/') || item.thumbnailUrl);
          const excerpt = (memory.title || memory.content || '').trim().slice(0, 30);
          return <Link key={memory.id} href={'/memories/' + memory.id} aria-label={`查看${dateText(memory.happenedAt)}的日常${excerpt ? '：' + excerpt : ''}`}><span className="jn-page-thumb">{asset ? <DecodedImage src={previewUrl(asset)} alt="" loading="lazy" /> : <Icon name={memory.assets.some(asset => asset.mime.startsWith('video/')) ? 'video' : 'edit'} size={19} />}</span><span><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: 'short', day: 'numeric' })}</time>{excerpt && <small>{excerpt}</small>}</span><Icon name="arrow" size={14} /></Link>;
        })}</div></div>}
      </>}
  </section>;
}

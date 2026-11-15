"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { DecodedImage } from "@/components/decoded-image";
import { dateText } from "@/lib/client";
import { moodLabel } from "./moods";
import type { MemoryList } from "./types";

// Reuses the selection/preview interaction from 53d1d31. This is the latest page,
// not a full-history map; position follows chronological order within this set.
export function MemorySky({ data, error, onRetry }: { data?: MemoryList; error?: string; onRetry: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = [...(data?.items || [])].reverse();
  const selected = items.find(item => item.id === selectedId) || items.at(-1);
  const position = (index: number) => ({ x: items.length === 1 ? 50 : 6 + (items.length > 6 ? index % 6 : index) * 88 / (Math.min(items.length, 6) - 1), y: items.length > 6 ? (index < 6 ? 29 : 74) : [40, 60, 35, 55][index % 4] });
  const photo = selected?.assets.find(asset => asset.mime.startsWith("image/"));
  return <div className="hero-sky" aria-busy={!data && !error}>
    <div className="hero-sky-label"><span><Icon name="spark" size={14} />记忆星图</span><small>{data ? `最近 ${items.length} 条` : "连接日常的光"}</small></div>
    {error ? <div className="hero-sky-empty" role="alert"><p>{error}</p><button type="button" className="button secondary" onClick={onRetry}>重新加载</button></div>
      : !data ? <div className="hero-sky-empty" role="status">正在点亮你的星图…</div>
      : !selected ? <div className="hero-sky-empty"><span aria-hidden="true">✦</span><h3>第一颗星，留给今天。</h3><p>写下一句日常，星光就从这里开始。</p></div>
      : <>
        <div className="hero-constellation" data-rows={items.length > 6 ? 2 : 1} role="group" aria-label="选择一颗记忆星星">
          <svg viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polyline points={items.map((_, i) => `${position(i).x},${position(i).y * 24 / 100}`).join(" ")} /></svg>
          {items.map((memory, index) => <button key={memory.id} type="button" className="hero-memory-star" data-mood={memory.mood}
            style={{ "--star-x": `${position(index).x}%`, "--star-y": `${position(index).y}%`, "--star-size": `${20 + Math.min(memory.assets.length, 8)}px` } as CSSProperties}
            aria-label={`预览：${memory.title || dateText(memory.happenedAt, { month: "long", day: "numeric" })}`} aria-pressed={selected.id === memory.id} aria-controls="hero-sky-preview"
            onClick={() => setSelectedId(memory.id)} onPointerEnter={event => { if (event.pointerType === "mouse") setSelectedId(memory.id); }} onFocus={() => setSelectedId(memory.id)}>
            <span aria-hidden="true">✦</span><small aria-hidden="true">{dateText(memory.happenedAt, { month: "numeric", day: "numeric" })}</small>
          </button>)}
        </div>
        <Link id="hero-sky-preview" href={"/memories/" + selected.id} className={"hero-sky-preview" + (!photo ? " hero-sky-text" : "")} aria-label={`打开回忆：${selected.title || "这一天"}`}>
          {photo ? <DecodedImage key={photo.id} src={photo.thumbnailUrl || photo.url + "?variant=preview"} alt={selected.title || "这一天的照片"} className="hero-sky-photo" fetchPriority="high" /> : <div className="hero-sky-note"><span aria-hidden="true">“</span><p>{selected.content || selected.title || "一段值得再看一次的画面。"}</p></div>}
          <div className="hero-sky-caption"><div><time dateTime={selected.happenedAt}>{dateText(selected.happenedAt, { year: "numeric", month: "long", day: "numeric" })}</time><strong>{selected.title || "这一天，值得记住"}</strong><small>{selected.mood && moodLabel(selected.mood)}{selected.mood && selected.location ? " · " : ""}{selected.location}</small></div><span className="hero-sky-open">打开<Icon name="arrow" size={15} /></span></div>
        </Link>
        <p className="hero-sky-hint">点选星星，翻回那一天。<span aria-hidden="true">✧</span></p>
      </>}
  </div>;
}

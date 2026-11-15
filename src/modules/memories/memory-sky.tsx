"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { DecodedImage } from "@/components/decoded-image";
import { dateText } from "@/lib/client";
import { moodLabel } from "./moods";
import type { MemoryList } from "./types";

// A bounded view of the existing first page, never an invented full-history chart.
const positions = [[13, 24], [36, 18], [61, 30], [86, 19], [16, 53], [40, 47], [66, 59], [88, 47], [12, 80], [36, 76], [61, 84], [85, 78]];

export function MemorySky({ data, error, onRetry }: { data?: MemoryList; error?: string; onRetry: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = data?.items.slice(0, positions.length) || [];
  const selected = items.find(item => item.id === selectedId) || items[0];
  const photo = selected?.assets.find(asset => asset.mime.startsWith("image/"));

  return <section className="memory-sky-section" aria-labelledby="memory-sky-title" aria-busy={!data && !error}>
    <div className="memory-sky-heading">
      <div><span className="section-eyebrow">A SMALL CONSTELLATION</span><h2 id="memory-sky-title">日子，连成星光。</h2></div>
      <span className="sky-count">{data ? `最近 ${items.length} 条` : "记忆星图"}</span>
    </div>
    {error ? <div className="sky-message" role="alert"><p>星图暂时没能展开。{error}</p><button type="button" className="button secondary" onClick={onRetry}>重新加载星图</button></div>
      : !data ? <div className="sky-message" role="status">正在连接这些小小的瞬间…</div>
      : !selected ? <div className="sky-message sky-first-page"><Icon name="spark" size={30} /><div><h3>第一颗星，留给今天。</h3><p>在上方写下一句日常，它就会出现在这里。</p></div></div>
      : <><p className="sky-description">每颗星都是一条记录。点一点，看看那天的自己。</p><div className="memory-sky-body">
        <div className="memory-sky-map" role="group" aria-label="选择一颗记忆星星">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={items.map((_, i) => positions[i].join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth=".3" strokeDasharray="1 1.7" /></svg>
          {items.map((memory, index) => <button key={memory.id} type="button" className="memory-star"
            style={{ "--star-x": `${positions[index][0]}%`, "--star-y": `${positions[index][1]}%` } as CSSProperties}
            aria-label={`预览：${memory.title || memory.content?.slice(0, 28) || "日常随记"}，${dateText(memory.happenedAt, { month: "long", day: "numeric" })}`}
            aria-pressed={selected.id === memory.id} aria-controls="memory-sky-preview" onClick={() => setSelectedId(memory.id)}>
            <span aria-hidden="true">✦</span><small aria-hidden="true">{String(index + 1).padStart(2, "0")}</small>
          </button>)}
          <span className="sky-map-caption" aria-hidden="true">little days, little stars</span>
        </div>
        <div id="memory-sky-preview" className="memory-sky-preview" aria-live="polite" aria-atomic="true">
          {photo && <DecodedImage src={photo.thumbnailUrl || photo.url} alt={selected.title || "这一天的照片"} className="sky-photo" loading="lazy" />}
          <div className="sky-preview-copy"><time dateTime={selected.happenedAt}>{dateText(selected.happenedAt, { year: "numeric", month: "long", day: "numeric" })}</time>
            <h3>{selected.title || "日常随记"}</h3><p>{selected.content || (selected.assets.some(asset => asset.mime.startsWith("video/")) ? "一段值得再看一次的画面。" : "把这一刻，好好留住。")}</p>
            {selected.mood && <span className="sky-mood">{moodLabel(selected.mood)}</span>}
            <Link className="studio-text-link" href={"/memories/" + selected.id}>翻开这一天<Icon name="arrow" size={15} /></Link>
          </div>
        </div>
      </div><p className="sky-footnote">{data.nextCursor ? "这里点亮最近 12 条记录，更多故事在「我的日常」。" : "星光来自你留下的真实记录，仅自己可见。"}</p></>}
  </section>;
}

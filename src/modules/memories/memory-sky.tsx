"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { DecodedImage } from "@/components/decoded-image";
import { dateText } from "@/lib/client";
import { moodLabel } from "./moods";
import type { MemoryList } from "./types";

// A bounded view of the existing first page, never an invented full-history chart.
const positions = [[10, 19], [36, 17], [63, 24], [89, 18], [13, 50], [39, 47], [65, 55], [90, 49], [10, 81], [36, 78], [62, 83], [88, 80]];

export function MemorySky({ data, error, onRetry }: { data?: MemoryList; error?: string; onRetry: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = data?.items.slice(0, positions.length) || [];
  const selected = items.find(item => item.id === selectedId) || items[0];
  const selectedIndex = selected ? items.indexOf(selected) : 0;
  const photo = selected?.assets.find(asset => asset.mime.startsWith("image/"));
  const compact = items.length <= 4;

  return <section className="memory-sky-section" aria-labelledby="memory-sky-title" aria-busy={!data && !error}>
    <div className="memory-sky-heading">
      <div><span className="section-eyebrow">A SMALL CONSTELLATION</span><h2 id="memory-sky-title">日子，连成星光。</h2></div>
      <span className="sky-count">{data ? `最近 ${items.length} 条` : "记忆星图"}</span>
    </div>
    {error ? <div className="sky-message" role="alert"><p>星图暂时没能展开。{error}</p><button type="button" className="button secondary" onClick={onRetry}>重新加载星图</button></div>
      : !data ? <div className="sky-message" role="status">正在连接这些小小的瞬间…</div>
      : !selected ? <div className="sky-message sky-first-page"><Icon name="spark" size={30} /><div><h3>第一颗星，留给今天。</h3><p>在上方写下一句日常，它就会出现在这里。</p></div></div>
      : <><p className="sky-description">{items.length === 1 ? "第一颗星，已经点亮。一点一滴，都是值得留下的日常。" : "沿着星光，重温那些小小的瞬间。点选一颗星，翻回那一天。"}</p>
        <div className="memory-sky-body">
          <div className="memory-sky-map" data-layout={compact ? "ribbon" : "map"} role="group" aria-label="选择一颗记忆星星">
            {!compact && <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={items.map((_, i) => positions[i].join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth=".3" strokeDasharray="1 1.7" /></svg>}
            {items.map((memory, index) => <button key={memory.id} type="button" className="memory-star"
              style={compact ? undefined : { "--star-x": `${positions[index][0]}%`, "--star-y": `${positions[index][1]}%` } as CSSProperties}
              aria-label={`预览：${memory.title || memory.content?.slice(0, 28) || "日常随记"}，${dateText(memory.happenedAt, { month: "long", day: "numeric" })}`}
              aria-pressed={selected.id === memory.id} aria-controls="memory-sky-preview" onClick={() => setSelectedId(memory.id)}>
              <span aria-hidden="true">✦</span><small aria-hidden="true">{compact ? dateText(memory.happenedAt, { month: "numeric", day: "numeric" }) : String(index + 1).padStart(2, "0")}</small>
            </button>)}
            {items.length === 1 && <p className="sky-first-star-note">再留一个瞬间，<br />星光就会相连。</p>}
          </div>
          <div id="memory-sky-preview" className="memory-sky-preview" data-has-photo={Boolean(photo)} aria-live="polite" aria-atomic="true">
            {photo && <Link href={"/memories/" + selected.id} className="sky-photo-link" aria-label={`查看完整回忆：${selected.title || "日常随记"}`}>
              <DecodedImage src={photo.thumbnailUrl || photo.url + "?variant=preview"} alt={selected.title || "这一天的照片"} className="sky-photo" loading="lazy" />
              <span className="sky-photo-caption"><Icon name="image" size={13} />{selected.assets.filter(asset => asset.mime.startsWith("image/")).length} 张照片<Icon name="arrow" size={13} /></span>
            </Link>}
            <div className="sky-preview-copy">
              <span className="sky-preview-number" aria-hidden="true">MOMENT {String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
              <time dateTime={selected.happenedAt}>{dateText(selected.happenedAt, { year: "numeric", month: "long", day: "numeric" })}</time>
              <h3>{selected.title || "日常随记"}</h3>
              <p>{selected.content || (selected.assets.some(asset => asset.mime.startsWith("video/")) ? "一段值得再看一次的画面。" : "把这一刻，好好留住。")}</p>
              {selected.mood && <span className="sky-mood">{moodLabel(selected.mood)}</span>}
              <Link className="studio-text-link" href={"/memories/" + selected.id}>翻开这一天<Icon name="arrow" size={15} /></Link>
            </div>
          </div>
        </div><p className="sky-footnote"><Icon name="lock" size={12} />{data.nextCursor ? "这里点亮最近 12 条记录，更多故事在「我的日常」。" : "你的星光，仅自己可见。每一个平凡日子，都值得被记住。"}</p></>}
  </section>;
}

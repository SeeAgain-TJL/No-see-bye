"use client";
import Link from "next/link";
import { useState } from "react";
import { DecodedImage } from "@/components/decoded-image";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import { MediaViewer, previewUrl } from "./media";
import type { Memory } from "./types";

export function PhotoWall({ memories }: { memories: Memory[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const items = memories.flatMap(memory => memory.assets.map(asset => ({ memory, asset })));
  if (!items.length) return <div className="empty-state"><Icon name="image" size={30} /><h2>这些记录还没有影像</h2><p>换个筛选看看，或切回卡片阅读文字。</p></div>;
  return <section className="photo-wall" aria-label="照片墙">
    <div className="photo-wall-heading"><span>THE VISUAL DIARY</span><span>{items.length} 个已加载片段</span></div>
    <div className="photo-wall-grid">{items.map(({ memory, asset }, index) => <article className="wall-item" key={asset.id}>
      <button type="button" className="wall-image" onClick={() => setSelected(index)} aria-label={'查看' + (asset.mime.startsWith("video/") ? "视频" : "图片") + '：' + asset.filename}>
        {asset.mime.startsWith("image/") || asset.thumbnailUrl ? <DecodedImage src={previewUrl(asset)} alt={memory.title || asset.filename} loading="lazy" /> : <span className="wall-video"><Icon name="video" size={34} />视频</span>}
        {asset.mime.startsWith("video/") && <span className="wall-video-badge"><Icon name="video" size={17} /></span>}
      </button>
      <Link href={'/memories/' + memory.id} className="wall-caption"><span><strong>{memory.title || "日常随记"}</strong><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: "long", day: "numeric" })}</time></span><Icon name="arrow" size={17} /></Link>
    </article>)}</div>
    {selected !== null && <MediaViewer assets={items.map(item => item.asset)} initial={selected} close={() => setSelected(null)} />}
  </section>;
}

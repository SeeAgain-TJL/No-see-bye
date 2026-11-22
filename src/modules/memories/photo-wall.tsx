"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import { MediaViewer, MediaThumbnail } from "./media";
import type { Memory } from "./types";

export function PhotoWall({ memories }: { memories: Memory[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const items = memories.flatMap(memory => memory.assets.map(asset => ({ memory, asset })));
  if (!items.length) return <div className="empty-state"><Icon name="image" size={30} /><h2>此页无影，字里有光。</h2><p>可换个筛选，或切回卡片，读一段往日。</p></div>;
  return <section className="photo-wall" aria-label="照片墙">
    <div className="photo-wall-heading"><span>光阴接触印相 · CONTACT SHEET</span><span>{items.length} 帧已显影</span></div>
    <div className="journal-wall-grid">{items.map(({ memory, asset }, index) => <article className="wall-item" key={asset.id}>
      <div className="wall-preview-well"><MediaThumbnail asset={asset} mat className="wall-image" onOpen={() => setSelected(index)} label={'查看' + (asset.mime.startsWith("video/") ? "视频" : "图片") + '：' + asset.filename} /></div>
      <Link href={'/memories/' + memory.id} className="wall-caption"><span>{memory.title && <strong>{memory.title}</strong>}<time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: "long", day: "numeric" })}</time></span></Link>
    </article>)}</div>
    {selected !== null && <MediaViewer assets={items.map(item => item.asset)} initial={selected} close={() => setSelected(null)} />}
  </section>;
}

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
    <div className="photo-wall-heading"><span>照片墙</span><span>{items.length} 个已加载片段</span></div>
    <div className="photo-wall-grid">{items.map(({ memory, asset }, index) => <article className="wall-item" key={asset.id}>
      <span className="motion-spotlight" aria-hidden="true" />
      <div className="wall-preview-well"><MediaThumbnail asset={asset} className="wall-image" onOpen={() => setSelected(index)} label={'查看' + (asset.mime.startsWith("video/") ? "视频" : "图片") + '：' + asset.filename} /></div>
      <Link href={'/memories/' + memory.id} className="wall-caption"><span>{memory.title && <strong>{memory.title}</strong>}<time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: "long", day: "numeric" })}</time></span><Icon name="arrow" size={17} /></Link>
    </article>)}</div>
    {selected !== null && <MediaViewer assets={items.map(item => item.asset)} initial={selected} close={() => setSelected(null)} />}
  </section>;
}

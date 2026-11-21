"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import { MediaViewer, MediaThumbnail } from "./media";
import type { Memory } from "./types";
import { photoRows } from '@/lib/photo-rows';

export function PhotoWall({ memories }: { memories: Memory[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(320);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const grid = useRef<HTMLDivElement>(null);
  const items = memories.flatMap(memory => memory.assets.map(asset => ({ memory, asset })));
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const resize = new ResizeObserver(entries => { const next = entries[0]?.contentRect.width; if (next > 0) setWidth(next); });
    resize.observe(element);
    return () => resize.disconnect();
  }, [items.length]);
  const gap = width < 600 ? 10 : 18;
  const rows = photoRows(items.map(({ asset }) => ratios[asset.id] || (asset.width && asset.height ? asset.width / asset.height : 1.5)), width, width < 600 ? 160 : 230, gap);
  if (!items.length) return <div className="empty-state"><Icon name="image" size={30} /><h2>此页无影，字里有光。</h2><p>可换个筛选，或切回卡片，读一段往日。</p></div>;
  return <section className="photo-wall" aria-label="照片墙">
    <div className="photo-wall-heading"><span>光阴接触印相 · CONTACT SHEET</span><span>{items.length} 帧已显影</span></div>
    <div ref={grid} className="justified-wall">{rows.map(row => <div className='justified-row' key={row.start} style={{ '--row-height': row.height + 'px', gridTemplateColumns: row.widths.map(value => value + 'px').join(' '), gap: gap + 'px' } as CSSProperties}>{items.slice(row.start, row.start + row.count).map(({ memory, asset }, localIndex) => <article className="wall-item" key={asset.id}>
      <span className="motion-spotlight" aria-hidden="true" />
      <div className="wall-preview-well"><MediaThumbnail asset={asset} className="wall-image" onRatio={value => setRatios(previous => previous[asset.id] === value ? previous : { ...previous, [asset.id]: value })} onOpen={() => setSelected(row.start + localIndex)} label={'查看' + (asset.mime.startsWith("video/") ? "视频" : "图片") + '：' + asset.filename} /></div>
      <Link href={'/memories/' + memory.id} className="wall-caption"><span>{memory.title && <strong>{memory.title}</strong>}<time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: "long", day: "numeric" })}</time></span></Link>
    </article>)}</div>)}</div>
    {selected !== null && <MediaViewer assets={items.map(item => item.asset)} initial={selected} close={() => setSelected(null)} />}
  </section>;
}

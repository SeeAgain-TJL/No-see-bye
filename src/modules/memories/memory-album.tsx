'use client';
import { useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { ThemeMotif } from '@/components/theme-motif';
import { DecodedImage } from '@/components/decoded-image';
import { dateText } from '@/lib/client';
import { MediaViewer, previewUrl } from './media';
import type { Memory, MemoryList } from './types';

function Album({ items }: { items: Memory[] }) {
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<Memory | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const titleId = useId();
  const selected = items[index];
  const asset = selected.assets.find(a => a.mime.startsWith('image/') || a.thumbnailUrl);
  const ratio = asset ? ratios[asset.id] || (asset.width && asset.height ? asset.width / asset.height : 1.5) : 1.5;
  const isVideo = asset?.mime.startsWith('video/') || (!asset && selected.assets.some(a => a.mime.startsWith('video/')));
  function choose(next: number) {
    const value = (next + items.length) % items.length;
    setIndex(value);
    requestAnimationFrame(() => thumbs.current?.children[value]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  }
  return <>
    <section className='memory-album editorial-album' aria-labelledby={titleId} aria-roledescription='轮播相册' onKeyDown={e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); choose(e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : index + (e.key === 'ArrowLeft' ? -1 : 1)); }
    }}>
      <header className='editorial-album-heading'><span>THE ART OF REMEMBERING</span><span><ThemeMotif />私人放映室</span></header>
      <div className='album-spread' data-orientation={ratio < .9 ? 'portrait' : 'landscape'}>
        <div className='album-exhibit' style={{ '--exhibit-ratio': ratio } as CSSProperties}>
          <span className='exhibit-corner exhibit-corner-one' aria-hidden='true' /><span className='exhibit-corner exhibit-corner-two' aria-hidden='true' />
          {selected.assets.length ? <button type='button' className='album-exhibit-image' aria-label={'放大' + dateText(selected.happenedAt) + '的影像'} onClick={() => { if (!dragged.current) setViewing(selected); }}
            onPointerDown={e => { if (e.button !== 0 || !e.isPrimary) return; dragged.current = false; gesture.current = { x: e.clientX, y: e.clientY, moved: false }; }}
            onPointerMove={e => { const g = gesture.current; if (g && Math.abs(e.clientX - g.x) > 8) g.moved = true; }}
            onPointerUp={e => { const g = gesture.current; gesture.current = null; if (!g) return; const dx = e.clientX - g.x, dy = e.clientY - g.y; dragged.current = g.moved; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) choose(index + (dx < 0 ? 1 : -1)); }}
            onPointerCancel={() => { gesture.current = null; dragged.current = false; }} onDragStart={e => e.preventDefault()}>
            {asset ? <DecodedImage key={asset.id} src={previewUrl(asset)} alt={selected.title || '珍藏的影像'} fetchPriority='high' draggable={false} width={asset.width || undefined} height={asset.height || undefined} onDimensions={({ width, height }) => { if (width > 0 && height > 0) setRatios(previous => previous[asset.id] === width / height ? previous : { ...previous, [asset.id]: width / height }); }} /> : <span className='exhibit-video-placeholder'><Icon name='video' size={36} /></span>}
            {isVideo && <span className='album-video'><Icon name='play' size={25} /></span>}
            <span className='exhibit-zoom'><Icon name='image' size={14} />轻触放大</span>
          </button> : <Link href={'/memories/' + selected.id} className='album-letter-preview'><Icon name='edit' size={26} /><p>{selected.content || selected.title || '留一页，给往后的自己。'}</p><span>READ THE LETTER <Icon name='arrow' size={16} /></span></Link>}
        </div>
        <div className='album-exhibit-copy' key={selected.id}>
          <span className='exhibit-edition'>CHAPTER {String(index + 1).padStart(2, '0')} <span>/ {String(items.length).padStart(2, '0')}</span></span>
          <h2 id={titleId}>{selected.title || (isVideo ? '流动的旧时光' : asset ? '那一日，光曾来过。' : '纸上有余温。')}</h2>
          <time dateTime={selected.happenedAt}>{dateText(selected.happenedAt, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <p className='exhibit-excerpt'>{selected.assets.length ? selected.content || '我们终将成为故事，而这一刻，有了形状。' : '言语留在纸上，时间便有了回声。'}</p>
          <div className='exhibit-context'>{selected.location && <span>{selected.location}</span>}<span>{selected.assets.length ? selected.assets.length + ' 帧影像' : '一纸心事'}</span><span>{selected.visibility === 'public' ? '与人间共读' : '留给自己'}</span></div>
          <Link className='exhibit-read' href={'/memories/' + selected.id}>重读此刻<Icon name='arrow' size={18} /></Link>
          <div className='exhibit-navigation'><button type='button' aria-label='上一段日常' disabled={items.length < 2} onClick={() => choose(index - 1)}><Icon name='back' size={19} /></button><span>向旧日，借一束光。</span><button type='button' aria-label='下一段日常' disabled={items.length < 2} onClick={() => choose(index + 1)}><Icon name='arrow' size={19} /></button></div>
        </div>
      </div>
      <div ref={thumbs} className='album-contact-strip' role='group' aria-label='选择珍藏篇章'>{items.map((memory, i) => {
        const image = memory.assets.find(a => a.mime.startsWith('image/') || a.thumbnailUrl);
        return <button key={memory.id} type='button' aria-label={'翻到' + dateText(memory.happenedAt) + '的日常'} aria-pressed={i === index} onClick={() => choose(i)}><span className='contact-number'>{String(i + 1).padStart(2, '0')}</span>{image ? <DecodedImage src={previewUrl(image)} alt='' loading='lazy' /> : <Icon name={memory.assets.length ? 'video' : 'edit'} size={18} />}<span className='contact-date'>{dateText(memory.happenedAt, { month: '2-digit', day: '2-digit' })}</span></button>;
      })}</div>
      <span className='sr-only' aria-live='polite' aria-atomic='true'>{dateText(selected.happenedAt)}，第 {index + 1} 段，共 {items.length} 段日常</span>
    </section>
    {viewing && <MediaViewer assets={viewing.assets} initial={Math.max(0, viewing.assets.findIndex(a => a.mime.startsWith('image/') || a.thumbnailUrl))} close={() => setViewing(null)} />}
  </>;
}
export function MemoryAlbum({ data, error, onRetry }: { data?: MemoryList; error?: string; onRetry: () => void }) {
  const items = useMemo(() => (data?.items || []).slice(0, 12), [data]);
  if (data && !error && items.length) return <Album key={items.map(item => item.id).join(':')} items={items} />;
  return <section className='memory-album editorial-album editorial-album-empty' aria-label='私人放映室' aria-busy={!data && !error}>
    <ThemeMotif /><h2>万物有时，记忆有归处。</h2>
    {error ? <><p role='alert'>{error}</p><button type='button' className='studio-button' onClick={onRetry}>重新加载<Icon name='restore' size={15} /></button></> : !data ? <p role='status'>旧光正缓缓显影…</p> : <Link href='/memories/new' className='studio-button'>写下第一段日常<Icon name='plus' size={16} /></Link>}
  </section>;
}

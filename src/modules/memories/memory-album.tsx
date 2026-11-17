'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { ThemeMotif } from '@/components/theme-motif';
import { DecodedImage } from '@/components/decoded-image';
import { dateText } from '@/lib/client';
import { galleryPhotos, type GalleryPhoto } from '@/lib/photo-gallery';
import { MediaViewer, previewUrl } from './media';
import type { MemoryList } from './types';

function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const reel = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const active = useRef(0);
  const physical = useRef(photos.length > 1 ? photos.length : 0);
  const destination = useRef<number | null>(null);
  const dragging = useRef<{ x: number; scroll: number } | null>(null);
  const dragged = useRef(false);
  const scrollFrame = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const selected = photos[index];
  const reelPhotos = photos.length > 1 ? [...photos, ...photos, ...photos] : photos;
  const ratio = (photo: GalleryPhoto) => {
    const value = ratios[photo.asset.id] || (photo.asset.width && photo.asset.height ? photo.asset.width / photo.asset.height : 1.5);
    return Number.isFinite(value) && value > 0 ? value : 1.5;
  };

  const choose = useCallback((next: number, smooth = true) => {
    const value = (next + photos.length) % photos.length;
    const candidates = photos.length > 1 ? [value, value + photos.length, value + photos.length * 2] : [value];
    const position = candidates.reduce((best, candidate) => Math.abs(candidate - physical.current) < Math.abs(best - physical.current) ? candidate : best);
    physical.current = position;
    destination.current = position;
    const strip = reel.current, frame = strip?.querySelectorAll<HTMLElement>('.gallery-photo')[position];
    if (!strip || !frame) return;
    strip.scrollTo({ left: frame.offsetLeft - (strip.clientWidth - frame.offsetWidth) / 2, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    active.current = value; setIndex(value);
    const contacts = thumbs.current, contact = contacts?.children[value] as HTMLElement | undefined;
    if (contacts && contact) {
      const left = contact.offsetLeft - contacts.offsetLeft;
      if (left < contacts.scrollLeft || left + contact.offsetWidth > contacts.scrollLeft + contacts.clientWidth)
        contacts.scrollTo({ left: left - (contacts.clientWidth - contact.offsetWidth) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }, [photos.length]);
  useLayoutEffect(() => {
    const strip = reel.current;
    if (!strip) return;
    const observer = new ResizeObserver(() => { if (!dragging.current) choose(active.current, false); });
    observer.observe(strip);
    strip.querySelectorAll('.gallery-photo').forEach(frame => observer.observe(frame));
    return () => { observer.disconnect(); cancelAnimationFrame(scrollFrame.current); if (settleTimer.current) clearTimeout(settleTimer.current); };
  }, [choose]);
  useEffect(() => {
    const changed = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  useEffect(() => {
    if (!playing || hidden || hovered || viewing !== null || !loaded[selected.asset.id] || photos.length < 2) return;
    const timer = window.setTimeout(() => choose(index + 1, index < photos.length - 1), 2500);
    return () => clearTimeout(timer);
  }, [playing, hidden, hovered, viewing, loaded, selected.asset.id, photos.length, index, choose]);
  function observeScroll() {
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const strip = reel.current;
      if (!strip) return;
      const center = strip.scrollLeft + strip.clientWidth / 2;
      const frames = Array.from(strip.querySelectorAll<HTMLElement>('.gallery-photo'));
      if (destination.current !== null) {
        const target = frames[destination.current];
        if (Math.abs(target.offsetLeft + target.offsetWidth / 2 - center) > 2) return;
        destination.current = null;
      }
      const closest = frames.reduce((best, frame, i) => Math.abs(frame.offsetLeft + frame.offsetWidth / 2 - center) < Math.abs(frames[best].offsetLeft + frames[best].offsetWidth / 2 - center) ? i : best, 0);
      physical.current = closest;
      active.current = closest % photos.length; setIndex(active.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        if (dragging.current || photos.length < 2 || (physical.current >= photos.length && physical.current < photos.length * 2)) return;
        const position = active.current + photos.length;
        const frame = frames[position];
        physical.current = position;
        strip.scrollTo({ left: frame.offsetLeft - (strip.clientWidth - frame.offsetWidth) / 2, behavior: 'instant' });
      }, 160);
    });
  }
  function finishDrag() {
    if (!dragging.current) return;
    dragging.current = null;
    if (reel.current) delete reel.current.dataset.dragging;
    if (dragged.current) choose(active.current);
  }
  return <>
    <section className='memory-album living-gallery' aria-labelledby={titleId} aria-roledescription='照片轮播' onKeyDown={e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault(); setPlaying(false);
        choose(e.key === 'Home' ? 0 : e.key === 'End' ? photos.length - 1 : index + (e.key === 'ArrowLeft' ? -1 : 1));
      }
    }}>
      <header className='gallery-heading'><div><span className='gallery-eyebrow'>THE STILL, ALIVE</span><h2 id={titleId}>时光相册<ThemeMotif /></h2></div><span className='gallery-page'><strong>{String(index + 1).padStart(2, '0')}</strong><span>/ {String(photos.length).padStart(2, '0')}</span></span></header>
      <div className='photo-gallery-viewport' style={{ '--first-ratio': ratio(photos[0]), '--last-ratio': ratio(photos[photos.length - 1]) } as CSSProperties}>
        <span className='gallery-orbit' aria-hidden='true' />
        <div ref={reel} className='photo-reel' onScroll={observeScroll} onWheel={() => { destination.current = null; setPlaying(false); }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPlaying(false)}
          onPointerDown={e => {
            setPlaying(false); dragged.current = false; destination.current = null;
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            dragging.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft };
            (e.target as Element).closest('button')?.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            const start = dragging.current; if (!start) return;
            const distance = e.clientX - start.x;
            if (Math.abs(distance) > 5) { dragged.current = true; e.currentTarget.dataset.dragging = 'true'; }
            if (dragged.current) e.currentTarget.scrollLeft = start.scroll - distance;
          }} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
          {reelPhotos.map((photo, position) => { const i = position % photos.length; const mirror = photos.length > 1 && (position < photos.length || position >= photos.length * 2); return <button key={photo.asset.id + ':' + position} type='button' className='gallery-photo' data-current={i === index} aria-hidden={mirror || undefined} tabIndex={mirror ? -1 : 0} style={{ '--photo-ratio': ratio(photo), '--photo-lean': (i % 2 ? 2.5 : -2.5) + 'deg' } as CSSProperties}
            aria-label={(i === index ? '放大' : '翻到') + dateText(photo.memory.happenedAt) + '的照片，第' + (i + 1) + '张'} aria-pressed={i === index}
            onDragStart={e => e.preventDefault()} onClick={e => { if (e.detail !== 0 && dragged.current) return; if (i === index) { setPlaying(false); setViewing(i); } else choose(i); }}>
            <DecodedImage src={previewUrl(photo.asset)} alt={photo.memory.title || '日常照片'} loading={(!mirror && i < 3) || position === photos.length - 1 ? 'eager' : 'lazy'} fetchPriority={!mirror && i === 0 ? 'high' : 'auto'} draggable={false} width={photo.asset.width || undefined} height={photo.asset.height || undefined}
              onReady={() => setLoaded(previous => previous[photo.asset.id] ? previous : { ...previous, [photo.asset.id]: true })}
              onDimensions={({ width, height }) => { if (width > 0 && height > 0) setRatios(previous => previous[photo.asset.id] === width / height ? previous : { ...previous, [photo.asset.id]: width / height }); }} />
            <span className='gallery-zoom'><Icon name='expand' size={19} /><span>展开</span></span>
          </button>; })}
        </div>
      </div>
      <div className='gallery-caption'>
        <div className='gallery-authored' key={selected.asset.id}><time dateTime={selected.memory.happenedAt}>{dateText(selected.memory.happenedAt, { year: 'numeric', month: 'long', day: 'numeric' })}</time>{selected.memory.title && <h3>{selected.memory.title}</h3>}{selected.memory.content && <p>{selected.memory.content}</p>}</div>
        <div className='gallery-controls'><button className='gallery-control' type='button' aria-label='上一张照片' disabled={photos.length < 2} onClick={() => { setPlaying(false); choose(index - 1); }}><Icon name='back' size={21} /></button><button className='gallery-control gallery-play' type='button' aria-label={playing ? '暂停照片轮播' : '自动播放照片，每张2.5秒'} aria-pressed={playing} disabled={photos.length < 2} onClick={() => setPlaying(value => !value)}><Icon name={playing ? 'pause' : 'play'} size={18} /></button><button className='gallery-control' type='button' aria-label='下一张照片' disabled={photos.length < 2} onClick={() => { setPlaying(false); choose(index + 1); }}><Icon name='arrow' size={21} /></button></div>
      </div>
      <div className='gallery-bottom'><div ref={thumbs} className='gallery-contacts' role='group' aria-label='选择照片'>{photos.map((photo, i) => <button key={photo.asset.id} type='button' aria-label={'第' + (i + 1) + '张照片'} aria-pressed={i === index} onClick={() => { setPlaying(false); choose(i); }}><DecodedImage src={previewUrl(photo.asset)} alt='' loading='lazy' /><span>{String(i + 1).padStart(2, '0')}</span></button>)}</div><Link href={'/memories/' + selected.memory.id} className='gallery-detail' aria-label='打开这张照片的日常详情'><Icon name='arrow' size={21} /></Link></div>
      <span className='sr-only' aria-live='polite' aria-atomic='true'>第 {index + 1} 张，共 {photos.length} 张照片</span>
    </section>
    {viewing !== null && <MediaViewer assets={photos.map(photo => photo.asset)} initial={viewing} close={() => setViewing(null)} />}
  </>;
}
export function MemoryAlbum({ data, error, onRetry }: { data?: MemoryList; error?: string; onRetry: () => void }) {
  const photos = useMemo(() => galleryPhotos(data?.items || []), [data]);
  if (data && !error && photos.length) return <PhotoGallery key={photos.map(photo => photo.asset.id).join(':')} photos={photos} />;
  return <section className='memory-album living-gallery gallery-empty' aria-label='时光相册' aria-busy={!data && !error}>
    <ThemeMotif /><h2>时光相册</h2>
    {error ? <><p role='alert'>{error}</p><button type='button' className='studio-button' onClick={onRetry}>重新加载<Icon name='restore' size={15} /></button></> : !data ? <p role='status'>正在加载照片…</p> : <Link href='/memories/new' className='studio-button'>添加照片<Icon name='plus' size={16} /></Link>}
  </section>;
}

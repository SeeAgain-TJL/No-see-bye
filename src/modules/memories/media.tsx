'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MediaAsset } from './types';
import { Icon } from '@/components/icons';
import { DecodedImage } from '@/components/decoded-image';

export const previewUrl = (asset: MediaAsset) => asset.thumbnailUrl || asset.url + (asset.url.includes('?') ? '&' : '?') + 'variant=preview';
const displayUrl = (asset: MediaAsset) => asset.url + (asset.url.includes('?') ? '&' : '?') + 'variant=display';

export function MediaThumbnail({ asset, onOpen, className = 'media-tile', label, count = 1 }: { asset: MediaAsset; onOpen: () => void; className?: string; label: string; count?: number }) {
  const [ratio, setRatio] = useState(asset.width && asset.height ? asset.width / asset.height : 1.5);
  const isVideo = asset.mime.startsWith('video/');
  return <button type='button' className={className + ' framed-preview'} style={{ '--media-ratio': ratio } as CSSProperties} data-orientation={ratio < .9 ? 'portrait' : 'landscape'} onClick={onOpen} aria-label={label}>
    {!isVideo || asset.thumbnailUrl ? <DecodedImage src={isVideo ? asset.thumbnailUrl! : previewUrl(asset)} alt={isVideo ? '视频封面' : '日常照片'} loading='lazy' width={asset.width || undefined} height={asset.height || undefined} onDimensions={({ width, height }) => { if (width > 0 && height > 0) setRatio(width / height); }} /> : <div className='video-placeholder'><Icon name='video' size={32} /></div>}
    {isVideo && <span className='play-icon'><Icon name='play' size={23} /></span>}
    {count > 1 && <span className='cover-count'><Icon name='image' size={13} />{count}</span>}
  </button>;
}

export function MediaGrid({ assets, compact = false }: { assets: MediaAsset[]; compact?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!assets.length) return null;
  const shown = compact ? assets.slice(0, 1) : assets;
  return <>
    <div className={'media-grid ' + (shown.length === 1 ? 'single ' : '') + (compact ? 'compact archive-cover' : '')}>
      {shown.map((asset, index) => <div className='media-print' key={asset.id}><MediaThumbnail asset={asset} onOpen={() => setSelected(index)} count={compact ? assets.length : 1} label={'查看第 ' + (index + 1) + ' 个' + (asset.mime.startsWith('video/') ? '视频' : '照片') + (compact && assets.length > 1 ? '，共 ' + assets.length + ' 项影像' : '')} /></div>)}
    </div>
    {selected !== null && <MediaViewer assets={assets} initial={selected} close={() => setSelected(null)} />}
  </>;
}

type Transform = { scale: number; x: number; y: number };
type Point = { x: number; y: number };
const resting = { scale: 1, x: 0, y: 0 };
export function MediaViewer({ assets, initial, close }: { assets: MediaAsset[]; initial: number; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ start: Point; last: Point; time: number; transform: Transform; moved: boolean; pinched: boolean } | null>(null);
  const pinch = useRef<{ distance: number; center: Point; transform: Transform } | null>(null);
  const transformRef = useRef<Transform>(resting);
  const [transform, setTransform] = useState<Transform>(resting);
  const [index, setIndex] = useState(initial);
  const [ready, setReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const asset = assets[index], isVideo = asset.mime.startsWith('video/');

  function update(next: Transform) {
    const box = stage.current;
    const fullImage = box?.querySelector<HTMLImageElement>('.immersive-image img');
    const image = fullImage?.naturalWidth ? fullImage : box?.querySelector<HTMLImageElement>('.immersive-preview img');
    const scale = Math.max(1, Math.min(5, next.scale));
    let maxX = 0, maxY = 0;
    if (box && image?.naturalWidth) {
      const fit = Math.min(box.clientWidth / image.naturalWidth, box.clientHeight / image.naturalHeight);
      maxX = Math.max(0, (image.naturalWidth * fit * scale - box.clientWidth) / 2);
      maxY = Math.max(0, (image.naturalHeight * fit * scale - box.clientHeight) / 2);
    }
    const value = { scale, x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
    transformRef.current = value; setTransform(value);
  }
  function choose(next: number) {
    const target = (next + assets.length) % assets.length; if (target === index) return;
    setIndex(target); update(resting); setReady(false); setPreviewReady(false); setFailed(false); setAttempt(0); setBuffering(false);
    pointers.current.clear(); gesture.current = null; pinch.current = null;
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.current?.open) dialog.current?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const resize = () => { transformRef.current = resting; setTransform(resting); };
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('resize', resize); previous?.focus(); };
  }, []);
  useEffect(() => {
    const box = stage.current; if (!box || isVideo) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const old = transformRef.current, rect = box.getBoundingClientRect();
      const cx = event.clientX - rect.left - rect.width / 2, cy = event.clientY - rect.top - rect.height / 2;
      const scale = Math.max(1, Math.min(5, old.scale * Math.exp(-event.deltaY * .002)));
      update({ scale, x: cx - (cx - old.x) * scale / old.scale, y: cy - (cy - old.y) * scale / old.scale });
    };
    box.addEventListener('wheel', wheel, { passive: false });
    return () => box.removeEventListener('wheel', wheel);
  }, [isVideo]);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!ready || assets.length < 2 || connection?.saveData || connection?.effectiveType?.includes('2g')) return;
    const next = assets[(index + 1) % assets.length]; if (!next.mime.startsWith('image/')) return;
    const image = new Image(); image.fetchPriority = 'low'; image.decoding = 'async'; image.src = displayUrl(next); void image.decode().catch(() => {});
  }, [ready, index, assets]);
  function pinchPoints() {
    const [a, b] = [...pointers.current.values()];
    return { distance: Math.hypot(b.x - a.x, b.y - a.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }
  return <dialog ref={dialog} className='immersive-viewer' aria-label='媒体预览，照片可双指缩放、拖动，轻点关闭' onClose={close} onKeyDown={e => {
    if ((e.target as HTMLElement).tagName === 'VIDEO') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); choose(index + (e.key === 'ArrowLeft' ? -1 : 1)); }
    if (!isVideo && ['+', '=', '-', '0'].includes(e.key)) { e.preventDefault(); update(e.key === '0' ? resting : { ...transformRef.current, scale: transformRef.current.scale * (e.key === '-' ? .8 : 1.25) }); }
  }}>
    <button type='button' className={'immersive-dismiss' + (isVideo ? ' for-video' : '')} aria-label='关闭预览' onClick={() => dialog.current?.close()}><Icon name='close' size={22} /></button>
    <div ref={stage} className={'immersive-stage' + (transform.scale > 1 ? ' is-zoomed' : '') + (isVideo ? ' is-video' : '')} data-preview-ready={previewReady} style={{ touchAction: isVideo ? 'auto' : 'none' }}
      onPointerDown={e => {
        if ((e.target as HTMLElement).closest('button, video, a') || e.button !== 0) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); e.currentTarget.setPointerCapture(e.pointerId);
        if (pointers.current.size === 1) gesture.current = { start: { x: e.clientX, y: e.clientY }, last: { x: e.clientX, y: e.clientY }, time: performance.now(), transform: transformRef.current, moved: false, pinched: false };
        if (pointers.current.size >= 2) { const p = pinchPoints(); pinch.current = { ...p, transform: transformRef.current }; if (gesture.current) gesture.current.pinched = true; }
      }}
      onPointerMove={e => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gesture.current; if (!g) return;
        g.last = { x: e.clientX, y: e.clientY }; if (Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y) > 8) g.moved = true;
        if (pointers.current.size >= 2 && pinch.current) {
          const p = pinchPoints(), base = pinch.current, rect = e.currentTarget.getBoundingClientRect();
          const scale = Math.max(1, Math.min(5, base.transform.scale * p.distance / Math.max(1, base.distance))), ratio = scale / base.transform.scale;
          update({ scale, x: p.center.x - rect.left - rect.width / 2 - (base.center.x - rect.left - rect.width / 2 - base.transform.x) * ratio, y: p.center.y - rect.top - rect.height / 2 - (base.center.y - rect.top - rect.height / 2 - base.transform.y) * ratio });
        } else if (transformRef.current.scale > 1) update({ ...g.transform, x: g.transform.x + e.clientX - g.start.x, y: g.transform.y + e.clientY - g.start.y });
      }}
      onPointerUp={e => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.delete(e.pointerId); const g = gesture.current;
        if (pointers.current.size) { const remaining = [...pointers.current.values()][0]; gesture.current = { start: remaining, last: remaining, time: performance.now(), transform: transformRef.current, moved: true, pinched: true }; pinch.current = null; return; }
        gesture.current = null; pinch.current = null; if (!g || g.pinched) return;
        const dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
        if (!g.moved && Math.hypot(dx, dy) < 8 && performance.now() - g.time < 350) dialog.current?.close();
        else if (transformRef.current.scale === 1 && Math.abs(dx) > 55 && Math.abs(dy) < 75) choose(index + (dx < 0 ? 1 : -1));
      }}
      onPointerCancel={e => { pointers.current.delete(e.pointerId); gesture.current = null; pinch.current = null; }}
      onDragStart={e => e.preventDefault()}>
      {!isVideo && !ready && <DecodedImage key={asset.id + ':preview'} className='immersive-preview' src={previewUrl(asset)} alt='' aria-hidden='true' fetchPriority='high' style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} onReady={() => setPreviewReady(true)} />}
      {isVideo ? <video key={asset.id + ':' + attempt} src={asset.url} poster={asset.thumbnailUrl || undefined} controls autoPlay playsInline preload='auto' onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)} onError={() => { setFailed(true); setBuffering(false); }} />
        : <DecodedImage key={asset.id + ':' + attempt} className='immersive-image' src={displayUrl(asset) + (attempt ? '&retry=' + attempt : '')} alt='日常照片' fetchPriority='high' style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} onReady={() => { setReady(true); setFailed(false); }} onFailure={() => setFailed(true)} />}
      {failed ? <div className='immersive-status' role='alert'><span>{isVideo ? '暂时无法播放' : previewReady ? '清晰画面暂未加载，正在显示预览' : '图片加载失败'}</span><button type='button' onClick={() => { setAttempt(v => v + 1); setFailed(false); setReady(false); }}>重试</button></div> : ((!isVideo && !ready && !previewReady) || buffering) ? <span className='immersive-loader' role='status' aria-label='加载中' /> : !isVideo && !ready && previewReady ? <span className='immersive-refining' role='status'>正在加载清晰画面…</span> : null}
    </div>
    {assets.length > 1 && <><button type='button' className='immersive-prev' aria-label='上一张' onClick={() => choose(index - 1)}><Icon name='back' size={22} /></button><button type='button' className='immersive-next' aria-label='下一张' onClick={() => choose(index + 1)}><Icon name='arrow' size={22} /></button><span className='immersive-count' aria-live='polite'>{index + 1}<span> / {assets.length}</span></span></>}
  </dialog>;
}

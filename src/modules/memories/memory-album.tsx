'use client';
import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { DecodedImage } from '@/components/decoded-image';
import { dateText } from '@/lib/client';
import { MediaViewer, previewUrl } from './media';
import { albumOffset, useAlbumMotion, wrap } from './use-album-motion';
import type { Memory, MemoryList } from './types';

function AlbumDecoration() {
  return <div className='album-decoration' aria-hidden='true'>
    <svg className='album-memory-thread' viewBox='0 0 1000 420' fill='none' preserveAspectRatio='none'>
      <path d='M18 216C48 86 188 26 290 83S495 368 691 318 942 352 985 193' />
      <path d='M70 355c54-27 63-10 57 5s-36 2-21-17c16-22 53-18 76-9' />
      <circle cx='28' cy='188' r='5' /><circle cx='964' cy='248' r='4' />
    </svg>
    <span className='album-margin-note'>把时光，轻轻夹好。<svg viewBox='0 0 84 28' fill='none'><path d='M2 9c23 17 53 16 76-4m-14 1 15-2-5 12' /></svg></span>
    <span className='album-spark album-spark-one'>✦</span><span className='album-spark album-spark-two'>✧</span><span className='album-spark album-spark-three'>+</span>
    <span className='album-memory-keeper'>
      <svg viewBox='0 0 76 88' fill='none'>
        <path d='m24 30-8-19 21 12 17-14-1 25c10 8 13 20 9 30-5 12-37 14-46 2-9-12-4-27 8-36Z' fill='var(--album-paper)' stroke='currentColor' strokeWidth='1.7' strokeLinejoin='round' />
        <path d='m22 52 5-1m18 0 5 1m-17 5c2 3 5 3 7 0' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' />
        <ellipse cx='23' cy='58' rx='4' ry='2' fill='var(--warm)' opacity='.45' /><ellipse cx='49' cy='58' rx='4' ry='2' fill='var(--warm)' opacity='.45' />
        <path d='m58 4 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z' fill='var(--warm)' />
        <path d='M26 72v9m22-9v9' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
        <path d='m30 66 7-4 7 4-1 10-6 3-6-3Z' fill='var(--accent-soft)' stroke='currentColor' strokeWidth='1.2' /><path d='M37 63v15' stroke='currentColor' strokeWidth='1' />
      </svg>
      <span>记忆保管员</span>
    </span>
  </div>;
}

function Album({ items }: { items: Memory[] }) {
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [viewing, setViewing] = useState<{ memory: Memory; initial: number } | null>(null);
  const index = Math.max(0, items.findIndex(item => item.id === selectedId));
  const selected = items[index];
  const router = useRouter();
  const titleId = useId();
  const choose = (next: number) => setSelectedId(items[wrap(next, items.length)].id);
  const { stage, controls } = useAlbumMotion(index, items.length, choose);

  function open(memory: Memory) {
    if (memory.assets.length) {
      const initial = memory.assets.findIndex(asset => asset.mime.startsWith('image/') || asset.thumbnailUrl);
      setViewing({ memory, initial: Math.max(0, initial) });
    } else router.push(`/memories/${memory.id}`);
  }

  return <>
    <section className='memory-album keepsake-album' aria-labelledby={titleId} aria-roledescription='轮播相册'>
      <header className='album-heading'><div className='album-title-group'><span lang='en'>THE MEMORY ARCHIVE</span><h2 id={titleId}>时光相册<Icon name='spark' size={15} /></h2></div><span className='album-gesture'>滑动翻阅<Icon name='arrow' size={13} /></span></header>
      <div ref={stage} className='album-stage' onPointerDown={e => controls.current?.down(e)} onPointerMove={e => controls.current?.move(e)} onPointerUp={e => controls.current?.up(e)} onPointerCancel={() => controls.current?.cancel()}
        onClickCapture={e => { if (e.detail > 0 && controls.current?.wasDragged()) { e.preventDefault(); e.stopPropagation(); } }}
        onDragStart={e => e.preventDefault()}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); open(selected); }
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault(); choose(e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : index + (e.key === 'ArrowLeft' ? -1 : 1));
            stage.current?.focus({ preventScroll: true });
          }
        }} role='group' tabIndex={0} aria-label='相册，左右方向键翻阅，点按当前照片可放大'>
        <div className='album-ground' aria-hidden='true' />
        <AlbumDecoration />
        {items.map((memory, i) => {
          const distance = Math.abs(albumOffset(i, index, items.length));
          const asset = memory.assets.find(asset => asset.mime.startsWith('image/') || asset.thumbnailUrl);
          const video = asset?.mime.startsWith('video/') || (!asset && memory.assets.some(asset => asset.mime.startsWith('video/')));
          return <button type='button' key={memory.id} data-album-card data-active={i === index} data-paper-tone={i % 3} className={'album-card' + (!asset ? ' album-card-note' : '')}
            aria-label={(i === index ? '打开' : '翻到') + dateText(memory.happenedAt) + '的日常'} aria-current={i === index ? 'true' : undefined}
            aria-hidden={distance > 2} tabIndex={i === index ? 0 : -1}
            onClick={() => i === index ? open(memory) : choose(i)}>
            <span className='album-washi' aria-hidden='true' />
            <span className='album-photo'>
              {asset ? distance <= 2 && <DecodedImage src={previewUrl(asset)} alt='' draggable={false} fetchPriority={i === index ? 'high' : 'auto'} />
                : <span className='album-note'><Icon name={video ? 'play' : 'edit'} size={22} />{(memory.content || memory.title) && <span>{memory.content || memory.title}</span>}</span>}
              {video && asset && <span className='album-video'><Icon name='play' size={21} /></span>}
              {memory.assets.length > 1 && <span className='album-assets'><Icon name='image' size={12} />{memory.assets.length}</span>}
              <span className='album-photo-shine' aria-hidden='true' />
            </span>
            <span className='album-caption'><span className='album-print-number' aria-hidden='true'>{String(i + 1).padStart(2, '0')}</span><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', ' . ')}</time>{memory.location && <span>{memory.location}</span>}<Icon name={video ? 'video' : asset ? 'image' : 'edit'} size={13} /></span>
          </button>;
        })}
      </div>
      <footer className='album-footer'>
        <div className='album-pager'>
          <button type='button' className='album-arrow' aria-label='上一段日常' disabled={items.length < 2} onClick={() => choose(index - 1)}><Icon name='back' size={18} /></button>
          <label className='album-range'><span className='sr-only'>选择日常</span><input type='range' min={0} max={Math.max(1, items.length - 1)} value={index} disabled={items.length < 2} onChange={e => choose(Number(e.target.value))} aria-valuetext={dateText(selected.happenedAt)} /></label>
          <span className='album-counter' aria-hidden='true'>{String(index + 1).padStart(2, '0')}<span> / {String(items.length).padStart(2, '0')}</span></span>
          <button type='button' className='album-arrow' aria-label='下一段日常' disabled={items.length < 2} onClick={() => choose(index + 1)}><Icon name='arrow' size={18} /></button>
        </div>
        <span className='album-footer-note' aria-hidden='true'>每一页，都值得被记得。</span>
        <Link className='album-open' href={`/memories/${selected.id}`} aria-label={'查看' + dateText(selected.happenedAt) + '的日常详情'}>查看日常<Icon name='arrow' size={14} /></Link>
      </footer>
      <span className='sr-only' aria-live='polite' aria-atomic='true'>{dateText(selected.happenedAt)}，第 {index + 1} 段，共 {items.length} 段日常</span>
    </section>
    {viewing && <MediaViewer assets={viewing.memory.assets} initial={viewing.initial} close={() => setViewing(null)} />}
  </>;
}

export function MemoryAlbum({ data, error, onRetry }: { data?: MemoryList; error?: string; onRetry: () => void }) {
  const items = useMemo(() => (data?.items || []).slice(0, 12), [data]);
  if (data && !error && items.length) return <Album key={items.map(item => item.id).join(':')} items={items} />;
  return <section className='memory-album keepsake-album album-unpopulated' aria-label='时光相册' aria-busy={!data && !error}>
    <header className='album-heading'><div className='album-title-group'><span lang='en'>THE MEMORY ARCHIVE</span><h2>时光相册<Icon name='spark' size={15} /></h2></div></header>
    <div className='album-state' role={error ? 'alert' : 'status'}><div className='album-empty-frame' aria-hidden='true'><Icon name='image' size={29} /></div>
      {error ? <><p>{error}</p><button type='button' className='album-state-action' onClick={onRetry}>重新加载<Icon name='restore' size={15} /></button></> : !data ? <p>正在整理相册…</p> : <Link href='/memories/new' className='album-state-action'>留下第一段日常<Icon name='plus' size={16} /></Link>}
    </div>
  </section>;
}

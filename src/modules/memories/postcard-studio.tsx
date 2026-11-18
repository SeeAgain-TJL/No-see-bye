'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons';
import { ThemeMotif } from '@/components/theme-motif';
import { MemorySprite } from '@/components/memory-sprite';
import { DecodedImage } from '@/components/decoded-image';
import { useApp } from '@/components/providers';
import { api, dateText } from '@/lib/client';
import { defaultTheme, resolveTheme, type ThemeName } from '@/lib/themes';
import { previewUrl } from './media';
import type { Memory, MemoryList, UserInfo } from './types';

type Draft = { recipient: string; message: string; signature: string; cover: string };
const prompts = ['今天最想留住的，是这一刻。', '等很久以后再读到这里，希望你还记得……', '有些话，想慢慢说给你听。'];
const palette = {
  grassland: { sky: '#e4ead7', hill: '#8ba58c', sea: '#b5c8aa', paper: '#faf9ef', ink: '#3e5141', mark: '草地来信', subtitle: '把平凡的日子，折成一片叶子。' },
  ocean: { sky: '#d9edf0', hill: '#a0c3c2', sea: '#71a5b3', paper: '#f0f8f6', ink: '#355b67', mark: '海风邮局', subtitle: '让海风，把想念送得远一点。' },
  rift: { sky: '#eed7b3', hill: '#aa8e68', sea: '#c6ab83', paper: '#fff4dd', ink: '#725637', mark: '峡谷回信', subtitle: '给这一帧，留一个不会褪色的注脚。' },
  forest: { sky: '#243d43', hill: '#375749', sea: '#54776c', paper: '#e9edde', ink: '#344e40', mark: '林中来信', subtitle: '今夜的月光，也替我说一声想念。' },
  iceberg: { sky: '#dbeef8', hill: '#8baec9', sea: '#9dccdf', paper: '#f2f8ff', ink: '#34536b', mark: '冰川来信', subtitle: '愿这一刻，顺着冰光寄到你身边。' },
};
function currentTheme(): ThemeName { return resolveTheme(document.documentElement.dataset.theme ?? null); }
function subscribeTheme(notify: () => void) {
  window.addEventListener('nsb:theme', notify); window.addEventListener('storage', notify);
  return () => { window.removeEventListener('nsb:theme', notify); window.removeEventListener('storage', notify); };
}
const serverTheme = (): ThemeName => defaultTheme;

function Landscape({ theme }: { theme: ThemeName }) {
  const p = palette[theme];
  return <svg className='ps-landscape' viewBox='0 0 900 590' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
    <rect width='900' height='590' fill={p.sky} />
    {theme === 'forest' ? <><path d='M699 64a64 64 0 1 0 55 98c-71 14-100-58-55-98Z' fill='#ece1ac' /><path d='m93 95 89 43 64-72 84 53' fill='none' stroke='#d5e0bd' strokeWidth='2' opacity='.6' />{[[93,95],[182,138],[246,66],[330,119],[479,92],[550,171],[809,236]].map(([x,y]) => <circle key={x} cx={x} cy={y} r='3' fill='#fff5c8' />)}</> : <><circle cx='701' cy='136' r='62' fill={theme === 'rift' ? '#d79c61' : '#f0bf83'} /><g fill='#fffdf3' opacity='.8'><path d='M82 158c0-29 32-42 55-24 13-39 65-32 73 1 29-21 59-5 61 23Z' /><path d='M435 77c5-23 31-27 48-12 14-26 52-19 56 7 21-11 42-1 43 11H435Z' /></g></>}
    <path d='M0 363c110-53 213-155 344-94 150 69 206-89 354-63 78 13 143 51 202 44v340H0Z' fill={p.hill} />
    <path d='M0 398c183-87 305 20 466-56 155-73 265-25 434-67v315H0Z' fill={p.sea} />
    <path d='M0 523c200-68 334 2 511-40 150-36 260-12 389-35v142H0Z' fill={theme === 'forest' ? '#a1b29a' : theme === 'iceberg' ? '#dcecf5' : '#e9d4b0'} />
    <g stroke='#fff7df' strokeWidth='3' opacity='.7' fill='none'><path d='M115 420h96m77 35h120m197-54h143M0 549c180-43 370 3 549-38 121-28 225-10 351-22' /></g>
    {theme === 'ocean' && <g transform='translate(437 353)'><path d='m0 31 72 0-18 17H17Z' fill='#4c5e72' /><path d='M36-29v57H0Z' fill='#fff9df' /><path d='m42-12 25 40H42Z' fill='#dfb398' /></g>}
    {theme === 'grassland' && <g stroke='#496f50' strokeWidth='4' fill='#dbe4ba'><path d='M117 563c1-54 15-93 43-132' fill='none' /><path d='M135 508c-51-3-66-31-56-54 37 4 58 23 56 54Zm12-33c36 0 58-20 60-44-36-2-61 15-60 44Z' /></g>}
    {theme === 'rift' && <g fill='#6b553f' opacity='.55'>{Array.from({ length: 12 }, (_, i) => <g key={i}><rect x={24+i*74} y='14' width='31' height='9' rx='2' /><rect x={24+i*74} y='567' width='31' height='9' rx='2' /></g>)}</g>}
    {theme === 'forest' && <g fill='#eee8b7'><circle cx='184' cy='415' r='4' /><circle cx='244' cy='474' r='3' /><circle cx='739' cy='444' r='4' /></g>}
  </svg>;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const rows: string[] = [];
  for (const paragraph of text.split('\n')) {
    let row = '';
    for (const char of paragraph) {
      if (row && ctx.measureText(row + char).width > width) { rows.push(row); row = char; } else row += char;
    }
    rows.push(row);
  }
  return rows;
}
async function imageFromUrl(src: string) {
  const image = new Image(); image.src = src; await image.decode(); return image;
}

export function PostcardStudio({ user, data, close, onSaved }: { user: UserInfo; data?: MemoryList; close: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  const p = palette[theme];
  const { notify } = useApp();
  const [draft, setDraft] = useState<Draft>({ recipient: '未来的自己', message: '', signature: user.displayName || user.username, cover: 'illustration' });
  const [restored, setRestored] = useState(false);
  const [draftStatus, setDraftStatus] = useState('正在整理信纸…');
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: string; digest: string } | null>(null);
  const savePending = useRef(false);
  const exportPending = useRef(false);
  const key = 'nsb:postcard-draft:' + user.id;
  const photos = useMemo(() => (data?.items || []).flatMap(memory => memory.assets.filter(asset => asset.mime.startsWith('image/')).map(asset => ({ memory, asset }))).filter((item, i, items) => items.findIndex(other => other.asset.id === item.asset.id) === i).slice(0, 8), [data]);
  const photo = photos.find(item => item.asset.id === draft.cover);
  const message = draft.message.trim();
  const digest = JSON.stringify([draft.recipient.trim(), message, draft.signature.trim()]);
  const today = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialog.current; node?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    // Restore browser-owned draft once after mount; never persist the empty initial form over it.
    let value: Partial<Draft> = {};
    try { value = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* An unavailable or invalid draft starts blank. */ }
    const timer = window.setTimeout(() => {
      setDraft(current => ({ ...current,
        recipient: typeof value?.recipient === 'string' ? value.recipient.slice(0, 32) : current.recipient,
        message: typeof value?.message === 'string' ? value.message.slice(0, 320) : current.message,
        signature: typeof value?.signature === 'string' ? value.signature.slice(0, 32) : current.signature,
        cover: typeof value?.cover === 'string' ? value.cover : current.cover,
      }));
      setRestored(true);
      try { localStorage.setItem(key, localStorage.getItem(key) || '{}'); setDraftStatus('草稿保存在当前浏览器'); }
      catch { setDraftStatus('浏览器无法保存草稿，请在关闭前下载或存为日常'); }
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem(key, JSON.stringify(draft)); } catch { /* Editing remains available when browser storage is full. */ }
  }, [draft, key, restored]);

  function edit<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [field]: value })); setError('');
    if (restored) {
      try { localStorage.setItem(key, JSON.stringify({ ...draft, [field]: value })); setDraftStatus('草稿已保存在当前浏览器'); }
      catch { setDraftStatus('浏览器无法保存草稿，请在关闭前下载或存为日常'); }
    }
  }
  async function save() {
    if (!message || savePending.current || saved?.digest === digest) return;
    savePending.current = true;
    setSaving(true); setError('');
    try {
      const result = await api<Memory>('/api/memories', { method: 'POST', body: JSON.stringify({ title: '寄给' + (draft.recipient.trim() || '此刻的自己'), content: `To：${draft.recipient.trim() || '此刻的自己'}\n\n${message}\n\nFrom：${draft.signature.trim() || user.username}`, happenedAt: new Date().toISOString(), visibility: 'private', tags: ['明信片'], mood: '平静', location: '', assetIds: [] }) });
      setSaved({ id: result.id, digest }); notify('明信片文字已保存为私密日常'); onSaved();
    } catch (failure) { setError((failure as Error).message); }
    finally { savePending.current = false; setSaving(false); }
  }
  async function download() {
    if (exportPending.current) return;
    exportPending.current = true;
    setExporting(true); setError('');
    let source: string | undefined;
    try {
      let cover: HTMLImageElement;
      if (photo) {
        const response = await fetch(photo.asset.url + (photo.asset.url.includes('?') ? '&' : '?') + 'variant=display', { credentials: 'same-origin', signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error('照片暂时没有加载成功，请稍后再下载');
        source = URL.createObjectURL(await response.blob()); cover = await imageFromUrl(source);
      } else {
        const svg = art.current?.querySelector('svg'); if (!svg) throw new Error('插画还在准备中，请稍后重试');
        source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })); cover = await imageFromUrl(source);
      }
      await document.fonts.ready;
      const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1200;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('当前浏览器不支持导出图片');
      ctx.fillStyle = theme === 'forest' ? '#263d30' : p.sky; ctx.fillRect(0, 0, 1800, 1200);
      ctx.fillStyle = p.paper; ctx.fillRect(44, 44, 838, 1112); ctx.fillRect(914, 44, 842, 1112);
      const fit = Math.min(774 / cover.naturalWidth, 870 / cover.naturalHeight);
      ctx.fillStyle = p.sky; ctx.fillRect(76, 76, 774, 870);
      ctx.drawImage(cover, 76+(774-cover.naturalWidth*fit)/2, 76+(870-cover.naturalHeight*fit)/2, cover.naturalWidth*fit, cover.naturalHeight*fit);
      ctx.fillStyle = p.ink; ctx.font = '28px sans-serif'; ctx.fillText('NO SEE BYE / ' + p.mark, 78, 1012);
      ctx.font = '24px sans-serif'; ctx.fillText(p.subtitle, 78, 1072);
      ctx.strokeStyle = p.ink; ctx.globalAlpha = .2; ctx.strokeRect(946, 76, 778, 1048); ctx.globalAlpha = 1;
      ctx.font = '22px sans-serif'; ctx.fillText('A LETTER TO REMEMBER', 974, 133);
      ctx.font = '32px sans-serif'; ctx.fillText('To：' + (draft.recipient.trim() || '此刻的自己'), 974, 213, 680);
      ctx.font = '30px sans-serif';
      const rows = wrapCanvasText(ctx, message || '把想说的话，写在这里。', 694);
      if (rows.length > 22) throw new Error('换行较多，导出图片放不下；请合并部分空行后再试');
      rows.forEach((row, index) => ctx.fillText(row, 974, 284 + index * 32));
      ctx.font = '26px sans-serif'; ctx.fillText('From：' + (draft.signature.trim() || user.username), 974, 1040, 680);
      ctx.font = '22px sans-serif'; ctx.fillText(dateText(today, { year: 'numeric', month: 'long', day: 'numeric' }), 974, 1090);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('导出失败，请稍后重试')), 'image/png'));
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = '不说再见-明信片-' + today.slice(0, 10) + '.png'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('明信片图片已生成');
    } catch (failure) { setError((failure as Error).message); }
    finally { if (source) URL.revokeObjectURL(source); exportPending.current = false; setExporting(false); }
  }

  return <dialog ref={dialog} className='postcard-studio' aria-labelledby='ps-title' onClose={event => {
    // Effect replay may reopen the dialog before its queued close event arrives.
    if (!event.currentTarget.open) close();
  }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <header className='ps-header'><div><span>明信片 · THE LETTER ATELIER</span><h2 id='ps-title'>尺素寄相思。</h2></div><button type='button' className='icon-button' aria-label='关闭明信片工作台' onClick={() => dialog.current?.close()}><Icon name='close' size={23} /></button></header>
    <div className='ps-workspace'>
      <section className='ps-preview' aria-label='明信片预览'>
        <div className='ps-preview-caption'><ThemeMotif /><span>{p.mark}</span><span className='ps-edition'>NO. 01 / YOUR OWN LETTER</span></div>
        <div className='ps-envelope' aria-hidden='true' />
        <div className='ps-turntable' data-flipped={flipped}>
          <div className='ps-turntable-inner'>
            <div className='ps-card ps-front' inert={flipped}>
              <div ref={art} className='ps-cover'>{photo ? <DecodedImage src={previewUrl(photo.asset)} alt='选择的明信片照片' /> : <Landscape theme={theme} />}</div>
              <div className='ps-front-caption'><span>给 {draft.recipient.trim() || '此刻的自己'}</span><time dateTime={today}>{dateText(today, { month: 'long', day: 'numeric' })}</time></div>
              <p className='ps-front-note'>{p.subtitle}</p><span className='ps-corner-mark' aria-hidden='true'><MemorySprite pose='peek' /></span>
            </div>
            <div className='ps-card ps-back' inert={!flipped}>
              <div className='ps-postage' aria-hidden='true'><ThemeMotif /><span>NO SEE BYE</span></div>
              <span className='ps-back-eyebrow'>POSTCARD / 私人来信</span>
              <strong className='ps-to'>To. {draft.recipient.trim() || '此刻的自己'}</strong>
              <p className={'ps-letter' + (!message ? ' is-empty' : '')} tabIndex={flipped ? 0 : -1} aria-label='完整信件，可滚动阅读'>{message || '山水迢迢，见字如晤。\n愿这一纸，收好未尽的心事。'}</p>
              <div className='ps-sign'><span>From. {draft.signature.trim() || user.username}</span><time dateTime={today}>{dateText(today, { year: 'numeric', month: 'long', day: 'numeric' })}</time></div>
            </div>
          </div>
        </div>
        <div className='ps-preview-controls'><button type='button' className='ps-flip' onClick={() => setFlipped(value => !value)}><Icon name='restore' size={17} />{flipped ? '翻回封面' : '翻看信件'}<span aria-hidden='true'>↗</span></button><span>跟随当前主题的私人邮局</span></div>
      </section>
      <form className='ps-editor' onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className='ps-editor-title'><span>01 — 写信</span><span className='ps-draft-status' role='status'>{draftStatus}</span></div>
        <label className='ps-field'>寄给谁<input value={draft.recipient} maxLength={32} disabled={!restored} onChange={event => edit('recipient', event.target.value)} placeholder='未来的自己，或想念的人' /></label>
        <label className='ps-field'>想说的话<textarea value={draft.message} maxLength={320} disabled={!restored} onFocus={() => setFlipped(true)} onChange={event => edit('message', event.target.value)} placeholder='写一程山水，或一缕想念…' rows={6} /></label>
        <div className='ps-writing-meta'><span>纸短情长，落笔皆是此刻。</span><span>{draft.message.length} / 320</span></div>
        <div className='ps-prompts' aria-label='写信灵感'>{prompts.map((prompt, index) => <button type='button' key={prompt} disabled={!restored || draft.message.length + prompt.length + 1 > 320} onClick={() => { edit('message', (draft.message ? draft.message + '\n' : '') + prompt); setFlipped(true); }}>{['留住今天', '写给未来', '寄出想念'][index]}<span aria-hidden='true'>＋</span></button>)}</div>
        <label className='ps-field ps-signature-field'>署名<input value={draft.signature} maxLength={32} disabled={!restored} onChange={event => edit('signature', event.target.value)} /></label>
        <div className='ps-cover-heading'><span>02 — 挑一张封面</span><span>照片完整保留</span></div>
        <div className='ps-cover-options' role='group' aria-label='选择明信片封面'><button type='button' className='ps-cover-choice is-illustration' aria-label='使用主题插画' aria-pressed={!photo} onClick={() => { edit('cover', 'illustration'); setFlipped(false); }}><ThemeMotif /><span>主题插画</span></button>{photos.map(({ asset }) => <button type='button' className='ps-cover-choice' key={asset.id} aria-label={'使用照片：' + asset.filename} aria-pressed={draft.cover === asset.id} onClick={() => { edit('cover', asset.id); setFlipped(false); }}><DecodedImage src={previewUrl(asset)} alt='' loading='lazy' /></button>)}</div>
        <p className='ps-save-note'>保存为仅自己可见的文字日常；下载图片可同时保留照片封面和完整信件。</p>
        {error && <p className='ps-error' role='alert'>{error}</p>}
        {saved && saved.digest === digest && <p className='ps-success' role='status'>已经妥善收藏。<Link href={'/memories/' + saved.id}>打开这封信 <Icon name='arrow' size={14} /></Link></p>}
        <div className='ps-actions'><button type='button' className='button secondary' disabled={exporting || !restored} onClick={() => void download()}><Icon name='download' size={17} />{exporting ? '正在生成…' : '下载明信片'}</button><button type='submit' className='studio-button' disabled={!message || saving || saved?.digest === digest}><Icon name='book' size={17} />{saving ? '正在收藏…' : saved?.digest === digest ? '已存入日常' : '存入我的日常'}</button></div>
      </form>
    </div>
  </dialog>;
}

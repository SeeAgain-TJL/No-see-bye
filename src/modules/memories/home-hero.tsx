'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Daydream } from '@/components/daydream';
import { Icon } from '@/components/icons';
import { MemoryAlbum } from './memory-album';
import { MemoryStories } from './stories';
import type { MemoryList, UserInfo } from './types';

function Postcard({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} className='postcard-dialog' aria-labelledby='postcard-title' onClose={close} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
    <header><h2 id='postcard-title'>心情明信片</h2><button type='button' className='icon-button' aria-label='关闭明信片' onClick={() => dialog.current?.close()}><Icon name='close' /></button></header>
    <div className='postcard-turntable' data-flipped={flipped}>
      <div className='postcard-front' inert={flipped}><Daydream /></div>
      <div className='postcard-back' inert={!flipped}><Icon name='spark' size={34} /><p>寄给此刻的自己。</p><time>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}</time><span className='postcard-postmark' aria-hidden='true'>NO SEE BYE</span></div>
    </div>
    <button type='button' className='postcard-flip' onClick={() => setFlipped(v => !v)}><Icon name='restore' size={17} />{flipped ? '翻回风景' : '翻到背面'}</button>
  </dialog>;
}

export function HomeHero({ user, data, error, onRetry }: { user: UserInfo | null; data?: MemoryList; error?: string; onRetry: () => void }) {
  const [experience, setExperience] = useState<'postcard' | 'stories' | null>(null);
  if (!user) return <section className='studio-hero' aria-labelledby='hero-title'><div className='studio-hero-copy'><span className='studio-greeting'>NO SEE BYE</span><h1 id='hero-title'>收藏生活，<br /><span>也收藏自己。</span></h1><div className='studio-hero-actions'><Link href='/register' className='studio-button'>开启我的空间<Icon name='plus' size={18} /></Link><Link href='/memories?scope=public' className='studio-text-link'>先逛一逛<Icon name='arrow' size={17} /></Link></div></div><Daydream /></section>;
  return <section className='home-observatory' aria-labelledby='hero-title'>
    <header className='home-welcome'><div><span className='welcome-eyebrow'>欢迎回来</span><h1 id='hero-title'>你好，{user.displayName || user.username}</h1></div><div className='home-small-actions'><button type='button' aria-label='打开心情明信片' title='心情明信片' onClick={() => setExperience('postcard')}><Icon name='postcard' size={19} /><span>明信片</span></button><button type='button' aria-label='播放回忆' title='播放回忆' onClick={() => setExperience('stories')}><Icon name='play' size={18} /><span>回放</span></button></div></header>
    <MemoryAlbum data={data} error={error} onRetry={onRetry} />
    {experience === 'stories' && <MemoryStories onClose={() => setExperience(null)} />}
    {experience === 'postcard' && <Postcard close={() => setExperience(null)} />}
  </section>;
}

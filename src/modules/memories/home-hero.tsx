'use client';
import Link from 'next/link';
import { useRef, useState, type PointerEvent } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { Icon } from '@/components/icons';
import { useActiveTheme } from '@/components/theme-provider';
import { themeNames, themes, type ThemeName } from '@/lib/themes';
import { MediaViewer } from './media';
import { MemoryAlbum } from './memory-album';
import { MemoryStories } from './stories';
import { PostcardStudio } from './postcard-studio';
import type { MemoryList, UserInfo } from './types';

const photography: Record<ThemeName, { alt: string; credit?: { name: string; url: string } }> = {
  forest: { alt: '雾气漫过瑞士山坡上的常绿树林', credit: { name: 'Chris Linnett', url: 'https://unsplash.com/photos/BoezF2tPJbI' } },
  iceberg: { alt: '格陵兰海面上的蓝色拱形冰山与倒影', credit: { name: 'Filippo Salvioni', url: 'https://unsplash.com/photos/aiADDysGH7M' } },
  grassland: { alt: '夕阳照亮翁布里亚层叠的草坡', credit: { name: 'Ollie Singleton', url: 'https://unsplash.com/photos/thtjda3CDRY' } },
  rift: { alt: '航拍犹他州峡谷的赭红岩壁和蜿蜒河床', credit: { name: 'Nick Da Fonseca', url: 'https://unsplash.com/photos/vosVDyzZJC0' } },
  ocean: { alt: '深色海面上卷过暗礁的白色浪花', credit: { name: 'Iain', url: 'https://unsplash.com/photos/naVr1Z6xM3E' } },
};
const sceneImages = themeNames.map(id => {
  const url = `/visuals/scene-${id}.webp`;
  return { id, ...photography[id], mime: 'image/webp', url, fullUrl: url, thumbnailUrl: `/visuals/scene-${id}-preview.webp` };
});

function GuestOpening() {
  const theme = useActiveTheme();
  const [view, setView] = useState<number | null>(null);
  const drag = useRef<{ x: number; offset: number } | null>(null);
  const scene = themes[theme];

  function move(event: PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const offset = Math.max(-58, Math.min(58, drag.current.offset + (event.clientX - drag.current.x) * .55));
    event.currentTarget.style.setProperty('--shot-offset', offset + 'px');
  }
  function finish(event: PointerEvent<HTMLElement>) {
    drag.current = null;
    event.currentTarget.removeAttribute('data-shot-dragging');
  }
  return <>
    <section key={theme} className='cinematic-opening' data-camera-frame='' aria-labelledby='hero-title'
      onPointerDown={event => {
        if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest('a, button') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        drag.current = { x: event.clientX, offset: Number.parseFloat(event.currentTarget.style.getPropertyValue('--shot-offset')) || 0 };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.setAttribute('data-shot-dragging', '');
      }}
      onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
      <div className='cinematic-camera-track' aria-hidden='true'>
        <div className='cinematic-opening-art' />
        <div className='cinematic-opening-optics' />
      </div>
      <div className='cinematic-opening-copy'>
        <span className='cinematic-opening-brand'><BrandMark /><span>不说再见</span></span>
        <h1 id='hero-title'>{scene.quote[0]}<span>{scene.quote[1]}</span></h1>
        <p className='opening-film-credit'>《{scene.film}》 · {theme === 'rift' ? '主题改写' : '台词意译'}</p>
        <div className='cinematic-opening-actions'>
          <Link href='/register' className='cinematic-opening-primary' aria-label='注册账户，开启自己的空间'>开启我的空间<Icon name='arrow' size={18} /></Link>
          <Link href='/memories?scope=public' className='cinematic-opening-secondary' aria-label='浏览公开日常'>借阅人间<Icon name='arrow' size={16} /></Link>
        </div>
      </div>
      <button type='button' className='opening-photo-label' onClick={() => setView(themeNames.indexOf(theme))} aria-label={`查看整幅${scene.label}摄影`}>
        <Icon name='expand' size={15} />查看全幅
      </button>
    </section>
    {view !== null && <MediaViewer assets={sceneImages} initial={view} close={() => setView(null)} />}
  </>;
}

export function HomeHero({ user, data, error, onRetry }: { user: UserInfo | null; data?: MemoryList; error?: string; onRetry: () => void }) {
  const [experience, setExperience] = useState<'postcard' | 'stories' | null>(null);
  if (!user) return <GuestOpening />;
  return <section className='home-observatory' aria-labelledby='hero-title'>
    <header className='home-welcome'>
      <div className='home-welcome-copy'><div><span className='welcome-eyebrow'>{user.displayName || user.username} · 私人相册</span><h1 id='hero-title'>旧日如笺。</h1></div></div>
      <div className='home-small-actions'>
        <button type='button' aria-label='打开心情明信片' title='心情明信片' onClick={() => setExperience('postcard')}><Icon name='postcard' size={19} /><span>明信片</span></button>
        <button type='button' aria-label='播放回忆' title='播放回忆' onClick={() => setExperience('stories')}><Icon name='play' size={18} /><span>回放</span></button>
      </div>
    </header>
    <MemoryAlbum data={data} error={error} onRetry={onRetry} />
    {experience === 'stories' && <MemoryStories photosOnly onClose={() => setExperience(null)} />}
    {experience === 'postcard' && <PostcardStudio user={user} data={data} close={() => setExperience(null)} onSaved={onRetry} />}
  </section>;
}

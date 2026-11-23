'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { Icon } from '@/components/icons';
import { useActiveTheme } from '@/components/theme-provider';
import { themeNames, themes } from '@/lib/themes';
import { useCoverGesture } from './cover-gesture';
import { LivingPhoto } from './living-photo';
import { MediaViewer } from './media';
import { sceneImages } from './scene-photography';
import { MemoryAlbum } from './memory-album';
import type { MemoryList, UserInfo } from './types';

const MemoryStories = dynamic(() => import('./stories').then(module => module.MemoryStories));
const PostcardStudio = dynamic(() => import('./postcard-studio').then(module => module.PostcardStudio));

function GuestOpening({ allowMotion }: { allowMotion: boolean }) {
  const theme = useActiveTheme();
  const [view, setView] = useState<number | null>(null);
  const scene = themes[theme];
  const gesture = useCoverGesture(() => setView(themeNames.indexOf(theme)));

  return <>
    <section key={theme} className='cinematic-opening' aria-labelledby='hero-title'>
      <div className='cinematic-camera-track'>
        <div className='cinematic-opening-art' aria-hidden='true'><LivingPhoto theme={theme} paused={!allowMotion || view !== null} /></div>
        <button type='button' className='opening-photo-surface' aria-label={`打开${scene.label}摄影，可缩放`} aria-haspopup='dialog' title='双击查看照片' {...gesture} />
      </div>
      <div className='cinematic-opening-copy'>
        <span className='cinematic-opening-brand'><BrandMark /><span>不说再见</span></span>
        <h1 id='hero-title'>死亡不是终点<span>遗忘才是</span></h1>
        <div className='cinematic-opening-actions'>
          <Link href='/register' className='cinematic-opening-primary' aria-label='注册账户，开启自己的空间'>开启我的空间<Icon name='arrow' size={18} /></Link>
          <Link href='/memories?scope=public' className='cinematic-opening-secondary' aria-label='浏览公开日常'>借阅人间<Icon name='arrow' size={16} /></Link>
        </div>
      </div>
    </section>
    {view !== null && <MediaViewer assets={sceneImages} initial={view} close={() => setView(null)} zoomControls />}
  </>;
}

export function HomeHero({ user, data, error, onRetry, allowCoverMotion }: { user: UserInfo | null; data?: MemoryList; error?: string; onRetry: () => void; allowCoverMotion: boolean }) {
  const [experience, setExperience] = useState<'postcard' | 'stories' | null>(null);
  if (!user) return <GuestOpening allowMotion={allowCoverMotion} />;
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

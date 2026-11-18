'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { MemorySprite } from '@/components/memory-sprite';
import { ThemeMotif } from '@/components/theme-motif';
import { MemoryAlbum } from './memory-album';
import { MemoryStories } from './stories';
import { PostcardStudio } from './postcard-studio';
import type { MemoryList, UserInfo } from './types';

export function HomeHero({ user, data, error, onRetry }: { user: UserInfo | null; data?: MemoryList; error?: string; onRetry: () => void }) {
  const [experience, setExperience] = useState<'postcard' | 'stories' | null>(null);
  const [focused, setFocused] = useState(false);
  if (!user) return <section className='cinematic-opening' data-camera-frame='' data-focused={focused} aria-labelledby='hero-title'>
    <div className='cinematic-camera-track' aria-hidden='true'>
      <div className='cinematic-opening-art' />
      <div className='cinematic-opening-optics' />
    </div>
    <div className='cinematic-opening-copy'>
      <span className='cinematic-opening-brand'><ThemeMotif /><span>NO SEE BYE</span></span>
      <h1 id='hero-title'>死亡不是终点，<span>遗忘才是。</span></h1>
      <div className='cinematic-opening-actions'>
        <Link href='/register' className='cinematic-opening-primary' aria-label='注册账户，开启自己的空间'>开启我的空间<Icon name='arrow' size={18} /></Link>
        <Link href='/memories?scope=public' className='cinematic-opening-secondary' aria-label='浏览公开日常'>借阅人间<Icon name='arrow' size={16} /></Link>
      </div>
    </div>
    <button className='cinematic-opening-focus' type='button' aria-pressed={focused} onClick={() => setFocused(value => !value)}>
      <Icon name='expand' size={17} />聚焦画面
    </button>
  </section>;
  return <section className='home-observatory' aria-labelledby='hero-title'>
    <header className='home-welcome'><div className='home-welcome-copy'><MemorySprite pose='peek' /><div><span className='welcome-eyebrow'>{user.displayName || user.username} · 岁月小集</span><h1 id='hero-title'>旧日如笺。</h1></div></div><div className='home-small-actions'><button type='button' aria-label='打开心情明信片' title='心情明信片' onClick={() => setExperience('postcard')}><Icon name='postcard' size={19} /><span>明信片</span></button><button type='button' aria-label='播放回忆' title='播放回忆' onClick={() => setExperience('stories')}><Icon name='play' size={18} /><span>回放</span></button></div></header>
    <MemoryAlbum data={data} error={error} onRetry={onRetry} />
    {experience === 'stories' && <MemoryStories photosOnly onClose={() => setExperience(null)} />}
    {experience === 'postcard' && <PostcardStudio user={user} data={data} close={() => setExperience(null)} onSaved={onRetry} />}
  </section>;
}

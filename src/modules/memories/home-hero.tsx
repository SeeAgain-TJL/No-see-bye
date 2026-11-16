'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Daydream } from '@/components/daydream';
import { Icon } from '@/components/icons';
import { MemorySprite } from '@/components/memory-sprite';
import { MemoryAlbum } from './memory-album';
import { MemoryStories } from './stories';
import { PostcardStudio } from './postcard-studio';
import type { MemoryList, UserInfo } from './types';

export function HomeHero({ user, data, error, onRetry }: { user: UserInfo | null; data?: MemoryList; error?: string; onRetry: () => void }) {
  const [experience, setExperience] = useState<'postcard' | 'stories' | null>(null);
  if (!user) return <section className='studio-hero keepsake-hero' aria-labelledby='hero-title'>
    <span className='hero-corner hero-corner-start' aria-hidden='true'>✧</span><span className='hero-corner hero-corner-end' aria-hidden='true'>✧</span>
    <div className='studio-hero-copy'><span className='studio-greeting'><span className='hero-edition'>NO SEE BYE</span><span className='hero-greeting-line' />记忆有回声</span>
      <h1 id='hero-title'>死亡不是终点，<br /><span>遗忘才是。</span></h1>
      <p className='hero-memory-note'>山河有迹，念念有回响。</p>
      <div className='studio-hero-actions'><Link href='/register' className='studio-button' aria-label='注册账户，开启自己的空间'>为光阴落款<Icon name='plus' size={18} /></Link><Link href='/memories?scope=public' className='studio-text-link' aria-label='浏览公开日常'>借阅人间<Icon name='arrow' size={17} /></Link></div>
      <div className='hero-keepsake-footer'><span aria-hidden='true'>✦</span><span lang='en'>Every memory, a little forever.</span><span className='hero-footer-rule' /></div>
    </div><Daydream />
  </section>;
  return <section className='home-observatory' aria-labelledby='hero-title'>
    <header className='home-welcome'><div className='home-welcome-copy'><MemorySprite pose='peek' /><div><span className='welcome-eyebrow'>{user.displayName || user.username} · 岁月小集</span><h1 id='hero-title'>旧日如笺。</h1></div></div><div className='home-small-actions'><button type='button' aria-label='打开心情明信片' title='心情明信片' onClick={() => setExperience('postcard')}><Icon name='postcard' size={19} /><span>明信片</span></button><button type='button' aria-label='播放回忆' title='播放回忆' onClick={() => setExperience('stories')}><Icon name='play' size={18} /><span>回放</span></button></div></header>
    <MemoryAlbum data={data} error={error} onRetry={onRetry} />
    {experience === 'stories' && <MemoryStories onClose={() => setExperience(null)} />}
    {experience === 'postcard' && <PostcardStudio user={user} data={data} close={() => setExperience(null)} onSaved={onRetry} />}
  </section>;
}

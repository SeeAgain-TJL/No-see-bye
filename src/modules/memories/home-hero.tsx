'use client';
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { Icon } from '@/components/icons';
import { useActiveTheme } from '@/components/theme-provider';
import { MediaViewer } from './media';
import { MemoryAlbum } from './memory-album';
import { MemoryStories } from './stories';
import { PostcardStudio } from './postcard-studio';
import type { MemoryList, UserInfo } from './types';

const scenes = [
  { id: 'dusk', label: '旧金山温室', alt: '胶卷拍摄的温室，漫射光落在交叠的枝叶上', credit: { name: 'Sasha Matveeva', url: 'https://unsplash.com/photos/RiQfTa7koCg' } },
  { id: 'sea', label: '莫赫悬崖', alt: '海雾里的莫赫悬崖和起伏的浪', credit: { name: 'Andrej A', url: 'https://unsplash.com/photos/VF6STp3LMNQ' } },
  { id: 'film', label: '复古影院', alt: '空影院内的金色幕布与对称座席', credit: { name: 'Peter Herrmann', url: 'https://unsplash.com/photos/j7-T7aAliSg' } },
  { id: 'night', label: '伯尔尼阿尔卑斯山', alt: '暮色中的山林轮廓与落月', credit: { name: 'Thierry Lemaitre', url: 'https://unsplash.com/photos/PYkzZFieU-8' } },
] as const;
const sceneImages = scenes.map(scene => {
  const url = `/visuals/opening-${scene.id}.webp`;
  return { ...scene, mime: 'image/webp', url, fullUrl: url, thumbnailUrl: `/visuals/opening-${scene.id}-preview.webp` };
});

function GuestOpening() {
  const theme = useActiveTheme();
  const [focus, setFocus] = useState(false);
  const [focalLength, setFocalLength] = useState(120);
  const [view, setView] = useState<number | null>(null);
  const sceneIndex = scenes.findIndex(scene => scene.id === theme);

  return <>
    <section className='cinematic-opening' data-camera-frame='' data-focused={focus} aria-labelledby='hero-title'
      style={{ '--opening-zoom': focus ? focalLength / 100 : 1.012 } as CSSProperties}>
      <div className='cinematic-camera-track' aria-hidden='true'>
        <div className='cinematic-opening-art' />
        <div className='cinematic-opening-optics' />
      </div>
      <div className='cinematic-opening-copy'>
        <span className='cinematic-opening-brand'><BrandMark /><span>不说再见</span></span>
        <h1 id='hero-title'>死亡不是终点，<span>遗忘才是。</span></h1>
        <div className='cinematic-opening-actions'>
          <Link href='/register' className='cinematic-opening-primary' aria-label='注册账户，开启自己的空间'>开启我的空间<Icon name='arrow' size={18} /></Link>
          <Link href='/memories?scope=public' className='cinematic-opening-secondary' aria-label='浏览公开日常'>借阅人间<Icon name='arrow' size={16} /></Link>
        </div>
      </div>
      <div className='opening-viewfinder'>
        <button className='cinematic-opening-focus' type='button' aria-expanded={focus} aria-controls='opening-lens' onClick={() => setFocus(value => !value)}>
          <Icon name='expand' size={17} />调整取景
        </button>
        <div id='opening-lens' className='opening-lens' hidden={!focus}>
          <label htmlFor='opening-zoom'>画面缩放 <output htmlFor='opening-zoom'>{focalLength}%</output></label>
          <input id='opening-zoom' type='range' min={102} max={160} value={focalLength} onChange={event => setFocalLength(Number(event.target.value))} />
          <button type='button' onClick={() => setView(sceneIndex)}>查看整幅照片<Icon name='arrow' size={15} /></button>
        </div>
      </div>
      <button type='button' className='opening-photo-label' onClick={() => setView(sceneIndex)} aria-label={`查看整幅照片，${scenes[sceneIndex].label}`}>
        <Icon name='image' size={15} />{scenes[sceneIndex].label}<Icon name='arrow' size={15} />
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

'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { ThemeMotif } from '@/components/theme-motif';
import { dateText } from '@/lib/client';
import { moodLabel } from './moods';
import { MediaGrid } from './media';
import type { Memory } from './types';

export function CollectionCard({ memory, index = 0 }: { memory: Memory; index?: number }) {
  const href = '/memories/' + memory.id;
  const context = [memory.location, moodLabel(memory.mood)].filter(Boolean).join(' · ');
  return <article className={'recent-entry keepsake-entry' + (!memory.assets.length ? ' recent-entry-note' : '')} data-keepsake={index % 3}>
    <span className='motion-spotlight' aria-hidden='true' />
    <div className='keepsake-trim' aria-hidden='true'><span className='keepsake-tape' /><span className='keepsake-number'>NO. {String(index + 1).padStart(2, '0')}</span><ThemeMotif className='keepsake-flower' /></div>
    {!!memory.assets.length && <div className='recent-entry-cover'><MediaGrid assets={memory.assets} compact /></div>}
    <div className='recent-entry-info'>
      <div className='recent-entry-meta'><Link href={href} aria-label={'打开' + dateText(memory.happenedAt) + '的日常'}><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { year: 'numeric', month: 'long', day: 'numeric' })}</time></Link><span title={memory.visibility === 'public' ? '公开日常' : '仅自己可见'}><Icon name={memory.visibility === 'public' ? 'globe' : 'lock'} size={13} /><span className='sr-only'>{memory.visibility === 'public' ? '公开日常' : '仅自己可见'}</span></span></div>
      {memory.title && <Link href={href} className='recent-entry-title'><h3>{memory.title}</h3></Link>}
      {memory.content && <p className='recent-entry-excerpt'>{memory.content}</p>}
      <div className='recent-entry-footer'><span className='recent-entry-context'>{context}</span><Link href={href} className='entry-open' aria-label={'打开' + dateText(memory.happenedAt) + '的日常'}><Icon name='arrow' size={18} /></Link></div>
    </div>
  </article>;
}

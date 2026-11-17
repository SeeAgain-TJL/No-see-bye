"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Icon } from "@/components/icons";
import { ThemeMotif } from "@/components/theme-motif";
import { dateText } from "@/lib/client";
import type { Memory } from "./types";

const editions = [
  ["dusk", "THE INNER GARDEN", "一念生春，万物有迹。", "草木有本心，光阴自成诗。"],
  ["sea", "LETTERS TO THE SELF", "潮汐往复，此心有岸。", "流水带走岁月，纸笺留下回声。"],
  ["film", "A STUDY OF PASSING TIME", "浮生如寄，片刻可留。", "光落在底片上，时间便有了形状。"],
  ["night", "THE PRIVATE CONSTELLATION", "长夜有星，往事有光。", "人是散落的日子，也是亲手连起的星河。"],
] as const;

function JournalScene() {
  return <div className="journal-cover-scene" aria-hidden="true">
    <div className="journal-scene-orbit" />
    <svg className="journal-landscape" viewBox="0 0 420 260" fill="none">
      <g data-journal-scene="dusk" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M77 242c19-81 67-147 166-214M180 249c20-62 32-109 25-164" />
        <path d="M137 133C61 141 56 90 72 69c50 3 77 30 65 64ZM201 80c-43-41-19-70 11-69 30 30 16 54-11 69ZM123 167c65-35 110-14 114 16-49 25-89 13-114-16ZM197 162c-7-51 18-76 48-67 8 42-10 61-48 67ZM90 210c-34-22-68-13-65 14 31 15 54 7 65-14Z" fill="currentColor" fillOpacity=".1" />
        <circle cx="303" cy="69" r="31" strokeDasharray="2 8" /><circle cx="303" cy="69" r="20" strokeOpacity=".4" />
        <path d="M280 208h84m-60-7v14m15-14v14m15-14v14m15-14v14" strokeOpacity=".5" />
      </g>
      <g data-journal-scene="sea" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 165c64-57 103 42 171-2s120-28 176 4 64-24 77-28M-11 195c70-57 109 42 177-2s120-28 176 4 64-24 87-28M-7 226c64-57 103 42 171-2s120-28 176 4 64-24 87-28" />
        <circle cx="272" cy="67" r="45" fill="currentColor" fillOpacity=".08" strokeOpacity=".2" />
        <circle cx="92" cy="80" r="9" /><circle cx="110" cy="51" r="4" />
        <path d="m156 133 18-48 26 42-44 6Zm-9 2 63-6-11 13-40 2Z" fill="currentColor" fillOpacity=".12" />
        <path d="M333 242 278 196c-12-18 3-27 14-20-2-20 21-25 31-9 9-19 34-16 35 7 20-9 36 10 25 25 23 10 11 29 0 34l-43 13Zm0 0-39-60m39 60-10-67m10 67 20-59m-20 59 44-36" />
      </g>
      <g data-journal-scene="film" stroke="currentColor" strokeWidth="1.5">
        <g transform="rotate(-11 202 130)"><rect x="58" y="34" width="296" height="196" rx="5" fill="currentColor" fillOpacity=".07" /><path d="M58 65h296M58 198h296" strokeOpacity=".5" /><rect x="91" y="83" width="104" height="97" /><rect x="210" y="83" width="111" height="97" /><path d="m96 163 35-29 23 15 22-45 16 59m22-9 30-35 26 21 45-43" strokeOpacity=".5" />
        <path d="M74 49h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m-264 165h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13m14 0h13" strokeWidth="6" /></g>
        <circle cx="334" cy="63" r="34" strokeDasharray="2 4" /><path d="M311 60h47m-40 10h33" strokeOpacity=".5" />
      </g>
      <g data-journal-scene="night" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="m42 149 66-93 97 47 71-69 83 117-82 65-72-113-43 112L42 149Z" strokeOpacity=".35" />
        <path d="m42 149 120 66 115 1 82-65M108 56l54 159" strokeDasharray="3 8" strokeOpacity=".45" />
        <circle cx="42" cy="149" r="3" fill="currentColor" /><circle cx="108" cy="56" r="4" fill="currentColor" /><circle cx="205" cy="103" r="3" fill="currentColor" /><circle cx="276" cy="34" r="4" fill="currentColor" /><circle cx="359" cy="151" r="3" fill="currentColor" /><circle cx="277" cy="216" r="4" fill="currentColor" /><circle cx="162" cy="215" r="3" fill="currentColor" />
        <path d="M335 9a32 32 0 1 0 44 40c-38 12-58-10-44-40Z" fill="currentColor" fillOpacity=".12" />
        <path d="m68 30 2 7 7 2-7 2-2 7-2-7-7-2 7-2Zm265 190 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="currentColor" />
      </g>
    </svg>
    <span className="journal-scene-caption"><ThemeMotif /><span>NO SEE BYE<br />EVERYDAY COLLECTION</span></span>
  </div>;
}

export function JournalAtmosphere({ title, items, publicScope, view, onView, ownerName, month, search, pinned, onFilter }: {
  title: string; items: Memory[]; publicScope: boolean; view: string; onView: (view: string) => void;
  ownerName?: string; month: string; search: string; pinned: boolean;
  onFilter: (name: 'month' | 'q' | 'pinned', value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const directoryId = useId();
  const router = useRouter();
  const monthFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' });
  const months = new Map<string, number>();
  const topics = new Map<string, number>();
  for (const memory of items) {
    const key = monthFormat.format(new Date(memory.happenedAt));
    months.set(key, (months.get(key) || 0) + 1);
    for (const topic of new Set([...memory.tags, memory.location].map(value => value.trim().slice(0, 100)).filter(Boolean))) topics.set(topic, (topics.get(topic) || 0) + 1);
  }
  const paths = [...topics].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  function locate(memory: Memory) {
    const target = document.getElementById('journal-entry-' + memory.id);
    if (target) {
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    }
  }
  return <>
    <header className={'journal-cover journal-editorial-cover motion-surface ' + (publicScope ? 'journal-open-horizon' : 'journal-personal-book')} aria-label={title}>
      <span className="motion-spotlight" aria-hidden="true" />
      <div className="journal-cover-copy">
        <div className="journal-edition"><span className="journal-edition-number">{publicScope ? 'COMMON GROUND' : 'PRIVATE JOURNAL'}</span><span className="journal-edition-rule" />{publicScope ? <span>发现日常</span> : <span>{ownerName || '我的日常'} · 私人卷册</span>}</div>
        <h1>{publicScope ? <>世界广阔，<br />借一页相逢。</> : <>此心有迹，<br />岁月成书。</>}</h1>
        <div className="journal-theme-story">{publicScope ? <><h2>他人的片刻，亦是人间的注脚。</h2><p>We see the world not once, but through a thousand eyes.</p></> : editions.map(([theme, , headline, note]) => <div key={theme} data-journal-copy={theme}><h2>{headline}</h2><p>{note}</p></div>)}</div>
        <div className="journal-cover-actions">
          {publicScope ? <button type="button" className="journal-directory-toggle" disabled={!items.length} onClick={() => { const memory = items[Math.floor(Math.random() * items.length)]; if (memory) router.push('/memories/' + memory.id); }} aria-label="随机打开一条公开日常"><Icon name="spark" size={17} />偶遇一页<Icon name="arrow" size={16} /></button> : <Link className="journal-directory-toggle" href="/memories/new" aria-label="创建日常"><Icon name="edit" size={17} />落笔此刻<Icon name="plus" size={16} /></Link>}
          <button type="button" className="journal-cover-write" aria-expanded={expanded} aria-controls={directoryId} onClick={() => setExpanded(v => !v)}><Icon name="book" size={16} />{expanded ? '合上卷目' : publicScope ? '人间卷目' : '翻开卷目'}<Icon name="arrow" size={15} /></button>
        </div>
      </div>
      {publicScope ? <aside className="discovery-compass">
        <div className="discovery-compass-art" aria-hidden="true"><span className="compass-orbit compass-orbit-one" /><span className="compass-orbit compass-orbit-two" /><span className="compass-orbit compass-orbit-three" /><Icon name="globe" size={72} /><span className="compass-north">N</span><span className="compass-south">S</span><span className="compass-star">✦</span></div>
        <div className="discovery-topic-heading"><span>PATHS TO WANDER</span><span>循字漫游</span></div>
        {paths.length ? <div className="discovery-topics">{paths.map(([topic]) => <button key={topic} type="button" aria-label={'搜索公开日常：' + topic} aria-pressed={search === topic} onClick={() => onFilter('q', search === topic ? '' : topic)}><span>{topic}</span><Icon name="arrow" size={13} /></button>)}</div> : <p className="discovery-no-topics">世间每一页，都是未至之地。</p>}
      </aside> : <aside className="journal-month-index">
        <JournalScene />
        <div className="journal-index-heading">{editions.map(([theme, eyebrow]) => <span key={theme} data-journal-copy={theme}>{eyebrow}</span>)}<ThemeMotif /></div>
        <p className="journal-index-title">页角有年轮</p>
        {months.size ? <div className="journal-months" aria-label="当前篇章的月份索引">{[...months].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4).map(([key, count], index) => <button key={key} type="button" aria-label={'筛选' + key.replace('-', '年') + '月的日常，当前列表中有' + count + '篇'} aria-pressed={month === key} onClick={() => onFilter('month', month === key ? '' : key)}><span className="chapter-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{Number(key.slice(5))} 月</strong><small>{key.slice(0, 4)} · {count} 篇拾遗</small></span><Icon name="arrow" size={15} /></button>)}</div> : <p className="journal-index-empty">此书尚薄，来日方长。</p>}
        <button type="button" className="journal-index-bookmark" aria-label={pinned ? '查看全部日常' : '只看收藏的日常'} aria-pressed={pinned} onClick={() => onFilter('pinned', pinned ? '' : '1')}><Icon name="pin" size={15} />{pinned ? '重读全卷' : '重读珍藏'}<Icon name="arrow" size={14} /></button>
      </aside>}
      <div className="journal-cover-foot"><span>{publicScope ? 'NO TWO LIVES SEE THE SAME SKY.' : 'TO REMEMBER IS TO LIVE TWICE.'}</span><Link href={publicScope ? '/memories' : '/memories?scope=public'}>{publicScope ? '回到自己的卷册' : '去看万般人生'}<Icon name="arrow" size={12} /></Link></div>
    </header>
    <section id={directoryId} className="journal-directory" data-expanded={expanded} aria-label="当前日常目录" hidden={!expanded}>
      <div className="journal-directory-heading"><div><span>{publicScope ? 'AN ATLAS OF MOMENTS' : 'READ YOUR DAYS'}</span><h2>{publicScope ? '有字处，即是远方' : '循笺寻旧日'}</h2></div><p>循眼前篇章，拾散落时光。</p></div>
      <div className="journal-directory-views" role="group" aria-label="目录浏览方式">{[['grid', '卡片', 'grid'], ['timeline', '时间线', 'list'], ['gallery', '照片墙', 'image']].map(([value, label, icon]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => onView(value)}><Icon name={icon} size={16} />{label}</button>)}</div>
      {items.length ? <ol>{items.map((memory, index) => <li key={memory.id}><span className="journal-directory-index">{String(index + 1).padStart(2, '0')}</span><div><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: 'long', day: 'numeric' })}</time><Link href={'/memories/' + memory.id}>{memory.title || memory.content?.slice(0, 36) || '光影无言，往事有声'}</Link></div>{view !== 'gallery' && <button type="button" onClick={() => locate(memory)} aria-label={'定位到第 ' + (index + 1) + ' 条日常'}><Icon name="arrow" size={18} /></button>}</li>)}</ol> : <p className="journal-directory-empty">未至之页，尚待时光落笔。</p>}
    </section>
  </>;
}

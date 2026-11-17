"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "@/components/icons";
import { ThemeMotif } from "@/components/theme-motif";
import { dateText } from "@/lib/client";
import type { Memory } from "./types";

const editions = [
  ["dusk", "GARDEN JOURNAL", "把日子，种成一座花园。", "一页一页，让小事慢慢生长。"],
  ["sea", "LETTERS FROM THE TIDE", "每段日常，都是一封来信。", "潮水退去以后，仍有值得留下的片刻。"],
  ["film", "THE EVERYDAY ARCHIVE", "让平凡，成为珍贵的底片。", "按下快门的那一刻，时间有了形状。"],
  ["night", "A PRIVATE OBSERVATORY", "散落的日子，也会连成星座。", "把光收好，等想念的时候再打开。"],
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

export function JournalAtmosphere({ title, items, publicScope, view, onView }: {
  title: string; items: Memory[]; publicScope: boolean; view: string; onView: (view: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const directoryId = useId();
  function locate(memory: Memory) {
    const target = document.getElementById('journal-entry-' + memory.id);
    if (target) {
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    }
  }
  return <>
    <header className="journal-cover motion-surface">
      <span className="motion-spotlight" aria-hidden="true" />
      <div className="journal-cover-copy">
        <div className="journal-edition"><span className="journal-edition-number">01 —</span>{editions.map(([theme, eyebrow]) => <span key={theme} data-journal-copy={theme}>{eyebrow}</span>)}</div>
        <h1>{title}<span className="journal-cover-period">.</span></h1>
        <div className="journal-theme-story">{editions.map(([theme, , headline, note]) => <div key={theme} data-journal-copy={theme}><h2>{headline}</h2><p>{publicScope ? '借一页人间，见万般风景。' : note}</p></div>)}</div>
        <div className="journal-cover-actions">
          <button type="button" className="journal-directory-toggle" aria-expanded={expanded} aria-controls={directoryId} onClick={() => setExpanded(v => !v)}><Icon name="book" size={17} />{expanded ? '收起日常目录' : '展开日常目录'}<Icon name="arrow" size={16} /></button>
          <Link className="journal-cover-write" href="/memories/new">续写一页<Icon name="plus" size={17} /></Link>
        </div>
      </div>
      <JournalScene />
      <div className="journal-cover-foot"><span>YOUR DAYS, BEAUTIFULLY KEPT.</span><span>{items.length ? `${String(items.length).padStart(2, '0')} 段已加载的日常` : '等待下一段故事'}</span></div>
    </header>
    <section id={directoryId} className="journal-directory" data-expanded={expanded} aria-label="当前日常目录" hidden={!expanded}>
      <div className="journal-directory-heading"><div><span>READ YOUR DAYS</span><h2>循笺寻旧日</h2></div><p>目录随当前筛选更新</p></div>
      <div className="journal-directory-views" role="group" aria-label="目录浏览方式">{[['grid', '卡片', 'grid'], ['timeline', '时间线', 'list'], ['gallery', '照片墙', 'image']].map(([value, label, icon]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => onView(value)}><Icon name={icon} size={16} />{label}</button>)}</div>
      {items.length ? <ol>{items.map((memory, index) => <li key={memory.id}><span className="journal-directory-index">{String(index + 1).padStart(2, '0')}</span><div><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: 'long', day: 'numeric' })}</time><Link href={'/memories/' + memory.id}>{memory.title || memory.content?.slice(0, 36) || '这一刻的影像'}</Link></div>{view !== 'gallery' && <button type="button" onClick={() => locate(memory)} aria-label={'定位到第 ' + (index + 1) + ' 条日常'}><Icon name="arrow" size={18} /></button>}</li>)}</ol> : <p className="journal-directory-empty">当前还没有已加载的日常，换个筛选或写下新的一页吧。</p>}
    </section>
  </>;
}

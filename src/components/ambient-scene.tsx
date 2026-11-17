"use client";
import { useId, type CSSProperties } from "react";
import { Icon } from "./icons";

const editions = [
  ['dusk', '借一阵风', '风穿过了纸页'], ['sea', '唤一场潮', '潮汐正在靠岸'],
  ['film', '放映旧光', '旧光开始流动'], ['night', '拾一夜星', '星河已在途中'],
] as const;
type Edition = typeof editions[number][0];
const travelers = [
  { x: 8, y: 19, size: 31, delay: -3, duration: 22 },
  { x: 87, y: 32, size: 38, delay: -14, duration: 27 },
  { x: 14, y: 74, size: 23, delay: -9, duration: 24 },
  { x: 78, y: 83, size: 29, delay: -20, duration: 31 },
  { x: 48, y: 7, size: 19, delay: -17, duration: 29 },
];

/** The same four small visitors recur in the scenery and in its switch. */
function Visitor({ theme }: { theme: Edition }) {
  return <svg viewBox="0 0 80 70" fill="none" className={'world-visitor world-visitor-' + theme} aria-hidden="true">
    {theme === 'dusk' && <>
      <g className="world-wing world-wing-left"><path d="M39 36C25 4 3 8 8 28c3 10 13 13 31 8Z" fill="var(--world-petal)" /><path d="M39 36C9 32 15 62 30 53l9-17Z" fill="var(--world-soft)" /><path d="M12 22c10 0 18 7 24 12m-11 9 11-7" stroke="var(--world-ink)" strokeOpacity=".4" /></g>
      <g className="world-wing world-wing-right"><path d="M40 36C54 4 76 8 71 28c-3 10-13 13-31 8Z" fill="var(--world-petal)" /><path d="M40 36c30-4 24 26 9 17l-9-17Z" fill="var(--world-soft)" /><path d="M67 22c-10 0-18 7-24 12m11 9-11-7" stroke="var(--world-ink)" strokeOpacity=".4" /></g>
      <path d="m39 28 1 18m-1-18-4-7m5 7 5-7" stroke="var(--world-ink)" strokeWidth="1.2" strokeLinecap="round" />
    </>}
    {theme === 'sea' && <g className="world-fish-body">
      <path d="M15 36C28 17 49 19 63 34 49 48 28 53 15 36Z" fill="var(--world-petal)" /><path className="world-fish-tail" d="m61 34 15-13-2 24-13-11Z" fill="var(--world-soft)" />
      <path d="m31 22 13-9 6 11m-19 22 10 7 9-9" fill="var(--world-soft)" /><path d="M29 28c-3 5-3 10 0 15m6-10 12 2-12 5" stroke="var(--world-ink)" strokeOpacity=".4" /><circle cx="23" cy="34" r="1.5" fill="var(--world-ink)" /><path d="M12 21h1m-8 9h1" stroke="var(--world-petal)" strokeWidth="2" strokeLinecap="round" />
    </g>}
    {theme === 'film' && <>
      <path className="world-bird-wing" d="M39 37C25 19 12 9 1 15c13 1 15 24 35 26L25 54l17-12c17-4 25-15 36-22-19 0-29 8-39 17Z" fill="var(--world-petal)" />
      <path d="m38 38 13 5-10 2-7-3m6-3-18-8" stroke="var(--world-ink)" strokeWidth="1" strokeOpacity=".55" /><path d="m25 54 13-9" stroke="var(--world-soft)" />
    </>}
    {theme === 'night' && <>
      <g className="world-wing world-wing-left"><path d="M40 33C21 5 2 17 5 33c1 9 14 9 25 8-3 7-3 15 1 22l9-30Z" fill="var(--world-petal)" /><path d="M14 26c7-3 12 1 16 7m-8-7 2 3" stroke="var(--world-ink)" strokeOpacity=".55" /></g>
      <g className="world-wing world-wing-right"><path d="M40 33c19-28 38-16 35 0-1 9-14 9-25 8 3 7 3 15-1 22l-9-30Z" fill="var(--world-soft)" /><path d="M66 26c-7-3-12 1-16 7m8-7-2 3" stroke="var(--world-ink)" strokeOpacity=".55" /></g>
      <path d="M40 28v18m-1-19-4-7m6 7 4-7" stroke="var(--world-ink)" strokeWidth="1.3" strokeLinecap="round" /><path d="m40 8 1-3 1 3-1 3Z" fill="var(--world-petal)" />
    </>}
  </svg>;
}

function BorderScenery({ theme, id }: { theme: Edition; id: string }) {
  return <svg className={'world-border-art world-border-' + theme} viewBox="0 0 420 280" fill="none" aria-hidden="true">
    {theme === 'dusk' && <>
      <g className="world-grass world-grass-back"><path d="M80 280C60 187 80 124 149 47m-52 210c54-51 87-90 115-156m-81 179c10-63 51-96 110-115" stroke="currentColor" strokeWidth="1.2" />
        <path d="M95 175c-35 0-48-24-42-46 25 9 39 25 42 46Zm34-57c-18-21-15-41 5-57 10 22 10 39-5 57Zm43 68c-4-30 6-50 35-57-2 30-14 45-35 57Zm33 29c-1-21 12-34 38-34-7 23-20 33-38 34Z" fill="var(--world-soft)" fillOpacity=".56" /></g>
      <g className="world-grass world-grass-front"><path d="M25 280c27-71 31-105 19-144m12 144c24-63 39-99 81-120m-64 120c56-23 94-25 131-8" stroke="currentColor" strokeWidth="1.3" /><path d="M50 221c-25-10-36-27-29-43 20 7 29 21 29 43Zm40 1c-5-21 8-40 31-45 1 23-8 38-31 45Z" fill="var(--world-petal)" fillOpacity=".65" /></g>
      <path className="world-drift-line" d="M133 110c45-48 87-1 128-29s69-7 87-21" stroke="currentColor" strokeWidth=".8" strokeDasharray="3 7" />
    </>}
    {theme === 'sea' && <>
      <g className="world-tide-lines">{[0,1,2,3,4].map(i => <path key={i} d={`M-45 ${184+i*18}c76-68 135 39 220-8s152-45 270-8`} stroke="currentColor" strokeWidth={i === 2 ? '1.2' : '.65'} opacity={1-i*.12} />)}</g>
      <path d="M65 280c1-54 38-63 31-117 21 24 1 55 11 68 12-43 48-41 42-80 21 30-8 65-18 82 22-17 50-18 57-40-1 43-36 47-50 87Z" fill="var(--world-soft)" fillOpacity=".5" />
      {[0,1,2,3].map(i => <circle key={i} className="world-water-bead" cx={235+i*29} cy={100+(i%3)*32} r={3+i%2*2} stroke="currentColor" strokeWidth=".8" style={{'--world-item': i} as CSSProperties} />)}
    </>}
    {theme === 'film' && <>
      <g className="world-film-sweep"><path d="M-20 249c153-146 258 45 466-102m-466 128c153-146 258 45 466-102" stroke="currentColor" strokeWidth="1" />
        <path d="M22 220c156-112 247 50 400-47" stroke="var(--world-soft)" strokeWidth="15" strokeDasharray="6 12" opacity=".6" />
      </g>
      <path d="M237 127h26m-13-13v26m54 30h14m-7-7v14" stroke="currentColor" strokeWidth=".8" />
      <text x="135" y="242" fill="currentColor" fontSize="7" letterSpacing="4">LIGHT / FRAME / MEMORY</text>
    </>}
    {theme === 'night' && <>
      <defs><mask id={id + '-moon'}><circle cx="296" cy="89" r="29" fill="white" /><circle cx="307" cy="78" r="28" fill="black" /></mask></defs>
      <circle cx="296" cy="89" r="29" fill="var(--world-petal)" mask={'url(#' + id + '-moon)'} />
      <path className="world-constellation" d="m104 183 59-65 48 46 57-61 58 42" stroke="currentColor" strokeWidth=".6" strokeDasharray="2 6" />
      {[[104,183],[163,118],[211,164],[268,103],[326,145],[365,76],[234,45]].map(([x,y], i) => <g key={i} className="world-star-point" style={{'--world-item': i} as CSSProperties}><path d={`M${x-3} ${y}h6m-3-3v6`} stroke="currentColor" strokeWidth=".8" /><circle cx={x} cy={y} r="1.4" fill="var(--world-petal)" /></g>)}
      <path d="M28 280c74-73 98-103 111-160m-53 160c77-74 127-57 174-95m-110 95c84-45 139-29 193-54" stroke="var(--world-soft)" strokeWidth="1" opacity=".6" />
    </>}
  </svg>;
}

/** Unmasked visitors make the change visible immediately; every layer passes input through. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  const id = useId().replace(/:/g, '');
  return <div className="immersive-environment world-environment" data-awake={awake}>
    <div className="world-atmosphere" aria-hidden="true">{editions.map(([theme]) => <div key={theme} className={'world-ground world-ground-' + theme} data-world-theme={theme}><span /><span /><span /></div>)}</div>
    {awake && <div className="world-choreography" aria-hidden="true">
      {editions.map(([theme]) => <div className={'world-scene world-scene-' + theme} data-world-theme={theme} key={theme}>
        <BorderScenery theme={theme} id={id + theme} />
        <div className="world-first-flight"><Visitor theme={theme} /><span className="world-first-trail" /></div>
        {travelers.map((item, index) => <span className={'world-traveler world-traveler-' + index} key={index} style={{ '--visitor-x': item.x + '%', '--visitor-y': item.y + '%', '--visitor-size': item.size + 'px', '--visitor-delay': item.delay + 's', '--visitor-duration': item.duration + 's', '--visitor-turn': index % 2 ? '-1' : '1' } as CSSProperties}><Visitor theme={theme} /></span>)}
        <div className="world-perched-visitor"><Visitor theme={theme} /><i /><i /><i /></div>
      </div>)}
    </div>}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '让整页风景归于宁静' : '唤起当前主题的全页风景'}>
      <span className="world-switch-mark" aria-hidden="true">{editions.map(([theme]) => <span data-world-invitation={theme} key={theme}><Visitor theme={theme} /></span>)}</span>
      {awake ? <span className="world-switch-label">归于静处</span> : editions.map(([theme, label]) => <span className="world-switch-label" key={theme} data-world-invitation={theme}>{label}</span>)}
      <Icon name={awake ? 'pause' : 'spark'} size={14} />
    </button>
    <span className="sr-only" role="status">{awake ? editions.map(([theme,,status]) => <span key={theme} data-world-invitation={theme}>{status}</span>) : '全页主题动效已关闭'}</span>
  </div>;
}

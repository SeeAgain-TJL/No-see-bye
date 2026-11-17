"use client";
import { Icon } from "./icons";
import type { CSSProperties } from "react";

const invitations = [['dusk', '让风翻页'], ['sea', '听潮生长'], ['film', '让旧光流动'], ['night', '与夜色同游']] as const;
const streamPath = 'M80-60C-20 80 166 180 73 312S-12 548 78 664 115 794 70 880';
const leaves = [
  'M78 452C44 451 29 432 22 409c31 5 47 18 56 43Z',
  'M78 420c35-8 51-30 55-56-31 12-46 30-55 56Z',
  'M77 373C47 365 36 343 35 319c27 11 40 29 42 54Z',
  'M87 326c34-7 54-28 63-56-31 8-53 28-63 56Z',
  'M105 276c-28-12-39-33-37-61 26 14 38 35 37 61Z',
  'M122 228c30-4 50-24 59-48-29 5-48 22-59 48Z',
  'M143 175c-25-11-34-34-30-60 23 15 34 35 30 60Z',
  'M156 125c26-5 40-21 44-44-23 7-38 23-44 44Z',
  'M170 73c-15-18-16-38-7-58 14 17 16 36 7 58Z',
];
const grains = Array.from({ length: 22 }, (_, i) => ({
  '--grain-x': `${9 + (i * 19) % 62}px`,
  '--grain-y': `${(i * 37 + 13) % 100}%`,
  '--grain-delay': `${-(i * 1.7)}s`,
  '--grain-size': `${i % 4 === 0 ? 1.8 : 1}px`,
} as CSSProperties));

function BotanicalSpray({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 220 560" fill="none">
    <g className="world-botanical-stem">
      <path className="world-branch-line" d="M62 560c37-89 3-158 28-238S163 152 168 26" />
      {leaves.map((d, i) => <path className="world-leaf-silhouette" key={i} d={d} />)}
    </g>
    <g className="world-botanical-rear"><path d="M24 560C-6 462 54 411 20 302m6 209-24-30m18-47 25-42m-23-2-19-28m18-14 17-35" /></g>
  </svg>;
}

/** Quiet layers stay in the viewport margins and remain transparent to input. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  return <div className="immersive-environment world-environment" data-awake={awake}>
    <div className="world-atmosphere" aria-hidden="true">{invitations.map(([theme]) => <div key={theme} className={'world-ground world-ground-' + theme} data-world-theme={theme}><span /><span /><span /></div>)}</div>
    {awake && <div className="world-choreography" aria-hidden="true">
      <div className="world-scene world-wind" data-world-theme="dusk">
        <BotanicalSpray className="world-botanical world-botanical-left" />
        <BotanicalSpray className="world-botanical world-botanical-right" />
        {[0, 1].map(i => <svg key={i} className={'world-air-line world-air-line-' + i} viewBox="0 0 180 800" preserveAspectRatio="none" fill="none"><path d={streamPath} /><path className="world-stream-trace" d={streamPath} pathLength="1" /></svg>)}
      </div>
      <div className="world-scene world-tide" data-world-theme="sea">
        {[0, 1].map(i => <svg key={i} className={'world-water-current world-water-current-' + i} viewBox="0 0 180 800" preserveAspectRatio="none" fill="none">{[0, 1, 2, 3].map(n => <g key={n} transform={`translate(${n * 14} 0)`}><path d={streamPath} /><path className="world-stream-trace" d={streamPath} pathLength="1" /></g>)}</svg>)}
        <svg className="world-waterline" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="none">{[0, 1, 2, 3, 4].map(i => <path key={i} d={`M-160 ${63 + i * 17}C140 ${-37 + i * 17} 300 ${180 + i * 17} 620 ${67 + i * 17}S1120 ${6 + i * 17} 1600 ${80 + i * 17}`} />)}</svg>
      </div>
      <div className="world-scene world-cinema" data-world-theme="film">
        {[0, 1].map(i => <div className={'world-film-edge world-film-edge-' + i} key={i}><div className="world-film-transport">{Array.from({ length: 36 }, (_, n) => <span key={n} />)}</div></div>)}
        {[0, 1].map(i => <div key={i} className={'world-film-grain world-film-grain-' + i}>{grains.map((style, n) => <i key={n} style={style} />)}</div>)}
      </div>
      <div className="world-scene world-cosmos" data-world-theme="night">
        {[0, 1].map(i => <svg key={i} className={'world-night-trail world-night-trail-' + i} viewBox="0 0 180 800" preserveAspectRatio="none" fill="none"><path d="M-20 90C160 155-30 310 106 470S-10 680 160 835" /><path className="world-stream-trace" pathLength="1" d="M-20 90C160 155-30 310 106 470S-10 680 160 835" /></svg>)}
        {[0, 1].map(i => <div key={i} className={'world-night-field world-night-field-' + i}>{grains.slice(0, 11).map((style, n) => <i key={n} style={style} />)}</div>)}
      </div>
    </div>}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '让整页风景归于宁静' : '唤起当前主题的全页风景'}>
      <span className="world-switch-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><path d="M3 17c6-8 10-8 16-4 3 2 5 1 6-2M3 22c6-8 10-8 16-4 3 2 5 1 6-2M5 11c4-5 8-6 12-4" /><circle cx="21" cy="6" r="1.5" /></svg></span>
      {awake ? <span className="world-switch-label">归于静处</span> : invitations.map(([theme, label]) => <span className="world-switch-label" key={theme} data-world-invitation={theme}>{label}</span>)}
      <Icon name={awake ? 'pause' : 'spark'} size={14} />
    </button>
  </div>;
}

"use client";

import { useId } from "react";
import { Icon } from "./icons";
import type { ThemeName } from "@/lib/themes";

const invitations = [
  ["forest", "唤起萤火", "森林里亮起萤火"],
  ["iceberg", "看冰晶落下", "冰晶沿冷空气落下"],
  ["grassland", "借一阵风", "蝶影随风而起"],
  ["rift", "点亮灯河", "暖灯沿峡谷升起"],
  ["ocean", "唤一场潮", "鱼群沿潮水游过"],
] as const;

function Butterfly() {
  const id = useId();
  return <svg viewBox="0 0 80 70" className="world-mark world-butterfly" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="var(--world-shine)" /><stop offset=".7" stopColor="var(--world-petal)" /><stop offset="1" stopColor="var(--world-soft)" />
      </linearGradient>
    </defs>
    <g className="world-wing" stroke="var(--world-ink)" strokeOpacity=".55">
      <path d="M39 37C22 3 4 5 6 23c1 8 7 13 16 16-13 2-9 19 1 18 8-1 14-11 16-20Z" fill={`url(#${id})`} />
      <path d="M10 18c10 1 19 7 26 16M15 46c8-1 15-5 21-9m-15-9 1-7m3 24 3 4" strokeWidth=".7" />
      <circle cx="17" cy="24" r=".8" fill="var(--world-shine)" />
    </g>
    <g className="world-wing world-wing-right" stroke="var(--world-ink)" strokeOpacity=".55">
      <path d="M41 37C58 3 76 5 74 23c-1 8-7 13-16 16 13 2 9 19-1 18-8-1-14-11-16-20Z" fill={`url(#${id})`} />
      <path d="M70 18c-10 1-19 7-26 16m21 12c-8-1-15-5-21-9m15-9-1-7m-3 24-3 4" strokeWidth=".7" />
      <circle cx="63" cy="24" r=".8" fill="var(--world-shine)" />
    </g>
    <path d="M40 27v20m0-19c-1-5-3-7-5-8m5 8c1-5 3-7 5-8" stroke="var(--world-ink)" strokeWidth="1.55" strokeLinecap="round" />
  </svg>;
}

function Fish() {
  const id = useId();
  return <svg viewBox="0 0 84 56" className="world-mark world-fish" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="var(--world-ink)" /><stop offset=".48" stopColor="var(--world-petal)" /><stop offset="1" stopColor="var(--world-shine)" />
      </linearGradient>
    </defs>
    <path className="world-fish-tail" d="M58 27c10-3 14-10 21-12-3 5-7 9-7 13 0 5 4 10 7 15-7-2-14-9-21-12Z" fill="var(--world-soft)" stroke="var(--world-petal)" strokeWidth=".8" />
    <path d="M23 18c7-6 16-11 24-11l-4 5 10 7m-19 18 13 11 7-13" fill="var(--world-soft)" stroke="var(--world-petal)" strokeWidth=".7" />
    <path d="M6 27c13-17 35-17 54 1-16 15-41 19-54-1Z" fill={`url(#${id})`} />
    <path d="M19 20c-3 4-4 10 0 14m6-7c7-2 13-1 17 3-6 3-10 4-16 3m18-11 4 2m-4 11 4-2" stroke="var(--world-shine)" strokeOpacity=".7" strokeWidth=".75" strokeLinecap="round" />
    <circle cx="12.5" cy="25.5" r="2.05" fill="var(--world-ink)" /><circle cx="12" cy="25" r=".65" fill="var(--world-shine)" />
  </svg>;
}

function Lantern() {
  return <svg viewBox="0 0 64 64" fill="none" className="world-mark" aria-hidden="true">
    <path d="M18 16h28l-4 31H22z" fill="var(--world-petal)" stroke="var(--world-shine)" strokeWidth="1.5" />
    <path d="M23 17h20l-4 29H26Z" fill="var(--world-shine)" fillOpacity=".73" />
    <path d="M22 47c5-4 15-4 20 0M32 14V8m-5 43h10" stroke="var(--world-soft)" strokeWidth="2" strokeLinecap="round" />
    <path d="M31 38c-4-3 0-7 2-11 4 6 3 9-2 11Z" fill="var(--world-ink)" fillOpacity=".7" />
  </svg>;
}

function Crystal() {
  return <svg viewBox="0 0 64 64" fill="none" className="world-mark" aria-hidden="true">
    <path d="M32 6 49 30 32 58 15 30Z" fill="var(--world-soft)" fillOpacity=".69" stroke="var(--world-petal)" strokeWidth="1.4" />
    <path d="m32 6 2 25 15-1M32 58l2-27-19-1" stroke="var(--world-shine)" strokeWidth="1.3" />
    <path d="M32 6 22 30l10 28-17-28Z" fill="var(--world-ink)" fillOpacity=".32" />
  </svg>;
}

function Star() {
  return <svg viewBox="0 0 64 64" fill="none" className="world-mark world-night-mark" aria-hidden="true">
    <path d="M39 13a18 18 0 1 0 12 26A19 19 0 0 1 39 13Z" fill="var(--world-soft)" fillOpacity=".72" stroke="var(--world-petal)" strokeWidth=".8" />
    <path className="world-star-mark" d="M45 12c0 7 2 9 9 9-7 0-9 2-9 9 0-7-2-9-9-9 7 0 9-2 9-9Z" fill="var(--world-shine)" />
    <path d="M54 32v6m-3-3h6M22 21v4m-2-2h4" stroke="var(--world-shine)" strokeWidth=".9" strokeLinecap="round" />
  </svg>;
}

const marks: Record<ThemeName, () => React.ReactNode> = { grassland: Butterfly, ocean: Fish, rift: Lantern, forest: Star, iceberg: Crystal };

function PaperScene() {
  return <>
    <svg className="world-paper-grove" viewBox="0 0 460 330" fill="none" focusable="false">
      <g className="world-paper-stems world-paper-stems-back" stroke="currentColor" strokeWidth="1.05">
        <path d="M115 330C68 213 98 135 169 62m-29 264c47-62 85-101 104-167m-74 171c41-52 80-71 156-95" />
        <path d="M123 220c-41-2-65-26-68-46 39-1 61 17 68 46Zm13-68c-29-20-35-50-24-76 23 20 29 48 24 76Zm55 94c-5-33 12-63 43-69-1 34-15 57-43 69Zm63 17c7-29 29-41 56-36-13 25-34 34-56 36Z" fill="var(--world-soft)" fillOpacity=".62" />
      </g>
      <g className="world-paper-stems" stroke="currentColor" strokeWidth="1.15">
        <path d="M27 330c43-67 47-120 34-171m-4 171c19-68 53-116 104-129m-76 129c44-38 88-41 124-30" />
        <path d="M64 237c-30-9-46-33-38-52 25 5 36 22 38 52Zm43 7c-6-24 11-49 34-52 1 25-12 41-34 52Z" fill="var(--world-petal)" fillOpacity=".63" />
      </g>
      <path d="M188 165c52-49 91-22 129-42 37-20 65-22 99-17" className="world-paper-air" stroke="currentColor" strokeWidth=".8" strokeDasharray="2 8" />
    </svg>
    <span className="world-paper-lift world-paper-lift-main"><Butterfly /></span>
    <span className="world-paper-lift world-paper-lift-echo"><Butterfly /></span>
    <span className="world-paper-glide world-paper-glide-close"><Butterfly /></span>
    <span className="world-paper-glide world-paper-glide-far"><Butterfly /></span>
    <span className="world-paper-pollen"><i /><i /><i /><i /></span>
  </>;
}

function SeaScene() {
  return <>
    <div className="world-sea-light" />
    <svg className="world-sea-water" viewBox="0 0 1200 155" preserveAspectRatio="none" fill="none" focusable="false">
      <path className="world-swell" d="M-120 85Q88 131 250 83T605 71T940 77T1320 51V170H-120Z" fill="var(--world-petal)" fillOpacity=".13" />
      <path className="world-swell world-swell-deep" d="M-120 107Q95 52 286 115T665 109T996 114T1320 86V170H-120Z" fill="var(--world-soft)" fillOpacity=".27" />
      <g className="world-current-lines" stroke="currentColor" strokeWidth=".7">
        <path d="M-118 51Q119 111 297 51T673 54T996 63T1321 45" />
        <path d="M-150 75Q97 134 273 74T650 79T999 88T1350 69" opacity=".72" />
        <path d="M-164 111Q92 158 272 111T651 115T990 118T1350 97" opacity=".47" />
      </g>
    </svg>
    <div className="world-shoal">
      <span className="world-shoal-lead"><Fish /></span>
      <span className="world-shoal-upper"><Fish /></span>
      <span className="world-shoal-lower"><Fish /></span>
      <i /><i /><i />
    </div>
    <span className="world-swim world-swim-near"><Fish /></span>
    <span className="world-swim world-swim-far"><Fish /></span>
    <span className="world-swim world-swim-deep"><Fish /></span>
  </>;
}

function LanternScene() {
  return <div className="world-lanterns"><span><Lantern /></span><span><Lantern /></span><span><Lantern /></span><span><Lantern /></span><span><Lantern /></span></div>;
}

function IceScene() {
  return <div className="world-icefall"><span><Crystal /></span><span><Crystal /></span><span><Crystal /></span><span><Crystal /></span><span><Crystal /></span></div>;
}

const stars = [[28, 135], [73, 83], [110, 125], [151, 52], [202, 76], [231, 34], [281, 104], [317, 59], [352, 119]];

function NightScene() {
  return <>
    <svg className="world-night-map" viewBox="0 0 380 170" fill="none" focusable="false">
      <path d="M329 36a22 22 0 1 1-28-27 23 23 0 0 0 28 27Z" fill="var(--world-soft)" fillOpacity=".73" />
      <path d="m28 135 45-52 37 42 41-73 51 24 29-42m50 70 36-45 35 60" className="world-star-thread" stroke="var(--world-petal)" strokeWidth=".8" pathLength="1" />
      {stars.map(([x, y], index) => <g className={"world-night-point world-night-point-" + index % 3} key={x} transform={`translate(${x} ${y})`}><path d="M0-4v8m-4-4h8" stroke="var(--world-shine)" strokeWidth=".7" /><circle r="1.35" fill="var(--world-petal)" /></g>)}
    </svg>
    <div className="world-meteor world-meteor-first"><span /></div>
    <div className="world-meteor world-meteor-echo"><span /></div>
    <div className="world-fireflies"><i /><i /><i /><i /><i /></div>
  </>;
}

const scenes: Record<ThemeName, () => React.ReactNode> = { grassland: PaperScene, ocean: SeaScene, rift: LanternScene, forest: NightScene, iceberg: IceScene };

/** The scenery layers are transparent to input across the entire app shell. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  return <div className="immersive-environment world-environment" data-awake={awake}>
    <div className="world-atmosphere" aria-hidden="true">{invitations.map(([theme]) => <div key={theme} className={'world-ground world-ground-' + theme} data-world-theme={theme}><span /><span /><span /></div>)}</div>
    {awake && <div className="world-choreography" aria-hidden="true">
      {invitations.map(([theme]) => {
        const Scene = scenes[theme];
        return <div className={'world-scene world-scene-' + theme} data-world-theme={theme} key={theme}><Scene /></div>;
      })}
    </div>}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '让整页风景归于宁静' : '唤起当前主题的全页风景'}>
      <span className="world-switch-mark" aria-hidden="true">{invitations.map(([theme]) => {
        const Mark = marks[theme];
        return <span data-world-invitation={theme} key={theme}><Mark /></span>;
      })}</span>
      {awake ? <span className="world-switch-label">归于静处</span> : invitations.map(([theme, label]) => <span className="world-switch-label" key={theme} data-world-invitation={theme}>{label}</span>)}
      <Icon name={awake ? 'pause' : 'spark'} size={14} />
    </button>
    <span className="sr-only" role="status">{awake ? invitations.map(([theme, , status]) => <span key={theme} data-world-invitation={theme}>{status}</span>) : '全页主题动效已关闭'}</span>
  </div>;
}

"use client";
import { Icon } from "./icons";
import type { CSSProperties } from "react";

const invitations = [['dusk', '让风翻页'], ['sea', '听潮生长'], ['film', '让旧光流动'], ['night', '与星河同游']] as const;

/** All scenery is viewport-wide, decorative, and transparent to input. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  return <div className="immersive-environment world-environment" data-awake={awake}>
    <div className="world-atmosphere" aria-hidden="true">{invitations.map(([theme]) => <div key={theme} className={'world-ground world-ground-' + theme} data-world-theme={theme}><span /><span /><span /></div>)}</div>
    {awake && <div className="world-choreography" aria-hidden="true">
      <div className="world-scene world-wind" data-world-theme="dusk">
        {Array.from({ length: 5 }, (_, i) => <svg key={i} className={'world-paper-fold world-paper-fold-' + i} viewBox="0 0 300 180" fill="none"><path d="m0 78 96-34 110 56 94-36v46l-94 36L96 90 0 124Z" fill="var(--motion-pop)" /><path d="m96 44 110 56v46L96 90Z" fill="currentColor" opacity=".28" /><path d="m0 78 96-34 110 56 94-36M0 124l96-34 110 56 94-36M96 44v46m110 10v46" stroke="currentColor" strokeWidth="1" /></svg>)}
        <svg className="world-wind-lines" viewBox="0 0 1200 800" preserveAspectRatio="none" fill="none"><path d="M-80 640C220 640 110 140 480 140s210 520 800 180" /><path d="M-80 664C220 664 110 164 480 164s210 520 800 180" /><path d="M-80 688C220 688 110 188 480 188s210 520 800 180" /></svg>
      </div>
      <div className="world-scene world-tide" data-world-theme="sea">
        <svg className="world-tidal-lines" viewBox="0 0 1440 420" preserveAspectRatio="none" fill="none">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M-160 ${140 + i * 25}C70 ${-35 + i * 25} 340 ${350 + i * 17} 610 ${155 + i * 23}S1040 ${-20 + i * 25} 1280 ${135 + i * 23} 1540 ${180 + i * 25} 1640 ${65 + i * 25}`} />)}</svg>
        {Array.from({ length: 4 }, (_, i) => <span key={i} className={'world-refraction world-refraction-' + i} />)}
        <svg className="world-tide-dial" viewBox="0 0 240 240" fill="none"><circle cx="120" cy="120" r="94" /><circle cx="120" cy="120" r="75" strokeDasharray="1 13" /><path d="M120 13v20m0 174v20M13 120h20m174 0h20" /><path className="world-tide-needle" d="m120 120 0-86M120 120l-20 20" /><circle cx="120" cy="120" r="4" fill="currentColor" stroke="none" /></svg>
      </div>
      <div className="world-scene world-cinema" data-world-theme="film">
        <div className="world-film-edge world-film-edge-left" /><div className="world-film-edge world-film-edge-right" />
        <div className="world-film-frame world-film-frame-first" /><div className="world-film-frame world-film-frame-second" />
        {Array.from({ length: 4 }, (_, i) => <span key={i} className={'world-shutter world-shutter-' + i} />)}
        <div className="world-film-counter" >{Array.from({ length: 7 }, (_, i) => <span key={i} style={{ '--frame-index': i } as CSSProperties} />)}</div>
      </div>
      <div className="world-scene world-cosmos" data-world-theme="night">
        {[0, 1].map(i => <svg key={i} className={'world-orbit world-orbit-' + i} viewBox="0 0 640 640" fill="none"><circle cx="320" cy="320" r="286" /><circle cx="320" cy="320" r="252" strokeDasharray="1 15" /><ellipse cx="320" cy="320" rx="300" ry="138" transform="rotate(-33 320 320)" /><ellipse cx="320" cy="320" rx="300" ry="138" transform="rotate(33 320 320)" /><path d="M320 20v34m0 532v34M20 320h34m532 0h34" /><g className="world-orbit-satellite"><path d="M320 34 320 320" strokeDasharray="3 9" /><circle cx="320" cy="34" r="6" fill="var(--motion-pop)" /><circle cx="320" cy="320" r="7" /></g></svg>)}
        {Array.from({ length: 3 }, (_, i) => <span key={i} className={'world-meteor world-meteor-' + i} />)}
      </div>
    </div>}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '让整页风景归于宁静' : '唤起当前主题的全页风景'}>
      <span className="world-switch-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      {awake ? <span className="world-switch-label">归于静处</span> : invitations.map(([theme, label]) => <span className="world-switch-label" key={theme} data-world-invitation={theme}>{label}</span>)}
      <Icon name={awake ? 'pause' : 'spark'} size={14} />
    </button>
  </div>;
}

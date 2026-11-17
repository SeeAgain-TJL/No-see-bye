"use client";
import { Icon } from "./icons";
import { MemorySprite } from "./memory-sprite";

const invitations = [['dusk', '让风翻页'], ['sea', '听潮生长'], ['film', '让旧光流动'], ['night', '与星河同游']] as const;

/** All scenery is viewport-wide, decorative, and transparent to input. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  return <div className="immersive-environment world-environment" data-awake={awake}>
    <div className="world-atmosphere" aria-hidden="true">{invitations.map(([theme]) => <div key={theme} className={'world-ground world-ground-' + theme} data-world-theme={theme}><span /><span /><span /></div>)}</div>
    {awake && <div className="world-choreography" aria-hidden="true">
      <div className="world-scene world-wind" data-world-theme="dusk">
        {Array.from({ length: 10 }, (_, i) => <svg key={i} className={'world-leaf world-leaf-' + i} viewBox="0 0 60 90" fill="none"><path d="M30 75C-4 63-1 24 42 4c18 37 13 61-12 71Z" fill="currentColor" opacity=".22" /><path d="M30 84C22 54 32 28 42 4M30 64 10 44m20 4 18-21" stroke="currentColor" strokeWidth="1.2" /></svg>)}
        <svg className="world-wind-stroke" viewBox="0 0 1200 800" preserveAspectRatio="none" fill="none"><path d="M-100 450C250 140 370 670 720 460S1010 180 1300 320M-100 475C250 165 370 695 720 485S1010 205 1300 345" /></svg>
      </div>
      <div className="world-scene world-tide" data-world-theme="sea">
        <svg className="world-wave" viewBox="0 0 1440 300" preserveAspectRatio="none" fill="none"><path d="M-120 190C100 10 310 350 550 180S940 30 1170 160 1500 200 1590 100M-120 214C100 34 310 374 550 204S940 54 1170 184 1500 224 1590 124M-120 238C100 58 310 398 550 228S940 78 1170 208 1500 248 1590 148" /></svg>
        <svg className="world-boat" viewBox="0 0 140 110" fill="none"><path d="m18 77 101-7-23 25H40Z" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" /><path d="m73 9-4 60-46 4Z" fill="var(--surface)" stroke="currentColor" strokeWidth="1.4" /><path d="m80 31 37 35-40 4Z" fill="currentColor" opacity=".25" /><path d="M10 101c29-6 41 4 63 0 23-5 37 0 59-5" stroke="currentColor" opacity=".5" /></svg>
        {Array.from({ length: 6 }, (_, i) => <span key={i} className={'world-sea-glint world-sea-glint-' + i} />)}
      </div>
      <div className="world-scene world-cinema" data-world-theme="film"><div className="world-projector-light" /><div className="world-film-edge world-film-edge-left" /><div className="world-film-edge world-film-edge-right" /><div className="world-film-exposure" /></div>
      <div className="world-scene world-cosmos" data-world-theme="night">
        <svg className="world-constellation" viewBox="0 0 1200 800" preserveAspectRatio="none" fill="none"><path d="m30 530 120-190 155 65 108-235M780 650l125-116 90 30 185-196M825 153l106-68 102 103" /></svg>
        {Array.from({ length: 16 }, (_, i) => <span key={i} className={'world-star world-star-' + i} />)}
        <span className="world-shooting-star" /><span className="world-moon" />
      </div>
    </div>}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '让整页风景归于宁静' : '唤起当前主题的全页风景'}>
      <MemorySprite pose={awake ? 'float' : 'rest'} />
      {awake ? <span>归于静处</span> : invitations.map(([theme, label]) => <span key={theme} data-world-invitation={theme}>{label}</span>)}
      <Icon name={awake ? 'pause' : 'spark'} size={14} />
    </button>
  </div>;
}

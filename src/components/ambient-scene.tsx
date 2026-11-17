"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";
import { MemorySprite } from "./memory-sprite";

const sceneCopy = [
  ['dusk', '风过纸间', '叶影摇落，纸上春山仍在。', '借一阵风'],
  ['sea', '潮生梦隙', '潮声有信，远岸亦有回音。', '赴一场潮'],
  ['film', '光影重逢', '旧光轻转，未完的故事又亮了一帧。', '拾一缕光'],
  ['night', '星河入怀', '万籁俱寂，仍有一颗星为你闪烁。', '点一颗星'],
] as const;

function ForegroundScene() {
  return <div className="scene-preview" aria-hidden="true">
    <svg data-scene-preview="dusk" viewBox="0 0 320 165" fill="none"><path d="M8 132c88-17 177 16 305-12" stroke="currentColor" opacity=".2" /><path d="M85 139c-1-48 13-84 42-115" stroke="currentColor" strokeWidth="2" /><path d="M98 90C53 91 48 65 55 47c30 0 47 17 43 43Zm13-25c-18-27-7-46 11-49 18 23 13 39-11 49Zm-15 45c33-29 62-23 66-5-26 24-50 22-66 5Z" fill="currentColor" opacity=".35" /><g className="scene-wind-leaves" fill="currentColor"><path d="M210 40c-22-3-28-18-20-33 19 6 27 17 20 33Z" /><path d="M247 106c17-24 35-20 44-5-15 15-30 17-44 5Z" opacity=".6" /><path d="M170 90c-17-2-20-14-15-24 15 5 20 13 15 24Z" opacity=".5" /></g><path className="scene-wind-line" d="M144 51c48-29 122 7 149-20M156 112c29-12 51 4 72-7" stroke="currentColor" strokeDasharray="4 6" opacity=".4" /></svg>
    <svg data-scene-preview="sea" viewBox="0 0 320 165" fill="none"><circle cx="242" cy="35" r="24" fill="currentColor" opacity=".13" /><g className="scene-wave" stroke="currentColor"><ellipse cx="164" cy="134" rx="93" ry="18" /><ellipse cx="164" cy="134" rx="130" ry="28" opacity=".5" /></g><g className="scene-paper-boat"><path d="m123 107 72-3-17 19h-39Z" fill="currentColor" opacity=".7" /><path d="m160 53-2 49-35 2Z" fill="currentColor" opacity=".25" /><path d="m165 70 28 31-28 2Z" fill="currentColor" opacity=".4" /></g><path d="M4 144c29-8 48 6 74-1s48-5 74 1 52-8 80-4 45 8 84-2" stroke="currentColor" opacity=".3" /><circle className="scene-bubble" cx="59" cy="75" r="6" stroke="currentColor" opacity=".45" /></svg>
    <svg data-scene-preview="film" viewBox="0 0 320 165" fill="none"><g className="scene-film-reel" stroke="currentColor"><circle cx="98" cy="76" r="47" /><circle cx="98" cy="76" r="9" fill="currentColor" opacity=".2" /><circle cx="98" cy="47" r="12" /><circle cx="69" cy="76" r="12" /><circle cx="98" cy="105" r="12" /><circle cx="127" cy="76" r="12" /></g><path d="M99 124c63 12 71-15 111-3 31 9 48 16 91 6" stroke="currentColor" strokeWidth="2" opacity=".5" /><g className="scene-film-frame" transform="rotate(8 220 70)"><rect x="169" y="29" width="109" height="78" rx="3" stroke="currentColor" /><path d="M180 42h87v51h-87Z" fill="currentColor" opacity=".08" /><path d="m187 83 24-26 14 12 25-19 13 35" stroke="currentColor" opacity=".5" /><path d="M175 35h6m9 0h6m9 0h6m9 0h6m9 0h6m9 0h6m9 0h6m-96 66h6m9 0h6m9 0h6m9 0h6m9 0h6m9 0h6m9 0h6" stroke="currentColor" strokeWidth="3" /></g></svg>
    <svg data-scene-preview="night" viewBox="0 0 320 165" fill="none"><circle cx="245" cy="52" r="47" fill="currentColor" opacity=".06" /><path d="M251 18c-33 4-38 44-10 57-40 5-55-45-23-64" fill="currentColor" opacity=".6" /><path d="m31 112 39-57 45 36 44-53 37 65-41 38-40-50" stroke="currentColor" opacity=".3" /><g className="scene-stars" fill="currentColor"><circle cx="31" cy="112" r="2.5" /><circle cx="70" cy="55" r="3" /><circle cx="115" cy="91" r="2.5" /><circle cx="159" cy="38" r="3" /><circle cx="196" cy="103" r="2.5" /><circle cx="155" cy="141" r="2" /><path d="m280 104 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /></g><path className="scene-shooting-star" d="m184 13 34 12" stroke="currentColor" strokeLinecap="round" /></svg>
  </div>;
}

/** Quiet scenery behind the page, with an explicit, interactive foreground preview. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  const region = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [edition, setEdition] = useState(0);
  useEffect(() => {
    if (!awake) return;
    root.current?.querySelector<HTMLButtonElement>('.scene-panel-close')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) onToggle(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { onToggle(); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [awake, onToggle]);
  return <div ref={root} className="immersive-environment" data-awake={awake}>
    <div className="immersive-ambience" aria-hidden="true">
      <svg className="environment-scene environment-paper" data-environment="dusk" viewBox="0 0 1000 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <g className="environment-layer environment-layer-back" stroke="currentColor" strokeWidth="1.1">
          <path d="M-30 490C195 380 265 162 257-30M17 455C75 261 158 180 257 110M128 353C283 349 389 258 418 146" />
          <path d="M70 403C-5 366-6 278 30 220c87 32 110 109 40 183ZM171 279c-57-63-36-135 15-168 60 68 53 126-15 168ZM279 313c22-76 93-110 150-88-22 86-90 122-150 88Z" fill="currentColor" fillOpacity=".1" />
          <circle cx="814" cy="581" r="126" strokeDasharray="3 10" /><circle cx="814" cy="581" r="102" strokeOpacity=".5" />
        </g>
        <g className="environment-leaves" fill="currentColor" fillOpacity=".24">
          <path d="M834 166c-34-4-42-27-33-51 29 8 42 24 33 51Z" /><path d="M707 389c23-31 48-28 63-6-22 22-44 24-63 6Z" /><path d="M930 654c-35-5-42-31-30-53 31 11 42 28 30 53Z" />
        </g>
        <text x="774" y="591" fill="currentColor" stroke="none" fontSize="12" letterSpacing="4">HERBARIUM</text>
      </svg>
      <svg className="environment-scene environment-sea" data-environment="sea" viewBox="0 0 1000 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <g className="environment-layer environment-layer-back" stroke="currentColor" strokeWidth="1.1">
          <path d="M-100 580C190 270 469 840 1110 349M-100 610C198 300 487 875 1110 378M-100 642C201 327 502 910 1110 407M-100 675C208 361 517 941 1110 439" />
          <path d="M814-70c-166 70-210 182-123 260s226 23 286 114" strokeDasharray="3 9" />
        </g>
        <g className="environment-ripples" stroke="currentColor"><ellipse cx="170" cy="217" rx="125" ry="70" /><ellipse cx="170" cy="217" rx="180" ry="103" /><ellipse cx="170" cy="217" rx="237" ry="138" /></g>
        <g className="environment-bubbles" stroke="currentColor" strokeWidth="1.4"><circle cx="892" cy="520" r="17" /><circle cx="850" cy="554" r="6" /><circle cx="874" cy="587" r="11" /></g>
        <text x="788" y="709" fill="currentColor" fontSize="12" letterSpacing="4">LET IT FLOW</text>
      </svg>
      <svg className="environment-scene environment-film" data-environment="film" viewBox="0 0 1000 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <g className="environment-contact-sheet environment-layer" transform="rotate(-14 870 420)" stroke="currentColor">
          <rect x="729" y="-100" width="265" height="1050" rx="4" /><path d="M759-100V950M964-100V950" />
          <path d="M772 45h179v225H772zM772 295h179v225H772zM772 545h179v225H772z" fill="currentColor" fillOpacity=".035" />
          <path d="M744-80V950M979-80V950" strokeWidth="9" strokeDasharray="9 17" />
        </g>
        <g className="environment-layer environment-layer-back" stroke="currentColor" strokeWidth="1"><path d="M34 169h72m-36-36v72M109 666h72m-36-36v72" /><circle cx="159" cy="384" r="66" /><circle cx="159" cy="384" r="51" strokeDasharray="3 4" /></g>
        <text x="104" y="390" fill="currentColor" fontSize="10" letterSpacing="3">KEEP THIS</text>
      </svg>
      <svg className="environment-scene environment-night" data-environment="night" viewBox="0 0 1000 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="nsb-moon-halo"><stop stopColor="currentColor" stopOpacity=".23" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
        <circle className="environment-moonlight" cx="852" cy="190" r="220" fill="url(#nsb-moon-halo)" />
        <g className="environment-layer environment-layer-back" stroke="currentColor" strokeWidth="1"><path d="m47 498 72-71 45 28 77-110M771 292l75 49 66-55 64 71" strokeOpacity=".55" /><circle cx="852" cy="190" r="80" strokeDasharray="2 9" /><path d="M880 138c-56 1-68 69-22 90-67 7-92-77-38-106" fill="currentColor" fillOpacity=".12" /></g>
        <g className="environment-fireflies" fill="currentColor"><circle cx="47" cy="498" r="3" /><circle cx="119" cy="427" r="2" /><circle cx="164" cy="455" r="3" /><circle cx="241" cy="345" r="2" /><circle cx="771" cy="292" r="2" /><circle cx="846" cy="341" r="3" /><circle cx="912" cy="286" r="2" /><circle cx="976" cy="357" r="2" /><circle cx="379" cy="618" r="2" /><circle cx="608" cy="112" r="2" /></g>
        <text x="752" y="650" fill="currentColor" fontSize="12" letterSpacing="4">UNDER THE STARS</text>
      </svg>
    </div>
    {awake && <section id={region} className="environment-panel" aria-label="主题小景">
      <div className="scene-panel-heading"><span>一隅风景</span><button type="button" className="scene-panel-close" aria-label="合上风景" onClick={() => { onToggle(); trigger.current?.focus(); }}><Icon name="close" size={16} /></button></div>
      <div key={edition} className="scene-animation"><ForegroundScene /></div>
      {sceneCopy.map(([theme, title, description]) => <div key={theme} className="scene-panel-copy" data-environment-title={theme}><h3>{title}</h3><p>{description}</p></div>)}
      <button type="button" className="scene-replay" onClick={() => setEdition(value => value + 1)}>再看一遍<Icon name="restore" size={14} /></button>
    </section>}
    <button ref={trigger} className="environment-toggle" type="button" aria-expanded={awake} aria-controls={awake ? region : undefined} onClick={onToggle} aria-label={awake ? "合上主题风景" : "展开主题风景"}>
      <MemorySprite pose={awake ? 'float' : 'rest'} />
      {awake ? <span>合上风景</span> : sceneCopy.map(([theme, , , label]) => <span key={theme} data-environment-title={theme}>{label}</span>)}
      <Icon name={awake ? 'close' : 'spark'} size={14} />
    </button>
  </div>;
}

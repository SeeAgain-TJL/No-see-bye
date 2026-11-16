import { ThemeMotif } from "./theme-motif";

/** The scenery sits behind the reading surface; none of these marks receive input. */
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  return <div className="immersive-environment" data-awake={awake}>
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
    <button className="environment-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? "收起主题风景" : "唤醒主题风景"}>
      <ThemeMotif />
      {awake ? <span>收起风景</span> : <><span data-environment-title="dusk">让风经过</span><span data-environment-title="sea">唤起潮汐</span><span data-environment-title="film">转动胶片</span><span data-environment-title="night">点亮星空</span></>}
      <span className="environment-toggle-dot" aria-hidden="true" />
    </button>
  </div>;
}

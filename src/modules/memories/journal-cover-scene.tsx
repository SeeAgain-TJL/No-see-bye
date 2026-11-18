"use client";

import { useId, useState, type CSSProperties, type PointerEvent } from "react";

const plantStems = [
  "M63 304c-8-52 4-84 29-123m-17 45-33-15m38 0 27-23m-25-2-20-23",
  "M156 310c-19-63-8-107 10-151m-16 84-25-19m29-4 26-28m-23-5-11-24",
  "M657 310c-1-51-16-85-43-120m27 57 28-22m-36 2-21-4m10-12 7-27",
];
const smallBird = "m-12 1 11 5 13-6-10 2-2-4-2 4Z";

function Butterfly({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  return <g className={"jls-butterfly" + (small ? " jls-butterfly-small" : "")} transform={`translate(${x} ${y})`}>
    <g className="jls-butterfly-flight"><path className="jls-wing-left" d="M0 0C-17-27-35-21-29-7c3 8 13 9 29 7Zm0 0c-23-7-24 17-13 14L0 0Z" fill="#b0c48a" /><path className="jls-wing-right" d="M0 0c17-27 35-21 29-7-3 8-13 9-29 7Zm0 0c23-7 24 17 13 14L0 0Z" fill="#d5dcae" /><path d="M0-5v13m0-13-4-6m4 6 4-6" stroke="#526d53" strokeWidth="1" /></g>
  </g>;
}

/** Four original moving landscapes, without editorial text competing with the records. */
export function JournalCoverScene({ publicScope = false, className = "" }: { publicScope?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId().replace(/:/g, "");
  const clip = id + "-landscape";
  const sea = id + "-sea";
  const dusk = id + "-dusk";
  const film = id + "-film";
  const night = id + "-night";
  const moon = id + "-moon";
  function pointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--jls-x", ((event.clientX - bounds.left) / bounds.width - .5).toFixed(3));
    event.currentTarget.style.setProperty("--jls-y", ((event.clientY - bounds.top) / bounds.height - .5).toFixed(3));
  }
  function leave(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.removeProperty("--jls-x");
    event.currentTarget.style.removeProperty("--jls-y");
  }
  return <button type="button" className={"journal-living-scene " + className} data-jls-open={open} data-jls-scope={publicScope ? "public" : "personal"}
    aria-label={open ? "让主题风景慢下来" : "轻触，唤起主题风景"} aria-pressed={open} title={open ? "让风景慢下来" : "轻触，让风景流动"}
    onClick={() => setOpen(value => !value)} onPointerMove={pointer} onPointerLeave={leave}>
    <svg className="jls-canvas" viewBox="0 0 720 310" fill="none" aria-hidden="true">
      <defs>
        <clipPath id={clip}><path d="M0 0h720v310H0z" /></clipPath>
        <linearGradient id={dusk} x1="350" y1="10" x2="350" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#e4ebd4" /><stop offset="1" stopColor="#f2efdc" /></linearGradient>
        <linearGradient id={sea} x1="350" y1="40" x2="350" y2="310" gradientUnits="userSpaceOnUse"><stop stopColor="#d5e9eb" /><stop offset=".5" stopColor="#cae1df" /><stop offset="1" stopColor="#8dbcc1" /></linearGradient>
        <linearGradient id={film} x1="360" y1="20" x2="360" y2="310" gradientUnits="userSpaceOnUse"><stop stopColor="#e8d6be" /><stop offset=".6" stopColor="#edc99e" /><stop offset="1" stopColor="#e4cfb1" /></linearGradient>
        <linearGradient id={night} x1="350" y1="0" x2="350" y2="310" gradientUnits="userSpaceOnUse"><stop stopColor="#1b3431" /><stop offset=".6" stopColor="#36564a" /><stop offset="1" stopColor="#4d6a53" /></linearGradient>
        <mask id={moon}><circle cx="526" cy="70" r="35" fill="white" /><circle cx="540" cy="56" r="33" fill="black" /></mask>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g className="jls-theme jls-dusk">
          <path d="M70 0h650v310H70z" fill={`url(#${dusk})`} />
          <g className="jls-depth-far">
            <circle cx="528" cy="67" r="40" fill="#f7f3d8" />
            <path d="M55 194c68-30 102-69 173-47s99 22 160-14 111 14 158-10 91-24 174 1v186H55Z" fill="#cad6ba" />
            <path d="M75 221c92-55 138-17 201-21 77-5 120-61 180-45s93 55 174 21l90 16v118H75Z" fill="#a5baa0" />
            <path d="M327 98c34-9 55-7 84-4m154 29c39-13 77-14 119-4" stroke="#f5f3dc" strokeWidth="1.5" opacity=".72" strokeLinecap="round" />
            <path d="m444 109 12 5 14-7-12 3-2-4-2 4Z" fill="#71846c" />
          </g>
          <g className="jls-depth-middle">
            <path d="M84 280c69-47 94-43 161-32s121 5 187-20 129 17 184 5l104-21v98H84Z" fill="#809b7d" />
            <path d="M226 310c64-41 119-24 153-54 25-22 39-25 77-23-30 9-42 16-52 34-7 17-36 29-64 43Z" fill="#d4d7b7" />
            <path d="M254 290c25-9 51-10 78-10m40-23 36-10m109 13c41-10 78-12 110-5" stroke="#c6d0b1" strokeWidth="1" opacity=".56" strokeLinecap="round" />
            <g className="jls-field-grass" stroke="#5c7e5f" strokeWidth="1.1" strokeLinecap="round"><path d={plantStems[0]} /><path d={plantStems[1]} /><path d={plantStems[2]} /></g>
            <g className="jls-flower-stems" stroke="#6a875f" strokeWidth="1.2"><path d="M585 310c9-43 1-68-8-97m20 97c-1-29 13-56 32-75m-57 41-14-18m31 19 16-17" /><path d="M566 217c-17 0-23-12-19-23 17 2 24 11 19 23Zm61 22c-3-20 9-28 22-29 1 15-4 25-22 29Z" fill="#91aa7a" /></g>
            <Butterfly x={466} y={139} /><Butterfly x={publicScope ? 331 : 603} y={publicScope ? 86 : 202} small />
          </g>
          <g className="jls-depth-near jls-foreground">
            <path d="M0 310v-48c62-42 94-2 138 1 30 3 64-10 94 47Zm540 0c58-31 120-21 180-54v54Z" fill="#496e54" opacity=".8" />
            <g className="jls-reed-sway" stroke="#66865d" strokeWidth="1.6"><path d="M62 311c12-65 17-98 6-141m-5 92c-26-15-37-35-35-56 25 12 40 31 35 56Zm7-52c30-22 39-45 33-66-24 17-34 40-33 66ZM695 310c-9-55-4-98 9-126m-7 65c-26-15-37-34-32-52 21 14 30 30 32 52Z" /></g>
          </g>
          {Array.from({ length: 7 }, (_, i) => <path className="jls-wind-leaf" key={i} style={{ "--jls-item": i } as CSSProperties} d="M0 0C-7-9-15-8-17-4-11 3-5 5 0 0Z" fill={i % 2 ? "#b6c99b" : "#8fa873"} />)}
          <path className="jls-wind-trace" d="M198 178c67-38 118 8 173-35s105-28 177-47" stroke="#728c65" strokeWidth=".8" strokeDasharray="2 8" opacity=".35" />
        </g>

        <g className="jls-theme jls-sea">
          <path d="M65 0h655v310H65z" fill={`url(#${sea})`} />
          <g className="jls-depth-far">
            <circle cx="542" cy="66" r="38" fill="#f3e7c8" />
            <g className="jls-cloud-drift" fill="#edf3e8"><path d="M256 83c7-14 20-17 31-8 9-17 31-13 37 2 13-7 25-1 28 8H256Zm279 40c5-11 16-14 25-6 8-15 26-13 32 0 10-6 22-1 26 8h-83Z" /><path d="M395 42h62m-45 7h42" stroke="#edf3e8" strokeWidth="1" opacity=".7" /></g>
            <path d="M40 175c71-36 122-27 181-15s101-45 163-28c43 12 56 39 113 31s109-18 223 11v136H40Z" fill="#94b5b4" />
            <path d="M270 159c29-16 68-26 96-22m112 27 45-8" stroke="#bfd1c8" strokeWidth="1.1" />
            <path d="m396 136 6-18h5l7 18m-14-18v-7h6v7m-13 19h26" fill="#e6e9d5" stroke="#859e99" strokeWidth=".7" />
          </g>
          <g className="jls-depth-middle">
            <path d="M35 187c108-26 171 20 249 7s128-28 200-10 158 4 236-5v131H35Z" fill="#6f9fa8" />
            <g className="jls-tide jls-tide-back" stroke="#c5dbd4" strokeWidth="1" strokeLinecap="round"><path d="M70 218c70-29 117 19 188-2s121-24 190-4 181 4 275-16M124 244c65-27 136 9 199-5s134-18 210-5 126-4 192-18" /><path d="M274 203h44m56 16h57m127-15h46m-240 47h55" strokeWidth="1.5" opacity=".6" /></g>
            <g className="jls-sailboat"><path d="m442 206 57-4-12 12h-33Z" fill="#547578" /><path d="m468 159-22 40 22-3v-37Z" fill="#f6efcf" /><path d="m472 172 23 22-23 2v-24Z" fill="#c5d4c2" /><path d="M470 159v48" stroke="#658588" strokeWidth="1" /><path d="M439 219c20 3 44 1 62-5" stroke="#acc9c7" strokeWidth=".9" /></g>
            <g className="jls-gull jls-gull-one" transform="translate(352 100)"><path d={smallBird} fill="#638c91" /></g><g className="jls-gull jls-gull-two" transform="translate(615 131)"><path d={smallBird} fill="#638c91" /></g>
          </g>
          <g className="jls-depth-near jls-foreground">
            <path d="M0 310v-30c54-22 99-12 154-23s92-8 143 1c-39 6-68 8-91 22-41 25-93 18-118 30H0Zm521 0c52-39 111-15 199-57v57H521Z" fill="#c7c8a3" />
            <path d="M65 301c70-26 113-9 162-34m347 35c49-18 83-13 146-41" stroke="#e2dabe" strokeWidth="2.5" strokeLinecap="round" />
            <g className="jls-reed-sway" stroke="#6e9c92" strokeWidth="1.4"><path d="M109 310c8-33 3-58-8-80m10 48 15-29m-17 45-23-24M653 310c-1-31 10-52 27-72m-19 35-17-20m21 7 22-5" /><path d="M100 246c-13-1-20-9-17-19 11 4 18 9 17 19Zm25 16c0-14 8-22 19-21-3 12-8 19-19 21Z" fill="#8bad94" /></g>
          </g>
          <g className="jls-tide jls-tide-front" stroke="#dde5cc" strokeLinecap="round"><path d="M216 279c103-39 164 26 263-8s154-26 241-36" strokeWidth="1.2" /><path d="M253 290c74-24 143 17 211-2s137-30 221-34" strokeWidth=".75" opacity=".55" /></g>
          <g className="jls-sea-sparkles" fill="#e6ead8">{Array.from({ length: 11 }, (_, i) => <path key={i} className="jls-water-light" style={{ "--jls-item": i } as CSSProperties} d={`M${267 + i * 33} ${214 + i % 4 * 13}h${4 + i % 3 * 3}v1h-${4 + i % 3 * 3}z`} />)}</g>
        </g>

        <g className="jls-theme jls-film">
          <path d="M64 0h656v310H64z" fill={`url(#${film})`} />
          <g className="jls-depth-far">
            <circle cx="548" cy="75" r="43" fill="#f5dfad" />
            <path d="M85 225c72-32 118-41 170-21s82-47 139-31 72 12 113 0 93 13 213-10v147H85Z" fill="#bda98b" />
            <path d="M182 195v-54h26v-16h46v82m18-6v-96h51v104m18-8v-53h30v-22h38v86m8-13v-67h57v75m36-9v-52h42v36h24v29" fill="#ad9780" />
            <g stroke="#d8c2a0" strokeWidth="2" opacity=".65">{Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${281 + i * 8} 121v37m-${i * 8} 7v20m140-34v30`} />)}</g>
            <path d="M237 78c37-9 67-7 96-4m206 49h74" stroke="#f0dfbd" strokeWidth="1.3" strokeLinecap="round" />
          </g>
          <g className="jls-depth-middle">
            <path d="M57 271c85-47 132-21 211-23 83-1 117-28 193-18s174-14 259-35v115H57Z" fill="#9f8c6e" />
            <g className="jls-film-frame"><path d="M302 28h288v250H302z" fill="#e8d0ab" fillOpacity=".09" stroke="#f6e3be" strokeWidth="2" /><path d="M313 38h266v229H313z" stroke="#aa8661" strokeWidth=".8" /><path d="M446 29v248M303 146h286" stroke="#d4bc95" strokeWidth="4" /><path d="M329 44h29l-34 103h-8V84Zm159 110h30l-34 108h-25Z" fill="#f9edcf" opacity=".17" /><path d="m447 149 37 16v80l-37 21Z" fill="#745f48" fillOpacity=".16" stroke="#c2a77f" strokeWidth=".7" /></g>
            <path className="jls-light-shaft" d="m316 148 127 2 175 160H183Z" fill="#f3d9a8" opacity=".16" />
            <g className="jls-swallow" transform="translate(541 104)"><path d="M0 0c-19-10-29-7-43-10 12 8 19 17 34 18L-27 27-2 13c16-2 28-10 46-19C24-9 15-4 0 0Z" fill="#6b6350" /><path d="m-3 7 15 5-10 1-6-3" stroke="#9e8868" strokeWidth=".7" /></g>
          </g>
          <g className="jls-depth-near jls-foreground">
            <path d="M0 310v-16c112-34 202-15 311 16Zm561 0c44-45 107-47 159-67v67Z" fill="#7f7255" opacity=".65" />
            <g className="jls-film-ribbon" transform="translate(115 232) rotate(-12)"><path d="M-30 0h202v44H-30z" fill="#76684f" fillOpacity=".2" stroke="#9e8969" strokeWidth=".7" /><path d="M-25 7h197m-197 30h197" stroke="#e2cfac" strokeWidth="4" strokeDasharray="5 9" /><path d="M-10 13h45v18H-10Zm54 0h45v18H44Zm54 0h45v18H98Z" fill="#e3cda4" fillOpacity=".32" /></g>
          </g>
          {Array.from({ length: 14 }, (_, i) => <circle key={i} className="jls-dust" cx={300 + i * 25 % 276} cy={61 + i * 43 % 226} r={i % 3 ? .7 : 1.2} fill="#f4e6c5" style={{ "--jls-item": i } as CSSProperties} />)}
          <path className="jls-film-exposure" d="M100-30h62l180 370h-62Z" fill="#fff0ce" />
        </g>

        <g className="jls-theme jls-night">
          <path d="M52 0h668v310H52z" fill={`url(#${night})`} />
          <g className="jls-depth-far">
            <circle cx="526" cy="70" r="35" fill="#dce0b8" mask={`url(#${moon})`} />
            {Array.from({ length: 19 }, (_, i) => <circle className="jls-star" key={i} cx={210 + i * 37 % 489} cy={16 + i * 29 % 131} r={i % 5 ? .8 : 1.5} fill="#c8d1b1" style={{ "--jls-item": i } as CSSProperties} />)}
            <path d="M90 210c84-29 98-62 177-45s107-37 169-23 86 27 126 10 91 5 158-13v171H90Z" fill="#496653" />
            <path d="M194 227c65-31 129-4 193-28s110 9 168-4 112-5 165-16v131H194Z" fill="#3c5e4c" />
            <g fill="#2d4e41" opacity=".72">{Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${238 + i * 63} ${154 + i % 3 * 15}l-13 68h26Z`} />)}</g>
          </g>
          <g className="jls-depth-middle">
            <path d="M86 310c42-40 102-28 163-30 58-1 95-43 152-33s110-4 160-24 99-8 159-30v117H86Z" fill="#294d3b" />
            <path d="M326 310c31-18 88-21 105-38 22-25 7-39 32-51-12 22 18 31 5 52-11 16 0 28 24 37Z" fill="#9ba982" opacity=".7" /><path d="m398 290 38-8m-26 20 53-5m-25-33 20-4" stroke="#c2c6a1" strokeWidth=".8" opacity=".4" />
            <g className="jls-lantern"><path d="M574 267v-62m-16 0h32m-28-6h24l5 6h-33Z" stroke="#617c60" strokeWidth="2" /><path d="M560 207h28v34h-28z" fill="#bbc69d" fillOpacity=".7" stroke="#819574" strokeWidth="1" /><path d="M567 208v32m14-32v32" stroke="#6a8165" strokeWidth="1" /><path d="M556 243h36l-8 6h-21Z" fill="#5c775a" /></g>
            {Array.from({ length: 9 }, (_, i) => <circle className="jls-firefly" key={i} cx={245 + i * 43 % 403} cy={166 + i * 23 % 108} r={i % 3 ? 1.1 : 1.8} fill="#d6dfa3" style={{ "--jls-item": i } as CSSProperties} />)}
          </g>
          <g className="jls-depth-near jls-foreground">
            <path d="M102 0h21c-12 73 3 121-7 171-8 52 3 90 11 139H94c-11-62 4-102 1-147-3-53 12-100 7-163Zm551 0h29c-15 87-10 129-1 184 5 40-4 85 6 126h-35c-2-53 12-86 1-129-13-49-5-107 0-181Z" fill="#173c30" /><path d="M112 135c33-18 53-43 64-76m-61 38L77 54m582 102c-32-26-43-53-53-91m68 46 42-34" stroke="#173c30" strokeWidth="10" />
            <path d="M40 310c48-49 96-38 146 0Zm510 0c78-55 131-36 170-47v47Z" fill="#193e2e" /><g className="jls-reed-sway" stroke="#507450" strokeWidth="1.1"><path d="M159 310c-3-28-13-48-31-63m26 38-23-4m17-10 2-21M610 310c-2-33 14-58 34-73m-27 43 27-6m-16-13-3-19" /><path d="M135 265c-13-3-19-14-16-24 14 5 19 13 16 24Zm484 21c1-17 11-27 23-25-3 16-11 24-23 25Z" fill="#426c46" /></g>
          </g>
          <path className="jls-comet" d="m289 67 103-27-93 35Z" fill="#c6d4b4" />
          <path className="jls-night-thread" d="m293 69 39 30 61-24 53 43 67-21" stroke="#9fb79a" strokeWidth=".65" strokeDasharray="2 8" opacity=".22" />
        </g>
      </g>
    </svg>
    <span className="jls-touchmark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m12 4 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" stroke="currentColor" strokeWidth="1.2" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg></span>
  </button>;
}

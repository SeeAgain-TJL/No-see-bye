"use client";
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { ThemeMotif } from "./theme-motif";

const scenes = [
  { label: "海边放空", english: "A little room to breathe.", sky: "#d7e6ee", sea: "#719aaf", hill: "#93b0b7", sand: "#efd4ab", sun: "#e4a06b" },
  { label: "落日散步", english: "Stay for the little things.", sky: "#efc9b5", sea: "#a096bc", hill: "#b6a5c6", sand: "#e9cda3", sun: "#b76650" },
  { label: "山间来信", english: "Somewhere, slow and lovely.", sky: "#e2dceb", sea: "#7e9c9a", hill: "#a8b7a2", sand: "#dfcfad", sun: "#d0985b" },
];

function subscribeReducedMotion(notify: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", notify);
  return () => preference.removeEventListener("change", notify);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerReducedMotion = () => false;

export function Daydream({ compact = false }: { compact?: boolean }) {
  const [scene, setScene] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);
  const current = scenes[scene];
  return <div className={"daydream daydream-keepsake" + (compact ? " daydream-compact" : "") + (reducedMotion ? " daydream-paused" : "")}
    style={{ "--scene-sky": current.sky, "--scene-sea": current.sea, "--scene-hill": current.hill, "--scene-sand": current.sand, "--scene-sun": current.sun } as CSSProperties}
    onPointerMove={e => { if (e.pointerType !== "mouse" || reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--drift-x", ((e.clientX - r.left) / r.width - .5) * 22 + "px"); e.currentTarget.style.setProperty("--drift-y", ((e.clientY - r.top) / r.height - .5) * 14 + "px"); }}
    onPointerLeave={e => { e.currentTarget.style.setProperty("--drift-x", "0px"); e.currentTarget.style.setProperty("--drift-y", "0px"); }}>
    <div className="daydream-orbit" aria-hidden="true" /><span className="daydream-spark" aria-hidden="true">✳</span>
    <ThemeMotif className="daydream-theme-token" />
    <svg className="daydream-flight" viewBox="0 0 160 110" fill="none" aria-hidden="true"><path d="M6 100c45 8 99-32 68-46-31-13-21 32 16 14 17-8 22-20 27-31" stroke="currentColor" strokeDasharray="3 5" /><path d="m108 16 40-10-18 33-7-15-15-8Z" fill="var(--surface)" stroke="currentColor" strokeLinejoin="round" /><path d="m123 24 25-18" stroke="currentColor" /></svg>
    <span className="daydream-star daydream-star-one" aria-hidden="true">✦</span><span className="daydream-star daydream-star-two" aria-hidden="true">✧</span>
    <div className="daydream-postcard">
      <span className="daydream-tape" aria-hidden="true" />
      <div className="daydream-art">
        <svg viewBox="0 0 560 380" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <path className="daydream-sky" fill="var(--scene-sky)" d="M0 0h560v380H0z" />
          <g className="daydream-clouds" fill="#fff8ec" opacity=".75"><path d="M35 93c0-15 19-23 31-12 6-29 50-29 57-1 16-12 35-2 36 13H35Z" /><path d="M329 57c2-12 19-18 28-9 8-24 41-23 47 0 15-9 31-1 31 9H329Z" /></g>
          <circle className="daydream-sun" cx="404" cy="125" r="45" fill="var(--scene-sun)" />
          <g className="daydream-atmosphere" data-atmosphere="night"><path d="M422 77a38 38 0 1 0 22 58c-35 8-53-29-22-58Z" fill="#efe3ae" /><path d="m67 45 52 22 42-33 48 28" stroke="#d0dec8" strokeWidth="1" opacity=".6" /><g fill="#eee6c7"><circle cx="67" cy="45" r="2.5" /><circle cx="119" cy="67" r="3" /><circle cx="161" cy="34" r="2.5" /><circle cx="209" cy="62" r="2" /><path d="m287 77 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /></g></g>
          <path className="daydream-hill" d="M0 224c103-28 149-99 239-66 72 26 108 17 184-22 72-37 112-12 137 6v238H0Z" fill="var(--scene-hill)" />
          <path className="daydream-sea" d="M0 239c95-38 193 9 294-22 88-27 173-15 266-36v199H0Z" fill="var(--scene-sea)" />
          <g className="daydream-waves" stroke="#fffaee" strokeWidth="2" strokeLinecap="round" opacity=".5"><path d="M302 246h83m-30 15h72m-180-12h27m-118 30h86m-171-13h40m270 25h112" /></g>
          <path className="daydream-sand" d="M0 315c94-24 174 1 267-19 109-24 169 10 293-9v93H0Z" fill="var(--scene-sand)" />
          <path d="M0 331c122-22 205 13 325-14 78-17 141 1 235-4" stroke="#fff5df" strokeWidth="3" opacity=".75" />
          <g className="daydream-boat"><path d="m260 256 48 0-11 11h-26Z" fill="#574d67" /><path d="M284 218v36h-25Z" fill="#fff6e5" /><path d="M287 229v25h15Z" fill="#d58c6d" /></g>
          <g className="daydream-birds" stroke="#545064" strokeWidth="2" strokeLinecap="round"><path d="m187 108 8 4 8-4m23 16 6 3 6-3" /></g>
          <g transform="translate(75 311)"><path d="m0 26 4-25m8 25L5 6" stroke="#657a68" strokeWidth="3" /><ellipse cx="0" cy="2" rx="7" ry="13" fill="#e8a19b" transform="rotate(-28)" /><ellipse cx="9" cy="4" rx="7" ry="13" fill="#c97a74" transform="rotate(21 9 4)" /></g>
          <g className="daydream-atmosphere" data-atmosphere="dusk" stroke="#657a68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M24 378c-2-36 8-58 24-79m-21 57c17-1 28-13 28-24-17 0-28 9-28 24Zm9-25c-15-2-22-13-19-25 14 3 21 10 19 25Z" fill="#93a78b" /><path d="M506 379q-7-35 14-58m-13 38c18-2 25-10 24-23-16 2-25 10-24 23Z" fill="#93a78b" /></g>
          <g className="daydream-atmosphere daydream-sea-details" data-atmosphere="sea"><g fill="none" stroke="#f8fcf4" strokeWidth="2" opacity=".75"><circle cx="123" cy="268" r="8" /><circle cx="143" cy="249" r="4" /><circle cx="347" cy="213" r="6" /></g><path d="m178 350-19-15c-8-8 1-18 8-12 2-13 16-12 19-2 10-6 19 5 10 13Z" fill="#f7e9d6" stroke="#aa9684" strokeWidth="1.3" /><path d="m178 347-11-20m11 20 2-23m-2 23 13-16" stroke="#c0ad97" strokeWidth="1.2" /></g>
          <g className="daydream-atmosphere" data-atmosphere="film" opacity=".76"><rect x="24" y="23" width="76" height="28" rx="2" fill="#fff1d3" fillOpacity=".55" stroke="#876649" strokeDasharray="3 2" /><text x="62" y="41" textAnchor="middle" fill="#755638" fontFamily="monospace" fontSize="11" letterSpacing="2">FRAME 01</text><path d="M28 76V61h15M517 61h15v15M28 304v15h15m474 0h15v-15" stroke="#fff2d5" strokeWidth="2" /></g>
          <g className="daydream-atmosphere daydream-fireflies" data-atmosphere="night" fill="#eddea2"><circle cx="122" cy="292" r="2.5" /><circle cx="152" cy="327" r="1.8" /><circle cx="350" cy="291" r="2.2" /><circle cx="482" cy="267" r="2" /></g>
          <g className="daydream-companion" transform="translate(435 283)">
            <ellipse cx="0" cy="58" rx="31" ry="6" fill="#687f791c" />
            <g className="daydream-companion-body">
              <path d="M-28 27c-2-13 2-24 9-29l-1-22c0-4 4-5 7-2L1-10l15-12c3-3 7-1 6 3l-3 22c8 9 12 18 9 33-3 16-16 24-30 23-16-1-26-13-26-32Z" fill="#fff9e9" stroke="#62786e" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="m-17-15 8 10-7 2Zm32 2-6 9 7 3Z" fill="#dba9a0" />
              <g className="daydream-companion-eyes" fill="#52675e"><ellipse cx="-11" cy="15" rx="2.5" ry="4" /><ellipse cx="10" cy="15" rx="2.5" ry="4" /></g>
              <path d="M-4 24q4 4 8 0" stroke="#52675e" strokeWidth="1.5" strokeLinecap="round" />
              <ellipse cx="-19" cy="23" rx="5" ry="2.5" fill="#e8b4a5" /><ellipse cx="18" cy="23" rx="5" ry="2.5" fill="#e8b4a5" />
              <path d="M-22 34q23 10 45-1l-2 8q-21 7-42 0Z" fill="#95a896" /><path d="m12 40 5 16 7-4-4-14" fill="#95a896" />
              <path className="daydream-companion-star" d="m-32 28 4 9 10 1-8 7 2 10-8-5-9 5 2-10-7-7 10-1Z" fill="#efc16f" stroke="#b38d54" strokeWidth="1.5" strokeLinejoin="round" />
            </g>
          </g>
          <g className="daydream-glints" fill="#fff8db"><path d="m116 201 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /><path d="m362 273 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /><circle cx="192" cy="297" r="2" /><circle cx="485" cy="228" r="2" /></g>
        </svg>
        <span className="postcard-stamp">NSB<br /><ThemeMotif /></span>
      </div>
      <div className="daydream-caption"><span lang="en">{current.english}</span><span>0{scene + 1} / 03</span></div>
    </div>
    <span className="daydream-note"><small>给时光的一封信</small><span lang="en">keep a little<br />wonder.</span><span className="daydream-note-arrow" aria-hidden="true">↗</span></span>
    <div className="daydream-controls">
      <div className="daydream-toolbar">
        <div className="daydream-scenes" role="group" aria-label="切换插画场景">
          {scenes.map((item, index) => <button key={item.label} type="button" aria-pressed={index === scene} onClick={() => setScene(index)}>{item.label}</button>)}
        </div>
      </div>
      <p className="daydream-status" role="status">{reducedMotion ? "已跟随系统，显示静态画面" : "风吹过的地方，回忆还在。"}</p>
    </div>
  </div>;
}

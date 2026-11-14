"use client";
import { useState, type CSSProperties } from "react";
import { Icon } from "./icons";

const scenes = [
  { label: "海边放空", english: "A little room to breathe.", sky: "#d7e6ee", sea: "#719aaf", hill: "#93b0b7", sand: "#efd4ab", sun: "#e4a06b" },
  { label: "落日散步", english: "Stay for the little things.", sky: "#efc9b5", sea: "#a096bc", hill: "#b6a5c6", sand: "#e9cda3", sun: "#b76650" },
  { label: "山间来信", english: "Somewhere, slow and lovely.", sky: "#e2dceb", sea: "#7e9c9a", hill: "#a8b7a2", sand: "#dfcfad", sun: "#d0985b" },
];

export function Daydream({ compact = false }: { compact?: boolean }) {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = scenes[scene];
  return <div className={"daydream" + (compact ? " daydream-compact" : "") + (paused ? " daydream-paused" : "")}
    style={{ "--scene-sky": current.sky, "--scene-sea": current.sea, "--scene-hill": current.hill, "--scene-sand": current.sand, "--scene-sun": current.sun } as CSSProperties}
    onPointerMove={e => { if (e.pointerType !== "mouse" || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--drift-x", ((e.clientX - r.left) / r.width - .5) * 12 + "px"); e.currentTarget.style.setProperty("--drift-y", ((e.clientY - r.top) / r.height - .5) * 8 + "px"); }}
    onPointerLeave={e => { e.currentTarget.style.setProperty("--drift-x", "0px"); e.currentTarget.style.setProperty("--drift-y", "0px"); }}>
    <div className="daydream-orbit" aria-hidden="true" /><span className="daydream-spark" aria-hidden="true">✳</span>
    <div className="daydream-postcard">
      <div className="daydream-art">
        <svg viewBox="0 0 560 380" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <path fill="var(--scene-sky)" d="M0 0h560v380H0z" />
          <g className="daydream-clouds" fill="#fff8ec" opacity=".75"><path d="M35 93c0-15 19-23 31-12 6-29 50-29 57-1 16-12 35-2 36 13H35Z" /><path d="M329 57c2-12 19-18 28-9 8-24 41-23 47 0 15-9 31-1 31 9H329Z" /></g>
          <circle className="daydream-sun" cx="404" cy="125" r="45" fill="var(--scene-sun)" />
          <path d="M0 224c103-28 149-99 239-66 72 26 108 17 184-22 72-37 112-12 137 6v238H0Z" fill="var(--scene-hill)" />
          <path d="M0 239c95-38 193 9 294-22 88-27 173-15 266-36v199H0Z" fill="var(--scene-sea)" />
          <g className="daydream-waves" stroke="#fffaee" strokeWidth="2" strokeLinecap="round" opacity=".5"><path d="M302 246h83m-30 15h72m-180-12h27m-118 30h86m-171-13h40m270 25h112" /></g>
          <path d="M0 315c94-24 174 1 267-19 109-24 169 10 293-9v93H0Z" fill="var(--scene-sand)" />
          <path d="M0 331c122-22 205 13 325-14 78-17 141 1 235-4" stroke="#fff5df" strokeWidth="3" opacity=".75" />
          <g className="daydream-boat"><path d="m260 256 48 0-11 11h-26Z" fill="#574d67" /><path d="M284 218v36h-25Z" fill="#fff6e5" /><path d="M287 229v25h15Z" fill="#d58c6d" /></g>
          <g stroke="#545064" strokeWidth="2" strokeLinecap="round"><path d="m187 108 8 4 8-4m23 16 6 3 6-3" /></g>
          <g transform="translate(75 311)"><path d="m0 26 4-25m8 25L5 6" stroke="#657a68" strokeWidth="3" /><ellipse cx="0" cy="2" rx="7" ry="13" fill="#e8a19b" transform="rotate(-28)" /><ellipse cx="9" cy="4" rx="7" ry="13" fill="#c97a74" transform="rotate(21 9 4)" /></g>
        </svg>
        <span className="postcard-stamp">NSB<br /><Icon name="spark" size={17} /></span>
      </div>
      <div className="daydream-caption"><span lang="en">{current.english}</span><span>0{scene + 1} / 03</span></div>
    </div>
    <span className="daydream-note" lang="en">little moments,<br />big feelings. <span>↗</span></span>
    <div className="daydream-controls"><div role="group" aria-label="切换插画场景">{scenes.map((item, index) => <button key={item.label} type="button" aria-pressed={index === scene} onClick={() => setScene(index)}>{item.label}</button>)}</div><button type="button" className="daydream-pause" aria-pressed={paused} aria-label={paused ? "播放背景动画" : "暂停背景动画"} onClick={() => setPaused(v => !v)}><Icon name={paused ? "play" : "pause"} size={15} /></button></div>
  </div>;
}

"use client";

import { useEffect, useRef } from "react";
import { type ThemeName } from "@/lib/themes";
import { ThemeMotif } from "./theme-motif";
import { Icon } from "./icons";
import { useActiveTheme } from "./theme-provider";
import { paintAtmosphere } from "./ambient-landscapes";

const invitations: Record<ThemeName, [string, string]> = {
  forest: ["让晨雾入林", "晨雾正在穿过林冠"],
  iceberg: ["点亮冰原", "极光越过浮冰"],
  grassland: ["借一阵风", "风吹过草穗"],
  rift: ["唤醒岩层", "光沿岩层展开，瀑流从石壁间落下"],
  ocean: ["唤一场潮", "潮线正在漫过岸边"],
};

// Brief line drawings grow inward from the switch, then yield to the landscape.
const arrivalLines: Record<ThemeName, string[]> = {
  grassland: ["M258 85 Q205 73 153 23 Q172 37 166 48 Q154 44 153 23 M182 52 Q178 37 182 32 Q191 42 187 57", "M239 80 Q184 70 113 50 Q125 47 140 58 M155 62 Q146 47 133 40"],
  ocean: ["M263 69 Q227 75 205 53 C185 32 158 37 162 50 Q165 58 176 54 Q166 70 145 62 T93 61", "M249 79 Q220 82 197 68 T147 73 Q129 78 111 70"],
  iceberg: ["M259 77 C219 83 221 25 186 27 S165 62 137 49 S112 32 92 42", "M251 77 C217 80 218 34 187 35 S165 65 138 56 S115 43 102 46"],
  forest: ["M259 85 Q208 62 153 28 M209 63 Q199 37 178 24 Q179 45 209 63 M191 52 Q160 56 143 43 Q164 37 191 52", "M235 76 Q233 54 216 40 Q214 56 235 76"],
  rift: ["M259 80 L229 66 L209 68 L185 34 L169 32 L165 55 L150 56 L147 73 L100 77", "M249 83 L221 77 L201 78 L182 50 L173 48 L168 65 L154 66 L151 79 L124 81"],
};
function ArrivalTrace({ theme }: { theme: ThemeName }) {
  return <svg className="world-arrival" viewBox="90 10 176 80" fill="none" aria-hidden="true" focusable="false">
    {arrivalLines[theme].map(d => <path key={d} d={d} pathLength={1} />)}
  </svg>;
}

function Landscape({ theme }: { theme: ThemeName }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0, h = 0, time = 0, last = 0, frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      paintAtmosphere[theme]({ ctx, w, h, t: reduced.matches ? 2 : time });
      // An incoming front travels from the switch along the bottom edge on activation.
      if (time < 1.2 && !reduced.matches) {
        const lead = (1 - time / 1.2) ** 2 * 1.25 - .22;
        const reveal = ctx.createLinearGradient(w * lead, 0, w * (lead + .22), 0);
        reveal.addColorStop(0, 'transparent'); reveal.addColorStop(1, 'black');
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = reveal; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
    };
    const tick = (now: number) => {
      if (now - last >= 1000 / 30) {
        time += last ? Math.min((now - last) / 1000, .1) : 0;
        last = now; draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (document.hidden || w === 0 || h === 0) return;
      draw();
      if (!reduced.matches) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      restart();
    });
    resize.observe(canvas);
    reduced.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      reduced.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', restart);
    };
  }, [theme]);
  return <canvas ref={ref} className="world-landscape" data-landscape={theme} aria-hidden="true" />;
}

export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  const theme = useActiveTheme();
  const [label, status] = invitations[theme];
  return <div className="world-environment" data-awake={awake}>
    {awake && <div className="world-choreography" aria-hidden="true"><Landscape key={theme} theme={theme} /><ArrivalTrace key={"arrival-" + theme} theme={theme} /></div>}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle}
      aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '关闭全页主题动效' : label}>
      <span className="world-switch-mark" aria-hidden="true">{awake ? <Icon name="pause" size={15}/> : <ThemeMotif theme={theme}/>}</span>
      <span className="world-switch-label">{awake ? '归于静处' : label}</span>
    </button>
    <span className="sr-only" role="status">{awake ? status : '全页主题动效已关闭'}</span>
  </div>;
}

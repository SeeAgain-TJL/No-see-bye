"use client";
import { lazy, Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { type ThemeName } from "@/lib/themes";
import { ThemeMotif } from "./theme-motif";
import { Icon } from "./icons";
import { useActiveTheme } from "./theme-provider";

const FieldStudy = lazy(() => import("./field-study"));
const invitations: Record<ThemeName, [string, string]> = {
  grassland: ["借一阵风", "燕尾蝶掠过麦穗"], forest: ["走入林荫", "翠鸟穿过蕨叶"],
  iceberg: ["点亮冰原", "极光在冰脊上舒展"], rift: ["循水入谷", "瀑布在层岩间落下"], ocean: ["唤一场潮", "海月水母舒张伞冠，随潮上浮"],
};
function subscribe(notify: () => void) { document.addEventListener('visibilitychange', notify); return () => document.removeEventListener('visibilitychange', notify); }
function SceneEdge({ theme }: { theme: ThemeName }) {
  const edge = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = edge.current;
    if (!el) return;
    let bounds = el.getBoundingClientRect();
    const resize = new ResizeObserver(() => { bounds = el.getBoundingClientRect(); });
    const measure = () => { bounds = el.getBoundingClientRect(); };
    const yieldToPointer = (e: PointerEvent) => {
      const inside = e.clientX >= bounds.left && e.clientY >= bounds.top && e.clientY <= bounds.bottom;
      el.toggleAttribute('data-reading', inside && !(e.target as Element)?.closest('.world-toggle'));
    };
    let timer: number;
    const scroll = () => {
      el.setAttribute('data-scrolling', ''); clearTimeout(timer);
      timer = window.setTimeout(() => el.removeAttribute('data-scrolling'), 240);
    };
    resize.observe(el); window.addEventListener('resize', measure);
    window.addEventListener('pointermove', yieldToPointer, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { resize.disconnect(); clearTimeout(timer); window.removeEventListener('resize', measure); window.removeEventListener('pointermove', yieldToPointer); window.removeEventListener('scroll', scroll); };
  }, []);
  return <div ref={edge} className="world-choreography" aria-hidden="true"><Suspense fallback={null}><FieldStudy key={theme} theme={theme} /></Suspense></div>;
}
export function AmbientScene({ awake, onToggle }: { awake: boolean; onToggle: () => void }) {
  const theme = useActiveTheme();
  const visible = useSyncExternalStore(subscribe, () => !document.hidden, () => false);
  const [label, status] = invitations[theme];
  return <div className="world-environment" data-awake={awake}>
    {awake && visible && <SceneEdge theme={theme} />}
    <button className="environment-toggle world-toggle" type="button" aria-pressed={awake} onClick={onToggle} aria-label={awake ? '关闭全页主题动效' : '开启全页主题动效'} title={awake ? '收起风景' : label}>
      <span className="world-switch-mark" aria-hidden="true">{awake ? <Icon name="pause" size={15}/> : <ThemeMotif theme={theme}/>}</span>
      <span className="world-switch-label">{awake ? '收起风景' : label}</span>
    </button>
    <span className="sr-only" role="status">{awake ? status : '全页主题动效已关闭'}</span>
  </div>;
}

"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { isTheme, themes, themeNames, THEME_STORAGE_KEY, type ThemeName } from "@/lib/themes";
import { ThemeMotif } from "./theme-motif";

function activeTheme(): ThemeName {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "dusk";
}
function subscribe(notify: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.dataset.theme = isTheme(event.newValue) ? event.newValue : "dusk";
    notify();
  };
  window.addEventListener("storage", sync);
  window.addEventListener("nsb:theme", notify);
  return () => { window.removeEventListener("storage", sync); window.removeEventListener("nsb:theme", notify); };
}
const serverTheme = (): ThemeName => "dusk";

export function ThemeSwitcher() {
  const current = useSyncExternalStore(subscribe, activeTheme, serverTheme);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const transition = useRef<ViewTransition | null>(null);
  const selection = useRef(0);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    function dismiss(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function switchTheme(name: ThemeName) {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const request = ++selection.current;
    transition.current?.skipTransition();
    transition.current = null;
    root.removeAttribute('data-cinematic-theme');

    const apply = () => {
      if (request !== selection.current) return;
      root.setAttribute('data-theme', name);
      try { localStorage.setItem(THEME_STORAGE_KEY, name); } catch { /* This tab keeps its choice. */ }
      window.dispatchEvent(new Event("nsb:theme"));
    };
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    if (name === activeTheme() || !document.startViewTransition || reduceMotion.matches || document.hidden) {
      apply();
      return;
    }

    root.setAttribute('data-cinematic-theme', name);
    try {
      const next = document.startViewTransition(() => flushSync(apply));
      transition.current = next;
      const skip = () => { if (reduceMotion.matches || document.hidden) next.skipTransition(); };
      reduceMotion.addEventListener('change', skip);
      document.addEventListener('visibilitychange', skip);
      void next.ready.catch(() => {});
      void next.finished.catch(() => {}).finally(() => {
        reduceMotion.removeEventListener('change', skip);
        document.removeEventListener('visibilitychange', skip);
        if (transition.current === next) {
          root.removeAttribute('data-cinematic-theme');
          transition.current = null;
        }
      });
    } catch {
      root.removeAttribute('data-cinematic-theme');
      apply();
    }
  }

  return <div className="theme-switcher" ref={menuRef}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); event.stopPropagation(); }
      const offsets: Record<string, number> = { ArrowDown: 2, ArrowUp: -2, ArrowRight: 1, ArrowLeft: -1 };
      if (!open || (!(event.key in offsets) && event.key !== "Home" && event.key !== "End")) return;
      event.preventDefault();
      const options = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []);
      const index = options.findIndex(option => option === document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + offsets[event.key] + options.length) % options.length;
      options[next]?.focus();
    }}>
    <button ref={trigger} type="button" className="theme-trigger" onClick={() => setOpen(!open)} aria-label="切换主题" aria-haspopup="menu" aria-controls={open ? menuId : undefined} aria-expanded={open}
      onKeyDown={event => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true); } }}>
      <span className="theme-current-swatch" aria-hidden="true"><ThemeMotif theme={current} /></span><span className="theme-trigger-label">主题</span>
    </button>
    {open && <div id={menuId} className="theme-menu theme-scene-menu" role="menu" aria-label="选择主题">
      {themeNames.map(name => <button key={name} type="button" role="menuitemradio" aria-checked={current === name} data-theme-choice={name} onClick={() => switchTheme(name)}>
        <span className="theme-swatch" data-theme-preview={name} aria-hidden="true"><ThemeMotif theme={name} /></span>
        <span className="theme-scene-label"><strong>{themes[name].label}</strong><small>{themes[name].description}</small></span>
        <span className="theme-check" aria-hidden="true">{current === name ? "✓" : ""}</span>
      </button>)}
    </div>}
  </div>;
}

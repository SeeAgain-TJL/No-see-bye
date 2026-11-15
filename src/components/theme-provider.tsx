"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { isTheme, themes, themeNames, THEME_STORAGE_KEY, type ThemeName } from "@/lib/themes";

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
    trigger.current?.focus();
    if (name === current) {
      try { localStorage.setItem(THEME_STORAGE_KEY, name); } catch { /* In-memory choice still works. */ }
      return;
    }
    const apply = () => {
      document.documentElement.dataset.theme = name;
      try { localStorage.setItem(THEME_STORAGE_KEY, name); } catch { /* In-memory choice still works. */ }
      window.dispatchEvent(new Event("nsb:theme"));
    };
    transition.current?.skipTransition();
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(); return; }
    const rect = trigger.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-radius", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    root.setAttribute("data-theme-transition", "true");
    const next = document.startViewTransition(apply);
    transition.current = next;
    void next.ready.catch(() => {});
    void next.finished.catch(() => {}).finally(() => {
      if (transition.current === next) { root.removeAttribute("data-theme-transition"); transition.current = null; }
    });
  }

  return <div className="theme-switcher" ref={menuRef}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); event.stopPropagation(); }
      if (!open || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const options = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []);
      const index = options.findIndex(option => option === document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
    }}>
    <button ref={trigger} type="button" className="theme-trigger" onClick={() => setOpen(!open)} aria-label="切换主题" aria-haspopup="menu" aria-controls={open ? menuId : undefined} aria-expanded={open}
      onKeyDown={event => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true); } }}>
      <span className="theme-current-swatch" aria-hidden="true" /><span className="theme-trigger-label">换个心情</span>
    </button>
    {open && <div id={menuId} className="theme-menu" role="menu" aria-label="选择主题">
      <p>给今天换一种颜色</p>
      {themeNames.map(name => <button key={name} type="button" role="menuitemradio" aria-checked={current === name} onClick={() => switchTheme(name)}>
        <span className="theme-swatch" data-theme-preview={name} aria-hidden="true" />
        <span><strong>{themes[name].label}</strong><small>{themes[name].description}</small></span>
        <span className="theme-check" aria-hidden="true">{current === name ? "✓" : ""}</span>
      </button>)}
    </div>}
  </div>;
}

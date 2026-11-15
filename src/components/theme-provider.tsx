"use client";
import { useEffect, useRef, useState } from "react";
import { themes, type ThemeName } from "@/lib/themes";

const STORAGE_KEY = "theme";

function isTheme(value: string | null | undefined): value is ThemeName {
  return !!value && value in themes;
}

function activeTheme(): ThemeName {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "dusk";
}

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeName>("dusk");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function toggle() {
    if (!open) setCurrent(activeTheme());
    setOpen(!open);
  }

  function switchTheme(name: ThemeName) {
    setCurrent(name);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      /* storage unavailable: the theme still applies for this visit */
    }
    const apply = () => {
      document.documentElement.dataset.theme = name;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof document.startViewTransition === "function" && !reduced) document.startViewTransition(apply);
    else apply();
  }

  return (
    <div className="theme-switcher" ref={menuRef}>
      <button type="button" className="theme-trigger" onClick={toggle} aria-label="切换主题" aria-expanded={open}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="10" cy="10" r="4" />
          <path d="M10 2v2m0 12v2M2 10h2m12 0h2m-2.8-5.2l-1.4 1.4m-9.6 9.6l-1.4 1.4m12-12l1.4 1.4m-9.6 9.6l1.4 1.4" />
        </svg>
      </button>
      {open && (
        <div className="theme-menu">
          {(Object.keys(themes) as ThemeName[]).map((name) => (
            <button
              key={name}
              type="button"
              className={current === name ? "active" : ""}
              aria-pressed={current === name}
              onClick={() => switchTheme(name)}
            >
              <span className="theme-swatch" data-theme-preview={name} />
              {themes[name].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

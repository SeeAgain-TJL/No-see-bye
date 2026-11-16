"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AmbientScene } from "./ambient-scene";

const surfaces = ".keepsake-entry, .memory-card, .wall-item, .motion-surface";
const arrivals = `${surfaces}, .keepsake-album, .keepsake-hero, .journal-hero, .stats-strip, .motion-reveal`;

/** Progressive motion: no content is hidden while JavaScript or observers load. */
export function ImmersiveMotion() {
  const anchor = useRef<HTMLDivElement>(null);
  const [awake, setAwake] = useState(false);
  const path = usePathname();
  const enabled = path === "/" || path === "/memories";

  useEffect(() => {
    if (!enabled) return;
    const host = anchor.current?.closest<HTMLElement>(".app-shell");
    const content = host?.querySelector<HTMLElement>(".main-content");
    if (!host || !content) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const animations = new Set<Animation>();
    const enhanced = new Set<HTMLElement>();
    const revealed = new WeakSet<Element>();
    const observing = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let activeSurface: HTMLElement | null = null;
    let pointerFrame = 0, scrollFrame = 0, mutationFrame = 0;
    let pointer: { element: HTMLElement; x: number; y: number } | null = null;
    let batch = 0;

    const resetSurface = () => {
      pointer = null;
      if (!activeSurface) return;
      delete activeSurface.dataset.motionHover;
      activeSurface.style.removeProperty("--surface-x");
      activeSurface.style.removeProperty("--surface-y");
      activeSurface.style.removeProperty("--tilt-x");
      activeSurface.style.removeProperty("--tilt-y");
      activeSurface = null;
    };
    const enter = (element: HTMLElement) => {
      if (revealed.has(element)) return;
      revealed.add(element);
      if (reduced.matches || typeof element.animate !== "function") return;
      const animation = element.animate([
        { opacity: .2, translate: "0 42px", scale: ".97" },
        { opacity: 1, translate: "0 0", scale: "1" },
      ], { duration: 850, delay: Math.min(batch++ % 4, 3) * 70, easing: "cubic-bezier(.16,1,.3,1)" });
      animations.add(animation);
      void animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    };
    if ("IntersectionObserver" in window) observer = new IntersectionObserver(entries => {
      batch = 0;
      for (const entry of entries) if (entry.isIntersecting) { enter(entry.target as HTMLElement); observer?.unobserve(entry.target); observing.delete(entry.target as HTMLElement); }
    }, { rootMargin: "0px 0px 35px 0px", threshold: .04 });

    const discover = () => {
      mutationFrame = 0;
      for (const element of observing) if (!content.contains(element)) { observer?.unobserve(element); observing.delete(element); }
      for (const element of enhanced) if (!content.contains(element)) enhanced.delete(element);
      content.querySelectorAll<HTMLElement>(arrivals).forEach(element => {
        // Feed wrappers include their month heading and card. Animate that unit
        // once instead of fading both an ancestor and its child independently.
        if (element.parentElement?.closest(arrivals)) return;
        if (!revealed.has(element)) {
          if (observer && !observing.has(element)) { observer.observe(element); observing.add(element); }
          else if (!observer) enter(element);
        }
      });
      content.querySelectorAll<HTMLElement>(surfaces).forEach(element => {
        if (enhanced.has(element)) return;
        enhanced.add(element);
        element.dataset.motionSurface = "";
      });
    };
    discover();
    const changes = new MutationObserver(() => { if (!mutationFrame) mutationFrame = requestAnimationFrame(discover); });
    changes.observe(content, { childList: true, subtree: true });

    const paintPointer = () => {
      pointerFrame = 0;
      if (!pointer || reduced.matches || !fine.matches) return;
      const { element, x, y } = pointer;
      if (!element.isConnected) { resetSurface(); return; }
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const px = Math.max(0, Math.min(1, (x - bounds.left) / bounds.width));
      const py = Math.max(0, Math.min(1, (y - bounds.top) / bounds.height));
      element.style.setProperty("--surface-x", `${px * 100}%`);
      element.style.setProperty("--surface-y", `${py * 100}%`);
      element.style.setProperty("--tilt-x", `${(0.5 - py) * 5}deg`);
      element.style.setProperty("--tilt-y", `${(px - 0.5) * 7}deg`);
      element.dataset.motionHover = "true";
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduced.matches || !fine.matches) return;
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest<HTMLElement>("[data-motion-surface]");
      if (!element || target?.closest("dialog") || !content.contains(element)) { resetSurface(); return; }
      if (activeSurface !== element) { resetSurface(); activeSurface = element; }
      pointer = { element, x: event.clientX, y: event.clientY };
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
    };
    const leave = (event: PointerEvent) => {
      if (!activeSurface || (event.relatedTarget instanceof Node && activeSurface.contains(event.relatedTarget))) return;
      pointer = null;
      resetSurface();
    };
    const paintScroll = () => {
      scrollFrame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      host.style.setProperty("--reading-progress", String(range > 0 ? Math.max(0, Math.min(1, scrollY / range)) : 0));
      host.style.setProperty("--environment-drift", reduced.matches ? "0px" : `${-Math.min(120, scrollY * .085)}px`);
    };
    const scroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll); };
    const measureShell = () => {
      const body = host.querySelector<HTMLElement>(".app-body");
      const topbar = host.querySelector<HTMLElement>(".topbar");
      host.style.setProperty("--environment-left", body ? getComputedStyle(body).marginLeft : "0px");
      host.style.setProperty("--environment-top", `${topbar?.offsetHeight || 0}px`);
      scroll();
    };
    const preferenceChanged = () => { animations.forEach(animation => animation.cancel()); resetSurface(); paintScroll(); };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerout", leave, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measureShell, { passive: true });
    reduced.addEventListener("change", preferenceChanged);
    fine.addEventListener("change", preferenceChanged);
    measureShell(); paintScroll();
    return () => {
      changes.disconnect(); observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      cancelAnimationFrame(pointerFrame); cancelAnimationFrame(scrollFrame); cancelAnimationFrame(mutationFrame);
      host.removeEventListener("pointermove", move); host.removeEventListener("pointerout", leave);
      window.removeEventListener("scroll", scroll); window.removeEventListener("resize", measureShell);
      reduced.removeEventListener("change", preferenceChanged); fine.removeEventListener("change", preferenceChanged);
      resetSurface();
      for (const element of enhanced) delete element.dataset.motionSurface;
      host.style.removeProperty("--reading-progress"); host.style.removeProperty("--environment-drift");
      host.style.removeProperty("--environment-left"); host.style.removeProperty("--environment-top");
    };
  }, [path, enabled]);

  return enabled ? <div ref={anchor} className="immersive-motion-root">
    <div className="immersive-reading-track" aria-hidden="true"><span /></div>
    <AmbientScene awake={awake} onToggle={() => setAwake(value => !value)} />
  </div> : null;
}

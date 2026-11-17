"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AmbientScene } from "./ambient-scene";

const surfaces = ".keepsake-entry, .memory-card, .wall-item, .motion-surface";
const arrivals = `${surfaces}, .living-gallery, .keepsake-hero, .home-welcome, .journal-cover, .stats-strip, .motion-reveal, .auth-story-copy, .auth-main, .auth-form, .editor-paper, .detail-article, .settings-card`;
const magneticControls = '.home-small-actions button, .gallery-control, .auth-submit, .studio-button, .journal-cover-write, .world-toggle';
const worldSubscribers = new Set<() => void>();
let currentAwake: boolean | undefined;
function readWorld() {
  if (currentAwake !== undefined) return currentAwake;
  try { return sessionStorage.getItem('nsb-world-awake') === 'true'; } catch { return false; }
}
function subscribeWorld(notify: () => void) {
  worldSubscribers.add(notify);
  return () => { worldSubscribers.delete(notify); };
}
function toggleScene() {
  currentAwake = !readWorld();
  try { sessionStorage.setItem('nsb-world-awake', String(currentAwake)); } catch { /* This tab still works without storage. */ }
  worldSubscribers.forEach(notify => notify());
}

/** Progressive motion: no content is hidden while JavaScript or observers load. */
export function ImmersiveMotion() {
  const anchor = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLSpanElement>(null);
  const awake = useSyncExternalStore(subscribeWorld, readWorld, () => false);
  const path = usePathname();
  useEffect(() => {
    const host = anchor.current?.closest<HTMLElement>('.app-shell, .studio-auth');
    if (!host) return;
    host.dataset.worldAwake = String(awake);
    return () => { delete host.dataset.worldAwake; };
  }, [awake]);

  useEffect(() => {
    const host = anchor.current?.closest<HTMLElement>('.app-shell, .studio-auth');
    const content = host?.querySelector<HTMLElement>('.main-content') || host;
    if (!host || !content) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const animations = new Set<Animation>();
    const enhanced = new Set<HTMLElement>();
    const revealed = new WeakSet<Element>();
    const observing = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let activeSurface: HTMLElement | null = null;
    let magnetic: HTMLElement | null = null;
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
      if (element.matches('.auth-story')) return;
      if (reduced.matches || typeof element.animate !== "function") return;
      const animation = element.animate([
        { opacity: .3, translate: "0 42px" },
        { opacity: 1, translate: "0 0" },
      ], { duration: 850, delay: Math.min(batch++ % 4, 3) * 85, easing: "cubic-bezier(.16,1,.3,1)" });
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
      element.style.setProperty("--tilt-x", `${(0.5 - py) * 2.2}deg`);
      element.style.setProperty("--tilt-y", `${(px - 0.5) * 3}deg`);
      element.dataset.motionHover = "true";
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduced.matches || !fine.matches) return;
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>(magneticControls) || null;
      if (magnetic !== control) { magnetic?.style.removeProperty('--magnet-x'); magnetic?.style.removeProperty('--magnet-y'); magnetic = control; }
      if (control) {
        const bounds = control.getBoundingClientRect();
        control.style.setProperty('--magnet-x', `${Math.max(-5,Math.min(5,(event.clientX - bounds.left - bounds.width / 2) * .14))}px`);
        control.style.setProperty('--magnet-y', `${Math.max(-5,Math.min(5,(event.clientY - bounds.top - bounds.height / 2) * .2))}px`);
      }
      const element = target?.closest<HTMLElement>("[data-motion-surface]");
      if (!element || target?.closest("dialog") || !content.contains(element)) { resetSurface(); return; }
      if (activeSurface !== element) { resetSurface(); activeSurface = element; }
      pointer = { element, x: event.clientX, y: event.clientY };
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
    };
    const leave = (event: PointerEvent) => {
      if (magnetic && (!(event.relatedTarget instanceof Node) || !magnetic.contains(event.relatedTarget))) { magnetic.style.removeProperty('--magnet-x'); magnetic.style.removeProperty('--magnet-y'); magnetic = null; }
      if (!activeSurface || (event.relatedTarget instanceof Node && activeSurface.contains(event.relatedTarget))) return;
      pointer = null;
      resetSurface();
    };
    const press = (event: PointerEvent) => {
      if (reduced.matches || event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>('button:not(:disabled), a[href]');
      if (!control || control.closest('.album-stage, .album-gallery, dialog') || typeof control.animate !== 'function') return;
      if (control.closest('.photo-reel')) return;
      const spot = pulse.current;
      if (spot) {
        spot.style.left = event.clientX + 'px'; spot.style.top = event.clientY + 'px';
        const wave = spot.animate([{ transform: 'translate(-50%,-50%) scale(.15)', opacity: .55 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
        animations.add(wave); void wave.finished.catch(() => {}).finally(() => animations.delete(wave));
      }
      const animation = control.animate([{ scale: '1' }, { scale: '.92', offset: .3 }, { scale: '1.035', offset: .7 }, { scale: '1' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
      animations.add(animation);
      void animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    };
    const visibility = () => { host.dataset.worldHidden = String(document.hidden); };
    const paintScroll = () => {
      scrollFrame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      host.style.setProperty("--reading-progress", String(range > 0 ? Math.max(0, Math.min(1, scrollY / range)) : 0));
      host.style.setProperty("--world-scroll", reduced.matches ? "0px" : `${-Math.min(70, scrollY * .045)}px`);
    };
    const scroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll); };
    const measureShell = () => {
      const body = host.querySelector<HTMLElement>(".app-body");
      const topbar = host.querySelector<HTMLElement>(".topbar");
      host.style.setProperty("--environment-left", body ? getComputedStyle(body).marginLeft : "0px");
      host.style.setProperty("--environment-top", `${topbar?.offsetHeight || 0}px`);
      scroll();
    };
    const preferenceChanged = () => { animations.forEach(animation => animation.cancel()); resetSurface(); magnetic?.style.removeProperty('--magnet-x'); magnetic?.style.removeProperty('--magnet-y'); magnetic = null; paintScroll(); };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerout", leave, { passive: true });
    host.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measureShell, { passive: true });
    reduced.addEventListener("change", preferenceChanged);
    fine.addEventListener("change", preferenceChanged);
    measureShell(); paintScroll(); visibility();
    return () => {
      changes.disconnect(); observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      cancelAnimationFrame(pointerFrame); cancelAnimationFrame(scrollFrame); cancelAnimationFrame(mutationFrame);
      host.removeEventListener("pointermove", move); host.removeEventListener("pointerout", leave);
      host.removeEventListener('pointerdown', press); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener("scroll", scroll); window.removeEventListener("resize", measureShell);
      reduced.removeEventListener("change", preferenceChanged); fine.removeEventListener("change", preferenceChanged);
      resetSurface();
      for (const element of enhanced) delete element.dataset.motionSurface;
      magnetic?.style.removeProperty('--magnet-x'); magnetic?.style.removeProperty('--magnet-y');
      host.style.removeProperty("--reading-progress"); host.style.removeProperty("--world-scroll");
      host.style.removeProperty("--environment-left"); host.style.removeProperty("--environment-top");
      delete host.dataset.worldHidden;
    };
  }, [path]);

  return <div ref={anchor} className="immersive-motion-root">
    <span ref={pulse} className="motion-pulse" aria-hidden="true" />
    <div className="immersive-reading-track" aria-hidden="true"><span /></div>
    <AmbientScene awake={awake} onToggle={toggleScene} />
  </div>;
}

"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AmbientScene } from "./ambient-scene";

const surfaces = ".keepsake-entry, .memory-card, .wall-item, .motion-surface";
const scenicFrames = '.keepsake-hero, .journal-living-cover, .living-gallery, .auth-story';
const scenicArtwork = '.daydream-art, .jl-cover-art, .photo-gallery-viewport, .anime-scene';
const scenicCopy = '.studio-hero-copy, .jl-cover-copy, .gallery-heading, .auth-story-copy';
const arrivals = `${surfaces}, ${scenicFrames}, .home-welcome, .stats-strip, .motion-reveal, .auth-form, .editor-paper, .detail-article, .settings-card`;
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
    const animations = new Map<Animation, HTMLElement>();
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
    const ease = 'cubic-bezier(.2,.72,.24,1)';
    function play(element: HTMLElement, frames: Keyframe[], duration: number, delay = 0) {
      if (element.matches(':focus-within') || typeof element.animate !== 'function') return;
      const animation = element.animate(frames, { duration, delay, easing: ease, fill: 'backwards' });
      animations.set(animation, element);
      void animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    }
    const enter = (element: HTMLElement) => {
      if (revealed.has(element)) return;
      revealed.add(element);
      if (reduced.matches || document.hidden || element.matches(':focus-within')) return;
      if (element.matches(scenicFrames)) {
        const art = element.querySelector<HTMLElement>(scenicArtwork);
        const copy = element.querySelector<HTMLElement>(scenicCopy);
        // Keep the frame and controls in place. Only the artwork travels into focus.
        if (art) play(art, [
          { opacity: .5, scale: '1.045', translate: '0 8px' },
          { opacity: 1, scale: '1', translate: '0 0' },
        ], 760);
        if (copy) play(copy, [{ opacity: .82 }, { opacity: 1 }], 380, 50);
        return;
      }
      play(element, [
        { opacity: .78, translate: '0 12px' },
        { opacity: 1, translate: '0 0' },
      ], 520, Math.min(batch++, 3) * 45);
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
        if (enhanced.has(element) || element.matches(scenicFrames)) return;
        enhanced.add(element);
        element.dataset.motionSurface = "";
      });
    };
    discover();
    const changes = new MutationObserver(() => { if (!mutationFrame) mutationFrame = requestAnimationFrame(discover); });
    changes.observe(content, { childList: true, subtree: true });

    const paintPointer = () => {
      pointerFrame = 0;
      if (!pointer || reduced.matches || !fine.matches || document.hidden) return;
      const { element, x, y } = pointer;
      if (!element.isConnected) { resetSurface(); return; }
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const px = Math.max(0, Math.min(1, (x - bounds.left) / bounds.width));
      const py = Math.max(0, Math.min(1, (y - bounds.top) / bounds.height));
      element.style.setProperty("--surface-x", `${px * 100}%`);
      element.style.setProperty("--surface-y", `${py * 100}%`);
      element.style.setProperty("--tilt-x", `${(0.5 - py) * 1.5}deg`);
      element.style.setProperty("--tilt-y", `${(px - 0.5) * 2}deg`);
      element.dataset.motionHover = "true";
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduced.matches || !fine.matches || document.hidden) return;
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>(magneticControls) || null;
      if (magnetic !== control) { magnetic?.style.removeProperty('--magnet-x'); magnetic?.style.removeProperty('--magnet-y'); magnetic = control; }
      if (control) {
        const bounds = control.getBoundingClientRect();
        control.style.setProperty('--magnet-x', `${Math.max(-3,Math.min(3,(event.clientX - bounds.left - bounds.width / 2) * .10))}px`);
        control.style.setProperty('--magnet-y', `${Math.max(-3,Math.min(3,(event.clientY - bounds.top - bounds.height / 2) * .14))}px`);
      }
      const element = target?.closest<HTMLElement>("[data-motion-surface]");
      if (!element || element.matches(scenicFrames) || target?.closest("dialog") || !content.contains(element)) { resetSurface(); return; }
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
    const finishArrival = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      for (const [animation, element] of animations) {
        if (element.contains(event.target)) animation.cancel();
      }
    };
    const cancelArrivals = () => { for (const animation of animations.keys()) animation.cancel(); };
    const visibility = () => {
      host.dataset.worldHidden = String(document.hidden);
      if (document.hidden) cancelArrivals();
    };
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
    const preferenceChanged = () => { cancelArrivals(); resetSurface(); magnetic?.style.removeProperty('--magnet-x'); magnetic?.style.removeProperty('--magnet-y'); magnetic = null; paintScroll(); };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerout", leave, { passive: true });
    host.addEventListener('pointerdown', finishArrival, { passive: true });
    host.addEventListener('focusin', finishArrival);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measureShell, { passive: true });
    reduced.addEventListener("change", preferenceChanged);
    fine.addEventListener("change", preferenceChanged);
    measureShell(); paintScroll(); visibility();
    return () => {
      changes.disconnect(); observer?.disconnect();
      cancelArrivals();
      cancelAnimationFrame(pointerFrame); cancelAnimationFrame(scrollFrame); cancelAnimationFrame(mutationFrame);
      host.removeEventListener("pointermove", move); host.removeEventListener("pointerout", leave);
      host.removeEventListener('pointerdown', finishArrival);
      host.removeEventListener('focusin', finishArrival);
      document.removeEventListener('visibilitychange', visibility);
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
    <div className="immersive-reading-track" aria-hidden="true"><span /></div>
    <AmbientScene awake={awake} onToggle={toggleScene} />
  </div>;
}

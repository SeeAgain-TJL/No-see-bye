'use client';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export const wrap = (n: number, count: number) => ((n % count) + count) % count;
export function albumOffset(index: number, position: number, count: number) {
  return count > 2 ? wrap(index - position + count / 2, count) - count / 2 : index - position;
}

type Controls = {
  select: (index: number) => void;
  down: (e: ReactPointerEvent<HTMLDivElement>) => void;
  move: (e: ReactPointerEvent<HTMLDivElement>) => void;
  up: (e: ReactPointerEvent<HTMLDivElement>) => void;
  cancel: () => void;
  wasDragged: () => boolean;
};

// Frame transforms are written outside React; only a settled selection updates content.
export function useAlbumMotion(index: number, count: number, onSelect: (index: number) => void) {
  const stage = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const selection = useRef(index);
  const callback = useRef(onSelect);
  useEffect(() => { selection.current = index; callback.current = onSelect; }, [index, onSelect]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-album-card]'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let current = selection.current, target = current, speed = 0, frame = 0, lastTime = 0;
    let step = 270, cardWidth = 440, mobile = false, moved = false;
    let gesture: { id: number; x: number; y: number; position: number; lastX: number; time: number; velocity: number; index: number } | null = null;
    const paint = () => {
      cards.forEach((card, i) => {
        const offset = albumOffset(i, current, count), distance = Math.abs(offset);
        const scale = 1 - Math.min(distance, 2) * (mobile ? .09 : .115);
        // Phones shuffle a small stack; wide screens spread into a photo desk.
        const x = mobile ? Math.sign(offset) * (Math.sin(Math.min(distance, 1) * Math.PI) * cardWidth * .5 + Math.min(distance, 1) * 14) : offset * step;
        const y = Math.min(distance, 2) * (mobile ? -12 : 16);
        const angle = clamp(offset, -2, 2) * (mobile ? 4 : 5);
        card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${angle}deg) scale(${scale})`;
        card.style.opacity = String(clamp((1.8 - distance) * 1.5, 0, 1));
        card.style.zIndex = String(30 - Math.round(distance * 10));
        card.style.pointerEvents = distance < 1.6 ? 'auto' : 'none';
      });
      element.dataset.position = current.toFixed(3);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTime = 0; };
    const tick = (time: number) => {
      const dt = Math.min(lastTime ? (time - lastTime) / 1000 : .016, .032);
      lastTime = time;
      speed += ((target - current) * 160 - speed * 23) * dt;
      current += speed * dt;
      if (Math.abs(target - current) < .0005 && Math.abs(speed) < .005) {
        current = target; speed = 0; paint(); stop();
      } else { paint(); frame = requestAnimationFrame(tick); }
    };
    const animate = (next: number) => {
      target = next;
      if (reduced.matches) { stop(); current = target; speed = 0; paint(); }
      else if (!frame) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      mobile = window.matchMedia('(max-width: 760px)').matches;
      cardWidth = mobile ? Math.min(326, element.clientWidth - 76) : Math.min(458, element.clientWidth * .51);
      step = mobile ? cardWidth * .87 : cardWidth * .73;
      element.style.setProperty('--album-card-width', `${cardWidth}px`);
      paint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const cancel = () => { gesture = null; delete element.dataset.dragging; animate(target); };
    controls.current = {
      select: next => animate(current + albumOffset(next, current, count)),
      wasDragged: () => moved,
      down: e => {
        if (e.button !== 0 || !e.isPrimary) return;
        moved = false;
        if (count < 2) return;
        stop(); speed = 0;
        gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, position: current, lastX: e.clientX, time: e.timeStamp, velocity: 0, index: selection.current };
      },
      move: e => {
        if (!gesture || gesture.id !== e.pointerId) return;
        const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
        if (!moved && Math.hypot(dx, dy) < 7) return;
        if (!moved && Math.abs(dy) > Math.abs(dx)) { cancel(); return; }
        moved = true; element.dataset.dragging = 'true';
        element.setPointerCapture(e.pointerId);
        gesture.velocity = (e.clientX - gesture.lastX) / Math.max(8, e.timeStamp - gesture.time);
        gesture.lastX = e.clientX; gesture.time = e.timeStamp;
        current = gesture.position - dx / step;
        if (count < 3) current = clamp(current, -.18, count - .82);
        paint();
      },
      up: e => {
        if (!gesture || gesture.id !== e.pointerId) return;
        const g = gesture;
        gesture = null; delete element.dataset.dragging;
        if (!moved) { animate(target); return; }
        const dx = e.clientX - g.x;
        const fast = e.timeStamp - g.time < 100 && Math.abs(g.velocity) > .45;
        const advance = Math.abs(dx) > step * .18 || fast;
        let next = advance ? g.index + (dx < 0 ? 1 : -1) : g.index;
        next = count > 2 ? wrap(next, count) : clamp(next, 0, count - 1);
        animate(current + albumOffset(next, current, count));
        callback.current(next);
      },
      cancel,
    };
    return () => { stop(); observer.disconnect(); controls.current = null; };
  }, [count]);

  useEffect(() => { controls.current?.select(index); }, [index, count]);
  return { stage, controls };
}

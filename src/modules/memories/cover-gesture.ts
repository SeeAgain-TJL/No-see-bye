"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

const tapDistance = 12;
const doubleTapWindow = 330;

export function useCoverGesture(open: () => void, drag?: (event: PointerEvent<HTMLButtonElement>, dx: number) => void) {
  const press = useRef<{ id: number; x: number; y: number; applied: number; at: number; moved: boolean } | null>(null);
  const tap = useRef<{ x: number; y: number; at: number } | null>(null);
  const moved = useRef(false);

  function end(event: PointerEvent<HTMLButtonElement>) {
    if (press.current?.id !== event.pointerId) return;
    press.current = null;
    event.currentTarget.removeAttribute("data-cover-dragging");
  }

  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (!event.isPrimary || event.button !== 0) return;
      press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, applied: 0, at: performance.now(), moved: false };
      moved.current = false;
      if (drag) event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const start = press.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      start.moved ||= Math.hypot(dx, event.clientY - start.y) > tapDistance;
      if (!start.moved) return;
      moved.current = true;
      tap.current = null;
      if (!drag || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.currentTarget.setAttribute("data-cover-dragging", "");
      drag(event, dx - start.applied);
      start.applied = dx;
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const start = press.current;
      end(event);
      if (!start || start.id !== event.pointerId || event.pointerType !== "touch") return;
      const at = performance.now();
      if (start.moved || at - start.at > doubleTapWindow || Math.hypot(event.clientX - start.x, event.clientY - start.y) > tapDistance) {
        tap.current = null;
        return;
      }
      const previous = tap.current;
      if (previous && at - previous.at < doubleTapWindow && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 34) {
        tap.current = null;
        open();
      } else tap.current = { x: event.clientX, y: event.clientY, at };
    },
    onPointerCancel(event: PointerEvent<HTMLButtonElement>) { tap.current = null; end(event); },
    onLostPointerCapture: end,
    onDoubleClick() { if (!moved.current) open(); },
    onClick(event: MouseEvent<HTMLButtonElement>) { if (event.detail === 0) open(); },
  };
}

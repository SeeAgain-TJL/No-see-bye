"use client";

import { useEffect, useRef } from "react";
import { drawGlassScene, readGlassLight } from "./admin-glass-renderer";
import "./admin-glass-scene.css";

type SceneControls = { synced: number; paused: boolean; focused?: boolean };

export function AdminParticleField(props: SceneControls) {
  const { synced, paused, focused } = props;
  const artwork = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const update = useRef<((settings: SceneControls) => void) | null>(null);

  useEffect(() => {
    const scene = artwork.current;
    const target = canvas.current;
    const context = target?.getContext("2d");
    const stage = scene?.closest<HTMLElement>(".admin-monitor-stage");
    if (!scene || !target || !context || !stage) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let settings: SceneControls = { synced: 0, paused: true };
    let light = readGlassLight(getComputedStyle(scene));
    let inView = true;
    let drawable = true;
    let width = 0;
    let height = 0;
    let aim = { x: 0, y: 0 };
    let camera = { x: 0, y: 0 };
    let zoom = 0;
    let frame = 0;
    let lastDraw = 0;
    let elapsed = 0;
    let pulseStart = -Infinity;
    let releaseAt = 0;

    function visible() {
      return drawable && inView && !document.hidden;
    }

    function requestDraw() {
      if (!frame && visible()) frame = requestAnimationFrame(render);
    }

    function render(now: number) {
      frame = 0;
      if (!visible() || !context || !scene || !width || !height) return;
      const delta = lastDraw ? Math.min(64, now - lastDraw) : 34;
      const reduced = motion.matches;
      const hasPulse = !reduced && now - pulseStart < 1400;
      const running = !reduced && !settings.paused;
      const focus = settings.focused ? 1 : 0;
      const blend = reduced ? 1 : 1 - Math.exp(-delta / 116);

      if (running && delta < 30) {
        requestDraw();
        return;
      }
      if (releaseAt && now >= releaseAt) {
        aim = { x: 0, y: 0 };
        releaseAt = 0;
      }
      if (running) elapsed += delta / 1000;
      lastDraw = now;
      camera = {
        x: camera.x + ((reduced ? 0 : aim.x) - camera.x) * blend,
        y: camera.y + ((reduced ? 0 : aim.y) - camera.y) * blend,
      };
      zoom += (focus - zoom) * blend;
      drawGlassScene(context, {
        width, height, time: elapsed, pointer: camera, focus: zoom,
        pulse: hasPulse ? (1 - (now - pulseStart) / 1400) ** 2 : 0,
        light,
      });
      if (!scene.dataset.ready) scene.dataset.ready = "true";

      const moving = Math.abs(zoom - focus) + Math.abs(camera.x - aim.x) + Math.abs(camera.y - aim.y) > .002;
      if (!reduced && (running || moving || hasPulse || releaseAt)) requestDraw();
      else lastDraw = 0;
    }

    function resize() {
      if (!target || !context || !scene) return;
      width = scene.clientWidth;
      height = scene.clientHeight;
      const density = Math.min(1.6, devicePixelRatio || 1);
      target.width = Math.max(1, Math.round(width * density));
      target.height = Math.max(1, Math.round(height * density));
      context.setTransform(density, 0, 0, density, 0, 0);
      requestDraw();
    }

    function pauseInvisible() {
      if (visible()) requestDraw();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        lastDraw = 0;
      }
    }

    function contextLost() {
      drawable = false;
      if (scene) delete scene.dataset.ready;
      pauseInvisible();
    }

    function contextRestored() {
      drawable = true;
      resize();
    }

    function move(event: PointerEvent) {
      if (motion.matches || !scene) return;
      const bounds = scene.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      aim = {
        x: clamp((event.clientX - bounds.left) / bounds.width * 2 - 1),
        y: clamp((event.clientY - bounds.top) / bounds.height * 2 - 1),
      };
      releaseAt = 0;
      requestDraw();
    }

    function reset(event: PointerEvent) {
      if (event.type === "pointerup" && event.pointerType === "mouse") return;
      if (event.type === "pointerleave" && releaseAt) return;
      if (event.type === "pointerup" && !motion.matches) releaseAt = performance.now() + 330;
      else {
        aim = { x: 0, y: 0 };
        releaseAt = 0;
      }
      requestDraw();
    }

    update.current = next => {
      if (settings.synced && settings.synced !== next.synced && next.synced) pulseStart = performance.now();
      settings = next;
      requestDraw();
    };
    const resizeObserver = new ResizeObserver(resize);
    const viewObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      pauseInvisible();
    });
    const themeObserver = new MutationObserver(() => {
      light = readGlassLight(getComputedStyle(scene));
      requestDraw();
    });
    resizeObserver.observe(scene);
    viewObserver.observe(scene);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", pauseInvisible);
    motion.addEventListener("change", requestDraw);
    target.addEventListener("contextlost", contextLost);
    target.addEventListener("contextrestored", contextRestored);
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerdown", move, { passive: true });
    stage.addEventListener("pointerleave", reset);
    stage.addEventListener("pointerup", reset);
    stage.addEventListener("pointercancel", reset);
    resize();

    return () => {
      update.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", pauseInvisible);
      motion.removeEventListener("change", requestDraw);
      target.removeEventListener("contextlost", contextLost);
      target.removeEventListener("contextrestored", contextRestored);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerdown", move);
      stage.removeEventListener("pointerleave", reset);
      stage.removeEventListener("pointerup", reset);
      stage.removeEventListener("pointercancel", reset);
    };
  }, []);

  useEffect(() => { update.current?.({ synced, paused, focused }); }, [synced, paused, focused]);

  return <div ref={artwork} className="admin-glass-scene" aria-hidden="true">
    <div className="admin-glass-fallback"><i /><i /><i /></div>
    <canvas ref={canvas} />
  </div>;
}

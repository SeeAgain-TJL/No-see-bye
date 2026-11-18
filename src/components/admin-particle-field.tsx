"use client";

import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function spherePoint(index: number, total: number) {
  const height = 1 - 2 * (index + .5) / total;
  const radius = Math.sqrt(1 - height * height);
  const angle = index * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: height, z: Math.sin(angle) * radius };
}

export function AdminParticleField({ synced, paused }: { synced: number; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const syncPulse = useRef(0);

  useEffect(() => {
    if (synced) syncPulse.current = performance.now();
  }, [synced]);

  useEffect(() => {
    const target = canvas.current;
    const ctx = target?.getContext("2d");
    if (!target || !ctx) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let inView = true;
    let width = 0;
    let height = 0;
    let lastDraw = -Infinity;
    let elapsed = 0;
    let lastFrame = 0;
    let color = "#b1e5cc";
    let warm = "#e8b880";
    let points: ReturnType<typeof spherePoint>[] = [];

    function draw(now: number, animate: boolean) {
      if (!ctx || !width || !height) return;
      const radius = Math.min(width * .27, height * .34);
      const x = width * .53;
      const y = height * .50;
      const spin = animate ? elapsed * .00015 : .7;
      const bank = -.32;
      const pulseProgress = (now - syncPulse.current) / 1500;
      const pulse = animate && syncPulse.current && pulseProgress >= 0 && pulseProgress <= 1 ? 1 - pulseProgress : 0;
      ctx.clearRect(0, 0, width, height);

      // A dim field and orbit provide depth behind the lit side of the globe.
      for (let i = 0; i < 56; i++) {
        const px = ((i * 197 + 41) % 653) / 653 * width;
        const py = ((i * 131 + 89) % 359) / 359 * height;
        ctx.fillStyle = i % 7 === 0 ? warm : color;
        ctx.globalAlpha = .1 + .17 * (i % 6) / 6;
        ctx.fillRect(px, py, i % 9 === 0 ? 1.6 : .75, i % 9 === 0 ? 1.6 : .75);
      }

      ctx.lineWidth = .7;
      ctx.strokeStyle = color;
      for (const ring of [1.38, 1.53, 1.73]) {
        ctx.beginPath();
        ctx.ellipse(x, y, radius * ring, radius * .47 * ring, bank, 0, TAU);
        ctx.globalAlpha = ring === 1.53 ? .21 : .08;
        ctx.stroke();
      }
      if (pulse > 0) {
        ctx.beginPath();
        ctx.ellipse(x, y, radius * (1.38 + pulseProgress * .63), radius * (.64 + pulseProgress * .33), bank, 0, TAU);
        ctx.strokeStyle = warm;
        ctx.globalAlpha = pulse * .68;
        ctx.stroke();
      }

      const cosine = Math.cos(spin);
      const sine = Math.sin(spin);
      const tiltCosine = Math.cos(bank);
      const tiltSine = Math.sin(bank);
      for (const point of points) {
        const px = point.x * cosine - point.z * sine;
        const depth = point.x * sine + point.z * cosine;
        const py = point.y * tiltCosine - depth * tiltSine;
        const front = point.y * tiltSine + depth * tiltCosine;
        const perspective = 1 / (1 - front * .23);
        const lit = Math.max(0, front * .55 + px * .46 - py * .17);
        const size = (.63 + lit * 1.25) * perspective;
        ctx.fillStyle = lit > .68 ? warm : color;
        ctx.globalAlpha = front > 0 ? .23 + lit * .73 : .08 + lit * .25;
        ctx.beginPath();
        ctx.arc(x + px * radius * perspective, y + py * radius * perspective, size, 0, TAU);
        ctx.fill();
      }

      for (let i = 0; i < 32; i++) {
        const angle = i / 32 * TAU + spin * .6;
        const ringX = Math.cos(angle) * radius * 1.53;
        const ringY = Math.sin(angle) * radius * .70;
        const orbitX = x + ringX * tiltCosine - ringY * tiltSine;
        const orbitY = y + ringX * tiltSine + ringY * tiltCosine;
        ctx.fillStyle = i % 6 === 0 ? warm : color;
        ctx.globalAlpha = .16 + Math.max(0, Math.sin(angle)) * .53;
        ctx.fillRect(orbitX, orbitY, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
    }

    function loop(now: number) {
      if (lastFrame) elapsed += Math.min(50, now - lastFrame);
      lastFrame = now;
      if (now - lastDraw >= 32) {
        draw(now, true);
        lastDraw = now;
      }
      frame = requestAnimationFrame(loop);
    }

    function syncAnimation() {
      cancelAnimationFrame(frame);
      lastFrame = 0;
      if (!paused && !motion.matches && inView && !document.hidden) frame = requestAnimationFrame(loop);
      else draw(performance.now(), false);
    }

    function resize() {
      if (!target || !ctx) return;
      width = target.clientWidth;
      height = target.clientHeight;
      const density = Math.min(2, window.devicePixelRatio || 1);
      target.width = Math.max(1, Math.round(width * density));
      target.height = Math.max(1, Math.round(height * density));
      ctx.setTransform(density, 0, 0, density, 0, 0);
      const total = width < 480 ? 460 : 880;
      points = Array.from({ length: total }, (_, index) => spherePoint(index, total));
      refreshColors();
    }

    function refreshColors() {
      if (!target) return;
      const style = getComputedStyle(target);
      color = style.getPropertyValue("--admin-signal").trim() || "#b1e5cc";
      warm = style.getPropertyValue("--admin-gold").trim() || "#e8b880";
      draw(performance.now(), !paused && !motion.matches);
    }

    const resizeObserver = new ResizeObserver(resize);
    const viewObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncAnimation();
    });
    const themeObserver = new MutationObserver(refreshColors);
    resizeObserver.observe(target);
    viewObserver.observe(target);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", syncAnimation);
    motion.addEventListener("change", syncAnimation);
    resize();
    syncAnimation();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      motion.removeEventListener("change", syncAnimation);
    };
  }, [paused]);

  return <canvas ref={canvas} className="admin-particle-field" aria-hidden="true" />;
}

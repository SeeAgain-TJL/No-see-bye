"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { themes, type ThemeName } from "@/lib/themes";
import { Icon } from "./icons";
import { paintMemoryAtmosphere, type ScenePlateBounds } from "./memory-scene-effects";
import { useActiveTheme } from "./theme-provider";

const memories = {
  forest: {
    title: "森林记得风。",
    fragment: "那些以为散去的声音，仍留在树的年轮里。",
    play: "点亮叶脉",
    cue: "窗灯亮了，萤火沿着铁轨飞起。",
  },
  iceberg: {
    title: "冰下有回声。",
    fragment: "时间把旧日封在冰里，光经过时，它又清晰了一次。",
    play: "唤醒冰层",
    cue: "一道折光滑过冰缝。",
  },
  grassland: {
    title: "风会把信带回。",
    fragment: "草叶朝旧日伏下，像一封信终于找到了收件人。",
    play: "送出明信片",
    cue: "折信迎着风，从邮筒飞向草坡。",
  },
  rift: {
    title: "灯火记得归路。",
    fragment: "为一个人留一盏灯，相遇就还能抵达我们。",
    play: "放飞记忆灯",
    cue: "纸灯从石桥上一盏盏升起。",
  },
  ocean: {
    title: "潮汐带回昨日。",
    fragment: "沉进去的光没有熄灭，只是在等下一次涨潮。",
    play: "拨动潮声",
    cue: "水纹掠过穹顶，气泡随潮而上。",
  },
} satisfies Record<ThemeName, { title: string; fragment: string; play: string; cue: string }>;

type Playback = "idle" | "playing" | "complete";
const playbackDuration = 5200;
const artworkAspect = 4 / 5;

export function MemoryPortal() {
  const theme = useActiveTheme();
  return <MemoryPlayer key={theme} theme={theme} />;
}

function MemoryPlayer({ theme }: { theme: ThemeName }) {
  const [playback, setPlayback] = useState<Playback>("idle");
  const scene = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const camera = useRef({ x: 0, y: 0, ambience: 0 });
  const memory = memories[theme];

  useEffect(() => {
    const frame = scene.current;
    const image = artwork.current;
    const surface = canvas.current;
    if (!frame || !image || !surface) return;

    const ctx = surface.getContext("2d");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let plate: ScenePlateBounds = { left: 0, top: 0, width: 1, height: 1 };
    let pivot = { x: 0, y: 0 };
    let dolly = { x: 0, y: 0 };
    let inView = true;
    let animation = 0;
    let lastFrame = 0;
    let lastPaint = 0;
    let elapsed = 0;
    const motion = camera.current;

    function update() {
      if (!frame) return;
      const progress = playback === "playing" ? Math.min(1, elapsed / playbackDuration) : playback === "complete" ? 1 : 0;
      const push = 1 - (1 - progress) ** 2;
      const exposure = Math.min(progress * 14, 1, (1 - progress) * 2.8);
      motion.x += (target.current.x - motion.x) * .095;
      motion.y += (target.current.y - motion.y) * .095;
      const x = motion.x * 12 + dolly.x * push;
      const y = motion.y * 9 + dolly.y * push;
      const scale = 1.012 + .09 * push;
      frame.style.setProperty("--auth-pan-x", `${x}px`);
      frame.style.setProperty("--auth-pan-y", `${y}px`);
      frame.style.setProperty("--auth-zoom", String(scale));
      frame.style.setProperty("--auth-exposure-cue", String(exposure));
      frame.style.setProperty("--auth-playhead", String(progress));
      if (ctx) paintMemoryAtmosphere(ctx, theme, width, height, motion.ambience / 1000, progress, motion.x, motion.y, reduced.matches, {
        left: pivot.x + (plate.left - pivot.x) * scale + x,
        top: pivot.y + (plate.top - pivot.y) * scale + y,
        width: plate.width * scale,
        height: plate.height * scale,
      });
    }

    function tick(now: number) {
      animation = 0;
      if (document.hidden || !inView || reduced.matches) return;
      const delta = lastFrame ? Math.min(now - lastFrame, 50) : 0;
      lastFrame = now;
      elapsed += delta;
      motion.ambience += delta;

      if (now - lastPaint > 29 || elapsed >= playbackDuration && playback === "playing") {
        update();
        lastPaint = now;
      }
      if (playback === "playing" && elapsed >= playbackDuration) setPlayback("complete");
      else animation = requestAnimationFrame(tick);
    }

    function wake() {
      cancelAnimationFrame(animation);
      animation = 0;
      lastFrame = 0;
      if (document.hidden || !inView) return;
      if (reduced.matches) {
        target.current = { x: 0, y: 0 };
        if (playback === "playing") setPlayback("complete");
        update();
      } else animation = requestAnimationFrame(tick);
    }

    const bounds = new ResizeObserver(() => {
      if (!frame.isConnected || !image.isConnected) return;
      width = Math.max(1, frame.clientWidth);
      height = Math.max(1, frame.clientHeight);
      // Use the covered image's crop so objects stay anchored to the artwork on phones.
      const style = getComputedStyle(image);
      const imageWidth = image.offsetWidth;
      const imageHeight = image.offsetHeight;
      const cropX = parseFloat(style.backgroundPositionX);
      const cropY = parseFloat(style.backgroundPositionY);
      const positionX = Number.isFinite(cropX) ? cropX / 100 : .5;
      const positionY = Number.isFinite(cropY) ? cropY / 100 : .5;
      const coverWidth = Math.max(imageWidth, imageHeight * artworkAspect);
      const coverHeight = coverWidth / artworkAspect;
      plate = {
        left: image.offsetLeft + (imageWidth - coverWidth) * positionX,
        top: image.offsetTop + (imageHeight - coverHeight) * positionY,
        width: coverWidth,
        height: coverHeight,
      };
      pivot = { x: image.offsetLeft + imageWidth * positionX, y: image.offsetTop + imageHeight * positionY };
      dolly = { x: parseFloat(style.getPropertyValue("--auth-dolly-x")) || 0, y: parseFloat(style.getPropertyValue("--auth-dolly-y")) || 0 };
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      update();
    });
    bounds.observe(frame);
    const visibility = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      wake();
    });
    visibility.observe(frame);
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", wake);
    wake();
    return () => {
      cancelAnimationFrame(animation);
      bounds.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", wake);
      reduced.removeEventListener("change", wake);
    };
  }, [playback, theme]);

  function move(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    target.current = {
      x: Math.min(1, Math.max(-1, (event.clientX - bounds.left) / bounds.width * 2 - 1)),
      y: Math.min(1, Math.max(-1, (event.clientY - bounds.top) / bounds.height * 2 - 1)),
    };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a"))
      || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event);
  }

  function resetLook() {
    target.current = { x: 0, y: 0 };
  }

  function play() {
    if (playback === "playing" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlayback("complete");
    } else {
      scene.current?.style.setProperty("--auth-playhead", "0");
      setPlayback("playing");
    }
  }

  return <div className="auth-projection" ref={scene} data-playing={playback}
    onPointerDown={startDrag} onPointerMove={move} onPointerLeave={resetLook} onPointerUp={resetLook}
    onPointerCancel={resetLook} onLostPointerCapture={resetLook}>
    <div className="auth-projection-planes" aria-hidden="true">
      <div className="auth-projection-image" ref={artwork} />
      <div className="auth-projection-optics" />
      <canvas className="auth-scene-field" ref={canvas} />
    </div>
    <div className="auth-projection-content">
      <h2 className="auth-scene-title">{memory.title}</h2>
      <div className="auth-memory-caption" aria-live="polite">
        {playback === "idle" ? <span>{themes[theme].label} · 记忆短片</span> : <p>{playback === "playing" ? memory.cue : memory.fragment}</p>}
      </div>
      <div className="auth-projection-actions">
        <button className="auth-scene-play" type="button" onClick={play}>
          <span className="auth-scene-meter" aria-hidden="true" />
          <Icon name={playback === "playing" ? "pause" : playback === "complete" ? "restore" : "play"} size={15} />
          {playback === "playing" ? "结束播放" : playback === "complete" ? "重放短片" : memory.play}
        </button>
        <Link href="/memories?scope=public" aria-label="浏览公开日常">借阅人间<Icon name="arrow" size={16} /></Link>
      </div>
    </div>
  </div>;
}

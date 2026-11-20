"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { ThemeName } from "@/lib/themes";
import { Icon } from "../icons";
import { ThemeMotif } from "../theme-motif";
import { habitats } from "./creatures";
import { looks } from "./looks";
import { clamp } from "./kit";
import type { makeEngine } from "./engine";

const CYCLE = 14;
type Engine = ReturnType<typeof makeEngine>;

export function ObservatoryStage({
  theme,
  active,
  status,
  metrics,
  header,
  children,
}: {
  theme: ThemeName;
  active: number | null;
  status: ReactNode;
  metrics: ReactNode;
  header: ReactNode;
  children?: ReactNode;
}) {
  const species = habitats[theme],
    look = looks[theme];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [cycle, setCycle] = useState(true);
  const [ready, setReady] = useState<"pending" | "3d" | "2d" | "unavailable">("pending");
  const viewport = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    fallback = useRef<HTMLCanvasElement>(null),
    progress = useRef<HTMLSpanElement>(null);
  const rerender = useRef<() => void>(() => {}),
    engine = useRef<Engine | null>(null);
  const state = useRef({ index: 0, playing: true, cycle: true, active: 0 });
  const target = useRef({ yaw: 0, pitch: 0.18, zoom: 1 });
  const gesture = useRef<{ id: number; x: number; y: number; distance: number } | null>(null);
  const current = species[index];

  useEffect(() => {
    state.current = { index, playing, cycle, active: active ?? 0 };
    rerender.current();
  }, [index, playing, cycle, active]);
  useEffect(() => {
    const host = viewport.current,
      surface = canvas.current,
      backup = fallback.current;
    if (!host || !surface || !backup) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false,
      visible = true,
      frame = 0,
      previous = 0,
      selected = -1,
      remaining = 0,
      pose = { ...target.current };
    const invalidate = () => {
      if (!disposed && !frame && visible && !document.hidden && engine.current) frame = requestAnimationFrame(draw);
    };
    function draw(timestamp: number) {
      frame = 0;
      const renderer = engine.current,
        host = viewport.current;
      if (!renderer || !host || !visible || document.hidden) return;
      const value = state.current,
        moving = value.playing && !motion.matches;
      const delta = previous ? Math.min(0.06, (timestamp - previous) / 1000) : 0;
      previous = timestamp;
      if (value.index !== selected) {
        selected = value.index;
        remaining = 0;
        renderer.select(species[selected], moving);
      }
      if (moving && value.cycle && !gesture.current) {
        remaining += delta;
        if (remaining >= CYCLE) {
          const next = (selected + 1) % species.length;
          remaining = 0;
          state.current.index = next;
          setIndex(next);
        }
      }
      progress.current?.style.setProperty("--scene-progress", String(value.cycle ? remaining / CYCLE : 0));
      const aim = target.current,
        ease = moving ? 1 - Math.exp(-delta * 10) : 1;
      pose = {
        yaw: pose.yaw + (aim.yaw - pose.yaw) * ease,
        pitch: pose.pitch + (aim.pitch - pose.pitch) * ease,
        zoom: pose.zoom + (aim.zoom - pose.zoom) * ease,
      };
      renderer.aim(pose.yaw, pose.pitch, pose.zoom);
      renderer.presence(value.active);
      renderer.draw(moving ? delta : 0, motion.matches);
      if (moving) invalidate();
      else previous = 0;
    }
    const visibility = () => {
      if (!visible || document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      } else invalidate();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visibility();
    });
    observer.observe(host);
    const size = () => {
      engine.current?.resize(host.clientWidth, host.clientHeight);
      invalidate();
    };
    const resize = new ResizeObserver(size);
    resize.observe(host);
    const lost = () => {
      setReady(engine.current?.sceneStatus() ?? "unavailable");
      invalidate();
    };
    rerender.current = invalidate;
    void import("./engine")
      .then(({ makeEngine }) => {
        if (disposed) return;
        engine.current = makeEngine(surface, backup, look, species[state.current.index], host.clientWidth < 550);
        selected = state.current.index;
        setReady(engine.current.sceneStatus());
        surface.addEventListener("webglcontextlost", lost);
        size();
      })
      .catch(() => {
        if (!disposed) setReady("unavailable");
      });
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", invalidate);
    return () => {
      disposed = true;
      rerender.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", invalidate);
      surface.removeEventListener("webglcontextlost", lost);
      engine.current?.dispose();
      engine.current = null;
    };
  }, [look, species]);

  const select = (i: number) => {
    setIndex(i);
    setCycle(false);
  };
  function align(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    ] as const;
  }
  const reset = () => {
    target.current = { yaw: 0, pitch: 0.18, zoom: 1 };
    rerender.current();
  };
  const available = ready === "3d" || ready === "2d";
  return (
    <section className="obs-stage" aria-labelledby="admin-monitor-title" data-habitat={theme}>
      {header}
      <div className="obs-deck">
        <div className="obs-readout">
          <div className="obs-accent-label">
            <span />
            站点活动
          </div>
          <div className="obs-active">
            <strong>{active === null ? "—" : active.toLocaleString("zh-CN")}</strong>
            <span>位用户</span>
          </div>
          <p>近 15 分钟活跃</p>
          {status}
        </div>
        <div
          className="obs-viewport"
          ref={viewport}
          tabIndex={available ? 0 : -1}
          role="group"
          aria-label={current.name + "动态生境"}
          aria-describedby="obs-keyboard"
          onPointerDown={(event) => {
            if (!available || !event.isPrimary || event.button !== 0) return;
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!event.isPrimary) return;
            engine.current?.point(...align(event));
            const drag = gesture.current;
            if (drag?.id === event.pointerId) {
              const dx = event.clientX - drag.x,
                dy = event.clientY - drag.y;
              drag.x = event.clientX;
              drag.y = event.clientY;
              drag.distance += Math.hypot(dx, dy);
              target.current.yaw += dx * 0.009;
              target.current.pitch = clamp(target.current.pitch + dy * 0.008, -0.72, 0.85);
            }
            rerender.current();
          }}
          onPointerUp={(event) => {
            if (gesture.current?.id !== event.pointerId) return;
            if (gesture.current.distance < 6) engine.current?.ping(...align(event));
            gesture.current = null;
            rerender.current();
          }}
          onPointerCancel={() => {
            gesture.current = null;
            engine.current?.point(9, 9);
            rerender.current();
          }}
          onLostPointerCapture={() => {
            gesture.current = null;
          }}
          onPointerLeave={() => {
            engine.current?.point(9, 9);
            rerender.current();
          }}
          onKeyDown={(event) => {
            const pose = target.current;
            switch (event.key) {
              case "ArrowLeft":
                pose.yaw -= 0.16;
                break;
              case "ArrowRight":
                pose.yaw += 0.16;
                break;
              case "ArrowUp":
                pose.pitch = clamp(pose.pitch - 0.13, -0.72, 0.85);
                break;
              case "ArrowDown":
                pose.pitch = clamp(pose.pitch + 0.13, -0.72, 0.85);
                break;
              case "+":
              case "=":
                pose.zoom = clamp(pose.zoom + 0.12, 0.68, 1.4);
                break;
              case "-":
                pose.zoom = clamp(pose.zoom - 0.12, 0.68, 1.4);
                break;
              case "Home":
                reset();
                break;
              default:
                return;
            }
            event.preventDefault();
            rerender.current();
          }}
        >
          <div className="obs-crosshair" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <canvas ref={canvas} className="obs-canvas" aria-hidden="true" />
          <canvas ref={fallback} className="obs-canvas" aria-hidden="true" hidden />
          {!available && (
            <div className="obs-render-status" role="status">
              <ThemeMotif theme={theme} />
              {ready === "pending" ? "正在生成生境" : "当前浏览器无法渲染生境"}
            </div>
          )}
          <span className="sr-only" id="obs-keyboard">
            方向键旋转，正负键缩放，Home 重置视角。
          </span>
        </div>
        <div className="obs-catalog">
          <div className="obs-accent-label">
            <ThemeMotif theme={theme} />
            {look.title}
          </div>
          <div className="obs-specimens" role="group" aria-label="选择主题生境">
            {species.map((item, i) => (
              <button key={item.id} type="button" aria-pressed={i === index} onClick={() => select(i)}>
                <span className="obs-index">{String(i + 1).padStart(2, "0")}</span>
                <span>{item.name}</span>
                <Icon name="arrow" size={14} />
              </button>
            ))}
          </div>
          <div className="obs-progress" aria-hidden="true">
            <span ref={progress} />
          </div>
          <div className="obs-tools" role="group" aria-label="生境控制">
            <button
              type="button"
              title={playing ? "暂停生境" : "播放生境"}
              aria-label={playing ? "暂停生境" : "播放生境"}
              disabled={!available}
              onClick={() => setPlaying(!playing)}
            >
              <Icon name={playing ? "pause" : "play"} size={16} />
            </button>
            <button
              type="button"
              title="自动轮播"
              aria-label="自动轮播"
              aria-pressed={cycle}
              disabled={!available}
              onClick={() => setCycle(!cycle)}
            >
              <Icon name="list" size={16} />
            </button>
            <button type="button" title="重置镜头" aria-label="重置镜头" disabled={!available} onClick={reset}>
              <Icon name="restore" size={16} />
            </button>
          </div>
        </div>
        <div className="obs-specimen-label" key={current.id}>
          <strong>{current.name}</strong>
          <em>{current.latin}</em>
          <span>{current.note}</span>
        </div>
        {active !== null && active > 0 && (
          <div className="obs-presence" title="代表近 15 分钟活跃用户，最多展示 28 点">
            <i />
            活跃信号{active > 28 ? " · 28+" : ""}
          </div>
        )}
      </div>
      {children}
      {metrics}
    </section>
  );
}

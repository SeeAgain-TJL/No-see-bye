"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ThemeName } from "@/lib/themes";
import { Icon } from "./icons";
import { ThemeMotif } from "./theme-motif";
import type { ActivityDay } from "./admin-activity";
import { createStage } from "./specimens/stage";
import { adminThemeScenes } from "./admin-observatory-theme";
import "./admin-observatory-scene.css";

type Mode = "orbit" | "activity";
type Pose = { yaw: number; pitch: number; zoom: number };
type Input = { theme: ThemeName; days: ActivityDay[]; mode: Mode; playing: boolean; selectedIndex: number };

const defaultPose: Pose = { yaw: -0.16, pitch: 0.45, zoom: 1 };
const historyPose: Pose = { yaw: -0.82, pitch: 0.70, zoom: 0.94 };
const minZoom = .65;
const maxZoom = 1.55;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const dateLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric" });
const noDays: ActivityDay[] = [];

export function AdminParticleField({ theme, days = noDays, selectedDate, onDateChange }: Pick<Input, "theme"> & {
  days?: ActivityDay[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  const [ready, setReady] = useState<"pending" | "available" | "unavailable">("pending");
  const [mode, setMode] = useState<Mode>("orbit");
  const [playing, setPlaying] = useState(true);
  const [zoom, setZoom] = useState(defaultPose.zoom);
  const scene = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const aim = useRef<Pose>({ ...defaultPose });
  const drag = useRef<{ id: number; x: number; y: number; distance: number } | null>(null);
  const setRenderInput = useRef<(input: Input) => void>(() => {});
  const invalidate = useRef<() => void>(() => {});
  const findDay = useRef<(x: number, y: number) => number>(() => -1);
  const displayedDays = days.slice(-30);
  const themeScene = adminThemeScenes[theme].name;
  const selected = displayedDays.find(day => day.date === selectedDate) ?? displayedDays.findLast(day => day.users || day.entries) ?? displayedDays.at(-1);
  const selectedIndex = selected ? displayedDays.indexOf(selected) : -1;
  const available = ready === "available";

  useEffect(() => {
    const viewport = scene.current;
    const canvas = surface.current;
    if (!viewport || !canvas) return;

    let renderer: ReturnType<typeof createStage> | undefined;
    let frameId = 0;
    let previousFrame = 0;
    let elapsed = 0;
    let density = 1;
    let visible = true;
    let pose = { ...defaultPose };
    let input: Input = { theme: "forest", days: noDays, mode: "orbit", playing: true, selectedIndex: -1 };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");

    function schedule() {
      if (!frameId && renderer && visible && !document.hidden) frameId = requestAnimationFrame(draw);
    }

    function draw(now: number) {
      frameId = 0;
      if (!renderer || !visible || document.hidden) return;
      const delta = previousFrame ? Math.min(50, now - previousFrame) : 16;
      previousFrame = now;
      const movingOnItsOwn = !motion.matches && input.playing;
      const blend = motion.matches ? 1 : 1 - Math.exp(-delta / 117);
      if (movingOnItsOwn && input.mode === "orbit") elapsed += delta / 1000;
      const target = aim.current;
      pose = {
        yaw: pose.yaw + (target.yaw - pose.yaw) * blend,
        pitch: pose.pitch + (target.pitch - pose.pitch) * blend,
        zoom: pose.zoom + (target.zoom - pose.zoom) * blend,
      };
      renderer.draw(elapsed, pose.yaw, pose.pitch, pose.zoom);
      const settling = Math.abs(pose.yaw - target.yaw) + Math.abs(pose.pitch - target.pitch)
        + Math.abs(pose.zoom - target.zoom) > .002;
      if ((movingOnItsOwn && input.mode === "orbit") || settling) schedule();
      else previousFrame = 0;
    }

    function sizeCanvas() {
      if (!viewport || !canvas) return;
      const { clientWidth: width, clientHeight: height } = viewport;
      density = Math.min(devicePixelRatio || 1, 1.55, Math.sqrt(1_650_000 / Math.max(1, width * height)));
      const pixelWidth = Math.max(1, Math.round(width * density));
      const pixelHeight = Math.max(1, Math.round(height * density));
      if (renderer) renderer.size(pixelWidth, pixelHeight);
      else { canvas.width = pixelWidth; canvas.height = pixelHeight; }
      schedule();
    }

    function manageVisibility() {
      if (visible && !document.hidden) schedule();
      else {
        cancelAnimationFrame(frameId);
        frameId = 0;
        previousFrame = 0;
      }
    }

    function initialize() {
      try {
        if (!canvas) return;
        renderer = createStage(canvas, input.theme, true);
        renderer.setHistory(input.days.slice(-30), input.selectedIndex);
        renderer.setActivity(input.mode === "activity");
        sizeCanvas();
        setReady("available");
      } catch {
        renderer?.dispose();
        renderer = undefined;
        setReady("unavailable");
      }
    }

    function onContextLost(event: Event) {
      event.preventDefault();
      renderer = undefined;
      cancelAnimationFrame(frameId);
      frameId = 0;
      previousFrame = 0;
      setReady("unavailable");
    }

    setRenderInput.current = next => {
      if (next.theme !== input.theme) renderer?.setTheme(next.theme);
      if (next.theme !== input.theme || next.days !== input.days || next.selectedIndex !== input.selectedIndex) renderer?.setHistory(next.days.slice(-30), next.selectedIndex);
      if (next.mode !== input.mode) renderer?.setActivity(next.mode === "activity");
      input = next;
      schedule();
    };
    invalidate.current = schedule;
    findDay.current = (x, y) => renderer?.dayAt(x / viewport.clientWidth, y / viewport.clientHeight, Math.min(30, input.days.length)) ?? -1;
    const resize = new ResizeObserver(sizeCanvas);
    resize.observe(viewport);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      manageVisibility();
    });
    intersection.observe(viewport);
    document.addEventListener("visibilitychange", manageVisibility);
    motion.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", initialize);
    const initializeId = requestAnimationFrame(initialize);
    return () => {
      cancelAnimationFrame(initializeId);
      cancelAnimationFrame(frameId);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", manageVisibility);
      motion.removeEventListener("change", schedule);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", initialize);
      renderer?.dispose();
      setRenderInput.current = () => {};
      invalidate.current = () => {};
      findDay.current = () => -1;
    };
  }, []);

  useEffect(() => {
    setRenderInput.current({ theme, days, mode, playing, selectedIndex });
  }, [theme, days, mode, playing, selectedIndex]);

  function reset(view: Mode = mode) {
    aim.current = { ...(view === "orbit" ? defaultPose : historyPose) };
    setZoom(aim.current.zoom);
    invalidate.current();
  }

  function changeMode(next: Mode) {
    if (next === mode) return;
    reset(next);
    setMode(next);
  }

  function magnify(step: number) {
    aim.current.zoom = clamp(aim.current.zoom + step, minZoom, maxZoom);
    setZoom(aim.current.zoom);
    invalidate.current();
  }

  function orbit(dx: number, dy: number) {
    if (mode === "activity") return;
    aim.current.yaw += dx;
    aim.current.pitch = clamp(aim.current.pitch + dy, -.13, 1.47);
    invalidate.current();
  }

  function startDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (!available || event.button !== 0 || drag.current) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueDrag(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start.distance += Math.hypot(dx, dy);
    if (start.distance >= 5) orbit(dx * .0098, dy * .0075);
    start.x = event.clientX;
    start.y = event.clientY;
  }

  function stopDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }

  function finishDrag(event: PointerEvent<HTMLCanvasElement>) {
    const gesture = drag.current;
    stopDrag(event);
    if (mode !== "activity" || gesture?.id !== event.pointerId || gesture.distance >= 5) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const day = displayedDays[findDay.current(event.clientX - bounds.left, event.clientY - bounds.top)];
    if (day) onDateChange(day.date);
  }

  function navigate(event: KeyboardEvent<HTMLCanvasElement>) {
    if (mode === "activity" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const day = displayedDays[clamp(selectedIndex + (event.key === "ArrowRight" ? 1 : -1), 0, displayedDays.length - 1)];
      if (day) onDateChange(day.date);
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case "ArrowLeft": orbit(-.16, 0); break;
      case "ArrowRight": orbit(.16, 0); break;
      case "ArrowUp": orbit(0, -.12); break;
      case "ArrowDown": orbit(0, .12); break;
      case "+": case "=": magnify(.12); break;
      case "-": magnify(-.12); break;
      case "Home": reset(); break;
      default: return;
    }
    event.preventDefault();
  }

  return <section className="admin-scene" aria-labelledby="admin-scene-title">
    <div className="admin-scene-header">
      <div className="admin-scene-heading"><ThemeMotif theme={theme} /><div className="admin-scene-title-group"><h2 id="admin-scene-title">{mode === "orbit" ? themeScene : "活动分布"}</h2><small>{mode === "orbit" ? adminThemeScenes[theme].label : "STATION SIGNAL · 30 DAYS"}</small></div></div>
      <div className="admin-scene-toolbar">
        <div className="admin-scene-modes" role="group" aria-label="观测视图">
          <button type="button" aria-pressed={mode === "orbit"} onClick={() => changeMode("orbit")}>主题生境</button>
          <button type="button" aria-pressed={mode === "activity"} onClick={() => changeMode("activity")}>30 天活动</button>
        </div>
        <button type="button" className="admin-scene-pause" disabled={!available || mode !== "orbit"}
          aria-label={playing ? "暂停主题运动" : "继续主题运动"} title={playing ? "暂停主题运动" : "继续主题运动"} onClick={() => setPlaying(value => !value)}><Icon name={playing ? "pause" : "play"} size={15} /></button>
      </div>
    </div>
    <div className="admin-scene-viewport" ref={scene} data-ready={available} data-mode={mode}>
      <div className="admin-scene-fallback" aria-hidden="true"><strong>{mode === "activity" ? "活动分布" : themeScene}</strong><small>{mode === "orbit" ? adminThemeScenes[theme].note : "选取下方日期查看新增用户与日常。"}</small><i /><i /><i /></div>
      <canvas ref={surface} className="admin-scene-canvas" role="img" tabIndex={available ? 0 : -1}
        aria-hidden={!available}
        aria-label={mode === "orbit" ? `${themeScene}三维动态生境` : "按日期排列的近 30 天真实活动柱状图"}
        aria-describedby={available ? "admin-scene-instructions" : undefined}
        onPointerDown={startDrag} onPointerMove={continueDrag} onPointerUp={finishDrag}
        onPointerCancel={stopDrag} onLostPointerCapture={stopDrag} onKeyDown={navigate} />
      <div className="admin-scene-zoom" role="group" aria-label="镜头控制">
        <button type="button" aria-label="缩小镜头" disabled={!available || zoom <= minZoom} onClick={() => magnify(-.12)}>−</button>
        <span aria-label={`缩放 ${Math.round(zoom * 100)}%`}>{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="放大镜头" disabled={!available || zoom >= maxZoom} onClick={() => magnify(.12)}>+</button>
        <button type="button" aria-label="重置镜头" title="重置镜头" disabled={!available} onClick={() => reset()}><Icon name="restore" size={15} /></button>
      </div>
    </div>
    <div className="admin-scene-readout" id="admin-scene-instructions">
      {mode === "activity" ? selected ? <>
        <label><span className="sr-only">选择活动日期</span><select value={selected.date} onChange={event => onDateChange(event.target.value)}>
          {displayedDays.map(day => <option key={day.date} value={day.date}>{dateLabel.format(new Date(`${day.date}T12:00:00+08:00`))}</option>)}
        </select></label>
        <span data-series="users">新增用户 <b>{selected.users}</b></span>
        <span data-series="entries">新增日常 <b>{selected.entries}</b></span>
        {available && <span className="admin-scene-pick-hint">点选刻度查看当日</span>}
      </> : <span>等待活动数据</span> : available && "拖动旋转 · 方向键也可操作"}
      {ready === "unavailable" && <span>3D 渲染不可用</span>}
      {ready === "pending" && <span>正在生成主题生境</span>}
      {available && <span className="sr-only">{mode === "activity" ? "左右方向键选择日期。" : "拖动或按方向键旋转。"}加号和减号缩放，Home 键重置镜头。</span>}
    </div>
  </section>;
}

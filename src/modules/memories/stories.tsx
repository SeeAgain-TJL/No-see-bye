"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { DecodedImage } from "@/components/decoded-image";
import { api, dateText } from "@/lib/client";
import { moodLabel } from "./moods";
import { previewUrl } from "./media";
import type { MediaAsset, Memory, StoryScope } from "./types";

const PHOTO_DURATION_MS = 4000;
const PHOTO_FADE_MS = 900;
type PhotoFrame = { key: number; source: string; alt: string; ready: boolean; outgoing: boolean };
const scopes: [StoryScope, string][] = [["recent", "最近"], ["month", "本月"], ["anniversary", "往年今日"], ["random", "随机"]];
const emptyCopy = { recent: "待第一笔落下，旧光便有了归处。", month: "本月尚无留影，可借最近的日常，重温一程。", anniversary: "往年此日尚未落笔。等岁月成册，再与今日重逢。", random: "片刻尚未收录，留住今日，便有来日可回望。" };

export function MemoryStories({ onClose, photosOnly = false }: { onClose: () => void; photosOnly?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<StoryScope>("recent");
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="memory-stories" aria-labelledby="stories-title" onCancel={event => { event.preventDefault(); close.current(); }}>
    <header className="stories-header"><div><span className="stories-eyebrow">A FEW MOMENTS, TOGETHER</span><h2 id="stories-title">播放回忆</h2></div><button type="button" className="stories-close" aria-label="关闭回忆播放" onClick={onClose} autoFocus><Icon name="close" size={24} /></button></header>
    <div className="stories-scopes" role="group" aria-label="播放范围">{scopes.map(([value, label]) => <button type="button" key={value} aria-pressed={scope === value} onClick={() => setScope(value)}>{label}</button>)}</div>
    <StoryLoad key={scope} scope={scope} photosOnly={photosOnly} />
  </dialog>;
}
function StoryLoad({ scope, photosOnly }: { scope: StoryScope; photosOnly: boolean }) {
  const [result, setResult] = useState<{ items?: Memory[]; error?: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<{ items: Memory[] }>("/api/memories/revisit?mode=story&scope=" + scope, { signal: controller.signal }).then(data => setResult({ items: data.items })).catch(error => { if (!controller.signal.aborted) setResult({ error: error.message }); });
    return () => controller.abort();
  }, [scope, retry]);
  if (result?.error) return <div className="stories-message" role="alert"><h3>回忆暂时没能展开</h3><p>{result.error}</p><button type="button" onClick={() => { setResult(undefined); setRetry(v => v + 1); }}>重新加载</button></div>;
  if (!result?.items) return <div className="stories-message" role="status">正在翻找这一段日常…</div>;
  const items = photosOnly ? result.items.map(memory => ({ ...memory, assets: memory.assets.filter(asset => asset.mime.startsWith('image/')) })).filter(memory => memory.assets.length) : result.items;
  if (!items.length) return <div className="stories-message" role="status"><Icon name="spark" size={40} /><h3>{photosOnly ? '这段时光还没有照片。' : '这一页，等日子慢慢写满。'}</h3><p>{emptyCopy[scope]}</p></div>;
  return <StoryPlayback items={items} />;
}
function StoryPlayback({ items }: { items: Memory[] }) {
  const slides = useMemo(() => items.flatMap<{ memory: Memory; asset: MediaAsset | null }>(memory => memory.assets.length ? memory.assets.map(asset => ({ memory, asset })) : [{ memory, asset: null }]), [items]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(!slides[0].asset);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [visit, setVisit] = useState(0);
  const [muted, setMuted] = useState(true);
  const photoSequence = useRef(0);
  const activePhoto = useRef(0);
  const [photoFrames, setPhotoFrames] = useState<PhotoFrame[]>(() => {
    const first = slides[0];
    return first.asset?.mime.startsWith("image/") ? [{ key: 0, source: previewUrl(first.asset), alt: first.memory.title || "这一天的照片", ready: false, outgoing: false }] : [];
  });
  const elapsed = useRef(0);
  const video = useRef<HTMLVideoElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const { memory, asset } = slides[index];
  const isVideo = !!asset?.mime.startsWith("video/");
  const playing = !paused && !hidden && !finished && ready && !failed;
  const crossfading = photoFrames.some(frame => frame.outgoing);
  const preparePhoto = useCallback((nextAsset: MediaAsset | null, title: string, retry = 0) => {
    const key = ++photoSequence.current;
    activePhoto.current = key;
    if (!nextAsset?.mime.startsWith("image/")) { setPhotoFrames([]); return; }
    const source = previewUrl(nextAsset);
    const incoming: PhotoFrame = { key, source: source + (retry ? (source.includes("?") ? "&" : "?") + "retry=" + retry : ""), alt: title || "这一天的照片", ready: false, outgoing: false };
    // Keep both decoded sides of an unfinished fade during rapid manual navigation.
    // Pending requests are discarded; at most two decoded nodes and one incoming node remain.
    setPhotoFrames(frames => [...frames.filter(frame => frame.ready).slice(-2), incoming]);
  }, []);
  const choose = useCallback((next: number) => {
    if (next >= slides.length) { setFinished(true); return; }
    if (next < 0) return;
    preparePhoto(slides[next].asset, slides[next].memory.title);
    setIndex(next); setReady(!slides[next].asset); setFailed(false); setFinished(false); setAttempt(0); setVisit(v => v + 1); setProgress(0); elapsed.current = 0;
  }, [slides, preparePhoto]);
  useEffect(() => {
    if (!photoFrames.some(frame => frame.outgoing)) return;
    const timer = window.setTimeout(() => setPhotoFrames(frames => frames.filter(frame => !frame.outgoing)), PHOTO_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [photoFrames]);
  // Keep timer callbacks current without restarting the clock on each paint.
  const chooseRef = useRef(choose);
  useEffect(() => { chooseRef.current = choose; }, [choose]);
  useEffect(() => {
    const changed = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  useEffect(() => {
    if (!playing || isVideo || crossfading) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); elapsed.current += now - previous; previous = now;
      setProgress(Math.min(1, elapsed.current / PHOTO_DURATION_MS));
      if (elapsed.current >= PHOTO_DURATION_MS) chooseRef.current(index + 1);
    }, 80);
    return () => clearInterval(timer);
  }, [playing, isVideo, crossfading, index]);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const next = slides[index + 1]?.asset;
    if (!ready || failed || finished || !next?.mime.startsWith("image/") || connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    // A single, low-priority lookahead reuses exactly the URL of the next slide.
    const image = new Image();
    image.fetchPriority = "low";
    image.decoding = "async";
    image.src = previewUrl(next);
    void image.decode().catch(() => {});
  }, [ready, failed, finished, index, slides]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (playing) void element.play().catch(() => setPaused(true));
    else element.pause();
  }, [playing, index, attempt, visit]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input,select,textarea") || target.closest(".stories-scopes")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); chooseRef.current(index + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); chooseRef.current(index - 1); }
      if (event.code === "Space" && target.tagName !== "BUTTON" && target.tagName !== "A") { event.preventDefault(); setPaused(v => !v); }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [index]);
  return <div className="stories-player">
    <div className="stories-stage" aria-label="回忆画面" tabIndex={0} onTouchStart={event => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; }} onTouchEnd={event => { const start = touch.current, end = event.changedTouches[0]; touch.current = null; if (start && Math.abs(end.clientX - start.x) > 65 && Math.abs(end.clientY - start.y) < 55) choose(index + (end.clientX < start.x ? 1 : -1)); }}>
      {asset && !isVideo && <><div className="stories-mat" aria-hidden="true"><span /><span /><span /><span /></div>{photoFrames.map(frame => <div key={frame.key} className="stories-photo-frame" data-visible={frame.ready && !frame.outgoing} aria-hidden={frame.outgoing || !frame.ready}><DecodedImage src={frame.source} className="stories-photo" alt={frame.alt} fetchPriority="high" onReady={() => {
        if (activePhoto.current !== frame.key) return;
        setPhotoFrames(frames => frames.map(value => value.key === frame.key ? { ...value, ready: true } : { ...value, outgoing: true }));
        setReady(true);
      }} onFailure={() => { if (activePhoto.current === frame.key) setFailed(true); }} /></div>)}</>}
      {asset && isVideo && <video key={asset.id + ":" + visit + ":" + attempt} ref={video} src={asset.url} poster={asset.thumbnailUrl || undefined} playsInline muted={muted} preload="auto" onLoadedData={() => setReady(true)} onError={() => setFailed(true)} onEnded={() => choose(index + 1)} onTimeUpdate={event => { const element = event.currentTarget; if (element.duration > 0) setProgress(element.currentTime / element.duration); }} />}
      {!asset && <div className="stories-letter"><span aria-hidden="true">“</span><p>{memory.content || memory.title}</p></div>}
      {asset && !ready && !failed && <div className={"stories-media-status" + (photoFrames.some(frame => frame.ready) ? " stories-media-pending" : "")} role="status">正在展开画面…</div>}
      {failed && <div className="stories-media-status" role="alert">这个画面暂时无法加载<button type="button" onClick={() => { setFailed(false); setReady(false); setAttempt(v => v + 1); preparePhoto(asset, memory.title, attempt + 1); }}>重新加载</button></div>}
      {finished && <div className="stories-finished" role="status"><Icon name="spark" size={36} /><h3>旧光未散，且留余温。</h3><p>这一程已翻至末页，念念仍有回响。</p><button type="button" onClick={() => { choose(0); setPaused(false); }}>再看一遍<Icon name="play" size={17} /></button></div>}
    </div>
    <div className="stories-caption" aria-live="polite" aria-atomic="true"><div><time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { year: "numeric", month: "long", day: "numeric" })}</time><span>{memory.location}{memory.location && memory.mood ? " · " : ""}{memory.mood && moodLabel(memory.mood)}</span></div>{memory.title && <h3>{memory.title}</h3>}{asset && memory.content && <p>{memory.content}</p>}<Link href={"/memories/" + memory.id}>打开完整记录<Icon name="arrow" size={14} /></Link></div>
    <div className="stories-transport"><progress max={slides.length} value={finished ? slides.length : index + progress} aria-label="回忆播放进度" /><div className="stories-controls"><button type="button" disabled={index === 0} aria-label="上一段回忆" onClick={() => choose(index - 1)}><Icon name="back" size={21} /></button><button type="button" aria-label={finished ? "重新播放回忆" : paused ? "继续播放回忆" : "暂停回忆播放"} onClick={() => { if (finished) { choose(0); setPaused(false); } else setPaused(v => !v); }}><Icon name={finished || paused ? "play" : "pause"} size={22} /></button><button type="button" disabled={finished} aria-label="下一段回忆" onClick={() => choose(index + 1)}><Icon name="arrow" size={21} /></button><span className="stories-counter">{index + 1} / {slides.length}</span>{isVideo && <button type="button" className="stories-sound" aria-pressed={!muted} onClick={() => setMuted(v => !v)}>{muted ? "开启声音" : "静音"}</button>}<span className="stories-speed">{paused ? "已暂停" : isVideo ? "视频结束后继续" : "每个画面 4 秒"}</span></div><p className="stories-hint">{items.length >= 30 ? "本次最多播放 30 条记录 · " : ""}左右切换 · 空格暂停 · Esc 关闭</p></div>
  </div>;
}

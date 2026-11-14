"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaAsset } from "./types";
import { Icon } from "@/components/icons";
import { DecodedImage } from "@/components/decoded-image";
import { bytes } from "@/lib/client";

export const previewUrl = (asset: MediaAsset) => asset.thumbnailUrl || asset.url + "?variant=preview";
const displayUrl = (asset: MediaAsset) => asset.url + "?variant=display";

export function MediaGrid({ assets, compact = false }: { assets: MediaAsset[]; compact?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!assets.length) return null;
  const shown = compact ? assets.slice(0, 1) : assets;
  return <>
    <div className={'media-grid ' + (shown.length === 1 ? "single " : "") + (compact ? "compact archive-cover" : "")}>
      {shown.map((asset, index) => <button type="button" key={asset.id} className="media-tile" onClick={() => setSelected(index)} aria-label={'查看' + (asset.mime.startsWith("video/") ? "视频" : "图片") + '：' + asset.filename}>
        {asset.mime.startsWith("video/") ? <>
          {asset.thumbnailUrl ? <DecodedImage src={asset.thumbnailUrl} alt={asset.filename} loading="lazy" /> : <div className="video-placeholder"><Icon name="video" size={32} /><span>视频</span></div>}
          <span className="play-icon"><Icon name="video" size={23} /></span>
        </> : <DecodedImage src={previewUrl(asset)} alt={asset.filename} loading="lazy" />}
        {compact && <span className="cover-count"><Icon name={asset.mime.startsWith("video/") ? "video" : "image"} size={13} />{assets.length > 1 ? assets.length + " 个附件" : asset.mime.startsWith("video/") ? "影像" : "照片"}</span>}
      </button>)}
    </div>
    {selected !== null && <MediaViewer assets={assets} initial={selected} close={() => setSelected(null)} />}
  </>;
}

export function MediaViewer({ assets, initial, close }: { assets: MediaAsset[]; initial: number; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(initial);
  const [zoom, setZoom] = useState(false);
  const [original, setOriginal] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const asset = assets[index];
  const isVideo = asset.mime.startsWith("video/");
  const source = original ? asset.url : displayUrl(asset);
  function choose(next: number) {
    const target = (next + assets.length) % assets.length;
    if (target === index) return;
    setIndex(target);
    setZoom(false); setOriginal(false); setReady(false); setFailed(false); setAttempt(0);
  }
  useEffect(() => {
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);
  useEffect(() => {
    // Preload only the next screen-sized image, after the current one is ready.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!ready || assets.length < 2 || connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    const next = assets[(index + 1) % assets.length];
    if (!next.mime.startsWith("image/")) return;
    const image = new Image();
    image.src = displayUrl(next);
    image.decode().catch(() => {});
    return () => { image.src = ""; };
  }, [ready, index, assets]);
  return <dialog ref={ref} className="media-dialog gallery-viewer" aria-label="媒体预览" onClose={close}
    onClick={event => { if (event.target === event.currentTarget) ref.current?.close(); }}
    onKeyDown={event => {
      if ((event.target as HTMLElement).tagName === "VIDEO") return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); choose(index + (event.key === "ArrowLeft" ? -1 : 1)); }
    }}>
    <div className="viewer-bar"><span className="viewer-counter">{String(index + 1).padStart(2, "0")} <span>/ {String(assets.length).padStart(2, "0")}</span><span className="viewer-filename">{asset.filename}</span></span>
      <button type="button" className="icon-button" aria-label="关闭预览" autoFocus onClick={() => ref.current?.close()}><Icon name="close" /></button>
    </div>
    <div className={'viewer-content' + (zoom ? " is-zoomed" : "")} key={asset.id}
      onTouchStart={event => { const t = event.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={event => { const t = event.changedTouches[0], start = touch.current; touch.current = null; if (!start || zoom || isVideo) return; const dx = t.clientX - start.x; if (Math.abs(dx) > 60 && Math.abs(t.clientY - start.y) < 60) choose(index + (dx < 0 ? 1 : -1)); }}>
      {isVideo ? <video key={asset.id} src={asset.url} poster={asset.thumbnailUrl || undefined} controls autoPlay playsInline onError={() => setFailed(true)} /> : <>
        <DecodedImage className="viewer-backfill" src={previewUrl(asset)} alt="" />
        <DecodedImage key={source + ":" + attempt} className="viewer-image" src={source + (attempt ? (source.includes("?") ? "&" : "?") + "retry=" + attempt : "")} alt={asset.filename} fetchPriority="high" onReady={() => { setReady(true); setFailed(false); }} onFailure={() => setFailed(true)} />
      </>}
      {failed ? <div className="viewer-status" role="status"><span>{isVideo ? "此视频暂时无法播放" : "图片加载失败"}</span>{!isVideo && <button type="button" onClick={() => { setFailed(false); setReady(false); setAttempt(v => v + 1); }}>重新加载</button>}</div> : !isVideo && !ready && <span className="viewer-status" role="status"><span className="image-loading-dot" />{original ? "正在加载原图…" : "正在加载清晰预览…"}</span>}
    </div>
    <div className="viewer-tools">
      <span>{isVideo ? "VIDEO" : original ? "ORIGINAL" : "HD PREVIEW"}</span>
      <div>{!isVideo && <><button type="button" disabled={!ready} aria-pressed={zoom} onClick={() => setZoom(v => !v)}>{zoom ? "适应屏幕" : "放大查看"}</button><button type="button" aria-pressed={original} onClick={() => { setOriginal(v => !v); setReady(false); setFailed(false); setZoom(false); }}>{original ? "返回高清预览" : "查看原图 · " + bytes(asset.sizeBytes)}</button></>}<a href={asset.url} download={asset.filename}>下载原文件<Icon name="download" size={15} /></a></div>
    </div>
    {assets.length > 1 && <div className="viewer-filmstrip" ref={strip} aria-label="选择影像">{assets.map((item, i) => <button key={item.id} type="button" aria-label={'第 ' + (i + 1) + ' 个附件：' + item.filename} aria-pressed={index === i} onClick={() => choose(i)}>
      {item.mime.startsWith("image/") || item.thumbnailUrl ? <DecodedImage src={previewUrl(item)} alt="" loading="lazy" /> : <Icon name="video" size={20} />}
    </button>)}</div>}
    <div className="viewer-controls"><button type="button" disabled={assets.length < 2} onClick={() => choose(index - 1)}><Icon name="back" size={17} />上一张</button><span className="viewer-key-hint">← → 切换 · ESC 关闭</span><span className="viewer-mobile-hint">左右滑动切换</span><button type="button" disabled={assets.length < 2} onClick={() => choose(index + 1)}>下一张<Icon name="arrow" size={17} /></button></div>
  </dialog>;
}

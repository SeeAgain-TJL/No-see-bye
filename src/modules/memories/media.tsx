"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated local media and temporary blob previews. */
import { useEffect, useRef, useState } from "react";
import type { MediaAsset } from "./types";
import { Icon } from "@/components/icons";
export function MediaGrid({
  assets,
  compact = false,
}: {
  assets: MediaAsset[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!assets.length) return null;
  const shown = compact ? assets.slice(0, 3) : assets;
  return (
    <>
      <div
        className={`media-grid ${assets.length === 1 ? "single" : ""} ${compact ? "compact" : ""}`}
      >
        {shown.map((a, i) => (
          <button
            type="button"
            key={a.id}
            className="media-tile"
            onClick={() => setSelected(i)}
            aria-label={`查看${a.mime.startsWith("video/") ? "视频" : "图片"}：${a.filename}`}
          >
            {a.mime.startsWith("video/") ? (
              <>
                <video
                  src={`${a.url}#t=0.1`}
                  muted
                  preload="metadata"
                  playsInline
                />
                <span className="play-icon">
                  <Icon name="video" size={23} />
                </span>
              </>
            ) : (
              <img src={a.url} alt={a.filename} loading="lazy" />
            )}
            {compact && i === 2 && assets.length > 3 && (
              <span className="media-more">+{assets.length - 3}</span>
            )}
          </button>
        ))}
      </div>
      {selected !== null && (
        <MediaViewer
          assets={assets}
          initial={selected}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
function MediaViewer({
  assets,
  initial,
  close,
}: {
  assets: MediaAsset[];
  initial: number;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initial);
  const asset = assets[index];
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="media-dialog"
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).tagName === "VIDEO") return;
        if (e.key === "ArrowLeft")
          setIndex((i) => (i - 1 + assets.length) % assets.length);
        if (e.key === "ArrowRight") setIndex((i) => (i + 1) % assets.length);
      }}
    >
      <div className="viewer-bar">
        <span>
          {index + 1} / {assets.length}{" "}
          <span className="viewer-filename">{asset.filename}</span>
        </span>
        <button
          type="button"
          className="icon-button"
          onClick={() => ref.current?.close()}
          aria-label="关闭预览"
          autoFocus
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="viewer-content" key={asset.id}>
        {asset.mime.startsWith("video/") ? (
          <video src={asset.url} controls autoPlay playsInline />
        ) : (
          <img src={asset.url} alt={asset.filename} />
        )}
      </div>
      <div className="viewer-controls">
        <button
          type="button"
          disabled={assets.length < 2}
          onClick={() =>
            setIndex((i) => (i - 1 + assets.length) % assets.length)
          }
        >
          <Icon name="back" size={18} />
          上一张
        </button>
        <a href={asset.url} download={asset.filename}>
          下载原文件
        </a>
        <button
          type="button"
          disabled={assets.length < 2}
          onClick={() => setIndex((i) => (i + 1) % assets.length)}
        >
          下一张
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </dialog>
  );
}

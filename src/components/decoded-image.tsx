"use client";
/* eslint-disable @next/next/no-img-element -- Protected media is revealed only after complete decoding. */
import { useEffect, useRef, useState } from "react";
import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> & {
  src: string;
  onReady?: () => void;
  onFailure?: () => void;
  onDimensions?: (size: { width: number; height: number }) => void;
};
export function DecodedImage(props: Props) { return <ImageFrame key={props.src} {...props} />; }
function ImageFrame({ className = "", onReady, onFailure, onDimensions, alt = "", ...props }: Props) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const image = useRef<HTMLImageElement>(null);
  const callbacks = useRef({ onReady, onFailure, onDimensions });
  useEffect(() => { callbacks.current = { onReady, onFailure, onDimensions }; }, [onReady, onFailure, onDimensions]);
  useEffect(() => {
    const element = image.current;
    if (!element) return;
    let active = true;
    let decoding = false;
    const failed = () => { if (active) { setState("error"); callbacks.current.onFailure?.(); } };
    const loaded = async () => {
      if (decoding) return;
      decoding = true;
      try {
        await element.decode();
        if (active) {
          callbacks.current.onDimensions?.({ width: element.naturalWidth, height: element.naturalHeight });
          setState("ready"); callbacks.current.onReady?.();
        }
      } catch { failed(); }
    };
    element.addEventListener("load", loaded);
    element.addEventListener("error", failed);
    // Cached and server-rendered images can finish before hydration attaches listeners.
    if (element.complete) void loaded();
    return () => {
      active = false;
      element.removeEventListener("load", loaded);
      element.removeEventListener("error", failed);
    };
  }, []);
  return <span className={"decoded-image " + className} data-state={state} aria-busy={state === "loading"}>
    <img {...props} ref={image} alt={alt} decoding="async" />
    {state === "loading" && <span className="image-placeholder" aria-hidden="true"><span /></span>}
    {state === "error" && <span className="image-unavailable" role="status">预览暂不可用</span>}
  </span>;
}

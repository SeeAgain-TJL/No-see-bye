"use client";

import { useEffect, useRef } from "react";
import type { ThemeName } from "@/lib/themes";

export function LivingPhoto({ theme, paused = false }: { theme: ThemeName; paused?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || paused) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 760px), (max-width: 1000px) and (pointer: coarse) and (orientation: landscape)");
    let visible = false;
    let generation = 0;
    const allowed = () => visible && !document.hidden && !reduced.matches;
    const hide = () => video.removeAttribute("data-live");
    function sync() {
      if (!video) return;
      if (!allowed()) { video.pause(); return; }
      // Measure the covered frame, including a wide source cropped into a tall cover.
      const pixels = Math.max(video.clientWidth, video.clientHeight * 16 / 9) * devicePixelRatio;
      const suffix = compact.matches ? "-small" : pixels > 1920 ? "-uhd" : "";
      const src = `/visuals/films/${theme}${suffix}.mp4`;
      if (video.getAttribute("src") !== src) {
        generation++;
        hide();
        video.src = src;
      }
      const request = generation;
      video.muted = true;
      void video.play().catch(() => { if (generation === request && video.paused) hide(); });
    }
    const reveal = () => { if (allowed()) video.dataset.live = theme; };
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const resize = new ResizeObserver(sync);
    intersection.observe(video);
    resize.observe(video);
    video.addEventListener("playing", reveal);
    video.addEventListener("error", hide);
    compact.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      generation++;
      intersection.disconnect();
      resize.disconnect();
      video.removeEventListener("playing", reveal);
      video.removeEventListener("error", hide);
      compact.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", sync);
      video.pause();
      hide();
    };
  }, [theme, paused]);
  return <video key={theme} ref={ref} className="living-photo-render" aria-hidden="true"
    muted playsInline loop disablePictureInPicture preload="none" />;
}

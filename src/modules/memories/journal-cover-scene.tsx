"use client";

import { useState, type CSSProperties } from "react";
import { useActiveTheme } from "@/components/theme-provider";
import { themeNames } from "@/lib/themes";
import { useCoverGesture } from "./cover-gesture";
import { LivingPhoto } from "./living-photo";
import { MediaViewer, previewUrl } from "./media";
import { sceneImages } from "./scene-photography";
import type { MediaAsset } from "./types";

export function JournalCoverScene({ publicScope = false, cover }: { publicScope?: boolean; cover?: MediaAsset }) {
  const theme = useActiveTheme();
  const [open, setOpen] = useState(false);
  const gesture = useCoverGesture(() => setOpen(true));
  return <>
    <button type="button" className="journal-living-scene" data-jls-scope={publicScope ? "public" : "personal"}
      style={cover ? { "--journal-photo": `url(${JSON.stringify(previewUrl(cover))})` } as CSSProperties : undefined}
      aria-label="打开日常封面，可缩放" aria-haspopup="dialog" title="双击查看照片" {...gesture}>
      <span className="jls-view-window" aria-hidden="true">
        <span className="jls-photo-plane">{!cover && <LivingPhoto theme={theme} paused={open} />}</span>
        <span className="jls-lens-plane" />
      </span>
    </button>
    {open && <MediaViewer assets={cover ? [cover] : sceneImages} initial={cover ? 0 : themeNames.indexOf(theme)} close={() => setOpen(false)} zoomControls />}
  </>;
}

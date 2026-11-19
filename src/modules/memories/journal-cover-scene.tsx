"use client";

import { useState } from "react";
import { useActiveTheme } from "@/components/theme-provider";
import { themeNames } from "@/lib/themes";
import { useCoverGesture } from "./cover-gesture";
import { LivingPhoto } from "./living-photo";
import { MediaViewer } from "./media";
import { sceneImages } from "./scene-photography";

export function JournalCoverScene({ publicScope = false }: { publicScope?: boolean }) {
  const theme = useActiveTheme();
  const [open, setOpen] = useState(false);
  const gesture = useCoverGesture(() => setOpen(true));
  return <>
    <button type="button" className="journal-living-scene" data-jls-scope={publicScope ? "public" : "personal"}
      aria-label="打开日常封面，可缩放" aria-haspopup="dialog" title="双击查看照片" {...gesture}>
      <span className="jls-view-window" aria-hidden="true">
        <span className="jls-photo-plane"><LivingPhoto theme={theme} paused={open} /></span>
        <span className="jls-lens-plane" />
      </span>
    </button>
    {open && <MediaViewer assets={sceneImages} initial={themeNames.indexOf(theme)} close={() => setOpen(false)} zoomControls />}
  </>;
}

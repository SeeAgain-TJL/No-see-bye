"use client";

import Image from "next/image";
import { useState } from "react";
import { useActiveTheme } from "@/components/theme-provider";
import { themeNames } from "@/lib/themes";
import { LivingPhoto } from "./living-photo";
import { MediaViewer } from "./media";
import { sceneImages } from "./scene-photography";

export function JournalCoverScene() {
  const theme = useActiveTheme();
  const [open, setOpen] = useState(false);
  const index = themeNames.indexOf(theme);
  const image = sceneImages[index];
  return <>
    <button type="button" className="journal-cover-photo" aria-label="打开日常封面照片" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="journal-cover-echo" aria-hidden="true" style={{ backgroundImage: `url(${image.thumbnailUrl})` }} />
      <span className="journal-cover-film" aria-hidden="true">
        <Image src={image.url} alt="" fill unoptimized fetchPriority="high" />
        <LivingPhoto theme={theme} paused={open} />
      </span>
    </button>
    {open && <MediaViewer assets={sceneImages} initial={index} close={() => setOpen(false)} zoomControls />}
  </>;
}

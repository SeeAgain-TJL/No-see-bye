"use client";

import Image from "next/image";
import { useState } from "react";
import { useActiveTheme } from "@/components/theme-provider";
import { themeNames } from "@/lib/themes";
import { MediaViewer } from "./media";
import { sceneImages } from "./scene-photography";

export function JournalCoverScene() {
  const theme = useActiveTheme();
  const [open, setOpen] = useState(false);
  const index = themeNames.indexOf(theme);
  const image = sceneImages[index];
  return <>
    <button type="button" className="journal-cover-photo" aria-label="打开日常封面照片" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Image src={image.url} alt="" width={1920} height={1080} unoptimized fetchPriority="high" />
    </button>
    {open && <MediaViewer assets={sceneImages} initial={index} close={() => setOpen(false)} zoomControls />}
  </>;
}

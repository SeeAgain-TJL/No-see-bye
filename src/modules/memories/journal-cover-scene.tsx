"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons";

export function JournalCoverScene({ publicScope = false, cover }: { publicScope?: boolean; cover?: string }) {
  const [closer, setCloser] = useState(false);
  return <button type="button" className="journal-living-scene" data-jls-open={closer} data-jls-scope={publicScope ? "public" : "personal"}
    style={cover ? { "--journal-photo": `url(${JSON.stringify(cover)})` } as CSSProperties : undefined}
    aria-label="拉近日常封面镜头" aria-pressed={closer} onClick={() => setCloser(value => !value)}>
    <span className="jls-view-window" aria-hidden="true">
      <span className="jls-photo-plane" />
      <span className="jls-lens-plane" />
    </span>
    <span className="jls-touchmark"><Icon name="expand" size={15} /><span>{closer ? "还原镜头" : "拉近镜头"}</span></span>
  </button>;
}

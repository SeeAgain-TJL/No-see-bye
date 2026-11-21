"use client";

import { useState, type CSSProperties } from "react";
import { DecodedImage } from "@/components/decoded-image";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import type { GalleryPhoto } from "@/lib/photo-gallery";
import { previewUrl } from "./media";



export function CollectionCard({ photo, index, onOpen }: { photo: GalleryPhoto; index: number; onOpen: () => void }) {
  const { memory, asset } = photo;
  const image = previewUrl(asset);
  const date = dateText(memory.happenedAt, { year: "numeric", month: "long", day: "numeric" });
  const known = asset.width && asset.height ? asset.width / asset.height : 0;
  const [measured, setMeasured] = useState(0);
  const ratio = measured || known || 4 / 3;
  // The print is sized from its real proportions; the blurred copy fills the rest of the frame.
  return <article className="projection-contact-card" data-motion-surface="" style={{ "--print-ratio": ratio } as CSSProperties}>
    <button className="projection-contact-photo" type="button" aria-label={`查看第 ${index + 1} 张照片，${memory.title || date}`} onClick={onOpen}>
      <span className="contact-backdrop" aria-hidden="true"><DecodedImage src={image} alt="" loading="lazy" /></span>
      <span className="contact-print">
        <DecodedImage src={image} alt={memory.title || "日常照片"} width={asset.width || undefined} height={asset.height || undefined} loading="lazy"
          onDimensions={known ? undefined : size => setMeasured(size.width / Math.max(1, size.height))} />
        <span className="contact-sheen" aria-hidden="true" />
      </span>
      <span className="projection-contact-expand" aria-hidden="true"><Icon name="expand" size={17} /></span>
    </button>
    <div className="projection-contact-caption">
      <time dateTime={memory.happenedAt}>{date}</time>
      {memory.title && <h3>{memory.title}</h3>}
    </div>
  </article>;
}
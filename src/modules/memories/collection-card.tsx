"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { DecodedImage } from "@/components/decoded-image";
import { dateText } from "@/lib/client";
import type { GalleryPhoto } from "@/lib/photo-gallery";
import { previewUrl } from "./media";

/** One print mount for the home and journal galleries. Only the matte is blurred. */
export function CollectionCard({ photo, index, onOpen, journal, actions }: {
  photo: GalleryPhoto; index: number; onOpen: () => void; journal?: "public" | "mine"; actions?: ReactNode;
}) {
  const { memory, asset } = photo;
  const image = previewUrl(asset);
  const date = dateText(memory.happenedAt, { year: "numeric", month: "long", day: "numeric" });
  const [measured, setMeasured] = useState(0);
  const known = asset.width && asset.height ? asset.width / asset.height : 0;
  const caption = <><time dateTime={memory.happenedAt}>{date}{journal === "public" && ` · ${memory.user.displayName || memory.user.username}`}{journal === "mine" && ` · ${memory.visibility === "public" ? "公开" : "私密"}`}{journal && memory.assets.length > 1 && ` · ${memory.assets.length} 项影像`}</time>{(memory.title || (journal && memory.content)) && <h3>{memory.title || memory.content}</h3>}</>;
  return <article className="projection-contact-card" style={{ "--print-ratio": measured || known || 4 / 3 } as CSSProperties}>
    <button className="projection-contact-photo" type="button" aria-haspopup="dialog" aria-label={`查看第 ${index + 1} 张照片，${memory.title || date}`} onClick={onOpen}>
      <span className="contact-backdrop" aria-hidden="true"><DecodedImage src={image} alt="" loading="lazy" /></span>
      <span className="contact-print"><DecodedImage src={image} alt={memory.title || "日常照片"} width={asset.width || undefined} height={asset.height || undefined} loading="lazy" onDimensions={known ? undefined : size => setMeasured(size.width / Math.max(1, size.height))} /></span>
    </button>
    <div className="projection-contact-caption">
      {journal ? <Link href={'/memories/' + memory.id} aria-label={'阅读日常：' + (memory.title || date)}>{caption}</Link> : caption}
    </div>
    {actions}
  </article>;
}

"use client";

import Link from "next/link";
import { DecodedImage } from "@/components/decoded-image";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import type { GalleryPhoto } from "@/lib/photo-gallery";
import { previewUrl } from "./media";

export function CollectionCard({ photo, index, onOpen }: { photo: GalleryPhoto; index: number; onOpen: () => void }) {
  const { memory, asset } = photo;
  const date = dateText(memory.happenedAt, { year: "numeric", month: "long", day: "numeric" });
  return <article className="projection-contact-card" data-motion-surface="">
    <button className="projection-contact-photo" type="button" aria-label={`查看第 ${index + 1} 张照片，${memory.title || date}`} onClick={onOpen}>
      <DecodedImage src={previewUrl(asset)} alt={memory.title || "日常照片"} width={asset.width || undefined} height={asset.height || undefined} loading="lazy" />
      <span className="projection-contact-expand" aria-hidden="true"><Icon name="expand" size={18} /></span>
    </button>
    <div className="projection-contact-caption">
      <div>
        <time dateTime={memory.happenedAt}>{date}</time>
        {memory.title && <h3>{memory.title}</h3>}
      </div>
      <Link href={`/memories/${memory.id}`} aria-label={`打开${memory.title || date}的日常`}><Icon name="arrow" size={17} /></Link>
    </div>
  </article>;
}

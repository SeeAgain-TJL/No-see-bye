import { DecodedImage } from "./decoded-image";
import Link from "next/link";
import type { Memory } from "@/modules/memories/types";

export function MemoryScene({ memories = [], personal = false }: { memories?: Memory[]; personal?: boolean }) {
  const photos = memories.flatMap(memory => memory.assets.filter(asset => asset.mime.startsWith("image/")).map(asset => ({ memory, asset }))).slice(0, 2);
  const sample = [
    { src: "/visuals/summer-beach.webp", title: "把夏天留在这里" },
    { src: "/visuals/lake-light.webp", title: "慢一点，也很好" },
  ];
  return (
    <div className={"memory-scene" + (photos.length ? " scene-personal" : "")} aria-label={photos.length ? (personal ? "你的影像片段" : "公开影像片段") : "记录灵感"}>
      <div className="scene-halo" /><div className="scene-orbit" />
      <span className="scene-edition">{photos.length ? "THE EVERYDAY ARCHIVE" : "A LITTLE INSPIRATION"}</span>
      {[0, 1].map(index => {
        const photo = photos[index];
        if (photos.length && !photo) return <Link key="next" href="/memories/new" className="scene-photo photo-back scene-next"><span className="scene-next-art" aria-hidden="true"><span>＋</span><small>TO BE CONTINUED</small></span><div className="photo-caption"><span>下一格，留给明天</span><span>↗</span></div></Link>;
        const content = <><DecodedImage src={photo ? photo.asset.thumbnailUrl || photo.asset.url + "?variant=preview" : sample[index].src} alt={photo ? photo.memory.title || "日常影像" : sample[index].title} width={640} height={800} fetchPriority={index === 0 ? "high" : "auto"} /><div className="photo-caption"><span>{photo ? photo.memory.title || "日常随记" : sample[index].title}</span><span aria-hidden="true">↗</span></div></>;
        return photo ? <Link key={photo.asset.id} href={"/memories/" + photo.memory.id} className={"scene-photo " + (index ? "photo-back" : "photo-front")} aria-label={"打开记录：" + (photo.memory.title || "日常随记")}>{content}</Link> : <div key={index} className={"scene-photo " + (index ? "photo-back" : "photo-front")}>{content}</div>;
      })}
      <div className="scene-seal" aria-hidden="true"><span>KEEP</span><strong>the feeling.</strong><span>不说再见 / DAILY ARCHIVE</span></div>
      <div className="scene-index"><span className="rec-dot" />{photos.length ? (personal ? "你的生活，正在展映" : "分享出来的好时光") : "灵感画面 · 下一格由你拍"}</div>
    </div>
  );
}

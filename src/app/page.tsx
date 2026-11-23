"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { HomeHero } from "@/modules/memories/home-hero";
import { CollectionCard } from "@/modules/memories/collection-card";
import { MediaViewer } from "@/modules/memories/media";
import { api } from "@/lib/client";
import { galleryPhotos } from "@/lib/photo-gallery";
import type { MemoryList } from "@/modules/memories/types";

export default function Home() {
  const { user } = useApp();
  const [revision, setRevision] = useState(0);
  const [allowCoverMotion, setAllowCoverMotion] = useState(false);
  const [viewing, setViewing] = useState<{ owner: string; photo: string } | null>(null);
  const owner = user?.id || "guest";
  const ownerKey = owner + ":" + revision;
  const scope = user ? "mine" : "public";
  const [response, setResponse] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  useEffect(() => {
    // Public pictures can be requested before the session lookup settles. An
    // authenticated result is still fetched and displayed only for its owner.
    const abort = new AbortController();
    api<MemoryList>(`/api/memories?scope=${scope}&type=photo`, { signal: abort.signal })
      .then(data => { if (!abort.signal.aborted) setResponse({ key: ownerKey, data }); })
      .catch(error => { if (!abort.signal.aborted) setResponse({ key: ownerKey, error: error.message }); });
    return () => abort.abort();
  }, [scope, ownerKey]);
  const current = response?.key === ownerKey ? response : null;
  const data = current?.data;
  const photos = useMemo(() => galleryPhotos(data?.items || [], 8), [data]);
  useEffect(() => {
    if (user || allowCoverMotion) return;
    // Give the first print a head start over the large decorative video, but
    // keep the poster from staying static indefinitely if an image is slow.
    const timer = window.setTimeout(() => setAllowCoverMotion(true), 2200);
    return () => window.clearTimeout(timer);
  }, [user, allowCoverMotion]);
  const viewerIndex = viewing?.owner === owner ? photos.findIndex(photo => photo.asset.id === viewing.photo) : -1;
  const target = `/memories?scope=${scope}&type=photo&view=gallery`;
  const reload = () => setRevision(value => value + 1);

  return <AppShell><div className="studio-home projection-home">
    <HomeHero key={owner} user={user} data={data} error={current?.error} onRetry={reload} allowCoverMotion={allowCoverMotion || !!current?.error || (!!data && !photos.length)} />
    <section className="projection-contact-sheet" aria-labelledby="collection-title">
      <header className="projection-contact-heading">
        <h2 id="collection-title">{user ? "近来拾光" : "人间片笺"}</h2>
        <Link href={target} className="contact-gallery-link"><Icon name="image" size={17} /><span>查看照片</span><span className="contact-gallery-arrow"><Icon name="arrow" size={15} /></span></Link>
      </header>
      <div aria-busy={!current}>
        {current?.error ? <div className="home-error" role="alert">{current.error}<button onClick={reload}>重新加载</button></div>
          : !data ? <div className="projection-contact-grid contact-skeleton" role="status" aria-label="正在加载照片"><span /><span /><span /><span /></div>
          : photos.length ? <div className="projection-contact-grid">
            {photos.map((photo, index) => <CollectionCard key={photo.asset.id} photo={photo} index={index} priority={index < 4}
              onSettled={!user && index === 0 && !allowCoverMotion ? () => setAllowCoverMotion(true) : undefined}
              onOpen={() => setViewing({ owner, photo: photo.asset.id })} />)}
          </div>
          : <div className="projection-empty">
            <Icon name="image" size={27} />
            <p>{user ? "这一卷，等第一束光。" : "这里还没有公开照片。"}</p>
            <Link className="studio-text-link" href={user ? "/memories/new" : target}>{user ? "添加照片" : "浏览公开日常"}<Icon name="arrow" size={17} /></Link>
          </div>}
      </div>
    </section>
    {viewerIndex >= 0 && <MediaViewer assets={photos.map(photo => ({ ...photo.asset, alt: photo.memory.title || undefined }))} initial={viewerIndex} close={() => setViewing(null)} />}
    <footer className="studio-footer"><span>不说再见 © 2026</span></footer>
  </div></AppShell>;
}

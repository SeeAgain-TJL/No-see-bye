"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { Landscape } from "@/components/landscape";
import { api, dateText } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";
export default function Home() {
  const { user, loading } = useApp();
  const ownerKey = user?.id || "guest";
  const [response, setResponse] = useState<{
    key: string;
    data: MemoryList;
  } | null>(null);
  const data = response?.key === ownerKey ? response.data : null;
  const [error, setError] = useState("");
  useEffect(() => {
    if (loading) return;
    let live = true;
    api<MemoryList>(`/api/memories?scope=${user ? "mine" : "public"}`)
      .then((v) => {
        if (live) {
          setResponse({ key: ownerKey, data: v });
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [user, loading, ownerKey]);
  return (
    <AppShell>
      <section className="portal-intro">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> A LITTLE SPACE FOR LIFE
          </div>
          <h1>
            生活有迹，<span className="serif">记忆有处。</span>
          </h1>
          <p className="intro-copy">
            这里是{user ? `${user.username} 的` : "一个"}生活收藏地。
            <br />
            安放日常，也留一点空间给未来。
          </p>
          <Link href="/memories/new" className="button">
            记录此刻 <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="portal-art">
          <Landscape />
          <span className="art-caption">日子本身，就是一份礼物。</span>
          <span className="art-label">LIFE, IN LITTLE MOMENTS.</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>
          我的空间 <span>THE COLLECTION</span>
        </h2>
        <span className="small muted">从一个片刻开始</span>
      </div>
      <section className="portal-modules">
        <Link href="/memories" className="module-card primary-module">
          <span className="module-icon">
            <Icon name="book" size={26} />
          </span>
          <span className="module-number">01 / MEMORIES</span>
          <h3>记忆手札</h3>
          <p>
            一些文字，一帧照片，一段影像。
            <br />
            把流动的生活，收进自己的时间线。
          </p>
          <div className="module-card-bottom">
            <span>
              {user && data?.stats
                ? `已收藏 ${data.stats.total} 段记忆`
                : "去看看生活的切片"}
            </span>
            <span className="circle-arrow">
              <Icon name="arrow" />
            </span>
          </div>
        </Link>
        <div className="module-card future-module">
          <span className="module-icon">
            <Icon name="spark" size={26} />
          </span>
          <span className="module-number">NEXT / SOMEDAY</span>
          <h3>未完待续</h3>
          <p>
            书单、旅行、作品与更多喜欢的事。
            <br />
            这个小小宇宙，正在慢慢生长。
          </p>
          <span className="coming-label">未来的空间，先留白。</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>
          {user ? "最近留下的" : "被分享的片刻"} <span>RECENT MOMENTS</span>
        </h2>
        <Link
          className="text-link"
          href={user ? "/memories" : "/memories?scope=public"}
        >
          查看全部 <Icon name="arrow" size={16} />
        </Link>
      </div>
      {error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : loading || !data ? (
        <div className="loading-panel">正在打开生活的相册…</div>
      ) : data.items.length ? (
        <div className="recent-list">
          {data.items.slice(0, 3).map((m) => (
            <Link key={m.id} href={`/memories/${m.id}`} className="recent-item">
              <span className="recent-date">
                {dateText(m.happenedAt, { month: "2-digit", day: "2-digit" })}
              </span>
              <Icon
                name={
                  m.assets.some((a) => a.mime.startsWith("video/"))
                    ? "video"
                    : m.assets.length
                      ? "image"
                      : "book"
                }
              />
              <span className="recent-title">
                {m.title || m.content?.slice(0, 40) || "一帧值得记住的日常"}
              </span>
              <span className="small muted">
                {m.location || "平凡而珍贵的一天"}
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="portal-empty">
          <Icon name="book" size={26} />
          <div>
            <h3>故事的第一页，还空着。</h3>
            <p>不必等特别的日子，今天就值得记录。</p>
          </div>
          <Link className="text-link" href="/memories/new">
            写下第一段 <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
    </AppShell>
  );
}

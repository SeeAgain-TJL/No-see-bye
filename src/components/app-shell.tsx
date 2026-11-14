"use client";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "./providers";
import { Icon } from "./icons";
import { BrandMark } from "./brand-mark";
import { Avatar } from "./avatar";
import { api } from "@/lib/client";
export function AppShell({children}:{children:React.ReactNode}) {
  return <Suspense fallback={<div className="loading-panel">加载中…</div>}><ShellContent>{children}</ShellContent></Suspense>;
}
function ShellContent({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const params = useSearchParams();
  const publicScope = params.get("scope") === "public";
  const router = useRouter();
  const { user, loading, refresh, notify } = useApp();
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      await refresh();
      router.push("/");
      notify("已安全退出");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <BrandMark />
          <span>
            不说再见<small>NO SEE BYE</small>
          </span>
        </Link>

        <nav aria-label="主要导航">
          <Link
            href="/"
            className={path === "/" ? "nav-link active" : "nav-link"}
          >
            <Icon name="home" />
            我的主页
          </Link>
          <Link
            href="/memories"
            className={
              path.startsWith("/memories") && !path.includes("trash") && !publicScope
                ? "nav-link active"
                : "nav-link"
            }
          >
            <Icon name="book" />
            我的日常

          </Link>
          <Link href="/memories?scope=public" className={publicScope ? "nav-link active" : "nav-link"}>
            <Icon name="globe" />
            发现日常
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <Link className={path.includes("trash") ? "nav-link active" : "nav-link"} href="/memories/trash">
            <Icon name="trash" />
            回收站
          </Link>
          <Link className={path === "/settings" ? "nav-link active" : "nav-link"} href="/settings"><Icon name="settings" />设置</Link>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="breadcrumb">
            我的空间 <span>/</span>{" "}
            {path === "/settings" ? "设置" : path.includes("trash") ? "回收站" : path.startsWith("/memories") ? (publicScope ? "发现日常" : "我的日常") : "首页"}
          </span>
          <Link href="/" className="mobile-brand">
            <BrandMark />不说再见
          </Link>
          <div className="account">
            {loading ? (
              <span className="muted small">连接中…</span>
            ) : user ? (
              <>
                <span className="account-name">{user.displayName || user.username}</span>
                <Link href="/settings" className="account-avatar-link" aria-label="账号设置"><Avatar name={user.displayName || user.username} src={user.avatarUrl} /></Link>
                <button
                  type="button"
                  className="icon-button"
                  title="退出登录"
                  aria-label="退出登录"
                  onClick={logout}
                >
                  <Icon name="logout" size={17} />
                </button>
              </>
            ) : (
              <Link className="button small-button" href="/login">
                登录 <Icon name="arrow" size={15} />
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>

      </div>
      <nav className="mobile-nav" aria-label="移动导航">
        <Link href="/">
          <Icon name="home" size={20} />
          首页
        </Link>
        <Link href="/memories">
          <Icon name="book" size={20} />
          日常
        </Link>
        <Link href="/memories/new" className="mobile-add" aria-label="新建记录">
          <Icon name="plus" size={24} />
        </Link>
        <Link href="/memories?scope=public">
          <Icon name="globe" size={20} />
          发现
        </Link>
        <Link href="/settings">
          <Icon name="settings" size={20} />
          我的
        </Link>
      </nav>
    </div>
  );
}

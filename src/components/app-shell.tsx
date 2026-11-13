"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Icon } from "./icons";
import { api } from "@/lib/client";
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
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
          <span className="brand-mark">n.</span>
          <span>
            不说再见<small>NO SEE BYE</small>
          </span>
        </Link>
        <div className="nav-label">我的小小宇宙</div>
        <nav aria-label="主要导航">
          <Link
            href="/"
            className={path === "/" ? "nav-link active" : "nav-link"}
          >
            <Icon name="home" />
            我的门户
          </Link>
          <Link
            href="/memories"
            className={
              path.startsWith("/memories") && !path.includes("trash")
                ? "nav-link active"
                : "nav-link"
            }
          >
            <Icon name="book" />
            记忆手札
            <span className="nav-dot" />
          </Link>
          <Link href="/memories?scope=public" className="nav-link">
            <Icon name="globe" />
            公开的片刻
          </Link>
        </nav>
        <div className="sidebar-note">
          <span className="little-star">✳</span>
          <p>
            日子慢慢过，
            <br />
            值得记住的，都留下。
          </p>
          <span className="small muted">给平凡生活一个位置</span>
        </div>
        <div className="sidebar-bottom">
          <Link className="nav-link" href="/memories/trash">
            <Icon name="trash" />
            回收站
          </Link>
          <div className="storage-note">
            <span className="status-dot" />
            本地存储 · 属于你自己
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="breadcrumb">
            我的空间 <span>/</span>{" "}
            {path.startsWith("/memories") ? "记忆手札" : "首页"}
          </span>
          <Link href="/" className="mobile-brand">
            n. 不说再见
          </Link>
          <div className="account">
            {loading ? (
              <span className="muted small">连接中…</span>
            ) : user ? (
              <>
                <span className="account-name">{user.username}</span>
                <span className="avatar">{user.username[0].toUpperCase()}</span>
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
                登录我的空间 <Icon name="arrow" size={15} />
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="footer">
          <span>
            NO SEE BYE <span className="footer-dot">·</span> 为生活留一份底片
          </span>
          <span>慢慢记录，常常回望。</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="移动导航">
        <Link href="/">
          <Icon name="home" size={20} />
          门户
        </Link>
        <Link href="/memories">
          <Icon name="book" size={20} />
          记忆
        </Link>
        <Link href="/memories/new" className="mobile-add" aria-label="新建记录">
          <Icon name="plus" size={24} />
        </Link>
        <Link href="/memories?scope=public">
          <Icon name="globe" size={20} />
          公开
        </Link>
        <Link href="/memories/trash">
          <Icon name="trash" size={20} />
          回收站
        </Link>
      </nav>
    </div>
  );
}

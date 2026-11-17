'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from './providers';
import { Icon } from './icons';
import { BrandMark } from './brand-mark';
import { Avatar } from './avatar';
import { api } from '@/lib/client';
import { QuickSearch } from './quick-search';
import { ThemeSwitcher } from './theme-provider';
import { ImmersiveMotion } from './immersive-motion';
export function AppShell({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className='loading-panel'>加载中…</div>}><ShellContent>{children}</ShellContent></Suspense>;
}
function ShellContent({ children }: { children: React.ReactNode }) {
  const path = usePathname(), params = useSearchParams(), router = useRouter();
  const publicScope = params.get('scope') === 'public';
  const { user, loading, refresh, notify } = useApp();
  const active = path === '/' ? 'home' : path.startsWith('/admin') ? 'admin' : path === '/settings' ? 'settings' : path.includes('trash') ? 'trash' : path === '/memories/new' ? 'new' : path.startsWith('/memories') ? (publicScope ? 'discover' : 'memories') : '';
  const linkClass = (key: string) => 'nav-link' + (active === key ? ' active' : '');
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); await refresh(); router.push('/'); notify('已安全退出'); } catch (error) { notify((error as Error).message); }
  }
  return <div className='app-shell'>
    <ImmersiveMotion />
    <aside className='sidebar'>
      <Link href='/' className='brand'><BrandMark /><span>不说再见<small>NO SEE BYE</small></span></Link>
      <nav aria-label='主要导航'>
        <Link href='/' className={linkClass('home')} aria-current={active === 'home' ? 'page' : undefined}><Icon name='home' />我的主页</Link>
        <Link href='/memories' className={linkClass('memories')} aria-current={active === 'memories' ? 'page' : undefined}><Icon name='book' />我的日常</Link>
        <Link href='/memories?scope=public' className={linkClass('discover')} aria-current={active === 'discover' ? 'page' : undefined}><Icon name='globe' />发现日常</Link>
      </nav>
      <div className='sidebar-bottom'>
        {user?.role === 'admin' && <Link href='/admin' className={linkClass('admin')} aria-current={active === 'admin' ? 'page' : undefined}><Icon name='grid' />管理台</Link>}
        <Link href='/memories/new' className='sidebar-compose'><Icon name='plus' size={18} /><span>记录日常</span><Icon name='arrow' size={16} /></Link>
        <Link href='/memories/trash' className={linkClass('trash')} aria-current={active === 'trash' ? 'page' : undefined}><Icon name='trash' />回收站</Link>
        <Link href='/settings' className={linkClass('settings')} aria-current={active === 'settings' ? 'page' : undefined}><Icon name='settings' />设置</Link>
      </div>
    </aside>
    <div className='app-body'>
      <header className='topbar'>
        <span className='breadcrumb'>我的空间<span>/</span>{({ admin: '管理台', settings: '设置', trash: '回收站', memories: '我的日常', discover: '发现日常', new: '记录日常' } as Record<string, string>)[active] || '首页'}</span>
        <Link href='/' className='mobile-brand'><BrandMark /><span>不说再见</span></Link>
        <div className='account'>
          <QuickSearch /><span className='account-divider' aria-hidden='true' /><ThemeSwitcher />
          {loading ? <span className='muted small'>连接中…</span> : user ? <>
            <Link href='/settings' className='account-avatar-link' aria-label='账号设置'><Avatar name={user.displayName || user.username} src={user.avatarUrl} /></Link>
            <button type='button' className='icon-button account-logout' title='退出登录' aria-label='退出登录' onClick={logout}><Icon name='logout' size={17} /></button>
          </> : <Link className='button small-button' href='/login'>登录<Icon name='arrow' size={15} /></Link>}
        </div>
      </header>
      <main id='main' className='main-content'>{children}</main>
    </div>
    <nav className='mobile-nav' aria-label='移动导航'>
      <Link href='/' aria-current={active === 'home' ? 'page' : undefined}><Icon name='home' size={21} /><span>首页</span></Link>
      <Link href='/memories' aria-current={active === 'memories' ? 'page' : undefined}><Icon name='book' size={21} /><span>日常</span></Link>
      <Link href='/memories/new' className='mobile-add' aria-label='新建记录' aria-current={active === 'new' ? 'page' : undefined}><Icon name='plus' size={24} /></Link>
      <Link href='/memories?scope=public' aria-current={active === 'discover' ? 'page' : undefined}><Icon name='globe' size={21} /><span>发现</span></Link>
      <Link href='/settings' aria-current={active === 'settings' ? 'page' : undefined}><Icon name='settings' size={21} /><span>我的</span></Link>
    </nav>
  </div>;
}

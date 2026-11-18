import { useEffect, useId, useRef, useState } from "react";
import { bytes } from "@/lib/client";
import { AdminUserActions } from "./admin-user-actions";
import { useAdminLiveData } from "./admin-live-data";
import { Avatar } from "./avatar";
import { Icon } from "./icons";
import "./admin-user-explorer.css";

export type AdminUserTarget = { id: string; username: string; request: number };

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  loginCount: number;
  entries: number;
  publicEntries: number;
  privateEntries: number;
  trashedEntries: number;
  assets: number;
  storageBytes: number;
  photos: number;
  videos: number;
  loginMethods: string[];
};

type UserPage = { items: AdminUser[]; page: number; total: number; totalPages: number };
type ExplorerProps = {
  revision: number;
  autoRefresh: boolean;
  onChanged: () => void;
  onDenied: () => void;
  target: AdminUserTarget | null;
};

const localDate = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const fullDate = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  dateStyle: "medium",
  timeStyle: "short",
  hourCycle: "h23",
});
const count = new Intl.NumberFormat("zh-CN");

function UserTime({ value, full = false }: { value: string | null; full?: boolean }) {
  if (!value) return <span>尚无记录</span>;
  return <time dateTime={value}>{(full ? fullDate : localDate).format(new Date(value))}</time>;
}

function UserRow({ person, expanded, onToggle, onChanged }: {
  person: AdminUser;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const detailId = useId();
  const buttonId = useId();
  const name = person.displayName || person.username;
  const isAdmin = person.role === "admin";
  const methods = person.loginMethods.map(method => method === "password" ? "密码" : method === "github" ? "GitHub" : method);

  return <li className="admin-explorer-person" data-expanded={expanded}>
    <button id={buttonId} type="button" className="admin-explorer-row" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}>
      <span className="admin-explorer-identity">
        <Avatar name={name} />
        <span>
          <strong>{name}{isAdmin && <small className="admin-explorer-role">管理员</small>}</strong>
          <span>@{person.username}</span>
        </span>
      </span>
      <span className="admin-explorer-row-metric"><b>{count.format(person.entries)}</b><span> 条日常</span></span>
      <span className="admin-explorer-row-metric admin-explorer-row-storage">{bytes(person.storageBytes)}</span>
      <span className="admin-explorer-row-seen"><span className="admin-explorer-mobile-label">最近活跃 </span><UserTime value={person.lastSeenAt} /></span>
      <span className="admin-explorer-disclosure"><Icon name="arrow" size={16} /></span>
    </button>
    <div className="admin-explorer-reveal" id={detailId} role="region" inert={!expanded} aria-hidden={!expanded} aria-labelledby={buttonId}>
      <div className="admin-explorer-reveal-clip">
        <div className="admin-explorer-detail">
          <div className="admin-explorer-detail-columns">
            <section>
              <h3><Icon name="calendar" size={15} />账号活动</h3>
              <dl className="admin-explorer-timestamps">
                <div><dt>最近活跃</dt><dd><UserTime value={person.lastSeenAt} full /></dd></div>
                <div><dt>最近登录</dt><dd><UserTime value={person.lastLoginAt} full /></dd></div>
                <div><dt>加入时间</dt><dd><UserTime value={person.createdAt} full /></dd></div>
              </dl>
            </section>
            <section>
              <h3><Icon name="book" size={15} />日常与附件</h3>
              <dl className="admin-explorer-inventory">
                <div><dt>公开</dt><dd>{count.format(person.publicEntries)}</dd></div>
                <div><dt>私密</dt><dd>{count.format(person.privateEntries)}</dd></div>
                <div><dt>回收站</dt><dd>{count.format(person.trashedEntries)}</dd></div>
                <div><dt>照片</dt><dd>{count.format(person.photos)}</dd></div>
                <div><dt>影像</dt><dd>{count.format(person.videos)}</dd></div>
                <div><dt>全部附件</dt><dd>{count.format(person.assets)}</dd></div>
              </dl>
            </section>
            <section>
              <h3><Icon name="lock" size={15} />登录资料</h3>
              <dl className="admin-explorer-credentials">
                <div><dt>邮箱</dt><dd>{person.email || "未绑定"}</dd></div>
                <div><dt>登录方式</dt><dd>{methods.join(" / ") || "尚无记录"}</dd></div>
                <div><dt>登录次数</dt><dd>{count.format(person.loginCount)}</dd></div>
              </dl>
            </section>
          </div>
          {!isAdmin && <div className="admin-explorer-actions"><span>数据操作</span><AdminUserActions userId={person.id} username={person.username} onChanged={onChanged} /></div>}
        </div>
      </div>
    </div>
  </li>;
}

function UserDirectory({ revision, autoRefresh, onChanged, onDenied, target }: ExplorerProps) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [exact, setExact] = useState(target);
  const [expandedId, setExpandedId] = useState<string | null>(target?.id ?? null);
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const endpoint = `/api/admin/users?${new URLSearchParams({ page: String(page), pageSize: "20", ...(exact ? { userId: exact.id } : { q: search }) })}`;
  const state = useAdminLiveData<UserPage>(endpoint, revision, autoRefresh);
  const result = state?.data;
  const denied = state?.denied;

  useEffect(() => {
    if (denied) onDenied();
  }, [denied, onDenied]);

  useEffect(() => {
    if (!target) return;
    section.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    heading.current?.focus({ preventScroll: true });
  }, [target]);

  function resetSearch() {
    setExact(null);
    setQuery("");
    setSearch("");
    setExpandedId(null);
    setPage(1);
  }

  return <section className="admin-panel admin-explorer" id="admin-users" ref={section} aria-labelledby="admin-users-title">
    <div className="admin-explorer-header">
      <div className="admin-explorer-title">
        <span className="admin-explorer-title-icon"><Icon name="globe" size={19} /></span>
        <h2 id="admin-users-title" ref={heading} tabIndex={-1}>用户管理</h2>
        {result && <span className="admin-explorer-total" title="当前结果数">{count.format(result.total)}</span>}
      </div>
      <form className="admin-explorer-search" onSubmit={event => {
        event.preventDefault();
        setExact(null);
        setSearch(query.trim());
        setExpandedId(null);
        setPage(1);
      }}>
        <Icon name="search" size={17} />
        <input type="search" aria-label="搜索用户" placeholder="用户名、昵称或邮箱" value={query} onChange={event => setQuery(event.target.value)} maxLength={100} />
        <button type="submit">搜索</button>
      </form>
    </div>
    {(exact || search) && <div className="admin-explorer-filter">
      <button type="button" onClick={resetSearch} aria-label="清空筛选，查看全部用户"><span>{exact ? `@${exact.username}` : search}</span><Icon name="close" size={15} /></button>
    </div>}
    {state?.error && !denied && <div className="admin-explorer-error" role="alert"><span>{state.error}{result ? "。正在显示上次同步的数据。" : "。"}</span><button type="button" className="admin-control" onClick={onChanged}>重试</button></div>}
    {!result && !state?.error && <div className="admin-read-status" role="status">正在读取用户…</div>}
    {result && (result.items.length === 0 ? <div className="admin-read-status" role="status">{exact ? "该账号已不存在。" : "没有找到匹配的用户。"}</div> : <>
      <div className="admin-explorer-columns" aria-hidden="true"><span>账号</span><span>日常</span><span>存储</span><span>最近活跃</span></div>
      <ul className="admin-explorer-list">
        {result.items.map(person => <UserRow key={person.id} person={person} expanded={expandedId === person.id} onToggle={() => setExpandedId(value => value === person.id ? null : person.id)} onChanged={onChanged} />)}
      </ul>
    </>)}
    {result && <footer className="admin-explorer-pagination">
      <span role="status">{`共 ${count.format(result.total)} 位用户 · 第 ${result.page} / ${result.totalPages} 页`}</span>
      {result.totalPages > 1 && <div>
        <button type="button" className="admin-control" aria-label="上一页" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)}><Icon name="back" size={17} /></button>
        <button type="button" className="admin-control" aria-label="下一页" disabled={result.page >= result.totalPages} onClick={() => setPage(result.page + 1)}><Icon name="arrow" size={17} /></button>
      </div>}
    </footer>}
  </section>;
}

export function AdminUserExplorer(props: ExplorerProps) {
  return <UserDirectory key={props.target?.request ?? "directory"} {...props} />;
}

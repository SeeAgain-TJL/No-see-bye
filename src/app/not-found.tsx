import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="empty-state">
      <p className="eyebrow">404 / LOST IN A MOMENT</p>
      <h1>这页故事，似乎走丢了。</h1>
      <Link className="button" href="/">
        回到我的空间
      </Link>
    </main>
  );
}

/** The last light at the edge of an open film frame. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={"brand-symbol " + className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="12" fill="#131e1d" />
      <path d="M12 28V14h15m9 6v14H21M12 35l17-13" stroke="#f1e5ce" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35" cy="13" r="4" fill="#e5a16d" />
    </svg>
  );
}

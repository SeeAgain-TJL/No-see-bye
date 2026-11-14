/** A sunset held inside a frame: one shared mark for the entire portal. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={"brand-symbol " + className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brand-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="15" fill="url(#brand-bg)" />
      <path d="M12 31V16a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="27.5" cy="21" r="4.5" fill="#d4ff5e" />
      <path d="M12 31c5-6 10-6 15-3s7 2 9 0" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

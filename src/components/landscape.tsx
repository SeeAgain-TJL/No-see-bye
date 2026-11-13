export function Landscape({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 520"
      role="img"
      aria-label="群山、湖水与缓缓升起的太阳"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#d8e4d8" />
          <stop offset="1" stopColor="#ecede0" />
        </linearGradient>
        <linearGradient id="water" x2="0" y2="1">
          <stop stopColor="#93b5a5" />
          <stop offset="1" stopColor="#dce2c9" />
        </linearGradient>
      </defs>
      <path fill="url(#sky)" d="M0 0h800v520H0z" />
      <circle cx="575" cy="155" r="58" fill="#f3d294" />
      <path
        d="M0 315 160 105l170 190L480 165l170 164L800 190v330H0Z"
        fill="#9eb5a3"
      />
      <path d="m0 350 210-143 173 145 170-92 247 125v135H0Z" fill="#6a907d" />
      <path d="m0 383 235-77 197 87 368-54v181H0Z" fill="#345f4c" />
      <path d="M0 400h800v120H0z" fill="url(#water)" />
      <path
        d="M190 430h370m-250 24h340m-530 23h250"
        fill="none"
        stroke="#f7f4de"
        strokeWidth="2"
        opacity=".5"
      />
      <path d="m0 478 170-35 116 77H0Z" fill="#214b37" />
      <path d="m640 520 72-81 88-15v96z" fill="#4d7256" />
    </svg>
  );
}

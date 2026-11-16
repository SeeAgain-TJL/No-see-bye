import type { ThemeName } from "@/lib/themes";

/** Decorative marks share a viewbox; CSS selects the current material before hydration. */
export function ThemeMotif({ theme, className = "" }: { theme?: ThemeName; className?: string }) {
  return <svg className={`theme-motif ${className}`} data-motif-theme={theme || "current"} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <g data-motif="dusk" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 43c4-13 9-23 19-35" />
      <path d="M23 28C8 28 6 18 8 13c10 1 16 5 15 15Zm6-10c-8-9-5-16 0-18 5 6 6 12 0 18Zm-9 18c12-1 18-6 19-14-9-2-18 5-19 14Z" fill="currentColor" fillOpacity=".15" />
      <path d="M23 28 12 18m8 18 14-9M29 18V6" strokeOpacity=".65" />
      <circle cx="38" cy="9" r="2" fill="currentColor" stroke="none" />
    </g>
    <g data-motif="sea" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 39 5 24c-3-4 0-8 5-7-1-7 6-10 10-5 3-6 11-5 12 2 6-3 12 2 9 8 6 2 5 8 1 10L26 41Z" fill="currentColor" fillOpacity=".1" />
      <path d="m24 38-13-18m13 18-4-23m4 23 6-21m-6 21 14-14" strokeOpacity=".75" />
      <path d="m20 39 3 5 7-2-2-4" fill="currentColor" fillOpacity=".2" />
      <circle cx="37" cy="7" r="3" /><circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </g>
    <g data-motif="film" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="6" width="38" height="36" rx="3" fill="currentColor" fillOpacity=".08" />
      <path d="M13 6v36M35 6v36" strokeOpacity=".6" />
      <path d="M8 12h2m-2 8h2m-2 8h2m-2 8h2m28-24h2m-2 8h2m-2 8h2m-2 8h2" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" /><path d="m21 18 5 5m4 1-7 2m-3 4 1-7" />
      <path d="M18 37h12" strokeOpacity=".45" />
    </g>
    <g data-motif="night" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 5a15 15 0 1 0 17 21C25 31 17 16 26 5Z" fill="currentColor" fillOpacity=".2" />
      <path d="m32 9 3 7 8 1-7 4-1 8-4-7-8-1 7-4Z" fill="currentColor" fillOpacity=".65" stroke="none" />
      <path d="m6 32 7 10 12-3" strokeDasharray="2 3" strokeOpacity=".65" />
      <circle cx="6" cy="32" r="1.5" fill="currentColor" stroke="none" /><circle cx="13" cy="42" r="2" fill="currentColor" stroke="none" /><circle cx="25" cy="39" r="1.5" fill="currentColor" stroke="none" />
    </g>
  </svg>;
}

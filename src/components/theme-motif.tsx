import type { ThemeName } from "@/lib/themes";

/** Decorative marks share a viewbox; CSS selects the current material before hydration. */
export function ThemeMotif({ theme, className = "" }: { theme?: ThemeName; className?: string }) {
  return <svg className={`theme-motif ${className}`} data-motif-theme={theme || "current"} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <g data-motif="grassland" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 43c4-13 9-23 19-35" />
      <path d="M23 28C8 28 6 18 8 13c10 1 16 5 15 15Zm6-10c-8-9-5-16 0-18 5 6 6 12 0 18Zm-9 18c12-1 18-6 19-14-9-2-18 5-19 14Z" fill="currentColor" fillOpacity=".15" />
      <path d="M23 28 12 18m8 18 14-9M29 18V6" strokeOpacity=".65" />
      <circle cx="38" cy="9" r="2" fill="currentColor" stroke="none" />
    </g>
    <g data-motif="ocean" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 39 5 24c-3-4 0-8 5-7-1-7 6-10 10-5 3-6 11-5 12 2 6-3 12 2 9 8 6 2 5 8 1 10L26 41Z" fill="currentColor" fillOpacity=".1" />
      <path d="m24 38-13-18m13 18-4-23m4 23 6-21m-6 21 14-14" strokeOpacity=".75" />
      <path d="m20 39 3 5 7-2-2-4" fill="currentColor" fillOpacity=".2" />
      <circle cx="37" cy="7" r="3" /><circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </g>
    <g data-motif="rift" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18h12l5 7-6 4 2 8H4Zm40-4H33l-5 8 6 5-2 10h12Z" fill="currentColor" fillOpacity=".16" />
      <path d="M4 24h11l4 3m11-2 5-6h9M4 32h12m17 0h11m-23 9c1-3 8-4 7-8" strokeOpacity=".58" />
      <path d="M22 8h7l-.9 8h-5.2Z" fill="currentColor" fillOpacity=".44" />
    </g>
    <g data-motif="forest" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m23 6-9 14h5L9 32h12v9h4v-9h12L27 20h5Z" fill="currentColor" fillOpacity=".14" />
      <path d="m35 17 8 13h-4l6 8h-5v4m-32-2h31" strokeOpacity=".55" />
      <path d="M8 11v6m-3-3h6m27-7v6m-3-3h6" strokeOpacity=".8" />
    </g>
    <g data-motif="iceberg" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="m4 29 10-3 10-19 7 11 6 3 7 8H4Zm2 5 9 9 21-2 7-7" fill="currentColor" fillOpacity=".18" />
      <path d="m24 7 2 13-5 9m5-9 5-2m-10 11-6 14m11-14 10 12M4 34h40" />
    </g>
  </svg>;
}

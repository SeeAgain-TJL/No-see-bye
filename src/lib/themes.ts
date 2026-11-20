// Palette tokens live in themes.css; materials and motifs live in theme-atmospheres.css.
export const themes = {
  forest: { label: "森林", description: "雾过林冠" },
  iceberg: { label: "冰山", description: "浮冰与蓝色冰拱" },
  grassland: { label: "草地", description: "草甸上的长影" },
  rift: { label: "裂谷", description: "岩间叠瀑" },
  ocean: { label: "海洋", description: "海湾的白色浪线" },
} as const;
export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
// v2 key: earlier releases stored an explicit choice under "theme", which kept
// returning visitors on ocean after grassland became the default. Starting a new
// key resets everyone to the default once; the old entry is removed on load.
export const THEME_STORAGE_KEY = "nsb-theme";
const RETIRED_THEME_KEY = "theme";
export const defaultTheme: ThemeName = "grassland";
const previousThemes = { dusk: "grassland", sea: "ocean", film: "rift", night: "forest" } as const;
export function isTheme(value: string | null | undefined): value is ThemeName {
  return themeNames.some(name => name === value);
}
export function resolveTheme(value: string | null): ThemeName {
  const legacy = Object.prototype.hasOwnProperty.call(previousThemes, value ?? "") ? previousThemes[value as keyof typeof previousThemes] : undefined;
  return isTheme(value) ? value : legacy ?? defaultTheme;
}
// Static, allow-listed values only. Runs before the first body paint.
export const themeInitScript = `(function(){try{localStorage.removeItem(${JSON.stringify(RETIRED_THEME_KEY)});var key=${JSON.stringify(THEME_STORAGE_KEY)},t=localStorage.getItem(key),legacy=${JSON.stringify(previousThemes)};if(Object.prototype.hasOwnProperty.call(legacy,t)){t=legacy[t];localStorage.setItem(key,t)}if(${JSON.stringify(themeNames)}.includes(t))document.documentElement.dataset.theme=t}catch(e){}})()`;

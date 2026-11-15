// Color tokens live in themes.css; this list is shared by the UI and first-paint script.
export const themes = {
  dusk: { label: "暮光", description: "杏色晚风，雾紫心事" },
  sea: { label: "海盐", description: "海风吹过的一页" },
  film: { label: "胶片", description: "把日子晒成暖色" },
  night: { label: "夜航", description: "蓝灰夜色，一盏小灯" },
} as const;
export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
export const THEME_STORAGE_KEY = "theme";
export function isTheme(value: string | null | undefined): value is ThemeName {
  return themeNames.some(name => name === value);
}
// Static, allow-listed values only. Runs before the first body paint.
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(themeNames)}.includes(t))document.documentElement.dataset.theme=t}catch(e){}})()`;

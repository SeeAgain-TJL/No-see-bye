// Color tokens live in themes.css; this list is shared by the UI and first-paint script.
export const themes = {
  dusk: { label: "纸白", description: "米白 · 鼠尾草绿" },
  sea: { label: "海盐", description: "雾白 · 青灰" },
  film: { label: "麦芽", description: "暖纸 · 浅棕" },
  night: { label: "墨林", description: "深绿 · 月白" },
} as const;
export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
export const THEME_STORAGE_KEY = "theme";
export function isTheme(value: string | null | undefined): value is ThemeName {
  return themeNames.some(name => name === value);
}
// Static, allow-listed values only. Runs before the first body paint.
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(themeNames)}.includes(t))document.documentElement.dataset.theme=t}catch(e){}})()`;

// Palette tokens live in themes.css; materials and motifs live in theme-atmospheres.css.
export const themes = {
  dusk: { label: "纸白", description: "植物标本 · 方格手账" },
  sea: { label: "海盐", description: "贝壳水纹 · 海边来信" },
  film: { label: "麦芽", description: "胶片齿孔 · 旧日档案" },
  night: { label: "墨林", description: "月光星轨 · 萤火森林" },
} as const;
export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
export const THEME_STORAGE_KEY = "theme";
export function isTheme(value: string | null | undefined): value is ThemeName {
  return themeNames.some(name => name === value);
}
// Static, allow-listed values only. Runs before the first body paint.
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(themeNames)}.includes(t))document.documentElement.dataset.theme=t}catch(e){}})()`;

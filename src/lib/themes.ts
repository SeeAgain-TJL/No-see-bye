// Palette tokens live in themes.css; materials and motifs live in theme-atmospheres.css.
export const themes = {
  forest: { label: "森林", description: "苍松与林间微光", quote: ["命运无从更改，", "但我们可以迎上去。"], film: "幽灵公主" },
  iceberg: { label: "冰山", description: "冷蓝冰层与极光", quote: ["看不见下一步时，", "先做眼前正确的事。"], film: "冰雪奇缘 2" },
  grassland: { label: "草地", description: "风过草甸与暖阳", quote: ["谢谢这一路的冒险。", "现在，去开启新的旅程吧。"], film: "飞屋环游记" },
  rift: { label: "裂谷", description: "赤岩峡谷与暮光", quote: ["死亡不是终点，", "遗忘才是。"], film: "寻梦环游记" },
  ocean: { label: "海洋", description: "深蓝海水与白浪", quote: ["一直游，", "一直向前游。"], film: "海底总动员" },
} as const;
export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
export const THEME_STORAGE_KEY = "theme";
export const defaultTheme: ThemeName = "forest";
const previousThemes = { dusk: "grassland", sea: "ocean", film: "rift", night: "forest" } as const;
export function isTheme(value: string | null | undefined): value is ThemeName {
  return themeNames.some(name => name === value);
}
export function resolveTheme(value: string | null): ThemeName {
  const legacy = Object.prototype.hasOwnProperty.call(previousThemes, value ?? "") ? previousThemes[value as keyof typeof previousThemes] : undefined;
  return isTheme(value) ? value : legacy ?? defaultTheme;
}
// Static, allow-listed values only. Runs before the first body paint.
export const themeInitScript = `(function(){try{var key=${JSON.stringify(THEME_STORAGE_KEY)},t=localStorage.getItem(key),legacy=${JSON.stringify(previousThemes)};if(Object.prototype.hasOwnProperty.call(legacy,t)){t=legacy[t];localStorage.setItem(key,t)}if(${JSON.stringify(themeNames)}.includes(t))document.documentElement.dataset.theme=t}catch(e){}})()`;

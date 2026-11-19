import { themeNames, type ThemeName } from "@/lib/themes";
import type { ViewerAsset } from "./media";

const photography: Record<ThemeName, { alt: string; credit: { name: string; url: string } }> = {
  forest: { alt: "雾气漫过瑞士山坡上的常绿树林", credit: { name: "Chris Linnett", url: "https://unsplash.com/photos/BoezF2tPJbI" } },
  iceberg: { alt: "格陵兰海面上的蓝色拱形冰山与倒影", credit: { name: "Filippo Salvioni", url: "https://unsplash.com/photos/aiADDysGH7M" } },
  grassland: { alt: "夕阳照亮翁布里亚层叠的草坡", credit: { name: "Ollie Singleton", url: "https://unsplash.com/photos/thtjda3CDRY" } },
  rift: { alt: "航拍犹他州峡谷的赭红岩壁和蜿蜒河床", credit: { name: "Nick Da Fonseca", url: "https://unsplash.com/photos/vosVDyzZJC0" } },
  ocean: { alt: "深色海面上卷过暗礁的白色浪花", credit: { name: "Iain", url: "https://unsplash.com/photos/naVr1Z6xM3E" } },
};

export const sceneImages: ViewerAsset[] = themeNames.map(id => {
  const url = `/visuals/scene-${id}.webp`;
  return { id, ...photography[id], mime: "image/webp", url, fullUrl: url, thumbnailUrl: `/visuals/scene-${id}-preview.webp` };
});

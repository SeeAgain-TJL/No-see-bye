import { themeNames, type ThemeName } from "@/lib/themes";
import type { ViewerAsset } from "./media";

const shots: Record<ThemeName, [string, string, string]> = {
  forest: [
    "晨雾穿过成片的树梢，远处的山脊逐渐显现",
    "Mixkit",
    "https://mixkit.co/free-stock-video/slow-aerial-tour-through-a-mist-covered-forest-28342/",
  ],
  iceberg: [
    "格陵兰浮冰间，一座冰山的蓝色拱洞映在海面",
    "NASA’s Goddard Space Flight Center",
    "https://svs.gsfc.nasa.gov/11987/",
  ],
  grassland: [
    "日光透过草甸边缘的枝叶，树影铺展在草地上",
    "Mixkit",
    "https://mixkit.co/free-stock-video/meadow-surrounded-by-trees-on-a-sunny-afternoon-40647/",
  ],
  rift: [
    "水从红褐色峡壁间分两级跌落，山岩上长着青苔与灌木",
    "Mixkit",
    "https://mixkit.co/free-stock-video/majestic-waterfall-cascading-over-rocky-cliffs-100194/",
  ],
  ocean: [
    "俯瞰青绿色海湾，白浪漫过浅色岩岸，又从礁石间退去",
    "Mixkit",
    "https://mixkit.co/free-stock-video/sea-waves-in-a-little-bay-1954/",
  ],
};

export const sceneImages: ViewerAsset[] = themeNames.map((id) => {
  const [alt, name, source] = shots[id];
  const base = `/visuals/films/${id}`;
  return {
    id,
    alt,
    credit: { name, url: source },
    mime: "image/webp",
    url: `${base}.webp`,
    fullUrl: `${base}-full.webp`,
    thumbnailUrl: `${base}-preview.webp`,
  };
});

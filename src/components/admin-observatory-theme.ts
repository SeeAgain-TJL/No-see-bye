import type { ThemeName } from "@/lib/themes";

// Field notes belong to the specimen, never to the site's activity data.
export const adminThemeScenes = {
  forest: { id: "01", name: "听风之树", label: "WIND ATLAS", note: "枝梢顺着阵风低伏，树根仍留在原地。", ink: 0x75e8bc, gold: 0xf3cb88 },
  iceberg: { id: "02", name: "极光冰峡", label: "POLAR LIGHT", note: "光幕沿冰脊展开，浮冰在水线上起伏。", ink: 0x85dfff, gold: 0xbea1ff },
  grassland: { id: "03", name: "草甸蝶谱", label: "WING STUDY", note: "前后翅交错振动，金色翅脉随光显现。", ink: 0xa7eed0, gold: 0xffbf69 },
  rift: { id: "04", name: "峡谷翼航", label: "THERMAL FLIGHT", note: "猛禽借热气流盘翔，主翼下压时翼尖滞后。", ink: 0xffb884, gold: 0xf89aaa },
  ocean: { id: "05", name: "深海脉动", label: "PELAGIC PULSE", note: "水母收缩伞体推进，细触须随后舒展。", ink: 0x7cebf3, gold: 0xffb59f },
} satisfies Record<ThemeName, { id: string; name: string; label: string; note: string; ink: number; gold: number }>;

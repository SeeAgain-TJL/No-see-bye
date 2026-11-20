import type { ThemeName } from "@/lib/themes";

export type Ambient = "bubbles" | "snow" | "fireflies" | "pollen" | "embers";
export interface Look {
  /** Backdrop colours, darkest to brightest. */
  deep: number;
  mid: number;
  glow: number;
  /** Interface and floor colour, plus the warm accent used for presence lights. */
  primary: number;
  accent: number;
  ambient: Ambient;
  /** Name shown with the stage, kept separate from the site's own data. */
  title: string;
  caption: string;
}

export const looks: Record<ThemeName, Look> = {
  forest: {
    deep: 0x020b08,
    mid: 0x0b2a1c,
    glow: 0x1f8a55,
    primary: 0x9df0b8,
    accent: 0xf3d27a,
    ambient: "fireflies",
    title: "林间观测",
    caption: "FOREST OBSERVATORY",
  },
  iceberg: {
    deep: 0x030a14,
    mid: 0x0b2540,
    glow: 0x2f86b8,
    primary: 0xa8e4ff,
    accent: 0xe9d5ff,
    ambient: "snow",
    title: "极地观测",
    caption: "POLAR OBSERVATORY",
  },
  grassland: {
    deep: 0x060d05,
    mid: 0x172e10,
    glow: 0x75a82c,
    primary: 0xd8f59a,
    accent: 0xffd27a,
    ambient: "pollen",
    title: "草原观测",
    caption: "MEADOW OBSERVATORY",
  },
  rift: {
    deep: 0x0d0605,
    mid: 0x2e130b,
    glow: 0xc2581f,
    primary: 0xffb38a,
    accent: 0xffe2a8,
    ambient: "embers",
    title: "裂谷观测",
    caption: "RIFT OBSERVATORY",
  },
  ocean: {
    deep: 0x010912,
    mid: 0x042a40,
    glow: 0x159ab5,
    primary: 0x7cebf3,
    accent: 0xffb59f,
    ambient: "bubbles",
    title: "深海观测",
    caption: "PELAGIC OBSERVATORY",
  },
};

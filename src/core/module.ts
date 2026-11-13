import type { ReactNode } from "react";

/** 搜索命中项，由各模块的 searchProvider 返回 */
export interface SearchHit {
  id: string;
  title: string;
  snippet?: string;
  href: string;
  happenedAt?: string;
}

/** 门户首页卡片的数据，由各模块的 widget 提供 */
export interface WidgetContext {
  userId: string;
}

/** 每个功能模块向门户注册的清单 */
export interface ModuleManifest {
  /** 唯一 ID，同时用作路由前缀的默认值 */
  id: string;
  /** 导航和卡片上显示的名称 */
  name: string;
  /** 图标名称，由门户的图标集解析 */
  icon: string;
  /** 模块入口路由，如 /memories */
  route: string;
  /** 门户首页卡片，可选 */
  widget?: (ctx: WidgetContext) => Promise<ReactNode> | ReactNode;
  /** 全局搜索，可选 */
  searchProvider?: (query: string, ctx: WidgetContext) => Promise<SearchHit[]>;
}

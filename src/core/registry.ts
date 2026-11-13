import type { ModuleManifest } from "@/core/module";
import { memoriesModule } from "@/modules/memories/manifest";

/** 门户已注册的模块。新增模块时在这里加一行。 */
export const modules: ModuleManifest[] = [memoriesModule];

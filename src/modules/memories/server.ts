import { z } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "@/core/http";
export const memorySchema = z
  .object({
    title: z.string().trim().max(100, "标题最多 100 字").default(""),
    content: z.string().trim().max(20000, "正文最多 20000 字").default(""),
    happenedAt: z
      .string()
      .datetime({ offset: true })
      .refine(
        (v) =>
          new Date(v).getFullYear() >= 1900 &&
          new Date(v).getFullYear() <= 2100,
        "请选择有效日期",
      ),
    location: z.string().trim().max(80).default(""),
    mood: z.enum(["", "开心", "平静", "感动", "疲惫", "想念"]).default(""),
    tags: z.array(z.string().trim().min(1).max(20)).max(8).default([]),
    visibility: z.enum(["private", "public"]).default("private"),
    assetIds: z.array(z.string().min(1).max(80)).max(12).default([]),
  })
  .refine(
    (v) => v.title || v.content || v.assetIds.length,
    "写点文字，或者放一张照片吧",
  );
export const includeMemory = {
  user: { select: { username: true } },
  attachments: {
    orderBy: { position: "asc" as const },
    include: { asset: true },
  },
} satisfies Prisma.EntryInclude;
type FullEntry = Prisma.EntryGetPayload<{ include: typeof includeMemory }>;
export const assetDTO = (a: {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
}) => ({
  id: a.id,
  filename: a.filename,
  mime: a.mime,
  sizeBytes: a.sizeBytes,
  url: `/api/assets/${a.id}`,
});
export function memoryDTO(entry: FullEntry) {
  const { attachments, media, tags, ...rest } = entry;
  let tagArray: string[] = [];
  try {
    tagArray = JSON.parse(tags);
  } catch {
    /* Preserve malformed legacy data without exposing it. */
  }
  return {
    ...rest,
    tags: tagArray,
    assets: attachments.map((x) => assetDTO(x.asset)),
    hasLegacyMedia: media !== "[]" && !!media,
  };
}
export async function validateAssets(
  tx: Prisma.TransactionClient,
  assetIds: string[],
  userId: string,
  entryId?: string,
) {
  if (new Set(assetIds).size !== assetIds.length)
    throw new HttpError(400, "附件不能重复");
  const count = await tx.asset.count({
    where: {
      id: { in: assetIds },
      ownerId: userId,
      status: "ready",
      OR: [
        { attachment: null },
        ...(entryId ? [{ attachment: { entryId } }] : []),
      ],
    },
  });
  if (count !== assetIds.length)
    throw new HttpError(400, "部分附件不可用，请移除后重新上传");
}
export function quotaBytes() {
  const n = Number(process.env.USER_QUOTA_MB || 2048);
  return (Number.isFinite(n) && n > 0 ? n : 2048) * 1024 * 1024;
}

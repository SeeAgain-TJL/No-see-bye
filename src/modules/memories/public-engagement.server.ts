import type { Prisma } from "@prisma/client";
import { HttpError } from "@/core/http";
import type { PublicEngagement } from "./types";

export const publicEntry = { visibility: "public", deletedAt: null } as const;

export function engagementSelect(userId?: string) {
  return {
    _count: { select: { comments: true, reactions: { where: { kind: "like" } } } },
    reactions: { where: userId ? { userId } : { userId: { in: [] } }, select: { kind: true } },
  } satisfies Prisma.EntrySelect;
}

export function engagementDTO(entry: {
  _count: { reactions: number; comments: number };
  reactions: { kind: string }[];
}): PublicEngagement {
  return {
    likes: entry._count.reactions,
    comments: entry._count.comments,
    liked: entry.reactions.some(r => r.kind === "like"),
    saved: entry.reactions.some(r => r.kind === "save"),
  };
}

export async function requirePublicEntry(tx: Prisma.TransactionClient, id: string) {
  if (!await tx.entry.findUnique({ where: { id, ...publicEntry }, select: { id: true } }))
    throw new HttpError(404, "这段记忆不存在，或尚未公开");
}

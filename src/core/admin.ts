import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { HttpError } from "@/core/http";

export const adminNoStore = { "Cache-Control": "private, no-store" };
export async function requireAdmin(req: NextRequest) {
  const session = await getUserFromRequest(req);
  // Roles are read from the database for every request, never trusted from a JWT or browser field.
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (user?.role !== "admin") throw new HttpError(403, "此页面仅站点管理员可访问");
  return session;
}

export async function adminOverview() {
  const week = new Date(Date.now() - 7 * 86400_000);
  const [users, activeUsers7d, entries, publicEntries, privateEntries, trashedEntries, assets, storage, photos, videos, userDays, entryDays] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { lastSeenAt: { gte: week } } }),
    prisma.entry.count({ where: { deletedAt: null } }),
    prisma.entry.count({ where: { deletedAt: null, visibility: "public" } }),
    prisma.entry.count({ where: { deletedAt: null, visibility: "private" } }),
    prisma.entry.count({ where: { deletedAt: { not: null } } }),
    prisma.asset.count(), prisma.asset.aggregate({ _sum: { sizeBytes: true } }),
    prisma.asset.count({ where: { mime: { startsWith: "image/" } } }),
    prisma.asset.count({ where: { mime: { startsWith: "video/" } } }),
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`SELECT date(CASE WHEN typeof("createdAt") IN ('integer','real') THEN datetime("createdAt"/1000,'unixepoch') ELSE "createdAt" END,'+8 hours') AS date, COUNT(*) AS count FROM User GROUP BY date HAVING date >= date('now','+8 hours','-29 days')`,
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`SELECT date(CASE WHEN typeof("createdAt") IN ('integer','real') THEN datetime("createdAt"/1000,'unixepoch') ELSE "createdAt" END,'+8 hours') AS date, COUNT(*) AS count FROM Entry GROUP BY date HAVING date >= date('now','+8 hours','-29 days')`,
  ]);
  const userMap = new Map(userDays.map(row => [row.date, Number(row.count)]));
  const entryMap = new Map(entryDays.map(row => [row.date, Number(row.count)]));
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.now() + 8 * 3600_000 - (29 - index) * 86400_000).toISOString().slice(0, 10);
    return { date, users: userMap.get(date) || 0, entries: entryMap.get(date) || 0 };
  });
  return { summary: { users, activeUsers7d, entries, publicEntries, privateEntries, trashedEntries, assets, storageBytes: storage._sum.sizeBytes || 0, photos, videos },
    registration: { enabled: process.env.ALLOW_REGISTRATION !== "false" }, daily };
}

export async function adminUsers(q: string, page: number, pageSize: number) {
  const where = q ? { OR: [{ username: { contains: q } }, { displayName: { contains: q } }, { email: { contains: q } }] } : {};
  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const users = await prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (current - 1) * pageSize, take: pageSize,
    select: { id: true, username: true, displayName: true, email: true, role: true, createdAt: true, lastLoginAt: true, lastSeenAt: true, loginCount: true, hasLocalPassword: true,
      oauthAccounts: { select: { provider: true } } } });
  const ids = users.map(user => user.id);
  const [entries, assets] = await Promise.all([
    prisma.entry.groupBy({ by: ["userId", "visibility", "deletedAt"], where: { userId: { in: ids } }, _count: true }),
    prisma.asset.groupBy({ by: ["ownerId", "mime"], where: { ownerId: { in: ids } }, _count: true, _sum: { sizeBytes: true } }),
  ]);
  const items = users.map(user => {
    const records = entries.filter(row => row.userId === user.id), media = assets.filter(row => row.ownerId === user.id);
    const sumEntries = (kind: "public" | "private" | "trash" | "all") => records.reduce((n, row) => n + ((kind === "trash" ? row.deletedAt !== null : row.deletedAt === null && (kind === "all" || row.visibility === kind)) ? row._count : 0), 0);
    return { id: user.id, username: user.username, displayName: user.displayName,
      email: /@(oauth|accounts)\.local$/.test(user.email) ? null : user.email,
      role: user.role === "admin" ? "admin" : "user", createdAt: user.createdAt, lastLoginAt: user.lastLoginAt, lastSeenAt: user.lastSeenAt, loginCount: user.loginCount,
      entries: sumEntries("all"), publicEntries: sumEntries("public"), privateEntries: sumEntries("private"), trashedEntries: sumEntries("trash"),
      assets: media.reduce((n, row) => n + row._count, 0), storageBytes: media.reduce((n, row) => n + (row._sum.sizeBytes || 0), 0),
      photos: media.reduce((n, row) => n + (row.mime.startsWith("image/") ? row._count : 0), 0), videos: media.reduce((n, row) => n + (row.mime.startsWith("video/") ? row._count : 0), 0),
      loginMethods: [...(user.hasLocalPassword ? ["password"] : []), ...user.oauthAccounts.map(account => account.provider)] };
  });
  return { items, page: current, pageSize, total, totalPages };
}

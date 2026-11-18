import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { HttpError } from "@/core/http";

export const adminNoStore = { "Cache-Control": "private, no-store" };
const dayMs = 86_400_000;
const beijingOffset = 8 * 3_600_000;
const activityPageSize = 8;

function activityDates(now: number) {
  return Array.from({ length: 30 }, (_, index) =>
    new Date(now + beijingOffset - (29 - index) * dayMs).toISOString().slice(0, 10),
  );
}

// SQLite stores older timestamps as UTC text and newer timestamps as epoch milliseconds.
const activityUtc = Prisma.sql`CASE WHEN typeof(source."createdAt") IN ('integer','real')
  THEN strftime('%Y-%m-%dT%H:%M:%fZ', source."createdAt" / 1000.0, 'unixepoch')
  ELSE strftime('%Y-%m-%dT%H:%M:%fZ', source."createdAt") END`;
const activityDate = Prisma.sql`date(${activityUtc}, '+8 hours')`;

function pageBounds(total: number, requested: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(requested, totalPages);
  return { page, totalPages, offset: (page - 1) * size };
}

export async function requireAdmin(req: NextRequest) {
  const session = await getUserFromRequest(req);
  // Roles are read from the database for every request, never trusted from a JWT or browser field.
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (user?.role !== "admin") throw new HttpError(403, "此页面仅站点管理员可访问");
  return session;
}

export async function adminOverview() {
  const now = Date.now();
  const week = new Date(now - 7 * dayMs);
  const quarterHour = new Date(now - 15 * 60_000);
  const dates = activityDates(now);
  const start = dates[0];
  const end = dates[dates.length - 1];
  const [users, activeUsers7d, activeUsers15m, entries, publicEntries, privateEntries, trashedEntries, assets, storage, photos, videos, userDays, entryDays] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { lastSeenAt: { gte: week } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: quarterHour } } }),
    prisma.entry.count({ where: { deletedAt: null } }),
    prisma.entry.count({ where: { deletedAt: null, visibility: "public" } }),
    prisma.entry.count({ where: { deletedAt: null, visibility: "private" } }),
    prisma.entry.count({ where: { deletedAt: { not: null } } }),
    prisma.asset.count(), prisma.asset.aggregate({ _sum: { sizeBytes: true } }),
    prisma.asset.count({ where: { mime: { startsWith: "image/" } } }),
    prisma.asset.count({ where: { mime: { startsWith: "video/" } } }),
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`SELECT ${activityDate} AS date, COUNT(*) AS count FROM User AS source GROUP BY date HAVING date BETWEEN ${start} AND ${end}`,
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`SELECT ${activityDate} AS date, COUNT(*) AS count FROM Entry AS source GROUP BY date HAVING date BETWEEN ${start} AND ${end}`,
  ]);
  const userMap = new Map(userDays.map(row => [row.date, Number(row.count)]));
  const entryMap = new Map(entryDays.map(row => [row.date, Number(row.count)]));
  const daily = dates.map(date => ({ date, users: userMap.get(date) || 0, entries: entryMap.get(date) || 0 }));
  return { sampledAt: new Date(now).toISOString(), summary: { users, activeUsers7d, activeUsers15m, entries, publicEntries, privateEntries, trashedEntries, assets, storageBytes: storage._sum.sizeBytes || 0, photos, videos },
    registration: { enabled: process.env.ALLOW_REGISTRATION !== "false" }, daily };
}

type ActivityAccount = { id: string; username: string; displayName: string };

export async function adminDayActivity(date: string, registrationPage: number, contributorPage: number) {
  if (!activityDates(Date.now()).includes(date)) throw new HttpError(400, "请选择最近 30 天内的有效日期（北京时间）");

  return prisma.$transaction(async tx => {
    const [{ total: accountCount }] = await tx.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM User AS source WHERE ${activityDate} = ${date}
    `;
    const [{ entries: entryCount, contributors: contributorCount }] = await tx.$queryRaw<Array<{ entries: bigint; contributors: bigint }>>`
      SELECT COUNT(*) AS entries, COUNT(DISTINCT source.userId) AS contributors
      FROM Entry AS source WHERE ${activityDate} = ${date}
    `;
    const users = Number(accountCount);
    const entries = Number(entryCount);
    const contributors = Number(contributorCount);
    const registrationBounds = pageBounds(users, registrationPage, activityPageSize);
    const contributorBounds = pageBounds(contributors, contributorPage, activityPageSize);
    const registrations = await tx.$queryRaw<Array<ActivityAccount & { createdAt: string }>>`
      SELECT source.id, source.username, source.displayName, ${activityUtc} AS "createdAt"
      FROM User AS source WHERE ${activityDate} = ${date}
      ORDER BY "createdAt" DESC, source.id ASC
      LIMIT ${activityPageSize} OFFSET ${registrationBounds.offset}
    `;
    // Like the trend totals, creation counts include entries in the recycle bin until permanent removal.
    const authors = await tx.$queryRaw<Array<ActivityAccount & { entries: bigint }>>`
      SELECT author.id, author.username, author.displayName, COUNT(*) AS entries
      FROM Entry AS source JOIN User AS author ON author.id = source.userId
      WHERE ${activityDate} = ${date}
      GROUP BY author.id, author.username, author.displayName
      ORDER BY entries DESC, author.username ASC, author.id ASC
      LIMIT ${activityPageSize} OFFSET ${contributorBounds.offset}
    `;
    return {
      date, users, entries,
      registrations: { items: registrations, page: registrationBounds.page, totalPages: registrationBounds.totalPages, total: users },
      contributors: { items: authors.map(author => ({ ...author, entries: Number(author.entries) })), page: contributorBounds.page, totalPages: contributorBounds.totalPages, total: contributors },
    };
  });
}

export async function adminUsers(q: string, page: number, pageSize: number, userId?: string) {
  const where = userId ? { id: userId } : q ? { OR: [{ username: { contains: q } }, { displayName: { contains: q } }, { email: { contains: q } }] } : {};
  const total = await prisma.user.count({ where });
  const { totalPages, page: current, offset } = pageBounds(total, page, pageSize);
  const users = await prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: offset, take: pageSize,
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

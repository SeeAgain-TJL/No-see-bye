import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@/core/auth";
import { apiError, HttpError } from "@/core/http";
import { prisma } from "@/core/prisma";
import type { JournalIndex, JournalIndexMonth } from "@/lib/journal-index";

type MonthRow = { month: string; count: bigint; photos: bigint; videos: bigint; texts: bigint };

/** A scope-wide index deliberately remains independent of feed filters and pagination. */
export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") || "mine";
    if (scope !== "mine" && scope !== "public") throw new HttpError(400, "无效的浏览范围");
    const session = scope === "mine" ? await getUserFromRequest(req) : null;
    const visibility = scope === "public"
      ? Prisma.sql`e.visibility = 'public'`
      : Prisma.sql`e.userId = ${session!.userId}`;
    // SQLite stores Prisma dates as epoch milliseconds, while older imports can
    // contain ISO/SQLite text dates. Normalize both before applying Shanghai time.
    const rows = await prisma.$queryRaw<MonthRow[]>(Prisma.sql`
      WITH record_media AS (
        SELECT e.id,
          strftime('%Y-%m', CASE
            WHEN typeof(COALESCE(e.happenedAt,e.createdAt)) IN ('integer','real')
              THEN datetime(COALESCE(e.happenedAt,e.createdAt)/1000.0,'unixepoch')
            ELSE COALESCE(e.happenedAt,e.createdAt)
          END,'+8 hours') AS month,
          MAX(CASE WHEN a.mime LIKE 'image/%' THEN 1 ELSE 0 END) AS has_photo,
          MAX(CASE WHEN a.mime LIKE 'video/%' THEN 1 ELSE 0 END) AS has_video,
          COUNT(ea.assetId) AS attachments
        FROM Entry e
        LEFT JOIN EntryAsset ea ON ea.entryId=e.id
        LEFT JOIN Asset a ON a.id=ea.assetId
        WHERE e.deletedAt IS NULL AND ${visibility}
        GROUP BY e.id
      )
      SELECT month,COUNT(*) AS count,SUM(has_photo) AS photos,SUM(has_video) AS videos,
        SUM(CASE WHEN attachments=0 THEN 1 ELSE 0 END) AS texts
      FROM record_media
      WHERE month IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
    `);
    const months: JournalIndexMonth[] = rows.map(row => ({
      month: row.month, count: Number(row.count), photos: Number(row.photos), videos: Number(row.videos), texts: Number(row.texts),
    }));
    const data: JournalIndex = {
      scope, timeZone: "Asia/Shanghai", months,
      availableYears: [...new Set(months.map(month => Number(month.month.slice(0, 4))))],
      total: months.reduce((sum, month) => sum + month.count, 0),
      photos: months.reduce((sum, month) => sum + month.photos, 0),
      videos: months.reduce((sum, month) => sum + month.videos, 0),
      texts: months.reduce((sum, month) => sum + month.texts, 0),
    };
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = apiError(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

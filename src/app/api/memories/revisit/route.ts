import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { apiError, HttpError } from "@/core/http";
import { dayRange, journalDate } from "@/lib/calendar";
import { includeMemory, memoryDTO } from "@/modules/memories/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const base = { userId: user.userId, deletedAt: null };
    const headers = { "Cache-Control": "private, no-store" };
    if (req.nextUrl.searchParams.get("mode") === "random") {
      const exclude = req.nextUrl.searchParams.get("exclude");
      const item = await prisma.$transaction(async tx => {
        const candidate = { ...base, ...(exclude ? { id: { not: exclude } } : {}) };
        const count = await tx.entry.count({ where: candidate });
        const where = count ? candidate : base;
        const total = count || await tx.entry.count({ where: base });
        return total ? tx.entry.findFirst({ where, skip: randomInt(total), orderBy: { id: "asc" }, include: includeMemory }) : null;
      });
      return NextResponse.json({ item: item ? memoryDTO(item) : null }, { headers });
    }
    const today = journalDate();
    const month = req.nextUrl.searchParams.get("month") || today.slice(0, 7);
    const start = dayRange(month + "-01");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !start) throw new HttpError(400, "请选择有效月份");
    const [year, number] = month.split("-").map(Number);
    const end = new Date(Date.UTC(year, number, 1) - 8 * 3600000);
    const earliest = await prisma.entry.aggregate({ where: base, _min: { happenedAt: true } });
    const anniversaryDates = [];
    const currentYear = Number(today.slice(0, 4));
    const firstYear = earliest._min.happenedAt ? Math.max(1900, Number(journalDate(earliest._min.happenedAt).slice(0, 4))) : currentYear;
    for (let y = firstYear; y < currentYear; y++) {
      const range = dayRange(y + today.slice(4));
      if (range) anniversaryDates.push({ happenedAt: range });
    }
    const [dates, anniversaries] = await Promise.all([
      prisma.entry.findMany({ where: { ...base, happenedAt: { gte: start.gte, lt: end } }, select: { happenedAt: true } }),
      anniversaryDates.length ? prisma.entry.findMany({ where: { ...base, OR: anniversaryDates }, include: includeMemory, orderBy: [{ happenedAt: "desc" }, { id: "desc" }], take: 6 }) : [],
    ]);
    const days: Record<string, number> = {};
    for (const entry of dates) { const key = journalDate(entry.happenedAt); days[key] = (days[key] || 0) + 1; }
    return NextResponse.json({ today, month, days, anniversaries: anniversaries.map(memoryDTO), firstDate: earliest._min.happenedAt ? journalDate(earliest._min.happenedAt) : null }, { headers });
  } catch (error) { return apiError(error); }
}

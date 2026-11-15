import type { Prisma } from "@prisma/client";
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
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode && mode !== "random" && mode !== "story") throw new HttpError(400, "请选择有效的回忆方式");
    if (mode === "random") {
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
    const requestedYear = req.nextUrl.searchParams.get("year");
    if (requestedYear !== null && mode !== "story") {
      if (!/^\d{4}$/.test(requestedYear) || +requestedYear < 1900 || +requestedYear > 2100) throw new HttpError(400, "请选择有效年份");
      const entries = await prisma.entry.findMany({ where: base, select: { happenedAt: true, mood: true }, orderBy: [{ happenedAt: "desc" }, { id: "desc" }] });
      const days: Record<string, { count: number; mood: string }> = {};
      const votes = new Map<string, Map<string, number>>();
      const allDays = new Set<string>();
      const monthMoods = new Map<string, number>();
      let total = 0;
      for (const entry of entries) {
        const day = journalDate(entry.happenedAt);
        allDays.add(day);
        if (entry.mood && day.startsWith(today.slice(0, 7))) monthMoods.set(entry.mood, (monthMoods.get(entry.mood) || 0) + 1);
        if (!day.startsWith(requestedYear + "-")) continue;
        total++;
        days[day] ||= { count: 0, mood: "" };
        days[day].count++;
        if (entry.mood) {
          if (!votes.has(day)) votes.set(day, new Map());
          const moods = votes.get(day)!;
          moods.set(entry.mood, (moods.get(entry.mood) || 0) + 1);
        }
      }
      const dominant = (moods: Map<string, number>) => [...moods].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      for (const [day, moods] of votes) days[day].mood = dominant(moods);
      const previousDay = (day: string) => journalDate(new Date(new Date(day + "T12:00:00+08:00").getTime() - 86400000));
      let cursor = allDays.has(today) ? today : previousDay(today);
      const streakThrough = allDays.has(cursor) ? cursor : null;
      let currentStreak = 0;
      while (allDays.has(cursor)) { currentStreak++; cursor = previousDay(cursor); }
      const firstDate = entries.at(-1)?.happenedAt;
      return NextResponse.json({ today, year: +requestedYear, firstYear: firstDate ? Math.min(+journalDate(firstDate).slice(0, 4), +today.slice(0, 4)) : +today.slice(0, 4), days, total, recordedDays: Object.keys(days).length, currentStreak, streakThrough, month: today.slice(0, 7), monthMood: dominant(monthMoods) }, { headers });
    }
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
    if (mode === "story") {
      const scope = req.nextUrl.searchParams.get("scope") || "recent";
      if (!["recent", "month", "anniversary", "random"].includes(scope)) throw new HttpError(400, "请选择有效的播放范围");
      const filters: Prisma.EntryWhereInput = { ...base };
      let ids: string[] | null = null;
      if (scope === "month") {
        const [y, m] = today.slice(0, 7).split("-").map(Number);
        filters.happenedAt = { gte: dayRange(today.slice(0, 7) + "-01")!.gte, lt: new Date(Date.UTC(y, m, 1) - 8 * 3600000) };
      } else if (scope === "anniversary") {
        if (!anniversaryDates.length) return NextResponse.json({ scope, items: [], limit: 30 }, { headers });
        filters.OR = anniversaryDates;
      } else if (scope === "random") {
        // Sample across the owner's entire archive; only IDs enter the random query.
        const sample = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM Entry WHERE userId = ${user.userId} AND deletedAt IS NULL ORDER BY RANDOM() LIMIT 30`;
        ids = sample.map(row => row.id);
        filters.id = { in: ids };
      }
      const items = await prisma.entry.findMany({ where: filters, include: includeMemory, orderBy: [{ happenedAt: "desc" }, { id: "desc" }], take: 30 });
      if (ids) items.sort((a, b) => ids!.indexOf(a.id) - ids!.indexOf(b.id));
      return NextResponse.json({ scope, items: items.map(memoryDTO), limit: 30 }, { headers });
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

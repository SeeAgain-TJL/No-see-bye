/** Journal dates consistently use Asia/Shanghai, including on other devices. */
export function journalDate(value: Date = new Date()) {
  return new Date(value.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export function dayRange(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(day + "T00:00:00+08:00");
  if (!Number.isFinite(start.getTime()) || journalDate(start) !== day || +day.slice(0, 4) < 1900 || +day.slice(0, 4) > 2100) return null;
  return { gte: start, lt: new Date(start.getTime() + 86400000) };
}

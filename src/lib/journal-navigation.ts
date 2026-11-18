export type JournalSelection = { month?: string; type?: "photo" | "video" | "text"; view?: "grid" };

/** A browse shortcut starts a fresh selection, preserving scope and presentation. */
export function journalNavigationQuery(current: string, selection: JournalSelection) {
  const next = new URLSearchParams(current);
  for (const key of ["cursor", "q", "day", "month", "pinned", "type"]) next.delete(key);
  if (selection.month) next.set("month", selection.month);
  if (selection.type) next.set("type", selection.type);
  // Text records have no representation in the photo wall.
  if (selection.view === "grid" || (selection.type === "text" && next.get("view") === "gallery")) next.delete("view");
  return next.toString();
}

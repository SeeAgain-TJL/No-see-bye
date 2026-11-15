import { headers } from "next/headers";
import { redirect } from "next/navigation";

type Query = Record<string, string | string[] | undefined>;
export type SiteEntryProps = { searchParams: Promise<Query> };

// Resolve the public address at request time, not when the Linux release is built.
// Only navigate before rendering the form; never forward a submitted password.
export async function normalizeSiteEntry(pathname: "/login" | "/register", query: Promise<Query>) {
  const configured = process.env.APP_ORIGIN;
  if (!configured) return;
  let site: URL;
  try { site = new URL(configured); } catch { return; }
  if (!["http:", "https:"].includes(site.protocol)) return;
  const incoming = await headers();
  const protocol = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (incoming.get("host")?.toLowerCase() === site.host &&
      (site.protocol !== "https:" || protocol === "https")) return;
  site.pathname = pathname;
  for (const [key, values] of Object.entries(await query)) {
    for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) site.searchParams.append(key, value);
  }
  redirect(site.toString());
}

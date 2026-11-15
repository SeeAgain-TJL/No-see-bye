import { AuthForm } from "@/components/auth-form";
import { normalizeSiteEntry, type SiteEntryProps } from "@/core/site-entry";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: SiteEntryProps) {
  await normalizeSiteEntry("/login", searchParams);
  return <AuthForm />;
}

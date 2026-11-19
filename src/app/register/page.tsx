import { AuthForm } from "@/components/auth-form";
import { configuredProviders } from "@/core/oauth";
import { normalizeSiteEntry, type SiteEntryProps } from "@/core/site-entry";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: SiteEntryProps) {
  await normalizeSiteEntry("/register", searchParams);
  return <AuthForm socialProviders={configuredProviders()} />;
}

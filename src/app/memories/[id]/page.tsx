import { MemoryDetail } from "@/modules/memories/detail";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scope?: string | string[] }>;
}) {
  const { id } = await params;
  const publicScope = (await searchParams).scope === "public";
  return <MemoryDetail key={`${id}:${publicScope}`} id={id} publicScope={publicScope} />;
}

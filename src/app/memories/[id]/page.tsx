import { MemoryDetail } from "@/modules/memories/detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemoryDetail key={id} id={id} />;
}

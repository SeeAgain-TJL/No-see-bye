export async function POST() {
  return Response.json(
    { error: "旧上传接口已停用，请使用 /api/assets" },
    { status: 410 },
  );
}

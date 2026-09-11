import { getChatGPTUser } from "@/app/chatgpt-auth";
import { deleteResource, updateResource } from "@/db/resources";
import { parseResourceInput } from "@/lib/resource-input";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
  try {
    const { id } = await context.params;
    const resource = await updateResource(user.userId, id, parseResourceInput(await request.json()));
    if (!resource) return Response.json({ error: "记录不存在。" }, { status: 404 });
    return Response.json(resource);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_INPUT" || code === "INVALID_URL") return Response.json({ error: "请检查名称和网址。" }, { status: 400 });
    console.error("Failed to update resource", error);
    return Response.json({ error: "更新失败，请稍后重试。" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
  try {
    const { id } = await context.params;
    if (!(await deleteResource(user.userId, id))) return Response.json({ error: "记录不存在。" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete resource", error);
    return Response.json({ error: "删除失败，请稍后重试。" }, { status: 503 });
  }
}

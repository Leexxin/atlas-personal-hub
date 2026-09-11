import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createResource, listResources } from "@/db/resources";
import { parseResourceInput } from "@/lib/resource-input";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
  try {
    return Response.json(await listResources(user.userId));
  } catch (error) {
    console.error("Failed to load resources", error);
    return Response.json({ error: "暂时无法读取数据，请稍后重试。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
  try {
    return Response.json(await createResource(user.userId, parseResourceInput(await request.json())), { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_INPUT" || code === "INVALID_URL") {
      return Response.json({ error: code === "INVALID_URL" ? "请输入完整有效的网址。" : "请填写名称和网址。" }, { status: 400 });
    }
    console.error("Failed to create resource", error);
    return Response.json({ error: "保存失败，请稍后重试。" }, { status: 503 });
  }
}

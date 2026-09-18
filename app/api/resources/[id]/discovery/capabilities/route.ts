import { getChatGPTUser } from "@/app/chatgpt-auth";
import { proxySmaDiscovery } from "@/lib/sma-discovery";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: { code: "unauthorized", message: "请先登录。" } }, { status: 401 });
  const { id } = await context.params;
  return proxySmaDiscovery(user.userId, id, "/v1/discovery/capabilities", "GET");
}

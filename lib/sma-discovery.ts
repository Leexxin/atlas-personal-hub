import { getServerAgentUrl } from "@/db/resources";

const MAX_RESPONSE_BYTES = 2_000_000;

export async function proxySmaDiscovery(
  userId: string,
  resourceId: string,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  const config = await getServerAgentUrl(userId, resourceId);
  if (!config) return Response.json({ error: { code: "server_not_found", message: "服务器不存在。" } }, { status: 404 });
  if (!config.agent_url) return Response.json({ error: { code: "not_configured", message: "尚未配置 SMA Agent 地址。" } }, { status: 422 });

  let endpoint: URL;
  try {
    endpoint = new URL(`${config.agent_url}${path}`);
    if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("unsupported protocol");
  } catch {
    return Response.json({ error: { code: "invalid_url", message: "SMA Agent 地址无效。" } }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), method === "POST" ? 10_000 : 7_000);
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { Accept: "application/json", ...(method === "POST" ? { "Content-Type": "application/json; charset=utf-8" } : {}) },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("response too large");
    const payload = await response.json().catch(() => ({ error: { code: "invalid_response", message: `SMA Agent 返回 ${response.status}。` } }));
    return Response.json(payload, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        ...(response.headers.get("retry-after") ? { "Retry-After": response.headers.get("retry-after")! } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to proxy SMA discovery", error);
    return Response.json({ error: { code: "network_error", message: "无法连接 SMA Agent。" } }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

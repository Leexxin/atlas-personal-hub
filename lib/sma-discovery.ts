import { getServerAgentConnection, SmaCredentialConfigurationError } from "@/db/agent-credentials";
import { readLimitedJson, smaHeaders } from "@/lib/sma-http";

const MAX_RESPONSE_BYTES = 2_000_000;

export async function proxySmaDiscovery(
  userId: string,
  resourceId: string,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  let config;
  try {
    config = await getServerAgentConnection(userId, resourceId);
  } catch (error) {
    if (error instanceof SmaCredentialConfigurationError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: 503 });
    }
    throw error;
  }
  if (!config) return Response.json({ error: { code: "server_not_found", message: "服务器不存在。" } }, { status: 404 });
  if (!config.agentUrl) return Response.json({ error: { code: "not_configured", message: "尚未配置 SMA Agent 地址。" } }, { status: 422 });

  let endpoint: URL;
  try {
    endpoint = new URL(`${config.agentUrl}${path}`);
    if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("unsupported protocol");
  } catch {
    return Response.json({ error: { code: "invalid_url", message: "SMA Agent 地址无效。" } }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), method === "POST" ? 10_000 : 7_000);
  try {
    const response = await fetch(endpoint, {
      method,
      headers: smaHeaders(config.token, method === "POST"),
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status === 401) return Response.json({ error: { code: "unauthorized", message: "SMA Agent 凭据未配置或无效。" } }, { status: 502 });
    const payload = await readLimitedJson(response, MAX_RESPONSE_BYTES).catch(() => ({ error: { code: "invalid_response", message: `SMA Agent 返回 ${response.status}。` } }));
    return Response.json(payload, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        ...(response.headers.get("retry-after") ? { "Retry-After": response.headers.get("retry-after")! } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to proxy SMA discovery", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: { code: "network_error", message: "无法连接 SMA Agent。" } }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

import type { ResourceKind, ResourceStatus } from "@/db/resources";

export function parseResourceInput(value: unknown) {
  const body = value as Record<string, unknown>;
  const kind = String(body?.kind ?? "tool") as ResourceKind;
  const status = String(body?.status ?? "unknown") as ResourceStatus;
  const name = String(body?.name ?? "").trim();
  const url = String(body?.url ?? "").trim();
  if (!name || !url || !["tool", "site", "server"].includes(kind) || !["online", "warning", "offline", "unknown"].includes(status)) {
    throw new Error("INVALID_INPUT");
  }
  try {
    new URL(url);
  } catch {
    throw new Error("INVALID_URL");
  }
  return {
    name: name.slice(0, 80),
    url,
    kind,
    status,
    description: String(body.description ?? "").trim().slice(0, 180),
    category: String(body.category ?? "其他").trim().slice(0, 40) || "其他",
    note: String(body.note ?? "").trim().slice(0, 240),
    pinned: Boolean(body.pinned),
    cpuUsage: Math.min(100, Math.max(0, Number(body.cpuUsage) || 0)),
    temperature: Math.min(150, Math.max(0, Number(body.temperature) || 0)),
    memoryUsage: Math.min(100, Math.max(0, Number(body.memoryUsage) || 0)),
    diskUsage: Math.min(100, Math.max(0, Number(body.diskUsage) || 0)),
    agentUrl: String(body.agentUrl ?? "").trim().replace(/\/$/, "").slice(0, 240),
  };
}

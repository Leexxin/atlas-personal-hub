import { getRawDb } from "./index";

export type ResourceKind = "tool" | "site" | "server";
export type ResourceStatus = "online" | "warning" | "offline" | "unknown";
export type Density = "comfortable" | "compact";
export type Accent = "cyan" | "violet" | "orange";

export type Resource = {
  id: string;
  kind: ResourceKind;
  name: string;
  url: string;
  description: string;
  category: string;
  status: ResourceStatus;
  note: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Preferences = {
  pageName: string;
  greeting: string;
  accent: Accent;
  density: Density;
};

type ResourceRow = Omit<Resource, "pinned" | "createdAt" | "updatedAt"> & {
  pinned: number;
  created_at: number;
  updated_at: number;
};

const starterResources = [
  ["tool", "ChatGPT", "https://chatgpt.com", "日常思考与创作助手", "AI 工具", "online", "", 1],
  ["tool", "GitHub", "https://github.com", "代码仓库与协作", "开发", "online", "", 1],
  ["site", "个人博客", "https://example.com", "内容发布站点", "内容", "online", "示例数据，可随时编辑", 0],
  ["site", "服务监控", "https://status.example.com", "对外服务状态页", "运维", "warning", "替换为你的真实地址", 0],
  ["server", "生产服务器", "https://server.example.com", "核心应用节点", "云服务器", "online", "4C / 8G · 上海", 1],
  ["server", "备份节点", "https://backup.example.com", "文件与数据库备份", "存储", "unknown", "每周检查一次", 0],
] as const;

function mapRow(row: ResourceRow): Resource {
  const { created_at, updated_at, ...resource } = row;
  return { ...resource, pinned: Boolean(row.pinned), createdAt: created_at, updatedAt: updated_at };
}

export async function listResources(userId: string): Promise<Resource[]> {
  const db = getRawDb();
  const count = await db.prepare("SELECT COUNT(*) AS total FROM resources WHERE user_id = ?").bind(userId).first<{ total: number }>();
  if (!count?.total) {
    const now = Date.now();
    await db.batch(
      starterResources.map((item, index) =>
        db.prepare(`INSERT INTO resources
          (id, user_id, kind, name, url, description, category, status, note, pinned, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), userId, ...item, now + index, now + index),
      ),
    );
  }
  const result = await db.prepare(`SELECT id, kind, name, url, description, category, status, note, pinned, created_at, updated_at
    FROM resources WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC`).bind(userId).all<ResourceRow>();
  return result.results.map(mapRow);
}

export async function createResource(userId: string, input: Omit<Resource, "id" | "createdAt" | "updatedAt">): Promise<Resource> {
  const db = getRawDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.prepare(`INSERT INTO resources
    (id, user_id, kind, name, url, description, category, status, note, pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, userId, input.kind, input.name, input.url, input.description, input.category, input.status, input.note, input.pinned ? 1 : 0, now, now).run();
  return { id, ...input, createdAt: now, updatedAt: now };
}

export async function updateResource(userId: string, id: string, input: Omit<Resource, "id" | "createdAt" | "updatedAt">): Promise<Resource | null> {
  const db = getRawDb();
  const existing = await db.prepare("SELECT created_at FROM resources WHERE id = ? AND user_id = ?").bind(id, userId).first<{ created_at: number }>();
  if (!existing) return null;
  const now = Date.now();
  await db.prepare(`UPDATE resources SET kind = ?, name = ?, url = ?, description = ?, category = ?,
    status = ?, note = ?, pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(input.kind, input.name, input.url, input.description, input.category, input.status, input.note, input.pinned ? 1 : 0, now, id, userId).run();
  return { id, ...input, createdAt: existing.created_at, updatedAt: now };
}

export async function deleteResource(userId: string, id: string) {
  const result = await getRawDb().prepare("DELETE FROM resources WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return result.meta.changes > 0;
}

export async function getPreferences(userId: string): Promise<Preferences> {
  const db = getRawDb();
  const row = await db.prepare("SELECT page_name, greeting, accent, density FROM user_preferences WHERE user_id = ?")
    .bind(userId).first<{ page_name: string; greeting: string; accent: Accent; density: Density }>();
  if (row) return { pageName: row.page_name, greeting: row.greeting, accent: row.accent, density: row.density };
  const defaults: Preferences = { pageName: "我的工具站", greeting: "今天想从哪里开始？", accent: "cyan", density: "comfortable" };
  await db.prepare("INSERT INTO user_preferences (user_id, page_name, greeting, accent, density, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(userId, defaults.pageName, defaults.greeting, defaults.accent, defaults.density, Date.now()).run();
  return defaults;
}

export async function savePreferences(userId: string, input: Preferences): Promise<Preferences> {
  await getRawDb().prepare(`INSERT INTO user_preferences (user_id, page_name, greeting, accent, density, updated_at)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET page_name = excluded.page_name,
    greeting = excluded.greeting, accent = excluded.accent, density = excluded.density, updated_at = excluded.updated_at`)
    .bind(userId, input.pageName, input.greeting, input.accent, input.density, Date.now()).run();
  return input;
}

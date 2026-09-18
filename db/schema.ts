import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  firstSeenAt: integer("first_seen_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [
  index("idx_users_email").on(table.email),
]);

export const resources = sqliteTable(
  "resources",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind", { enum: ["tool", "site", "server"] }).notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("其他"),
    status: text("status", { enum: ["online", "warning", "offline", "unknown"] }).notNull().default("unknown"),
    note: text("note").notNull().default(""),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    cpuUsage: integer("cpu_usage").notNull().default(0),
    temperature: integer("temperature").notNull().default(0),
    memoryUsage: integer("memory_usage").notNull().default(0),
    diskUsage: integer("disk_usage").notNull().default(0),
    agentUrl: text("agent_url").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_resources_user_kind").on(table.userId, table.kind),
    index("idx_resources_user_updated").on(table.userId, table.updatedAt),
  ],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  pageName: text("page_name").notNull().default("我的工具站"),
  greeting: text("greeting").notNull().default("今天想从哪里开始？"),
  accent: text("accent").notNull().default("cyan"),
  density: text("density", { enum: ["comfortable", "compact"] }).notNull().default("comfortable"),
  theme: text("theme", { enum: ["dark", "light"] }).notNull().default("dark"),
  sidebarCollapsed: integer("sidebar_collapsed", { mode: "boolean" }).notNull().default(false),
  navOrder: text("nav_order").notNull().default('["tool","site","server"]'),
  updatedAt: integer("updated_at").notNull(),
});

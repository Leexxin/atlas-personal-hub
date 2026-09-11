import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  updatedAt: integer("updated_at").notNull(),
});

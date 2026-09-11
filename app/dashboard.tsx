"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  CircleDot,
  Cloud,
  Command,
  Globe2,
  LayoutDashboard,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Server,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Accent, Density, Preferences, Resource, ResourceKind, ResourceStatus } from "@/db/resources";

type DashboardProps = {
  initialResources: Resource[];
  initialPreferences: Preferences;
  user: { displayName: string; email: string };
};

type ResourceDraft = Omit<Resource, "id" | "createdAt" | "updatedAt">;

const emptyDraft: ResourceDraft = {
  kind: "tool",
  name: "",
  url: "",
  description: "",
  category: "其他",
  status: "unknown",
  note: "",
  pinned: false,
};

const kindMeta: Record<ResourceKind, { label: string; icon: typeof Wrench }> = {
  tool: { label: "工具", icon: Wrench },
  site: { label: "站点", icon: Globe2 },
  server: { label: "服务器", icon: Server },
};

const statusMeta: Record<ResourceStatus, { label: string; className: string }> = {
  online: { label: "运行中", className: "status-online" },
  warning: { label: "需关注", className: "status-warning" },
  offline: { label: "已离线", className: "status-offline" },
  unknown: { label: "未检查", className: "status-unknown" },
};

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? "操作失败，请稍后重试。";
}

export default function Dashboard({ initialResources, initialPreferences, user }: DashboardProps) {
  const [resources, setResources] = useState(initialResources);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [filter, setFilter] = useState<"all" | ResourceKind>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ResourceDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(preferences);

  const counts = useMemo(() => ({
    tool: resources.filter((item) => item.kind === "tool").length,
    site: resources.filter((item) => item.kind === "site").length,
    server: resources.filter((item) => item.kind === "server").length,
    healthy: resources.filter((item) => item.status === "online").length,
  }), [resources]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources.filter((item) => {
      const inTab = filter === "all" || item.kind === filter;
      const inSearch = !needle || [item.name, item.description, item.category, item.url, item.note].join(" ").toLowerCase().includes(needle);
      return inTab && inSearch;
    });
  }, [resources, filter, query]);

  function startAdd(kind: ResourceKind = "tool") {
    setEditingId(null);
    setDraft({ ...emptyDraft, kind, status: kind === "tool" ? "online" : "unknown" });
    setResourceOpen(true);
  }

  function startEdit(resource: Resource) {
    setEditingId(resource.id);
    setDraft({
      kind: resource.kind,
      name: resource.name,
      url: resource.url,
      description: resource.description,
      category: resource.category,
      status: resource.status,
      note: resource.note,
      pinned: resource.pinned,
    });
    setResourceOpen(true);
  }

  async function persistResource(input: ResourceDraft, id?: string) {
    const response = await fetch(id ? `/api/resources/${id}` : "/api/resources", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(await readError(response));
    const saved = await response.json() as Resource;
    setResources((current) => id ? current.map((item) => item.id === id ? saved : item) : [saved, ...current]);
    return saved;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await persistResource(draft, editingId ?? undefined);
      setResourceOpen(false);
      toast.success(editingId ? "已更新记录" : "已添加到主页");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/resources/${editingId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      setResources((current) => current.filter((item) => item.id !== editingId));
      setDeleteOpen(false);
      setResourceOpen(false);
      toast.success("记录已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSettingsSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsDraft),
      });
      if (!response.ok) throw new Error(await readError(response));
      const saved = await response.json() as Preferences;
      setPreferences(saved);
      setSettingsOpen(false);
      toast.success("主页外观已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置保存失败。");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: {
      registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
    } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const report = (error: unknown) => console.warn("WebMCP registration failed", error);
    try {
      void Promise.resolve(modelContext.registerTool({
        name: "list_resources",
        title: "读取个人导航记录",
        description: "读取当前用户主页中的工具、站点和服务器记录。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => ({ resources }),
      }, { signal: lifecycle.signal })).catch(report);
      void Promise.resolve(modelContext.registerTool({
        name: "create_resource",
        title: "添加导航记录",
        description: "向当前用户主页添加一个工具、站点或服务器。",
        inputSchema: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["tool", "site", "server"] },
            name: { type: "string" },
            url: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
          },
          required: ["kind", "name", "url"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (value: unknown) => {
          const input = value as Partial<ResourceDraft>;
          if (!input.name || !input.url || !input.kind || !["tool", "site", "server"].includes(input.kind)) throw new Error("名称、网址和类型不能为空。");
          const saved = await persistResource({ ...emptyDraft, ...input, kind: input.kind });
          return { id: saved.id, name: saved.name, kind: saved.kind };
        },
      }, { signal: lifecycle.signal })).catch(report);
    } catch (error) {
      report(error);
    }
    return () => lifecycle.abort();
  }, [resources]);

  const initials = user.displayName.trim().slice(0, 2).toUpperCase();

  return (
    <div className={`app-shell accent-${preferences.accent} density-${preferences.density}`}>
      <Toaster position="top-right" richColors />
      <aside className="sidebar">
        <div className="brand-mark"><span>A</span><div><strong>ATLAS</strong><small>PERSONAL HUB</small></div></div>
        <nav aria-label="主导航" className="side-nav">
          <button className="active"><LayoutDashboard />总览</button>
          <button onClick={() => setFilter("tool")}><Wrench />工具库<span>{counts.tool}</span></button>
          <button onClick={() => setFilter("site")}><Globe2 />站点<span>{counts.site}</span></button>
          <button onClick={() => setFilter("server")}><Server />服务器<span>{counts.server}</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <button className="settings-button" onClick={() => { setSettingsDraft(preferences); setSettingsOpen(true); }}><Settings2 />主页设置</button>
        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div><strong>{user.displayName}</strong><small>{user.email}</small></div>
          <MoreHorizontal />
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span>A</span><strong>ATLAS</strong></div>
          <div className="search-wrap"><Search /><Input aria-label="搜索工具、站点和服务器" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、分类、网址…" /><kbd>⌘ K</kbd></div>
          <Button onClick={() => startAdd()} className="primary-action"><Plus />添加记录</Button>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div><p className="eyebrow">个人工作台 · {new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date())}</p><h1>{preferences.greeting}</h1><p>你的常用入口都在这里，保持专注，快速出发。</p></div>
            <div className="health-chip"><span className="pulse-dot" /><strong>{counts.healthy}</strong><span>项服务运行正常</span></div>
          </section>

          <section className="overview-grid" aria-label="资源概览">
            <div className="overview-card featured"><div className="overview-icon"><Command /></div><span>已收录</span><strong>{resources.length}</strong><small>个常用入口</small><ChevronRight /></div>
            <div className="overview-card"><div className="overview-icon"><Wrench /></div><span>工具</span><strong>{counts.tool}</strong><small>效率与开发</small></div>
            <div className="overview-card"><div className="overview-icon"><Globe2 /></div><span>站点</span><strong>{counts.site}</strong><small>服务与内容</small></div>
            <div className="overview-card"><div className="overview-icon"><Cloud /></div><span>服务器</span><strong>{counts.server}</strong><small>节点与存储</small></div>
          </section>

          <section className="library-section">
            <div className="section-head">
              <div><h2>{preferences.pageName}</h2><p>管理并打开你最常用的入口</p></div>
              <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | ResourceKind)}>
                <TabsList className="filter-tabs">
                  <TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="tool">工具</TabsTrigger><TabsTrigger value="site">站点</TabsTrigger><TabsTrigger value="server">服务器</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {filtered.length ? (
              <div className="resource-grid">
                {filtered.map((resource) => {
                  const Icon = kindMeta[resource.kind].icon;
                  const status = statusMeta[resource.status];
                  return (
                    <article className="resource-card" key={resource.id}>
                      <button className="card-edit" aria-label={`编辑 ${resource.name}`} onClick={() => startEdit(resource)}><MoreHorizontal /></button>
                      <div className={`resource-icon kind-${resource.kind}`}><Icon /></div>
                      <div className="resource-copy">
                        <div className="resource-title"><h3>{resource.name}</h3>{resource.pinned && <Pin aria-label="已置顶" />}</div>
                        <p>{resource.description || "暂无说明"}</p>
                      </div>
                      <div className="resource-meta"><span>{resource.category}</span>{resource.kind !== "tool" && <span className={status.className}><CircleDot />{status.label}</span>}</div>
                      {resource.note && <p className="resource-note">{resource.note}</p>}
                      <a href={resource.url} target="_blank" rel="noreferrer" className="resource-link"><span>{hostname(resource.url)}</span><ArrowUpRight /></a>
                    </article>
                  );
                })}
                <button className="add-card" onClick={() => startAdd(filter === "all" ? "tool" : filter)}><span><Plus /></span><strong>添加新入口</strong><small>工具、站点或服务器</small></button>
              </div>
            ) : (
              <div className="empty-state"><div><Search /></div><h3>没有找到匹配项</h3><p>换个关键词，或直接添加一条新记录。</p><Button onClick={() => startAdd()}><Plus />添加记录</Button></div>
            )}
          </section>
        </div>
      </main>

      <Dialog open={resourceOpen} onOpenChange={setResourceOpen}>
        <DialogContent className="form-dialog">
          <DialogHeader><DialogTitle>{editingId ? "编辑记录" : "添加到主页"}</DialogTitle><DialogDescription>保存后会同步到你的个人空间，其他用户无法看到。</DialogDescription></DialogHeader>
          <div className="form-grid">
            <div className="field"><Label htmlFor="kind">类型</Label><Select value={draft.kind} onValueChange={(value) => setDraft({ ...draft, kind: value as ResourceKind })}><SelectTrigger id="kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tool">工具</SelectItem><SelectItem value="site">站点</SelectItem><SelectItem value="server">服务器</SelectItem></SelectContent></Select></div>
            <div className="field"><Label htmlFor="status">状态</Label><Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as ResourceStatus })}><SelectTrigger id="status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">运行中</SelectItem><SelectItem value="warning">需关注</SelectItem><SelectItem value="offline">已离线</SelectItem><SelectItem value="unknown">未检查</SelectItem></SelectContent></Select></div>
            <div className="field full"><Label htmlFor="name">名称</Label><Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例如：家庭服务器" /></div>
            <div className="field full"><Label htmlFor="url">网址</Label><Input id="url" type="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" /></div>
            <div className="field"><Label htmlFor="category">分类</Label><Input id="category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="开发 / 运维 / 设计" /></div>
            <div className="field"><Label htmlFor="description">一句说明</Label><Input id="description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="这个入口是做什么的" /></div>
            <div className="field full"><Label htmlFor="note">备注</Label><Textarea id="note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="机器配置、续费日或使用提醒…" /></div>
            <button type="button" className={`pin-toggle ${draft.pinned ? "active" : ""}`} onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}><Pin />{draft.pinned ? "已置顶到前排" : "置顶到前排"}{draft.pinned && <Check />}</button>
          </div>
          <DialogFooter className="dialog-actions">
            {editingId && <Button variant="ghost" className="delete-button" onClick={() => setDeleteOpen(true)}><Trash2 />删除</Button>}
            <div className="action-spacer" /><Button variant="ghost" onClick={() => setResourceOpen(false)}>取消</Button><Button disabled={saving || !draft.name || !draft.url} onClick={handleSave}>{saving ? "保存中…" : "保存记录"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除这条记录？</AlertDialogTitle><AlertDialogDescription>删除后无法恢复，但不会影响对应的网站或服务器本身。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={handleDelete}>确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="form-dialog settings-dialog"><DialogHeader><DialogTitle>自定义主页</DialogTitle><DialogDescription>这些设置只属于你的账号。</DialogDescription></DialogHeader>
          <div className="settings-form">
            <div className="field"><Label htmlFor="page-name">主页名称</Label><Input id="page-name" value={settingsDraft.pageName} onChange={(e) => setSettingsDraft({ ...settingsDraft, pageName: e.target.value })} /></div>
            <div className="field"><Label htmlFor="greeting">欢迎语</Label><Input id="greeting" value={settingsDraft.greeting} onChange={(e) => setSettingsDraft({ ...settingsDraft, greeting: e.target.value })} /></div>
            <div className="field"><Label>强调色</Label><div className="color-options">{(["cyan", "violet", "orange"] as Accent[]).map((accent) => <button key={accent} aria-label={`选择 ${accent} 强调色`} className={`${accent} ${settingsDraft.accent === accent ? "selected" : ""}`} onClick={() => setSettingsDraft({ ...settingsDraft, accent })}>{settingsDraft.accent === accent && <Check />}</button>)}</div></div>
            <div className="field"><Label>信息密度</Label><div className="density-options">{(["comfortable", "compact"] as Density[]).map((density) => <button key={density} className={settingsDraft.density === density ? "selected" : ""} onClick={() => setSettingsDraft({ ...settingsDraft, density })}><SlidersHorizontal />{density === "comfortable" ? "舒适" : "紧凑"}</button>)}</div></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setSettingsOpen(false)}>取消</Button><Button onClick={handleSettingsSave} disabled={saving}>{saving ? "保存中…" : "应用设置"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

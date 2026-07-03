/**
 * Creator Island — 操作記錄（使用者看自己的動作時間軸）。
 * 不另開 audit 表：直接彙整既有帶時間戳的表（AI 動作 / 碎片 / 作品 / 草稿），
 * 依時間合併排序。傳 workspaceId → 只看該工作室；不傳 → 跨所有工作室。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type ActivityItem = {
  kind: "ai" | "fragment" | "work" | "draft";
  label: string;   // 動作中文
  title: string;   // 對象標題
  at: string;      // ISO 時間
  status?: string;
};

const AGENT_ZH: Record<string, string> = {
  synthesize: "凝聚碎片", evolve: "演化碎片", compose: "編織作品", transcreate: "文化轉譯",
  dna: "分析創作 DNA", advise: "AI 創作顧問", chat: "與綠寶對話", assist: "創作引擎輔助",
};

export async function getActivity(userId: string, workspaceId?: string | null, limit = 60): Promise<ActivityItem[]> {
  const admin = createSupabaseAdmin();
  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T) => (workspaceId ? q.eq("workspace_id", workspaceId) : q);

  const [runs, frags, works, drafts] = await Promise.all([
    scope(admin.from("ci_agent_runs").select("agent_type, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit) as any),
    scope(admin.from("ci_fragments").select("title, created_at").eq("created_by", userId).order("created_at", { ascending: false }).limit(limit) as any),
    scope(admin.from("ci_works").select("title, updated_at").eq("created_by", userId).order("updated_at", { ascending: false }).limit(limit) as any),
    scope(admin.from("ci_drafts").select("title, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit) as any),
  ]);

  const items: ActivityItem[] = [
    ...(((runs as any).data ?? []) as any[]).map((r) => ({ kind: "ai" as const, label: AGENT_ZH[r.agent_type] ?? `AI：${r.agent_type}`, title: r.status === "failed" ? "（失敗）" : "", at: r.created_at, status: r.status })),
    ...(((frags as any).data ?? []) as any[]).map((f) => ({ kind: "fragment" as const, label: "新增碎片", title: f.title ?? "", at: f.created_at })),
    ...(((works as any).data ?? []) as any[]).map((w) => ({ kind: "work" as const, label: "作品更新", title: w.title ?? "", at: w.updated_at })),
    ...(((drafts as any).data ?? []) as any[]).map((d) => ({ kind: "draft" as const, label: "草稿編輯", title: d.title ?? "未命名草稿", at: d.updated_at })),
  ].filter((x) => x.at);

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return items.slice(0, limit);
}

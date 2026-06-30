/**
 * Creator Engine — 創作引擎草稿（ci_drafts）。
 * 直接開寫的成品草稿（含類型專屬結構 doc）；完稿 publishDraftToWork → ci_works。
 * 編織結果也能 createDraft 一鍵導入續寫。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createWork } from "@/lib/creator-engine/works";

const COLS = "id, workspace_id, user_id, work_type, title, body, doc, meta, fragment_ids, word_count, status, published_work_id, created_at, updated_at";

export type Draft = {
  id: string; workspace_id: string; user_id: string;
  work_type: string; title: string; body: string;
  doc: Record<string, unknown>; meta: Record<string, unknown>;
  fragment_ids: string[]; word_count: number; status: string;
  published_work_id: string | null; created_at: string; updated_at: string;
};

/** 由 HTML/markdown 粗估字數（中文逐字、英文逐詞）。 */
export function countWords(html: string): number {
  const text = (html || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  const cjk = (text.match(/[一-鿿぀-ヿ]/g) || []).length;
  const words = (text.replace(/[一-鿿぀-ヿ]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + words;
}

export async function listDrafts(workspaceId: string, opts: { limit?: number } = {}): Promise<Draft[]> {
  const admin = createSupabaseAdmin();
  const limit = Math.max(1, Math.min(100, opts.limit ?? 50));
  const { data, error } = await admin.from("ci_drafts")
    .select(COLS).eq("workspace_id", workspaceId).neq("status", "archived")
    .order("updated_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data as Draft[]) ?? [];
}

export async function getDraft(id: string): Promise<Draft | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_drafts").select(COLS).eq("id", id).maybeSingle();
  return (data as Draft) ?? null;
}

export async function draftWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_drafts").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}

export async function createDraft(
  workspaceId: string, userId: string,
  input: { workType?: string; title?: string; body?: string; doc?: Record<string, unknown>; meta?: Record<string, unknown>; fragmentIds?: string[] },
): Promise<Draft> {
  const admin = createSupabaseAdmin();
  const body = input.body ?? "";
  const { data, error } = await admin.from("ci_drafts").insert({
    workspace_id: workspaceId, user_id: userId,
    work_type: input.workType ?? "article",
    title: (input.title ?? "未命名草稿").slice(0, 200),
    body, doc: input.doc ?? {}, meta: input.meta ?? {},
    fragment_ids: (input.fragmentIds ?? []).filter(Boolean),
    word_count: countWords(body),
  }).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Draft;
}

export async function updateDraft(
  id: string,
  patch: Partial<Pick<Draft, "title" | "body" | "doc" | "meta" | "work_type" | "status">> & { fragmentIds?: string[] },
): Promise<Draft> {
  const admin = createSupabaseAdmin();
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) clean.title = String(patch.title).slice(0, 200);
  if (patch.body !== undefined) { clean.body = patch.body; clean.word_count = countWords(patch.body); }
  if (patch.doc !== undefined) clean.doc = patch.doc;
  if (patch.meta !== undefined) clean.meta = patch.meta;
  if (patch.work_type !== undefined) clean.work_type = patch.work_type;
  if (patch.status !== undefined) clean.status = patch.status;
  if (patch.fragmentIds !== undefined) clean.fragment_ids = patch.fragmentIds.filter(Boolean);
  const { data, error } = await admin.from("ci_drafts").update(clean).eq("id", id).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Draft;
}

export async function deleteDraft(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ci_drafts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** 完稿 → 建 ci_works（記 composition），草稿標 published + 連結 work。回 { workId }。 */
export async function publishDraftToWork(draftId: string, userId: string): Promise<{ workId: string }> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error("draft_not_found");
  const work = await createWork(draft.workspace_id, userId, {
    workType: draft.work_type, title: draft.title, body: draft.body,
    fragmentIds: draft.fragment_ids, sourceType: "human_original", meta: draft.meta,
  });
  const admin = createSupabaseAdmin();
  await admin.from("ci_drafts")
    .update({ status: "published", published_work_id: work.id, updated_at: new Date().toISOString() })
    .eq("id", draftId);
  return { workId: work.id };
}

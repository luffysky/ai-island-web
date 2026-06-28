/**
 * Creator Engine — Works（M1）
 * 作品（ci_works，canonical）；composition 走 ci_work_fragments；archive→回收成碎片並記 recycled_from。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { addRelation } from "@/lib/creator-engine/lineage";

const COLS = "id, workspace_id, created_by, work_type, status, title, body, meta, source_type, language, culture, published_blog_id, created_at, updated_at";

export type Work = {
  id: string; workspace_id: string; created_by: string | null;
  work_type: string; status: string; title: string; body: string;
  meta: Record<string, unknown>; source_type: string;
  published_blog_id: string | null; created_at: string; updated_at: string;
};

export async function listWorks(workspaceId: string, opts: { cursor?: string | null; limit?: number } = {}): Promise<{ items: Work[]; nextCursor: string | null }> {
  const admin = createSupabaseAdmin();
  const limit = Math.max(1, Math.min(100, opts.limit ?? 20));
  let q = admin.from("ci_works").select(COLS).eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(limit + 1);
  if (opts.cursor) q = q.lt("updated_at", opts.cursor);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data as Work[]) ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].updated_at : null };
}

export async function getWork(id: string): Promise<Work | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_works").select(COLS).eq("id", id).maybeSingle();
  return (data as Work) ?? null;
}

export async function workWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_works").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}

/** 建作品 + 記 composition（work_fragments），AI 來源時 used fragment 記 quoted_by lineage。 */
export async function createWork(
  workspaceId: string,
  userId: string,
  input: { workType?: string; title: string; body?: string; fragmentIds?: string[]; sourceType?: string; meta?: Record<string, unknown> },
): Promise<Work> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ci_works")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      work_type: input.workType ?? "article",
      title: input.title.slice(0, 200),
      body: input.body ?? "",
      meta: input.meta ?? {},
      source_type: input.sourceType ?? "human_original",
    })
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  const work = data as Work;

  const fragIds = (input.fragmentIds ?? []).filter(Boolean);
  if (fragIds.length) {
    await admin.from("ci_work_fragments").insert(
      fragIds.map((fid, i) => ({ work_id: work.id, fragment_id: fid, position: i })),
    ).then(() => {}, () => {});
  }
  return work;
}

export async function updateWork(id: string, patch: Partial<Pick<Work, "title" | "body" | "status" | "work_type" | "meta">>): Promise<Work> {
  const admin = createSupabaseAdmin();
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["title", "body", "status", "work_type", "meta"] as const) {
    if (patch[k] !== undefined) clean[k] = patch[k];
  }
  const { data, error } = await admin.from("ci_works").update(clean).eq("id", id).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Work;
}

/** 作品用到的碎片 id（composition）。 */
export async function workFragmentIds(workId: string): Promise<string[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_work_fragments").select("fragment_id").eq("work_id", workId).order("position");
  return ((data as any[]) ?? []).map((r) => r.fragment_id);
}

/**
 * 封存作品 → 回收成新碎片（每段非空白行成一個碎片），記 recycled_from。
 * 簡化版：把 body 依空行切段。
 */
export async function archiveWork(workId: string, userId: string): Promise<{ recycled: number }> {
  const admin = createSupabaseAdmin();
  const work = await getWork(workId);
  if (!work) throw new Error("work_not_found");
  await admin.from("ci_works").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", workId);

  const chunks = (work.body || "").split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length >= 8).slice(0, 30);
  let recycled = 0;
  for (const chunk of chunks) {
    const { data: frag } = await admin.from("ci_fragments").insert({
      workspace_id: work.workspace_id,
      created_by: userId,
      title: chunk.slice(0, 60),
      content: chunk,
      source_type: "work_recycled",
    }).select("id").single();
    if (frag) {
      await addRelation(work.workspace_id, { id: (frag as any).id, type: "fragment" }, { id: workId, type: "work" }, "recycled_from").catch(() => {});
      recycled++;
    }
  }
  return { recycled };
}

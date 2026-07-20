/**
 * Creator Engine — Embeddings（Phase2 E4/E5）
 * 對 ci_fragments 補語意向量、找意外配對(E5)、主動回憶相關碎片(E4)。
 * 重用既有 embedText（OpenAI；無 key 時 null → 功能優雅降級）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { embedText } from "@/lib/ai-embeddings";

function embedInput(f: { title: string; content?: string | null; tags?: string[] | null }): string {
  return [f.title, f.content, (f.tags ?? []).join(" ")].filter(Boolean).join("\n").slice(0, 4000);
}

/** 補齊某 workspace 內缺向量的碎片（best-effort、有上限）。回補了幾筆。 */
export async function backfillWorkspaceEmbeddings(workspaceId: string, limit = 40): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ci_fragments")
    .select("id, title, content, tags")
    .eq("workspace_id", workspaceId)
    .is("embedding", null)
    .limit(limit);
  const rows = (data as any[]) ?? [];
  let done = 0;
  for (const f of rows) {
    const vec = await embedText(embedInput(f));
    if (!vec) break; // 沒 OpenAI key → 停（不浪費）
    await admin.from("ci_fragments").update({ embedding: `[${vec.join(",")}]` as any }).eq("id", f.id);
    done++;
  }
  return done;
}

export type Pair = { a_id: string; a_title: string; b_id: string; b_title: string; similarity: number };

/** E5：workspace 意外配對。 */
export async function surprisingPairs(workspaceId: string, count = 8): Promise<Pair[]> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("ci_surprising_pairs", { p_workspace: workspaceId, match_count: count });
  if (error) return [];
  return (data as Pair[]) ?? [];
}

/** E4：找跟某碎片語意相關的其他碎片（主動回憶）。 */
export async function relatedFragments(workspaceId: string, fragmentId: string, count = 6): Promise<any[]> {
  const admin = createSupabaseAdmin();
  // #8：先補齊同 workspace 其他碎片的向量，否則 E4 在沒跑過 E5 的 workspace 會回空。
  await backfillWorkspaceEmbeddings(workspaceId).catch(() => {});
  const { data: f } = await admin.from("ci_fragments").select("title, content, tags, embedding").eq("id", fragmentId).maybeSingle();
  if (!f) return [];
  let emb = (f as any).embedding as string | null;
  if (!emb) {
    const vec = await embedText(embedInput(f as any));
    if (!vec) return [];
    emb = `[${vec.join(",")}]`;
    await admin.from("ci_fragments").update({ embedding: emb as any }).eq("id", fragmentId).then(() => {}, () => {});
  }
  const { data, error } = await admin.rpc("ci_related_fragments", { p_workspace: workspaceId, p_embedding: emb, p_exclude: fragmentId, match_count: count });
  if (error) return [];
  return (data as any[]) ?? [];
}

/**
 * 用一段「文字查詢/主題」語意搜尋碎片（給「綠寶找碎片來寫歌」用）。
 * 把 query embed 後跟碎片向量比相似度；無 OpenAI key → embedText 回 null → 回空陣列（前端 fallback 純文字搜尋）。
 */
export async function searchFragmentsByQuery(workspaceId: string, query: string, count = 8): Promise<any[]> {
  const q = (query ?? "").trim();
  if (!q) return [];
  const admin = createSupabaseAdmin();
  await backfillWorkspaceEmbeddings(workspaceId).catch(() => {});
  const vec = await embedText(q.slice(0, 2000));
  if (!vec) return [];
  const emb = `[${vec.join(",")}]`;
  // p_exclude 傳一個不存在的 uuid → 等於不排除任何碎片、變成純「用查詢搜相似」。
  const { data, error } = await admin.rpc("ci_related_fragments", {
    p_workspace: workspaceId, p_embedding: emb, p_exclude: "00000000-0000-0000-0000-000000000000", match_count: count,
  });
  if (error) return [];
  return (data as any[]) ?? [];
}

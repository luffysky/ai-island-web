/**
 * FIE M1 — Fragment Representation。把 ci_fragments 升為可推理的分層表徵。
 * 沿用 embedText（需 OpenAI key）；結果快取進 ci_fragment_representations。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { embedText } from "@/lib/ai-embeddings";
import type { FragmentRepr } from "@/lib/creator-engine/fie/types";

/** 讀快取（給不需重算的呼叫方）。 */
export async function getCachedRepr(fragmentIds: string[]): Promise<Record<string, any>> {
  if (!fragmentIds.length) return {};
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_fragment_representations").select("fragment_id, surface, semantic, structural").in("fragment_id", fragmentIds);
  const out: Record<string, any> = {};
  for (const r of ((data as any[]) ?? [])) out[r.fragment_id] = r;
  return out;
}

/**
 * 為一組碎片建立/更新 Representation（Surface/Semantic/Structural + concept_embedding）。
 * 純程式抽 surface/structural、embedding 用 embedText、semantic 先用既有 tags/mood/category 投影。
 * 回傳輕量 FragmentRepr[]（供 reason pipeline 用）。
 */
export async function buildRepresentation(workspaceId: string, fragmentIds: string[]): Promise<FragmentRepr[]> {
  if (!fragmentIds.length) return [];
  const admin = createSupabaseAdmin();
  const { data: frags } = await admin
    .from("ci_fragments")
    .select("id, title, content, tags, mood, category, ai_summary")
    .eq("workspace_id", workspaceId)
    .in("id", fragmentIds.slice(0, 50));
  const rows = (frags as any[]) ?? [];

  // structural：讀 relation 的 in/out degree
  const { data: rels } = await admin.from("ci_asset_relations").select("from_asset_id, to_asset_id").in("from_asset_id", fragmentIds).limit(500);
  const relRows = (rels as any[]) ?? [];

  // 每個碎片的 embedding 是獨立的網路往返——並行跑（原本 for 迴圈序列 await，種子一多就把整條推理拖到 gateway timeout）。
  const out: FragmentRepr[] = await Promise.all(rows.map(async (f) => {
    const text = (f.ai_summary || f.content || f.title || "").toString();
    const surface = {
      len: text.length,
      keyphrases: Array.isArray(f.tags) ? f.tags.slice(0, 8) : [],
      title: f.title,
    };
    const semantic = { themes: Array.isArray(f.tags) ? f.tags.slice(0, 5) : [], sentiment: f.mood ?? null, category: f.category ?? null };
    const outDeg = relRows.filter((r) => r.from_asset_id === f.id).length;
    const inDeg = relRows.filter((r) => r.to_asset_id === f.id).length;
    const structural = { in_degree: inDeg, out_degree: outDeg, role: outDeg > inDeg ? "source" : "detail" };
    const vec = await embedText(text.slice(0, 4000)).catch(() => null);

    await admin.from("ci_fragment_representations").upsert({
      fragment_id: f.id, workspace_id: workspaceId,
      surface, semantic, structural,
      ...(vec ? { concept_embedding: `[${vec.join(",")}]` } : {}),
      computed_at: new Date().toISOString(),
    }, { onConflict: "fragment_id" });

    // salience：degree + 內容長度的粗略啟發式；surprise 先 0（由 pipeline 依鄰居算）
    const salience = Math.min(1, 0.4 + (inDeg + outDeg) * 0.1 + Math.min(0.3, text.length / 2000));
    return { fragmentId: f.id, role: structural.role, salience, surprise: 0, summary: f.ai_summary || f.title || text.slice(0, 80) } as FragmentRepr;
  }));
  return out;
}

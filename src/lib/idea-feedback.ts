import { createSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * 回饋迴路：把使用者「按過讚」的點子整理成一句風格摘要，餵回生成 prompt。
 * 容錯：feedback 欄位還沒 migrate / 沒有讚過的點子 → 回 ""。
 */
export async function likedStyleSummary(): Promise<string> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("generated_ideas")
      .select("title, idea_type")
      .eq("feedback", "up")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error || !data || data.length === 0) return "";
    const titles = (data as any[]).map((d) => d.title).filter(Boolean).slice(0, 8);
    if (titles.length === 0) return "";
    return `像這些他給過讚的點子那種調性 — ${titles.join("、")}`;
  } catch {
    return "";
  }
}

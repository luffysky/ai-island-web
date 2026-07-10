import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 程式辭典查詢：GET /api/dictionary?q=&lang=&category=&difficulty=&domain=programming&offset=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // 清掉 PostgREST or-filter 會誤解的字元，避免 query 壞掉 / 注入
  const q = (sp.get("q") || "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
  const lang = (sp.get("lang") || "").replace(/[^a-z0-9+#-]/gi, "").slice(0, 20);
  const category = (sp.get("category") || "").replace(/[^a-z]/gi, "").slice(0, 20);
  const difficulty = parseInt(sp.get("difficulty") || "", 10);
  const domain = (sp.get("domain") || "programming").replace(/[^a-z]/gi, "").slice(0, 20) || "programming";
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const LIMIT = 40;

  const admin = createSupabaseAdmin();
  let query = admin
    .from("dictionary_terms")
    .select("slug, term, zh_name, category, langs, plain, difficulty", { count: "exact" })
    .eq("domain", domain);
  if (q) query = query.or(`term.ilike.%${q}%,zh_name.ilike.%${q}%,plain.ilike.%${q}%`);
  if (lang) query = query.contains("langs", [lang]);
  if (category) query = query.eq("category", category);
  if (!Number.isNaN(difficulty)) query = query.eq("difficulty", difficulty);
  query = query.order("views", { ascending: false }).order("term").range(offset, offset + LIMIT - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [], total: count ?? 0, offset, limit: LIMIT });
}

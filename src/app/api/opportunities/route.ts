import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/opportunities — 機會清單（公開）。支援 q / type / category / country / free / deadline 篩選。
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 60);
  const type = sp.get("type") ?? "";
  // category 支援多選（逗號分隔）→ OR；成本/狀態等其他條件維持 AND。
  const categories = (sp.get("category") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const country = sp.get("country") ?? "";
  const free = sp.get("free");            // "1" = 只看免報名費
  const status = sp.get("status") ?? "";  // open|upcoming|closed
  const noPitch = sp.get("noPitch");      // "1" = 不用上台（初賽免 pitch）
  const online = sp.get("online");        // "1" = 全程線上

  const admin = createSupabaseAdmin();
  let query = admin.from("opportunities")
    .select("id, type, name, organizer, country, category, official_url, prize_amount, prize_text, currency, application_deadline, is_free, requires_demo, requires_pitch, is_online, requires_qa, requires_team, tags, status, source_confidence, ai_island_fit_score")
    .limit(200);

  if (q) query = query.or(`name.ilike.%${q}%,organizer.ilike.%${q}%,category.ilike.%${q}%`);
  if (type) query = query.eq("type", type);
  // 多選分類 = OR（符合任一即可）；逗號會破壞 PostgREST or() 語法，先濾掉
  if (categories.length) query = query.or(categories.map((c) => `category.ilike.%${c.replace(/[,()]/g, "")}%`).join(","));
  if (country) query = query.eq("country", country);
  if (free === "1") query = query.eq("is_free", true);
  if (status) query = query.eq("status", status);
  if (noPitch === "1") query = query.eq("requires_pitch", false);
  if (online === "1") query = query.eq("is_online", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 排序：open 在前 → 截止日近的在前（NULL 最後）
  const rank: Record<string, number> = { open: 0, upcoming: 1, closed: 2 };
  const opps = (data ?? []).sort((a: any, b: any) => {
    const s = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
    if (s !== 0) return s;
    const ad = a.application_deadline || "9999-12-31";
    const bd = b.application_deadline || "9999-12-31";
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });
  return NextResponse.json({ opportunities: opps });
}

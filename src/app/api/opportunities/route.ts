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
  const urgent = sp.get("urgent");        // "1" = 14 天內截止
  const minPrize = parseInt(sp.get("minPrize") ?? "", 10);  // 獎金下限（TWD，NaN=不限）
  const student = sp.get("student");      // "1" = 限學生可報（requires_student）
  const company = sp.get("company");      // "1" = 限法人／公司（requires_company）

  const admin = createSupabaseAdmin();
  let query = admin.from("opportunities")
    .select("id, type, name, organizer, country, category, official_url, prize_amount, prize_text, currency, application_deadline, is_free, requires_demo, requires_pitch, is_online, requires_qa, requires_team, requires_student, requires_company, prep_effort, tags, status, source_confidence, ai_island_fit_score")
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
  if (!Number.isNaN(minPrize) && minPrize > 0) query = query.not("prize_amount", "is", null).gte("prize_amount", minPrize);
  if (student === "1") query = query.eq("requires_student", true);
  if (company === "1") query = query.eq("requires_company", true);
  if (urgent === "1") {
    // 14 天內截止（且尚未過期）
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const in14 = new Date(today.getTime() + 14 * 86400_000);
    query = query.not("application_deadline", "is", null).gte("application_deadline", iso(today)).lte("application_deadline", iso(in14));
  }

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

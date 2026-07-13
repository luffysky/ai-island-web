import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { parseFeed } from "@/lib/rss-parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 機會島雷達（安全版）—— 從後台 curated 的 RSS/Atom 來源抓「候選機會」進待審佇列。
 *
 * 觸發：GET /api/cron/opportunity-radar?secret=<CRON_SECRET>（建議每天 1–2 次）。
 * 原則：① 只抓 enabled 的 RSS/Atom 來源（不亂爬）② 抓進來一律 status=pending（不自動上線）
 *       ③ 同 URL 去重（unique index）④ 後台人工核准才進 opportunities。
 * 絕不讓 AI 捏資料：這支只搬運來源原文、不生成、不猜。
 */
const PER_SOURCE_LIMIT = 60;

// 只有標題/摘要命中「機會關鍵字」的項目才進待審佇列（把廣泛新聞 feed 的雜訊擋掉、省人工審）。
// 寧可略鬆（進佇列還要人工核准）也別漏；之後可搬到後台讓林董自訂。
const OPP_KEYWORDS = [
  "補助", "補助款", "獎助", "獎學金", "徵件", "徵求", "徵選", "徵案", "徵稿", "徵提案", "提案徵",
  "競賽", "大賽", "比賽", "甄選", "選拔", "報名", "招募團隊", "創業競賽", "新創", "加速器",
  "培訓計畫", "育成", "孵化", "黑客松", "hackathon", "grant", "獎金", "頒獎典禮報名",
];
function looksLikeOpportunity(title: string, summary: string): boolean {
  const hay = `${title} ${summary}`.toLowerCase();
  return OPP_KEYWORDS.some((k) => hay.includes(k.toLowerCase()));
}

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const admin = createSupabaseAdmin();

  const { data: sources } = await admin.from("opportunity_sources")
    .select("id, name, url, kind, category_hint").eq("enabled", true).in("kind", ["rss", "atom"]);
  if (!sources || sources.length === 0) return NextResponse.json({ ok: true, note: "no enabled rss sources", inserted: 0 });

  const nowIso = new Date().toISOString();
  let inserted = 0;
  const perSource: { name: string; found: number; new: number; status: string }[] = [];

  for (const s of sources) {
    let found = 0, added = 0, status = "ok";
    try {
      const resp = await fetch(s.url, { headers: { "User-Agent": "AI-Island-Radar/1.0" }, signal: AbortSignal.timeout(15000) });
      if (!resp.ok) { status = `http ${resp.status}`; }
      else {
        const xml = await resp.text();
        const all = parseFeed(xml).slice(0, PER_SOURCE_LIMIT);
        // 廣泛新聞 feed 先用關鍵字濾成「像機會的」；純機會來源可設 category_hint='all' 跳過濾除
        const items = s.category_hint === "all" ? all : all.filter((it) => looksLikeOpportunity(it.title, it.summary));
        found = items.length;
        for (const it of items) {
          if (!it.link) continue;
          // 冪等：同 URL 已存在就跳過（unique index 也會擋、這裡先查省一次寫入錯誤）
          const { data: exist } = await admin.from("opportunity_candidates").select("id").eq("raw_url", it.link).limit(1);
          if (exist && exist.length) continue;
          const { error } = await admin.from("opportunity_candidates").insert({
            source_id: s.id, source_name: s.name,
            raw_title: it.title.slice(0, 300), raw_url: it.link, raw_summary: it.summary || null,
            raw_published_at: it.publishedAt, parsed: s.category_hint ? { category_hint: s.category_hint } : {},
            status: "pending",
          });
          if (!error) { added++; inserted++; }
        }
      }
    } catch (e: any) {
      status = `error: ${String(e?.message ?? e).slice(0, 80)}`;
    }
    await admin.from("opportunity_sources").update({ last_fetched_at: nowIso, last_status: status, last_count: added }).eq("id", s.id);
    perSource.push({ name: s.name, found, new: added, status });
  }

  return NextResponse.json({ ok: true, sources: sources.length, inserted, perSource });
}

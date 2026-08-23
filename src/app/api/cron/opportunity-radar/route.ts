import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  parseSourceBody, sha256, normalizeUrl, itemContentHash,
  type FeedItem, type JsonApiMapping,
} from "@/lib/opportunity-radar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 機會島雷達（安全版）—— 從後台 curated 的來源抓「候選機會」進待審佇列。
 *
 * 觸發：GET /api/cron/opportunity-radar?secret=<CRON_SECRET>（建議每天 1–2 次）。
 * 來源 kind：rss / atom / api（JSON，靠 source.config 欄位對應）/ sitemap（§3.3.1）。manual 不抓。
 * 原則：① 只抓 enabled 來源（不亂爬）② 抓進來一律 status=pending（不自動上線）
 *       ③ 同 URL 去重（unique index）④ 後台人工核准才進 opportunities ⑤ 只搬運原文、不生成不猜。
 *
 * 三層變動偵測（§3.3.2，省頻寬、省人工審重複）：
 *   tier1 HTTP 條件式：帶 If-None-Match/If-Modified-Since，來源回 304 → 整支跳過（連 body 都不下載）。
 *   tier2 body 雜湊：body 的 sha256 跟上次一樣 → 跳過解析（來源整體沒變）。
 *   tier3 逐項雜湊：同 URL 已在佇列，比對 content_hash，變了 → 更新原文 + 記 content_changed_at 供審核者注意。
 */
const PER_SOURCE_LIMIT = 60;

// 只有標題/摘要命中「機會關鍵字」的項目才進待審佇列（把廣泛新聞 feed 的雜訊擋掉、省人工審）。
// 寧可略鬆（進佇列還要人工核准）也別漏；category_hint='all' 的純機會來源跳過此濾除。
const OPP_KEYWORDS = [
  "補助", "補助款", "獎助", "獎學金", "徵件", "徵求", "徵選", "徵案", "徵稿", "徵提案", "提案徵",
  "競賽", "大賽", "比賽", "甄選", "選拔", "報名", "招募團隊", "創業競賽", "新創", "加速器",
  "培訓計畫", "育成", "孵化", "黑客松", "hackathon", "grant", "獎金", "頒獎典禮報名",
];
function looksLikeOpportunity(title: string, summary: string): boolean {
  const hay = `${title} ${summary}`.toLowerCase();
  return OPP_KEYWORDS.some((k) => hay.includes(k.toLowerCase()));
}

interface SourceRow {
  id: string; name: string; url: string; kind: string; category_hint: string | null;
  http_etag: string | null; http_last_modified: string | null; content_hash: string | null;
  config: Record<string, any> | null;
}

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const admin = createSupabaseAdmin();

  const { data: sources } = await admin.from("opportunity_sources")
    .select("id, name, url, kind, category_hint, http_etag, http_last_modified, content_hash, config")
    .eq("enabled", true).in("kind", ["rss", "atom", "api", "sitemap"]);
  if (!sources || sources.length === 0) {
    return NextResponse.json({ ok: true, note: "no enabled fetchable sources", inserted: 0 });
  }

  const nowIso = new Date().toISOString();
  let inserted = 0, changed = 0;
  const perSource: { name: string; found: number; new: number; changed: number; status: string }[] = [];

  for (const s of sources as SourceRow[]) {
    let found = 0, added = 0, chg = 0, status = "ok";
    const cfg = s.config ?? {};
    try {
      // tier1：條件式請求標頭
      const headers: Record<string, string> = { "User-Agent": "AI-Island-Radar/1.0" };
      if (s.http_etag) headers["If-None-Match"] = s.http_etag;
      if (s.http_last_modified) headers["If-Modified-Since"] = s.http_last_modified;
      if (s.kind === "api" && cfg.headers && typeof cfg.headers === "object") {
        for (const [k, v] of Object.entries(cfg.headers)) headers[k] = String(v);
      }

      const resp = await fetch(s.url, { headers, signal: AbortSignal.timeout(15000) });

      if (resp.status === 304) {
        status = "unchanged (304)";
        await admin.from("opportunity_sources")
          .update({ last_fetched_at: nowIso, last_status: status }).eq("id", s.id);
        perSource.push({ name: s.name, found: 0, new: 0, changed: 0, status });
        continue;
      }
      if (!resp.ok) {
        status = `http ${resp.status}`;
      } else {
        const body = await resp.text();
        const bodyHash = sha256(body);
        const etag = resp.headers.get("etag");
        const lastMod = resp.headers.get("last-modified");

        // tier2：來源整體 body 沒變 → 不必解析
        if (s.content_hash && s.content_hash === bodyHash) {
          status = "unchanged (hash)";
          await admin.from("opportunity_sources").update({
            last_fetched_at: nowIso, last_status: status,
            http_etag: etag, http_last_modified: lastMod,
          }).eq("id", s.id);
          perSource.push({ name: s.name, found: 0, new: 0, changed: 0, status });
          continue;
        }

        const apiMapping: JsonApiMapping | null =
          s.kind === "api" && cfg.titleField && cfg.urlField
            ? {
                itemsPath: cfg.itemsPath, titleField: cfg.titleField, urlField: cfg.urlField,
                summaryField: cfg.summaryField, publishedField: cfg.publishedField,
              }
            : null;

        let all = parseSourceBody(s.kind, body, { apiMapping }).slice(0, PER_SOURCE_LIMIT);

        // sitemap 可用 config.recentDays 只收近期更新的 URL（靠 lastmod）→ 避免整站 URL 灌爆佇列
        if (s.kind === "sitemap" && Number(cfg.recentDays) > 0) {
          const cutoff = Date.now() - Number(cfg.recentDays) * 86400_000;
          all = all.filter((it) => !it.publishedAt || Date.parse(it.publishedAt) >= cutoff);
        }

        const items: FeedItem[] = s.category_hint === "all"
          ? all
          : all.filter((it) => looksLikeOpportunity(it.title, it.summary));
        found = items.length;

        for (const it of items) {
          if (!it.link) continue;
          const url = normalizeUrl(it.link);
          const hash = itemContentHash(it);

          // 去重：查正規化後與原始連結任一是否已在佇列
          const { data: exist } = await admin.from("opportunity_candidates")
            .select("id, content_hash").in("raw_url", [url, it.link]).limit(1);

          if (exist && exist.length) {
            // tier3：同 URL 但內容變了 → 更新原文並記變動時間（供 §3.3.4 版本比較）
            const row = exist[0] as { id: string; content_hash: string | null };
            if (row.content_hash !== hash) {
              await admin.from("opportunity_candidates").update({
                raw_title: it.title.slice(0, 300), raw_summary: it.summary || null,
                raw_published_at: it.publishedAt, content_hash: hash, content_changed_at: nowIso,
              }).eq("id", row.id);
              chg++; changed++;
            }
            continue;
          }

          const { error } = await admin.from("opportunity_candidates").insert({
            source_id: s.id, source_name: s.name,
            raw_title: it.title.slice(0, 300), raw_url: url, raw_summary: it.summary || null,
            raw_published_at: it.publishedAt, content_hash: hash,
            parsed: s.category_hint ? { category_hint: s.category_hint } : {},
            status: "pending",
          });
          if (!error) { added++; inserted++; }
        }

        await admin.from("opportunity_sources").update({
          last_fetched_at: nowIso, last_status: status, last_count: added,
          http_etag: etag, http_last_modified: lastMod, content_hash: bodyHash,
        }).eq("id", s.id);
        perSource.push({ name: s.name, found, new: added, changed: chg, status });
        continue;
      }
    } catch (e: any) {
      status = `error: ${String(e?.message ?? e).slice(0, 80)}`;
    }
    await admin.from("opportunity_sources")
      .update({ last_fetched_at: nowIso, last_status: status, last_count: added }).eq("id", s.id);
    perSource.push({ name: s.name, found, new: added, changed: chg, status });
  }

  // 順帶：重算所有 open/upcoming 機會的「AI 島適合度分數」→ 寫進 ai_island_fit_score
  //（規則引擎、零 AI 成本；供後台雷達排序、前台精選用。含截止時程，每日跑保持新鮮。）
  let scored = 0;
  try {
    const { scoreOpportunity } = await import("@/lib/opportunity-fit");
    const { data: opps } = await admin.from("opportunities")
      .select("id, name, category, tags, prize_amount, is_free, is_online, requires_pitch, requires_demo, requires_business_plan, requires_student, application_deadline, status")
      .in("status", ["open", "upcoming"]);
    const now = Date.now();
    for (const o of opps ?? []) {
      const { score } = scoreOpportunity(o as any, now);
      await admin.from("opportunities").update({ ai_island_fit_score: score }).eq("id", (o as any).id);
      scored++;
    }
  } catch { /* 分數是加分功能、失敗不影響雷達主流程 */ }

  return NextResponse.json({ ok: true, sources: sources.length, inserted, changed, perSource, scored });
}

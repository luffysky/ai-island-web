import { NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getWork, workWorkspace } from "@/lib/creator-engine/works";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { slugify } from "@/lib/blog-types";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** 作品 body（可能是 HTML）→ 純文字，給 AI 讀。 */
function toPlain(html: string, max = 6000): string {
  const t = (html || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? t.slice(0, max) : t;
}

/** 從模型回覆抓第一段 {...} 當 JSON。 */
function extractJson(raw: string): any | null {
  if (!raw) return null;
  const fenced = raw.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(fenced.slice(start, end + 1)); } catch { return null; }
}

const SYSTEM_PROMPT = `你是繁體中文的 SEO 內容編輯。使用者會給你一篇「作品」的標題與內文，請把它改寫成一篇「對搜尋引擎與 AI 回答引擎友善」的部落格文章。
**只回傳一個嚴格 JSON 物件，不要任何額外說明、不要 markdown code fence。**
JSON 結構：
{
  "title": "≤ 60 字、含主要關鍵字、吸引點擊的 SEO 標題",
  "metaDescription": "≤ 155 字、能促使點擊的 meta description",
  "keywords": ["5 到 8 個繁中或英文關鍵字"],
  "bodyHtml": "結構化 HTML 內文：用 <h2>/<h3> 分段落標題、<p> 段落、需要時用 <ul><li>。第一段先用一句話回答讀者核心問題（GEO）。忠於原文、不要杜撰事實。只用 <h2><h3><p><ul><ol><li><strong><em><blockquote> 這些標籤，不要 <html>/<body>/<script>/<style>/行內 style。"
}
規則：title ≤ 60 字、metaDescription ≤ 155 字、keywords 5-8 個。內容需忠於原文、用繁體中文。`;

/** POST → 把作品用 AI 改寫成 SEO 部落格草稿（user_blog_articles，is_public=false）。回 { articleId, slug, editUrl }。 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;

  const ws = await workWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found", message: "找不到作品" }, { status: 404 });
  // 作品擁有者（可編輯者）才可轉換
  const gate = await requireWorkspaceRole(ws, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  // 限流：每人每分鐘 5 次（AI 生成較貴）
  const rl = rateLimit(`works-to-seo:${u.userId}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` }, { status: 429 });

  const work = await getWork(id);
  if (!work) return NextResponse.json({ error: "not_found", message: "找不到作品" }, { status: 404 });
  const plain = toPlain(work.body || "");
  if (!work.title && !plain) return NextResponse.json({ error: "empty", message: "作品沒有內容可以轉換" }, { status: 422 });

  // 1) AI 改寫
  let parsed: any = null;
  try {
    const { text } = await completeForUsage("seo_meta_gen", {
      system: SYSTEM_PROMPT,
      user: `作品標題：${work.title || "（未填）"}\n作品類型：${work.work_type}\n\n作品內文（純文字、可能已截斷）：\n${plain || "（無內文）"}`,
      maxTokens: 3000,
      temperature: 0.6,
    });
    parsed = extractJson(text);
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message ?? "AI 生成失敗" }, { status: 502 });
  }
  if (!parsed) return NextResponse.json({ error: "parse_failed", message: "AI 回覆格式無法解析、請再試一次" }, { status: 502 });

  const clamp = (s: any, n: number) => String(s ?? "").trim().slice(0, n);
  const title = clamp(parsed.title, 200) || work.title || "未命名文章";
  const seoDesc = clamp(parsed.metaDescription, 500);
  const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map((k: any) => String(k).trim()).filter(Boolean).slice(0, 8) : [];
  // 內文：AI 的 HTML 優先、沒有就用原文段落化。強制過濾允許標籤。
  const rawBody = typeof parsed.bodyHtml === "string" && parsed.bodyHtml.trim()
    ? parsed.bodyHtml
    : (work.body || plain).split(/\n\s*\n/).map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  const content = sanitizeRichHtmlStrict(rawBody);

  // 2) 建部落格草稿（撞名 slug 加數字）
  const admin = createSupabaseAdmin();
  const base = slugify(title) || `work-${id.slice(0, 6)}`;
  let slug = base;
  for (let n = 1; ; n++) {
    const { data: exists } = await admin.from("user_blog_articles").select("id").eq("user_id", u.userId).eq("slug", slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${n + 1}`;
  }

  const { data: article, error } = await admin.from("user_blog_articles").insert({
    user_id: u.userId,
    title: title.slice(0, 200),
    slug,
    summary: seoDesc || null,
    content,
    tags: keywords,
    is_public: false,           // 預設草稿
    seo_title: title.slice(0, 200),
    seo_desc: seoDesc || null,
  }).select("id, slug").single();
  if (error) return NextResponse.json({ error: "create_failed", message: error.message }, { status: 500 });

  const articleId = (article as any).id as string;
  // 確保有 blog_settings + 回填作品的 published_blog_id（前台顯示「已發布」+ 連結）
  await admin.from("user_blog_settings").upsert({ user_id: u.userId }, { onConflict: "user_id", ignoreDuplicates: true });
  await admin.from("ci_works").update({ published_blog_id: articleId, updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ ok: true, articleId, slug: (article as any).slug, editUrl: `/me/blog/edit/${articleId}`, keywords });
}

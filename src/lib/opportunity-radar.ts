// 機會島雷達 —— 來源解析 + 變動偵測（§3.3.1 / §3.3.2）。
// 純函式為主（好測、零副作用），HTTP/DB 留在 cron route。
// 原則不變：只搬運來源原文、不生成、不猜；抓進來一律 pending 待人工核准。

import { createHash } from "crypto";
import { parseFeed, type FeedItem } from "./rss-parse";

export type { FeedItem };

// ── 雜湊 / 正規化 ───────────────────────────────────────────────
export function sha256(s: string): string {
  return createHash("sha256").update(s ?? "", "utf8").digest("hex");
}

/** 正規化文字供 hash 比對：壓平空白、去頭尾、轉小寫 → 純排版差異不算「內容變動」。 */
export function normalizeForHash(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$|_hsenc$|_hsmi$|spm$)/i;
/** 去掉 URL 追蹤參數與結尾斜線 → 同一頁的不同追蹤碼視為同一 URL（去重更準）。 */
export function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const keep: [string, string][] = [];
    u.searchParams.forEach((v, k) => { if (!TRACKING_PARAMS.test(k)) keep.push([k, v]); });
    keep.sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    for (const [k, v] of keep) u.searchParams.append(k, v);
    u.hash = "";
    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}

/** 逐項內容 hash（tier 3 變動偵測）：標題＋摘要正規化後 hash；同 URL 但此值變了＝內容有更新。 */
export function itemContentHash(it: { title: string; summary?: string | null }): string {
  return sha256(normalizeForHash(it.title) + "\n" + normalizeForHash(it.summary));
}

// ── sitemap 解析（§3.3.1）────────────────────────────────────────
export interface SitemapEntry { loc: string; lastmod: string | null }

/** 解析 sitemap.xml 的 <url><loc>；若是 sitemap index（<sitemap><loc>）也一併回傳其子 sitemap 連結。 */
export function parseSitemap(xml: string): { urls: SitemapEntry[]; sitemaps: string[] } {
  const urls: SitemapEntry[] = [];
  const sitemaps: string[] = [];
  const urlBlocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) ?? [];
  for (const b of urlBlocks) {
    const loc = pickTag(b, "loc");
    if (!loc || !/^https?:/i.test(loc)) continue;
    urls.push({ loc: decodeXml(loc), lastmod: toIsoOrNull(pickTag(b, "lastmod")) });
  }
  const smBlocks = xml.match(/<sitemap\b[\s\S]*?<\/sitemap>/gi) ?? [];
  for (const b of smBlocks) {
    const loc = pickTag(b, "loc");
    if (loc && /^https?:/i.test(loc)) sitemaps.push(decodeXml(loc));
  }
  return { urls, sitemaps };
}

/** sitemap 的 URL 轉成 candidate 用的 FeedItem：標題取自 URL 最後一段 slug（人可讀化）。 */
export function sitemapEntryToItem(e: SitemapEntry): FeedItem {
  let title = e.loc;
  try {
    const u = new URL(e.loc);
    const seg = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
    title = decodeURIComponent(seg).replace(/[-_]+/g, " ").replace(/\.(html?|php|aspx?)$/i, "").trim() || e.loc;
  } catch { /* 保留原 loc 當標題 */ }
  return { title: title.slice(0, 300), link: e.loc, summary: "", publishedAt: e.lastmod };
}

// ── JSON API 解析（§3.3.1）───────────────────────────────────────
export interface JsonApiMapping {
  itemsPath?: string;        // 陣列所在的點路徑，如 "data.results"；省略＝整個回應就是陣列
  titleField: string;        // 每筆的標題欄（點路徑）
  urlField: string;          // 每筆的連結欄
  summaryField?: string;
  publishedField?: string;
}

/** 依 mapping 從 JSON 回應抽出 FeedItem[]（不猜欄位、對不到就跳過該筆）。 */
export function parseJsonApi(json: unknown, map: JsonApiMapping): FeedItem[] {
  const arr = map.itemsPath ? getPath(json, map.itemsPath) : json;
  if (!Array.isArray(arr)) return [];
  const out: FeedItem[] = [];
  for (const row of arr) {
    const title = String(getPath(row, map.titleField) ?? "").trim();
    const link = String(getPath(row, map.urlField) ?? "").trim();
    if (!title || !/^https?:/i.test(link)) continue;
    const summary = map.summaryField ? String(getPath(row, map.summaryField) ?? "").trim() : "";
    const pubRaw = map.publishedField ? getPath(row, map.publishedField) : null;
    out.push({
      title: title.slice(0, 300),
      link,
      summary: summary.slice(0, 800),
      publishedAt: pubRaw != null ? toIsoOrNull(String(pubRaw)) : null,
    });
  }
  return out;
}

/** 依來源 kind 把原始回應（文字）解析成 FeedItem[]。api 需要 mapping、否則回空。 */
export function parseSourceBody(
  kind: string,
  body: string,
  opts?: { apiMapping?: JsonApiMapping | null },
): FeedItem[] {
  switch (kind) {
    case "rss":
    case "atom":
      return parseFeed(body);
    case "sitemap":
      return parseSitemap(body).urls.map(sitemapEntryToItem);
    case "api": {
      if (!opts?.apiMapping) return [];
      let json: unknown;
      try { json = JSON.parse(body); } catch { return []; }
      return parseJsonApi(json, opts.apiMapping);
    }
    default:
      return [];
  }
}

// ── 內部小工具 ──────────────────────────────────────────────────
function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: any = obj;
  for (const key of path.split(".")) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

function pickTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();
}

function toIsoOrNull(s: string): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

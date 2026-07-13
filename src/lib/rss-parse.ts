// 極簡 RSS 2.0 / Atom 解析（不加相依套件）。只抓 title / link / summary / publishedAt。
// 用於機會島雷達：從 curated 來源抓「候選機會」進待審佇列（不自動上線）。

export interface FeedItem { title: string; link: string; summary: string; publishedAt: string | null }

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : "";
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toIso(s: string): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const b of blocks) {
    const title = decode(pick(b, "title"));
    if (!title) continue;
    // link：RSS 是 <link>url</link>；Atom 是 <link href="url"/>
    let link = decode(pick(b, "link"));
    if (!link || !/^https?:/i.test(link)) {
      const m = b.match(/<link[^>]*\bhref=["']([^"']+)["']/i);
      if (m) link = m[1];
    }
    const summary = decode(pick(b, "description") || pick(b, "summary") || pick(b, "content")).slice(0, 800);
    const pub = decode(pick(b, "pubDate") || pick(b, "published") || pick(b, "updated"));
    items.push({ title, link, summary, publishedAt: toIso(pub) });
  }
  return items;
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  // 官方爬蟲練習站
  "books.toscrape.com",
  "quotes.toscrape.com",
  "scrapethissite.com",
  // 公開 API
  "hacker-news.firebaseio.com",
  "en.wikipedia.org",
  "zh.wikipedia.org",
  "api.github.com",
  "jsonplaceholder.typicode.com",
  "api.coingecko.com",
  "api.exchangerate.host",
  "open.er-api.com",
  "wttr.in",
  "pypi.org",
  "registry.npmjs.org",
  "api.publicapis.org",
  "datausa.io",
  "data.gov.tw",
  "data.taipei",
  "data.gov.uk",
  "restcountries.com",
  "api.spaceflightnewsapi.net",
  "dog.ceo",
  "pokeapi.co",
  "fakestoreapi.com",
  "dummyjson.com",
  "randomuser.me",
  "raw.githubusercontent.com",
  // 本站
  "ai-island-web.snowrealm.pet",
  "localhost",
];

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  // rate limit：100/h/user
  const rl = rateLimit(`scrape:${gate.userId}`, 100, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const target = req.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "missing_url", body: "" }, { status: 400 });

  // 相對路徑 → 本站
  let url: URL;
  try {
    if (target.startsWith("/")) {
      const site = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get("host") ?? "ai-island-web.snowrealm.pet"}`;
      url = new URL(target, site);
    } else {
      url = new URL(target);
    }
  } catch {
    return NextResponse.json({ error: "invalid_url", body: "" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    return NextResponse.json({
      error: "host_not_allowed",
      message: `${url.hostname} 不在允許清單。允許：${ALLOWED_HOSTS.join(", ")}`,
      allowed_hosts: ALLOWED_HOSTS,
      body: "",
    }, { status: 403 });
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "AIIsland-Playground/1.0 (admin-only educational scraper)",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = res.headers.get("content-type") ?? "text/plain";
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ error: "no_body", body: "" }, { status: 500 });

    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        return NextResponse.json({ error: "too_large", message: `> ${MAX_BYTES / 1024 / 1024}MB`, body: "" }, { status: 413 });
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    // 嘗試解 UTF-8 text；圖片 / 二進位回 base64
    const isText = /^(text|application\/(json|xml|javascript|x-www-form|atom))/i.test(contentType);
    const body = isText ? buf.toString("utf8") : buf.toString("base64");

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      url: url.toString(),
      content_type: contentType,
      bytes: total,
      encoding: isText ? "utf8" : "base64",
      body,
      headers: Object.fromEntries(res.headers.entries()),
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError") {
      return NextResponse.json({ error: "timeout", message: "10 秒沒回應", body: "" }, { status: 504 });
    }
    return NextResponse.json({ error: "fetch_failed", message: e?.message ?? String(e), body: "" }, { status: 500 });
  }
}

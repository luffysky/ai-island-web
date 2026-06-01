import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  return p?.role === "admin" || (p as any)?.is_owner === true;
}

function pick(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim()).slice(0, 500);
  }
  return "";
}
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

/** POST { url } → { title, description, url } 抓網頁標題/摘要當碎片 */
export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));
  let url = String(body.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIIslandBot/1.0)" },
      redirect: "follow",
    });
    const html = (await res.text()).slice(0, 200_000);
    const title =
      pick(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
                  /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
                  /<title[^>]*>([^<]+)<\/title>/i]) || url;
    const description = pick(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);
    return NextResponse.json({ title, description, url });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", message: e?.message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

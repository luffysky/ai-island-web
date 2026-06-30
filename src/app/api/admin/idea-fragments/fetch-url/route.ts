import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { requireAdmin as adminGate } from "@/lib/admin-guard";
import { lookup } from "dns/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const gate = await adminGate();
  return { user: gate.ok ? { id: gate.userId } : (null as null), ok: gate.ok };
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

// SSRF 防護：擋掉內網 / loopback / link-local / metadata IP
function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) {
    const p = v.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;            // link-local + cloud metadata 169.254.169.254
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] >= 224) return true;                              // multicast / reserved
    return false;
  }
  if (v === "::1" || v === "::" || v === "::ffff:0:0") return true;
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true; // link-local / ULA
  return false;
}

/** 驗 URL 是 http/https 且 host 解析出的所有 IP 都是公網。否則 throw。 */
async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("只允許 http/https");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error("不允許內部主機");
  // host 本身就是 IP，或 DNS 解析出的任一 IP 為私有 → 擋
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error("不允許內網位址");
  }
  const addrs = await lookup(host, { all: true }).catch(() => [] as { address: string }[]);
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("解析到內網位址、已封鎖");
  return u;
}

/** POST { url } → { title, description, url } 抓網頁標題/摘要當碎片（含 SSRF 防護） */
export async function POST(req: NextRequest) {
  if (!(await guard()).ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));
  let url = String(body.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    // 最多跟 3 跳 redirect，每一跳都重新驗 SSRF（防 redirect 繞進內網）
    let current = url;
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicUrl(current); // 不合法直接 throw → 下面 catch
      res = await fetch(current, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIIslandBot/1.0)" },
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
    if (!res) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });

    // 只抓 HTML、且限制讀取大小（防大檔 / 非文字）
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype)) {
      return NextResponse.json({ error: "not_html", message: "目標不是網頁" }, { status: 415 });
    }
    const raw = await res.text();
    const html = raw.slice(0, 200_000);
    const title =
      pick(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
                  /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
                  /<title[^>]*>([^<]+)<\/title>/i]) || current;
    const description = pick(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);
    return NextResponse.json({ title, description, url: current });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", message: e?.message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

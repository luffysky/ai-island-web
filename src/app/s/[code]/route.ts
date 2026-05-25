import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 短連結 redirect — /s/<code>
 *
 * 流程：
 *   1. 查 utm_links 拿 dest_url + utm_*
 *   2. 補 utm_* 到目標 URL
 *   3. 寫點擊統計 (RPC 或 update)、用 client IP 抓 unique
 *   4. 302 redirect
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get("host")}`;

  const admin = createSupabaseAdmin();
  const { data: link } = await admin
    .from("utm_links")
    .select("*")
    .eq("short_code", code)
    .is("archived_at", null)
    .maybeSingle();

  if (!link) {
    return NextResponse.redirect(new URL("/", SITE_URL), 302);
  }

  // 寫點擊統計 (非阻塞)
  admin
    .from("utm_links")
    .update({ click_count: ((link as any).click_count ?? 0) + 1 })
    .eq("id", (link as any).id)
    .then(() => {}, () => {});

  // 組目標 URL + UTM
  let dest: URL;
  try {
    const raw = (link as any).dest_url;
    dest = new URL(raw.startsWith("http") ? raw : `${SITE_URL}${raw.startsWith("/") ? raw : "/" + raw}`);
  } catch {
    return NextResponse.redirect(new URL("/", SITE_URL), 302);
  }
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const v = (link as any)[k];
    if (v && !dest.searchParams.has(k)) dest.searchParams.set(k, v);
  }

  return NextResponse.redirect(dest, 302);
}

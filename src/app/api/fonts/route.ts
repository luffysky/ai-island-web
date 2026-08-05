import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/fonts — 公開字體目錄（給前台 font-loader 與主題工作室用）。
 *
 * 只回 enabled 的字體（RLS `fonts_public_read` 已限定 enabled=true）。
 * 每個字重的檔案路徑（file_manifest[weight].path）解析成 Supabase Storage 公開 URL。
 * v1：整檔 @font-face、不做 subsetting。
 *
 * 回傳：
 *   {
 *     fonts: [{ id, slug, family, category, weights, fallback_stack, files: { [weight]: url } }],
 *     pairs: [{ id, name, heading_font_id, body_font_id, ui_font_id, mood_tags, sort_order }]
 *   }
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data: fontRows, error: fontErr } = await supabase
      .from("fonts")
      .select(
        "id, slug, family, category, weights, fallback_stack, file_manifest, css_url, enabled, sort_order",
      )
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    if (fontErr) {
      return NextResponse.json({ error: fontErr.message, fonts: [], pairs: [] }, { status: 500 });
    }

    const bucket = supabase.storage.from("fonts");

    const fonts = (fontRows ?? []).map((row: any) => {
      const manifest = (row.file_manifest ?? {}) as Record<string, { path?: string }>;
      const weights: number[] = Array.isArray(row.weights) && row.weights.length > 0
        ? row.weights
        : Object.keys(manifest).map((w) => Number(w)).filter((n) => Number.isFinite(n));

      const files: Record<string, string> = {};
      for (const w of weights) {
        const entry = manifest[String(w)];
        const path = entry?.path;
        if (!path) continue;
        const { data } = bucket.getPublicUrl(path);
        if (data?.publicUrl) files[String(w)] = data.publicUrl;
      }

      return {
        id: row.id,
        slug: row.slug,
        family: row.family,
        category: row.category,
        weights,
        fallback_stack: row.fallback_stack ?? null,
        files,
        css_url: row.css_url ?? null,
      };
    });

    const { data: pairRows } = await supabase
      .from("font_pairs")
      .select("id, name, heading_font_id, body_font_id, ui_font_id, mood_tags, sort_order, enabled")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    return NextResponse.json({ fonts, pairs: pairRows ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "fonts_fetch_failed", fonts: [], pairs: [] },
      { status: 500 },
    );
  }
}

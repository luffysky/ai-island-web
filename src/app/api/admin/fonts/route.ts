import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  FONT_BUCKET as BUCKET,
  FONT_MAX_MB,
  FONT_MAX_SIZE,
  FONT_SLUG_RE as SLUG_RE,
  fontExtOf,
  fontObjectPath,
  normalizeFontWeight,
} from "@/lib/font-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/fonts  (JSON；字型檔已先由瀏覽器經 /api/admin/fonts/upload-url 直傳 Storage)
 *   filename:     原始檔名（判斷副檔名）
 *   family:       顯示名稱（CSS font-family）
 *   slug:         唯一代號 ^[a-z0-9-]+$
 *   category:     分類（sans/serif/mono/display/handwriting…）
 *   weight:       字重（預設 400）
 *   languages:    支援語言 csv（例：zh-Hant,en）
 *   license_name / license_url:  授權（建議 OFL）
 *
 * 檔案位於 bucket `fonts` 的 `${slug}/${weight}.${ext}`，
 * 依 slug upsert `fonts` 一列（同 slug → 合併 weights + file_manifest）。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const family = String(body.family ?? "").trim();
  const displayName = String(body.display_name ?? "").trim() || null;
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const category = String(body.category ?? "sans").trim() || "sans";
  const weight = normalizeFontWeight(body.weight);
  const languages = String(body.languages ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const licenseName = String(body.license_name ?? "").trim() || null;
  const licenseUrl = String(body.license_url ?? "").trim() || null;

  if (!family) {
    return NextResponse.json({ error: "family_required" }, { status: 400 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_slug", message: "slug 只能小寫英數與連字號" }, { status: 400 });
  }
  const ext = fontExtOf(String(body.filename ?? ""));
  if (!ext) {
    return NextResponse.json({ error: "invalid_file_type", message: "只接受 .ttf/.otf/.woff/.woff2" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const path = fontObjectPath(slug, weight, ext);

  try {
    // 檔案是瀏覽器直傳的 → 這裡確認真的傳上去了，並在 server 端複查大小
    const objectName = path.slice(slug.length + 1);
    const { data: listed, error: listErr } = await admin.storage
      .from(BUCKET)
      .list(slug, { search: objectName, limit: 10 });
    if (listErr) {
      return NextResponse.json({ error: "upload_check_failed", message: listErr.message }, { status: 500 });
    }
    const uploaded = (listed ?? []).find((o) => o.name === objectName);
    if (!uploaded) {
      return NextResponse.json({ error: "file_required", message: "找不到已上傳的字型檔，請重新上傳" }, { status: 400 });
    }
    if (Number(uploaded.metadata?.size ?? 0) > FONT_MAX_SIZE) {
      await admin.storage.from(BUCKET).remove([path]).catch(() => {});
      return NextResponse.json({ error: "too_large", message: `字型檔不可超過 ${FONT_MAX_MB} MB` }, { status: 400 });
    }

    // 讀既有列（同 slug → 合併）
    const { data: existing } = await admin
      .from("fonts")
      .select("id, weights, file_manifest, supported_languages")
      .eq("slug", slug)
      .maybeSingle();

    const prevManifest = ((existing as any)?.file_manifest ?? {}) as Record<string, { path: string }>;
    const manifest = { ...prevManifest, [String(weight)]: { path } };

    const prevWeights: number[] = Array.isArray((existing as any)?.weights) ? (existing as any).weights : [];
    const weights = Array.from(new Set([...prevWeights, weight])).sort((a, b) => a - b);

    const prevLangs: string[] = Array.isArray((existing as any)?.supported_languages)
      ? (existing as any).supported_languages
      : [];
    const supportedLanguages = languages.length > 0
      ? Array.from(new Set([...prevLangs, ...languages]))
      : prevLangs;

    const row: Record<string, unknown> = {
      slug,
      family,
      display_name: displayName,
      category,
      weights,
      file_manifest: manifest,
      supported_languages: supportedLanguages,
      enabled: true,
      updated_at: new Date().toISOString(),
    };
    if (licenseName) row.license_name = licenseName;
    if (licenseUrl) row.license_url = licenseUrl;

    const { data: saved, error: dbErr } = await admin
      .from("fonts")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();

    if (dbErr) {
      return NextResponse.json({ error: "db_upsert_failed", message: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, font: saved });
  } catch (e: any) {
    return NextResponse.json({ error: "font_install_failed", message: e?.message ?? "未知錯誤" }, { status: 500 });
  }
}

/** GET /api/admin/fonts — 列出所有字體（含停用），給後台表格。 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("fonts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, fonts: [] }, { status: 500 });
  }
  return NextResponse.json({ fonts: data ?? [] });
}

/**
 * PATCH /api/admin/fonts?slug=xxx
 * body: 可含 enabled / family / category / fallback_stack / sort_order / license_name / license_url
 * 常用途：切換 enabled。
 */
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = ["enabled", "family", "display_name", "category", "fallback_stack", "sort_order", "license_name", "license_url", "preview_text"] as const;
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("fonts")
    .update(patch)
    .eq("slug", slug)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, font: data });
}

/** DELETE /api/admin/fonts?slug=xxx — 刪列 + 清該 slug 的 storage 檔案。 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 先撈 manifest 找出要刪的物件路徑
  const { data: row } = await admin
    .from("fonts")
    .select("file_manifest")
    .eq("slug", slug)
    .maybeSingle();

  const manifest = ((row as any)?.file_manifest ?? {}) as Record<string, { path?: string }>;
  const paths = Object.values(manifest)
    .map((m) => m?.path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  if (paths.length > 0) {
    // 忽略 storage 刪除錯誤（檔案可能已不在）；DB 列一定要刪掉
    await admin.storage.from(BUCKET).remove(paths).catch(() => {});
  }

  const { error } = await admin.from("fonts").delete().eq("slug", slug);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

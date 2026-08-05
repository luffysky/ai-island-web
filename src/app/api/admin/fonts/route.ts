import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "fonts";
const SLUG_RE = /^[a-z0-9-]+$/;
const MB = 1024 * 1024;
const MAX_SIZE = 15 * MB; // 整檔字型，壓上限防 OOM

const EXT_CONTENT_TYPE: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

function extOf(name: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  const ext = m?.[1]?.toLowerCase();
  return ext && ext in EXT_CONTENT_TYPE ? ext : null;
}

/**
 * POST /api/admin/fonts  (multipart/form-data)
 *   file:         字型檔 (.ttf/.otf/.woff/.woff2)
 *   family:       顯示名稱（CSS font-family）
 *   slug:         唯一代號 ^[a-z0-9-]+$
 *   category:     分類（sans/serif/mono/display/handwriting…）
 *   weight:       字重（預設 400）
 *   languages:    支援語言 csv（例：zh-Hant,en）
 *   license_name / license_url:  授權（建議 OFL）
 *
 * 上傳到 bucket `fonts` 的 `${slug}/${weight}.${ext}`（upsert）、
 * 依 slug upsert `fonts` 一列（同 slug → 合併 weights + file_manifest）。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = form.get("file");
  const family = String(form.get("family") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const category = String(form.get("category") ?? "sans").trim() || "sans";
  const weightRaw = Number(form.get("weight") ?? 400);
  const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? Math.round(weightRaw) : 400;
  const languages = String(form.get("languages") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const licenseName = String(form.get("license_name") ?? "").trim() || null;
  const licenseUrl = String(form.get("license_url") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (!family) {
    return NextResponse.json({ error: "family_required" }, { status: 400 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_slug", message: "slug 只能小寫英數與連字號" }, { status: 400 });
  }
  const ext = extOf(file.name);
  if (!ext) {
    return NextResponse.json({ error: "invalid_file_type", message: "只接受 .ttf/.otf/.woff/.woff2" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large", message: `字型檔不可超過 ${MAX_SIZE / MB} MB` }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const path = `${slug}/${weight}.${ext}`;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: EXT_CONTENT_TYPE[ext], upsert: true });
    if (upErr) {
      return NextResponse.json({ error: "upload_failed", message: upErr.message }, { status: 500 });
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
  const allowed = ["enabled", "family", "category", "fallback_stack", "sort_order", "license_name", "license_url", "preview_text"] as const;
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

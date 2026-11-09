import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  FONT_BUCKET,
  FONT_CONTENT_TYPE,
  FONT_MAX_MB,
  FONT_MAX_SIZE,
  FONT_SLUG_RE,
  fontExtOf,
  fontObjectPath,
  normalizeFontWeight,
} from "@/lib/font-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { slug, weight, filename, size } → 回傳簽名上傳 token，瀏覽器直接傳到 fonts bucket。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const slug = String(body?.slug ?? "").trim().toLowerCase();
  const ext = fontExtOf(String(body?.filename ?? ""));
  const size = Number(body?.size);

  if (!FONT_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "invalid_slug", message: "slug 只能小寫英數與連字號" }, { status: 400 });
  }
  if (!ext) {
    return NextResponse.json({ error: "invalid_file_type", message: "只接受 .ttf/.otf/.woff/.woff2" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > FONT_MAX_SIZE) {
    return NextResponse.json({ error: "too_large", message: `字型檔不可超過 ${FONT_MAX_MB} MB` }, { status: 400 });
  }

  const path = fontObjectPath(slug, normalizeFontWeight(body?.weight), ext);
  const { data, error } = await createSupabaseAdmin()
    .storage.from(FONT_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    return NextResponse.json({ error: "sign_failed", message: error?.message ?? "無法建立上傳連結" }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token, contentType: FONT_CONTENT_TYPE[ext] });
}

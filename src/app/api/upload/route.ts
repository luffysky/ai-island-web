import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

const ALLOWED_FOLDERS = new Set([
  "avatar",
  "blog",
  "forum",
  "comment",
  "ai-attach",
  "portfolio",
  "social",
  "misc",
]);

/**
 * POST /api/upload  (multipart/form-data)
 *   file:   File (image)
 *   folder: string (avatar / blog / forum / comment / ai-attach / portfolio / social / misc)
 *
 * 認證：必須登入。每 user 60 秒 30 次。
 * 上傳成功寫一筆 media_assets、回 { url, id }。
 */
export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "r2_not_configured", message: "管理員尚未設定 R2 儲存" }, { status: 503 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // rate limit per user (30 uploads / 60s)
  const rl = rateLimit(`upload:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", retryAfter: rl.retryAfter }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = form.get("file");
  const folderInput = String(form.get("folder") ?? "misc");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "type_not_allowed", message: "只接受 JPG / PNG / WebP / GIF / SVG" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large", message: "檔案不可超過 8 MB" }, { status: 400 });
  }
  const folder = ALLOWED_FOLDERS.has(folderInput) ? folderInput : "misc";

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(buf, file.name, file.type, `${folder}/${user.id.slice(0, 8)}`);

    // 寫 media_assets（service role bypass RLS、確保寫入）
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("media_assets")
      .insert({
        user_id: user.id,
        url,
        filename: file.name.slice(0, 200),
        mime_type: file.type,
        size_bytes: file.size,
        folder,
      })
      .select("id")
      .single();

    if (error) {
      // 上傳成功但 DB 寫入失敗、url 還是可用、回 url 不擋
      return NextResponse.json({ url, warning: `media_assets_insert_failed: ${error.message}` });
    }

    return NextResponse.json({ ok: true, url, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: "upload_failed", message: e?.message ?? "未知錯誤" }, { status: 500 });
  }
}

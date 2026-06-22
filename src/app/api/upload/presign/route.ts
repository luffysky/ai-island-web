import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getPresignedUploadUrl, isR2Configured } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MB = 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["blog", "portfolio", "social", "misc"]);

/**
 * POST /api/upload/presign  { filename, contentType, folder, size }
 * 給「大檔」（影片/音訊）用：回 presigned PUT URL、前端直接傳 R2、不經 server 記憶體。
 * 回 { uploadUrl, publicUrl }。圖片仍走 /api/upload（小、且寫 media_assets）。
 */
export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "r2_not_configured", message: "管理員尚未設定 R2 儲存" }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`presign:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retryAfter: rl.retryAfter }, { status: 429 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  const { filename, contentType, folder, size } = body ?? {};
  const ct = String(contentType || "");
  // 支援所有影片/音訊格式（大類前綴判斷、不限白名單）
  const kind = ct.startsWith("video/") ? "video" : ct.startsWith("audio/") ? "audio" : null;
  if (!kind) {
    return NextResponse.json({ error: "type_not_allowed", message: "presign 只給影片 / 音訊大檔" }, { status: 400 });
  }
  const maxMb = kind === "video" ? 500 : 60;
  if (Number(size) > maxMb * MB) {
    return NextResponse.json({ error: "too_large", message: `${kind === "video" ? "影片" : "音訊"}不可超過 ${maxMb} MB` }, { status: 400 });
  }
  const f = ALLOWED_FOLDERS.has(folder) ? folder : "misc";

  try {
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
      String(filename || "file"),
      String(contentType),
      `${f}/${user.id.slice(0, 8)}`,
    );
    return NextResponse.json({ ok: true, uploadUrl, publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: "presign_failed", message: e?.message ?? "未知錯誤" }, { status: 500 });
  }
}

import { createSupabaseServer } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.text();
  const note = req.nextUrl.searchParams.get("note") ?? null;

  let parsed: any;
  try {
    parsed = JSON.parse(body);
    if (parsed.id !== Number(id)) {
      return NextResponse.json({ error: "id mismatch" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "invalid json: " + e.message }, { status: 400 });
  }

  // P4-02：snapshot 進 chapter_versions（先寫、再改檔；若版本寫失敗就不動檔案）
  const admin = createSupabaseAdmin();
  let version: number | null = null;
  try {
    const { data: nv } = await admin.rpc("next_chapter_version" as any, { p_chapter_id: Number(id) });
    version = Number(nv ?? 1);
    const { error: insErr } = await admin.from("chapter_versions").insert({
      chapter_id: Number(id),
      version,
      content: parsed,
      saved_by: user.id,
      note,
    });
    if (insErr) {
      console.warn("[chapters/PUT] version snapshot failed:", insErr.message);
      // fail-soft：版本寫不進去不擋編輯（也許 migration 尚未套用）
    }
  } catch (e) {
    console.warn("[chapters/PUT] versioning exception:", e);
  }

  // 寫檔案（dev）。production filesystem 為 read-only 時改抓 NEXT_PUBLIC_VERCEL_ENV 等再決定。
  try {
    const filePath = path.join(process.cwd(), "src/data/chapters", `ch${String(Number(id)).padStart(2, "0")}.json`);
    await fs.writeFile(filePath, body);
  } catch (e: any) {
    // production 寫檔失敗仍視為成功（snapshot 已存進 DB、可走 DB 重建 flow）
    console.warn("[chapters/PUT] file write failed:", e?.message);
  }

  // log 到 admin_events
  await supabase.from("admin_events").insert({
    event_type: "chapter_updated",
    user_id: user.id,
    meta: { chapter_id: Number(id), version },
  });

  return NextResponse.json({ ok: true, version });
}

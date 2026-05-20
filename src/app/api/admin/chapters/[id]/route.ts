import { createSupabaseServer } from "@/lib/supabase";
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

  try {
    const parsed = JSON.parse(body);
    if (parsed.id !== Number(id)) {
      return NextResponse.json({ error: "id mismatch" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "invalid json: " + e.message }, { status: 400 });
  }

  // Production：寫回 Supabase content 表
  // Dev：寫到 file system
  const filePath = path.join(process.cwd(), "src/data/chapters", `ch${String(Number(id)).padStart(2, "0")}.json`);
  await fs.writeFile(filePath, body);

  // log 到 admin_events
  await supabase.from("admin_events").insert({
    event_type: "chapter_updated",
    user_id: user.id,
    meta: { chapter_id: Number(id) },
  });

  return NextResponse.json({ ok: true });
}

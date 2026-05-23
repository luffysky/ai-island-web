import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "editor"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const path = String(body.path ?? "");
  if (!path.startsWith("/")) return NextResponse.json({ error: "invalid_path" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("seo_overrides").upsert({
    path,
    title: body.title ?? null,
    description: body.description ?? null,
    og_image: body.og_image ?? null,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: "path" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireStaff(["admin", "editor"]);
  if (!gate.ok) return gate.response;

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
    updated_by: gate.userId,
  }, { onConflict: "path" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

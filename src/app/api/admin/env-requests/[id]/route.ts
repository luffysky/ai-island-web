import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["done", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * PATCH /api/admin/env-requests/[id]
 * 標完成 / 拒絕（任何 admin 都可、有 audit）。
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("env_change_requests")
    .update({
      status: parsed.data.status,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolved_by_username: profile.username,
      resolved_note: parsed.data.note ?? null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found_or_already_resolved" }, { status: 404 });

  return NextResponse.json({ ok: true, request: data });
}

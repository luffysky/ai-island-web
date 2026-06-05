import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["owner", "admin", "teacher", "assistant", "editor"].includes(profile?.role ?? "")) {
    return new Response("forbidden", { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("submissions")
    .select(`
      id, submitted_at, score, graded_at,
      assignment:assignments!submissions_assignment_id_fkey(title, max_score),
      user:profiles!submissions_user_id_fkey(username, display_name)
    `)
    .order("submitted_at", { ascending: false })
    .limit(5000);

  const headers = ["submission_id", "assignment_title", "max_score", "username", "display_name", "submitted_at", "score", "graded_at"];
  const rows = (data ?? []).map((s: any) => [
    s.id,
    s.assignment?.title ?? "",
    s.assignment?.max_score ?? "",
    s.user?.username ?? "",
    s.user?.display_name ?? "",
    s.submitted_at,
    s.score ?? "",
    s.graded_at ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

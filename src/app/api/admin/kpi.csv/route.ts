import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if ((prof as any)?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const days = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10) || 30));
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [{ data: signups }, { data: active }, { data: lessons }] = await Promise.all([
    admin.from("profiles").select("created_at").gte("created_at", since).limit(10000),
    admin.from("profiles").select("last_active_at").gte("last_active_at", since).is("banned_at", null).limit(10000),
    admin.from("lesson_progress").select("completed_at").gte("completed_at", since).limit(50000),
  ] as any);

  const byDay = new Map<string, { date: string; signups: number; active: number; lessons: number }>();
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const k = new Date(now - i * 86400_000).toISOString().slice(0, 10);
    byDay.set(k, { date: k, signups: 0, active: 0, lessons: 0 });
  }
  for (const r of (signups as any[]) ?? []) {
    const v = byDay.get(String(r.created_at).slice(0, 10));
    if (v) v.signups++;
  }
  for (const r of (active as any[]) ?? []) {
    const v = byDay.get(String(r.last_active_at).slice(0, 10));
    if (v) v.active++;
  }
  for (const r of (lessons as any[]) ?? []) {
    const v = byDay.get(String(r.completed_at).slice(0, 10));
    if (v) v.lessons++;
  }

  const rows = [["date", "signups", "active", "lessons_done"]];
  for (const v of byDay.values()) rows.push([v.date, String(v.signups), String(v.active), String(v.lessons)]);
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="kpi-${days}d-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

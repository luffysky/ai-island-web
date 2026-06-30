import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { fetchSurprisingPairs } from "@/lib/idea-ai";
import { requireAdmin as adminGate } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const gate = await adminGate();
  return { user: gate.ok ? { id: gate.userId } : (null as null), ok: gate.ok };
}

/** GET ?folder= → { pairs } 語意意外配對（驚喜連結引擎） */
export async function GET(req: NextRequest) {
  if (!(await guard()).ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const folder = req.nextUrl.searchParams.get("folder") || null;
  const pairs = await fetchSurprisingPairs({ count: 8, folder });
  return NextResponse.json({ pairs });
}

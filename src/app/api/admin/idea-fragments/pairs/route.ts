import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { fetchSurprisingPairs } from "@/lib/idea-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  return p?.role === "admin" || (p as any)?.is_owner === true;
}

/** GET ?folder= → { pairs } 語意意外配對（驚喜連結引擎） */
export async function GET(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const folder = req.nextUrl.searchParams.get("folder") || null;
  const pairs = await fetchSurprisingPairs({ count: 8, folder });
  return NextResponse.json({ pairs });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const path = req.nextUrl.searchParams.get("path");
  if (!path || !path.startsWith("/")) return NextResponse.json({ error: "invalid_path" }, { status: 400 });

  try {
    revalidatePath(path);
    return NextResponse.json({ ok: true, path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "revalidate_failed" }, { status: 500 });
  }
}

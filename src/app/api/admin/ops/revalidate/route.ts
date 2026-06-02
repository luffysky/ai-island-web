import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const path = req.nextUrl.searchParams.get("path");
  if (!path || !path.startsWith("/")) return NextResponse.json({ error: "invalid_path" }, { status: 400 });

  try {
    revalidatePath(path);
    return NextResponse.json({ ok: true, path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "revalidate_failed" }, { status: 500 });
  }
}

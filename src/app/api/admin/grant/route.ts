import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { GRANT_DOCS } from "@/data/grant-content";

export const dynamic = "force-dynamic";

// 補助 / 競賽作戰室內容：只有登入後台的管理者看得到。
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ docs: GRANT_DOCS });
}

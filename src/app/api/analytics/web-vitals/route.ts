import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB", "FID"]);

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!ALLOWED_METRICS.has(String(body.metric))) {
    return NextResponse.json({ error: "invalid_metric" }, { status: 400 });
  }
  if (typeof body.value !== "number" || !isFinite(body.value)) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }

  const { error } = await supabase.from("web_vitals").insert({
    metric: body.metric,
    value: body.value,
    rating: body.rating ?? null,
    page_path: typeof body.page_path === "string" ? body.page_path.slice(0, 200) : null,
    navigation_type: typeof body.navigation_type === "string" ? body.navigation_type : null,
    device_type: typeof body.device_type === "string" ? body.device_type : null,
    user_id: user?.id ?? null,
  });

  if (error) {
    console.warn("[web-vitals] insert failed:", error.message);
    return NextResponse.json({ ok: true, skipped: error.message });
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { zodiacFromBirthDate } from "@/lib/fortune";
import { toSolarDate } from "@/lib/bazi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET：讀本人生日資料（沒建過回 { profile: null }） */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("fortune_profiles")
    .select("birth_date, birth_time, gender, calendar_type, zodiac")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ profile: data ?? null });
}

/** PUT：建立/更新生日資料（自動算西洋星座存起來） */
export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`fortune:profile:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const birthDate = String(body.birthDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ error: "invalid_birth_date" }, { status: 400 });
  }
  const calendarType = body.calendarType === "lunar" ? "lunar" : "solar";

  // 西洋星座依「國曆」月/日算：農曆生日先轉國曆、否則星座會錯。
  const solarDate = toSolarDate(birthDate, calendarType);
  const zodiac = solarDate ? zodiacFromBirthDate(solarDate) : null;
  if (!zodiac) return NextResponse.json({ error: "invalid_birth_date" }, { status: 400 });

  const birthTime = typeof body.birthTime === "string" && /^\d{2}:\d{2}$/.test(body.birthTime)
    ? body.birthTime : null;
  const gender = ["male", "female", "other"].includes(body.gender) ? body.gender : null;

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("fortune_profiles")
    .upsert({
      user_id: user.id,
      birth_date: birthDate,
      birth_time: birthTime,
      gender,
      calendar_type: calendarType,
      zodiac,
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  // 改了生日 → 今天的運勢快取作廢、重生
  await admin.from("fortune_daily").delete().eq("user_id", user.id).eq("kind", "daily");

  return NextResponse.json({ ok: true, zodiac });
}

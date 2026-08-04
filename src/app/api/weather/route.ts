import { NextRequest, NextResponse } from "next/server";
import { getDailyWeather, getCityWeather, deterministicAdvice, weatherEmoji } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/weather?lat=&lng=  或  ?city=
// 用使用者「當下位置」的經緯度即時查天氣 + 生活建議（Open-Meteo 免費）。
// ＊隱私：lat/lng 只用於這次查詢、不儲存（呼應 /api/me/geolocation 的「只存縣市」承諾）。
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const city = (sp.get("city") ?? "").trim();

  let w = null;
  if (Number.isFinite(lat) && Number.isFinite(lng)) w = await getDailyWeather(lat, lng);
  else if (city) w = await getCityWeather(city);
  else return NextResponse.json({ error: "缺 lat/lng 或 city" }, { status: 400 });

  if (!w) return NextResponse.json({ error: "查不到天氣，稍後再試" }, { status: 404 });
  return NextResponse.json({
    weather: { ...w, emoji: weatherEmoji(w.code) },
    advice: deterministicAdvice(w),
  });
}

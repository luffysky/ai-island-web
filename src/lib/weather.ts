// 每日晨報 · 天氣（§5.1/5.2）。來源＝Open-Meteo（免 key、免費、含逐日溫度/降雨機率/紫外線）。
// 純函式（WMO 代碼→中文、確定性生活建議、原始 JSON→結構化）可單元測試；fetch 函式防呆（逾時/失敗→null）。
// 零成本：daily-brief cron 一天呼叫一次；同城市可用 weather_cache 表去重（見 cron 整合）。

export interface DailyWeather {
  date: string;          // YYYY-MM-DD
  code: number;          // WMO weather code
  desc: string;          // 中文天氣描述
  tempMax: number;       // °C
  tempMin: number;       // °C
  tempRange: number;     // 溫差 °C
  precipProb: number;    // 降雨機率 %
  uvMax: number;         // 紫外線指數
  place?: string;        // 地點名（geocode 回填）
  feelsLike?: number;    // 體感溫度 °C（current apparent_temperature）
  humidity?: number;     // 相對濕度 %
  windSpeed?: number;    // 風速 km/h
  sunrise?: string;      // 日出 HH:MM
  sunset?: string;       // 日落 HH:MM
}

// WMO weather interpretation codes → 中文（Open-Meteo 用這套）。
const WMO: Record<number, string> = {
  0: "晴天", 1: "大致晴朗", 2: "局部多雲", 3: "陰天",
  45: "有霧", 48: "凍霧",
  51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨（較大）",
  56: "凍毛雨", 57: "凍毛雨（較大）",
  61: "小雨", 63: "中雨", 65: "大雨",
  66: "凍雨", 67: "凍雨（較大）",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "霰",
  80: "陣雨", 81: "陣雨", 82: "強陣雨",
  85: "陣雪", 86: "強陣雪",
  95: "雷雨", 96: "雷雨夾冰雹", 99: "強雷雨夾冰雹",
};

export function weatherCodeToText(code: number): string {
  return WMO[code] ?? "多雲";
}

/** WMO 代碼 → emoji（晨報卡用）。 */
export function weatherEmoji(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "🌡️";
}

/** Open-Meteo forecast 原始 JSON → 結構化（純函式、可測；壞資料回 null）。 */
export function parseForecast(json: any): DailyWeather | null {
  const d = json?.daily;
  if (!d || !Array.isArray(d.time) || !d.time.length) return null;
  const code = Number(d.weather_code?.[0] ?? 0);
  const tempMax = Math.round(Number(d.temperature_2m_max?.[0] ?? 0));
  const tempMin = Math.round(Number(d.temperature_2m_min?.[0] ?? 0));
  const precipProb = Math.round(Number(d.precipitation_probability_max?.[0] ?? 0));
  const uvMax = Math.round(Number(d.uv_index_max?.[0] ?? 0));
  const cur = json?.current ?? {};
  const hhmm = (iso: any) => (typeof iso === "string" && iso.length >= 16 ? iso.slice(11, 16) : undefined);
  return {
    date: String(d.time[0]),
    code, desc: weatherCodeToText(code),
    tempMax, tempMin, tempRange: Math.max(0, tempMax - tempMin),
    precipProb, uvMax,
    feelsLike: cur.apparent_temperature != null ? Math.round(Number(cur.apparent_temperature)) : undefined,
    humidity: cur.relative_humidity_2m != null ? Math.round(Number(cur.relative_humidity_2m)) : undefined,
    windSpeed: cur.wind_speed_10m != null ? Math.round(Number(cur.wind_speed_10m)) : undefined,
    sunrise: hhmm(d.sunrise?.[0]),
    sunset: hhmm(d.sunset?.[0]),
  };
}

/** 確定性生活建議（零 AI、可測）：帶傘/穿搭/紫外線/溫差/運動曬衣。當 LLM 沒 key 或省錢時用。 */
export function deterministicAdvice(w: DailyWeather): string[] {
  const tips: string[] = [];
  if (w.precipProb >= 60) tips.push("降雨機率高，記得帶傘 ☔");
  else if (w.precipProb >= 30) tips.push("可能有雨，帶把傘比較保險");
  if (w.tempMax >= 30) tips.push("天氣炎熱，多補水、避開正午曝曬");
  else if (w.tempMin <= 12) tips.push("偏冷，出門加件外套 🧥");
  if (w.tempRange >= 8) tips.push(`日夜溫差大（${w.tempRange}°C），洋蔥式穿搭、留意心血管`);
  if (w.uvMax >= 8) tips.push("紫外線過量，防曬、戴帽或撐傘");
  else if (w.uvMax >= 6) tips.push("紫外線偏高，記得防曬");
  if (w.precipProb < 30 && (w.code === 0 || w.code === 1)) tips.push("天氣不錯，適合曬衣、戶外活動 🌤️");
  if (!tips.length) tips.push("天氣平穩，good day！");
  return tips;
}

/** 給 LLM 生活建議的 prompt（§5.2；護欄：不做醫療斷言）。 */
export function buildWeatherAdvicePrompt(w: DailyWeather): { system: string; user: string } {
  return {
    system: "你是貼心的生活助理。根據今天天氣，給 2-3 句實用、正向的生活建議（穿搭／帶不帶傘／防曬／適不適合曬衣運動／溫差健康提醒）。用繁體中文、口語、每句短。不要做醫療診斷或用藥建議，只給一般生活提醒。不要重複數據本身。",
    user: `今天天氣：${w.desc}，高溫 ${w.tempMax}°C／低溫 ${w.tempMin}°C（溫差 ${w.tempRange}°C），降雨機率 ${w.precipProb}%，紫外線指數 ${w.uvMax}${w.place ? `，地點 ${w.place}` : ""}。`,
  };
}

const UA = "AI-Island-Weather/1.0";

/** 城市名 → 經緯度（Open-Meteo geocoding，免 key）。失敗回 null。 */
export async function geocodeCity(city: string, country?: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const raw = String(city ?? "").trim();
  if (!raw) return null;
  // Open-Meteo 地理編碼是「單一地名比對」，台灣行政區有兩個坑：
  //  ① 用「台」不用「臺」（臺北市→0 筆、台北市→命中）；② 區/鄉/鎮/市 等後綴常讓它查無（中正區/鶯歌區→0，中正/鶯歌→命中）。
  // → 依序試多個候選：原名 → 台化 → 去尾綴 → 台化+去尾綴，命中就用（優先台灣）。
  const taiwanize = (s: string) => s.replace(/臺/g, "台");
  const strip = (s: string) => s.replace(/[區鄉鎮市里]$/u, "");
  // geo_city 可能是「縣市 區」帶空格（例：新北市 板橋區）→ Open-Meteo 單一地名比對會查 0 筆。
  // 依序試：整串 → 區（較細、通常精準）→ 縣市，每個再做「台化 / 去尾綴」變體，命中即用。
  const parts = raw.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  const bases = Array.from(new Set([raw, ...parts.slice().reverse()]));
  const candidates = Array.from(new Set(
    bases.flatMap((s) => [s, taiwanize(s), strip(s), taiwanize(strip(s))]).map((s) => s.trim()).filter(Boolean),
  ));
  for (const name of candidates) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=zh&format=json`;
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const j = await r.json();
      const list = (j?.results ?? []) as any[];
      if (!list.length) continue;
      // 有指定國家就優先同國；否則台灣優先（本站客群），再退第一筆
      const hit = (country && list.find((x) => x.country_code === country || x.country === country))
        || list.find((x) => x.country_code === "TW") || list[0];
      return { lat: Number(hit.latitude), lng: Number(hit.longitude), name: String(hit.name ?? name) };
    } catch { /* 試下一個候選 */ }
  }
  return null;
}

/** 經緯度 → 今日天氣。失敗回 null。 */
export async function getDailyWeather(lat: number, lng: number): Promise<DailyWeather | null> {
  if (!isFinite(lat) || !isFinite(lng)) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset` +
      `&current=apparent_temperature,relative_humidity_2m,wind_speed_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=1`;
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    return parseForecast(await r.json());
  } catch { return null; }
}

/** 城市名 → 今日天氣（geocode + forecast 一次搞定）。失敗回 null。 */
export async function getCityWeather(city: string, country?: string): Promise<DailyWeather | null> {
  const geo = await geocodeCity(city, country);
  if (!geo) return null;
  const w = await getDailyWeather(geo.lat, geo.lng);
  if (w) w.place = geo.name;
  return w;
}

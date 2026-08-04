"use client";
// 即時天氣卡：讀取使用者「當下位置」（瀏覽器定位）→ 查今日天氣 + 生活建議。
// lat/lng 只用於這次查詢、不儲存（隱私）。定位被拒/不支援 → 明確提示、不擋其他內容。
import { useEffect, useState } from "react";
import { Loader2, MapPin, CloudSun } from "lucide-react";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";

const SAVED_CITY_KEY = "ai_island_weather_pick";

interface W {
  place?: string; emoji: string; desc: string;
  tempMax: number; tempMin: number; tempRange: number; precipProb: number; uvMax: number;
}

export function WeatherCard() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "denied" | "error">("idle");
  const [w, setW] = useState<W | null>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [pick, setPick] = useState<PickedLocation | null>(null);   // 目前選的地區→讓下拉停在上面

  const apply = (d: { weather: W; advice?: string[] }) => { setW(d.weather); setAdvice(d.advice ?? []); setState("done"); };

  // 下拉選好的縣市/區 → 用縣市靜態座標查天氣（不 geocode），顯示地點用使用者選的名字、記住下次直接套用
  const loadPick = async (loc: PickedLocation) => {
    setState("loading"); setPick(loc);
    try {
      const r = await fetch(`/api/weather?lat=${loc.lat}&lng=${loc.lng}`);
      if (!r.ok) { setState("error"); return; }
      const d = await r.json();
      apply({ weather: { ...d.weather, place: `${loc.city}${loc.district}` }, advice: d.advice });
      try { localStorage.setItem(SAVED_CITY_KEY, JSON.stringify(loc)); } catch {}
    } catch { setState("error"); }
  };

  const load = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setState("error"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`/api/weather?lat=${latitude}&lng=${longitude}`);
          if (!r.ok) { setState("error"); return; }
          apply(await r.json());
        } catch { setState("error"); }
      },
      () => setState("denied"),
      { maximumAge: 5 * 60 * 1000, timeout: 8000, enableHighAccuracy: false },
    );
  };

  // 上次選過地區 → 直接套用（不再打擾定位權限）
  useEffect(() => {
    let loc: PickedLocation | null = null;
    try { const s = localStorage.getItem(SAVED_CITY_KEY); if (s) loc = JSON.parse(s); } catch {}
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) loadPick(loc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "done" && w) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="text-4xl leading-none">{w.emoji}</div>
          <div className="min-w-0">
            <div className="text-sm text-black/60 dark:text-white/60 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {w.place ? `${w.place} · ` : ""}{w.desc}
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{w.tempMax}° <span className="text-black/40 dark:text-white/40 text-lg font-normal">/ {w.tempMin}°</span></div>
          </div>
          <div className="ml-auto text-right text-xs text-black/50 dark:text-white/50">
            <div>降雨 {w.precipProb}%</div>
            <div>紫外線 {w.uvMax}</div>
          </div>
        </div>
        {advice.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-black/70 dark:text-white/70">
            {advice.slice(0, 4).map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-500">·</span><span>{t}</span></li>)}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={load} className="text-xs text-black/40 dark:text-white/40 hover:text-amber-500">重新整理</button>
          <LocationPicker value={pick} onPick={loadPick} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
        <CloudSun className="w-4 h-4" /> 今日天氣 · 生活建議
      </div>
      {state === "denied" || state === "error" ? (
        <>
          <p className="text-sm text-black/60 dark:text-white/60 mb-2.5">
            {state === "denied" ? "沒拿到定位權限。" : "定位失敗或暫時查不到。"}可以直接在下面選你的縣市／區看天氣。
          </p>
          <LocationPicker value={pick} onPick={loadPick} />
          <button onClick={load} className="mt-2 block text-xs text-black/40 dark:text-white/40 hover:text-amber-500">或再試一次定位</button>
        </>
      ) : (
        <>
          <p className="text-sm text-black/60 dark:text-white/60 mb-2.5">用你「當下的位置」看今天天氣＋要不要帶傘/防曬/穿搭（位置只用來查這次、不會儲存）。</p>
          <button onClick={load} disabled={state === "loading"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
            {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {state === "loading" ? "定位中…" : "看我這裡的天氣"}
          </button>
          <div className="mt-2.5 text-xs text-black/40 dark:text-white/40">或不想給定位 → 直接選地區：</div>
          <div className="mt-1.5"><LocationPicker value={pick} onPick={loadPick} compact /></div>
        </>
      )}
    </div>
  );
}

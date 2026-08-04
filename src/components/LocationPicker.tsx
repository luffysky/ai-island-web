"use client";
// 縣市 → 區 兩段下拉。選定後直接用「縣市靜態座標」查天氣（不走 Open-Meteo geocode——它對台灣
// 極不可靠：查無、或把「中正區」配到南投的中正）。天氣是縣市級每日概況、市內差異可忽略。
import { useState } from "react";
import { TW_REGIONS, TW_CITY_COORDS } from "@/lib/tw-regions";

export type PickedLocation = { city: string; district: string; lat: number; lng: number };

export function LocationPicker({ onPick, compact }: { onPick: (loc: PickedLocation) => void; compact?: boolean }) {
  const [city, setCity] = useState(TW_REGIONS[0].city);
  const districts = TW_REGIONS.find((r) => r.city === city)?.districts ?? [];
  const [dist, setDist] = useState(districts[0] ?? "");

  // 用實心底色 + 明確字色（並帶 color-scheme）→ 原生下拉展開的選項清單在深/淺色都看得到，
  // 不能用 bg-transparent（展開時瀏覽器給白底，字若淺灰就整片看不到）。
  const sel = "rounded-lg border border-black/15 dark:border-white/20 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 [color-scheme:light] dark:[color-scheme:dark] px-2 py-1.5 text-sm outline-none focus:border-sky-500 min-w-0";
  const opt = "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100";
  const submit = () => { const c = TW_CITY_COORDS[city]; if (c && dist) onPick({ city, district: dist, lat: c.lat, lng: c.lng }); };
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : ""}`}>
      <select value={city} className={sel}
        onChange={(e) => { const c = e.target.value; setCity(c); const d = TW_REGIONS.find((r) => r.city === c)?.districts ?? []; setDist(d[0] ?? ""); }}>
        {TW_REGIONS.map((r) => <option key={r.city} value={r.city} className={opt}>{r.city}</option>)}
      </select>
      <select value={dist} className={sel} onChange={(e) => setDist(e.target.value)}>
        {districts.map((d) => <option key={d} value={d} className={opt}>{d}</option>)}
      </select>
      <button onClick={submit}
        className="shrink-0 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 text-sm">看天氣</button>
    </div>
  );
}

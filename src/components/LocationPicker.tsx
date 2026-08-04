"use client";
// 縣市 → 區 兩段下拉（照抄 Space tw-regions 作法）：選定「區名」交給 /api/weather?city=<區>
// （Open-Meteo geocode 反查座標，不外呼、可離線）。給定位被拒/不想給定位的使用者用。
import { useState } from "react";
import { TW_REGIONS } from "@/lib/tw-regions";

export function LocationPicker({ onPick, compact }: { onPick: (district: string) => void; compact?: boolean }) {
  const [city, setCity] = useState(TW_REGIONS[0].city);
  const districts = TW_REGIONS.find((r) => r.city === city)?.districts ?? [];
  const [dist, setDist] = useState(districts[0] ?? "");

  const sel = "rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-sky-500 min-w-0";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : ""}`}>
      <select value={city} className={sel}
        onChange={(e) => { const c = e.target.value; setCity(c); const d = TW_REGIONS.find((r) => r.city === c)?.districts ?? []; setDist(d[0] ?? ""); }}>
        {TW_REGIONS.map((r) => <option key={r.city} value={r.city}>{r.city}</option>)}
      </select>
      <select value={dist} className={sel} onChange={(e) => setDist(e.target.value)}>
        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <button onClick={() => dist && onPick(dist)}
        className="shrink-0 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 text-sm">看天氣</button>
    </div>
  );
}

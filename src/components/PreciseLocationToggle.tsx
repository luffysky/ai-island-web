"use client";

import { useEffect, useState } from "react";
import { MapPin, Check } from "lucide-react";
import {
  hasPreciseOptIn,
  setPreciseOptIn,
  getPreciseLocation,
} from "@/lib/geo-precise";

export function PreciseLocationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [district, setDistrict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(hasPreciseOptIn());
  }, []);

  const enable = async () => {
    setBusy(true);
    setError(null);
    setPreciseOptIn(true);
    setEnabled(true);
    const geo = await getPreciseLocation();
    if (!geo) {
      setError("無法取得位置（可能拒絕授權或網路問題）");
    } else if (!geo.district) {
      setError("已取得座標但解析不出區（OpenStreetMap 沒對應）");
    } else {
      setDistrict(geo.district);
    }
    setBusy(false);
  };

  const disable = () => {
    setPreciseOptIn(false);
    setEnabled(false);
    setDistrict(null);
    setError(null);
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin size={18} className="text-accent" />
        <h3 className="font-bold">精準位置（區級）</h3>
      </div>
      <p className="text-sm text-fg-muted leading-relaxed">
        預設站台只用 IP 看到城市級。啟用後瀏覽器會請你授權 GPS、用
        OpenStreetMap 把座標轉成「○○區」、寫入站內分析（不會給第三方）。
        每個 session 只查一次。
      </p>

      {enabled ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <Check size={14} />
            <span>已啟用</span>
            {district && (
              <span className="px-2 py-0.5 bg-emerald-500/15 rounded-full text-xs">
                目前偵測：{district}
              </span>
            )}
          </div>
          {error && (
            <p className="text-xs text-yellow-300">{error}</p>
          )}
          <button
            onClick={disable}
            className="px-4 py-1.5 text-sm rounded-lg border border-border hover:bg-bg-elevated"
          >
            停用
          </button>
        </div>
      ) : (
        <button
          onClick={enable}
          disabled={busy}
          className="px-4 py-2 text-sm rounded-lg bg-accent text-black font-semibold hover:scale-105 transition disabled:opacity-50"
        >
          {busy ? "請允許瀏覽器位置授權..." : "啟用精準位置"}
        </button>
      )}
    </div>
  );
}

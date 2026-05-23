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

      {/* 8 條好處（透明告知） */}
      <details className="text-xs text-fg-muted">
        <summary className="cursor-pointer text-accent hover:underline mb-2">📋 為什麼我們需要精準位置？（8 條好處）</summary>
        <ul className="space-y-1.5 pl-3">
          <li>🔒 <b>異常登入警告</b>：從陌生城市登入立刻寄 email、防帳號被盜</li>
          <li>🕒 <b>時間在地化</b>：課程截止 / 提醒用你的時區、不用設定</li>
          <li>🌏 <b>語系自動</b>：繁中 / 簡中 / 英文依國家自動帶</li>
          <li>👥 <b>找附近同學</b>：推薦同城市學員、組讀書會</li>
          <li>📅 <b>線下活動</b>：你的城市有 meetup / 工作坊立刻通知</li>
          <li>🇪🇺 <b>GDPR 合規</b>：歐盟用戶自動顯示 cookie banner</li>
          <li>⚡ <b>效能</b>：走最近 CDN、頁面 / 影片 / AI 載入更快</li>
          <li>💳 <b>支付幣別</b>：NTD / USD / JPY 自動帶、信用卡風控更準</li>
        </ul>
        <p className="mt-2 text-fg">
          🔐 承諾：只存大致縣市、不存原始 GPS、不對外販售、隨時可關。
        </p>
      </details>

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

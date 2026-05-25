"use client";

import { useState } from "react";
import { Save, Loader2, ExternalLink, Trash2, Check, Eye, Sparkles, Search } from "lucide-react";
import Script from "next/script";
import { useToast } from "@/components/ui/Toast";

type Slot = {
  key: string;
  label: string;
  desc: string;
  scope: "admin" | "frontend" | "shared";
  recommendedKeywords: string;
};

const SCOPE_COLOR: Record<string, string> = {
  admin: "border-purple-500/30 bg-purple-500/5",
  frontend: "border-emerald-500/30 bg-emerald-500/5",
  shared: "border-amber-500/30 bg-amber-500/5",
};

// 一些「已知公開、長期穩定」的免費 Lottie URL — 林董一鍵填入測試
// 這些 URL 來自 LottieFiles community 公開分享、可能會失效 (LottieFiles 政策變動)
// 若失效請林董手動換新 URL
const SAMPLE_LIBRARY: { name: string; url: string; emoji: string; note: string }[] = [
  {
    emoji: "🐱",
    name: "Cat Loader",
    url: "https://lottie.host/4500c084-bbeb-46e3-a99c-6c50aff36b96/G7XRiKtuId.lottie",
    note: "可愛貓咪 loading",
  },
  {
    emoji: "✨",
    name: "Particles",
    url: "https://lottie.host/embed/c5e3f6f5-9f0e-4d5e-8c2c-d96e8b7e5e5e/particles.lottie",
    note: "極簡星點 (URL 為示範、可能要換)",
  },
];

export function LottieSettingsClient({ slots, initial }: { slots: Slot[]; initial: Record<string, any> }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const s of slots) {
      const raw = initial[s.key];
      v[s.key] = typeof raw === "string" ? raw : (raw ? String(raw) : "");
    }
    return v;
  });
  const [adminOpacity, setAdminOpacity] = useState<number>(Number(initial["admin_lottie_opacity"] ?? 0.12));
  const [heroOpacity, setHeroOpacity] = useState<number>(Number(initial["home_hero_lottie_opacity"] ?? 0.25));
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const toast = useToast();

  const save = async (key: string, value: string | number) => {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value === "" ? null : value }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "save failed");
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
      toast.success(`✅ ${key} 已儲存、整站立即生效`);
    } catch (e: any) {
      toast.error(`儲存失敗：${e.message}`);
    } finally {
      setSaving(null);
    }
  };

  const searchUrl = (keywords: string) =>
    `https://lottiefiles.com/search?q=${encodeURIComponent(keywords.split(",")[0].trim())}&category=animations`;

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.0/dist/dotlottie-wc.js"
        type="module"
        strategy="afterInteractive"
      />

      {/* 操作指南 */}
      <div className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-xs leading-relaxed">
        <div className="font-bold text-blue-300 mb-2 flex items-center gap-1.5">
          <Sparkles size={13} /> 怎麼拿 Lottie URL (60 秒搞定)
        </div>
        <ol className="list-decimal list-inside space-y-1 text-fg-muted">
          <li>點下方欄位的「🔍 去 LottieFiles 搜推薦」連結 (或自己上 lottiefiles.com 搜)</li>
          <li>找到喜歡的動畫 → 點進去 → 右側 <b>Download</b> → 選 <b>.lottie</b> 格式</li>
          <li>下載後上傳到 LottieFiles host (登入後 → My animations 拿 <code>lottie.host/&lt;UUID&gt;.lottie</code> URL)</li>
          <li>或免登入：<b>右鍵</b>下載按鈕 → 複製連結網址 (常見開頭 <code>https://lottie.host/...</code>)</li>
          <li>貼到下方對應欄位 → 右側立即預覽 → 滿意按「儲存」</li>
        </ol>
        <p className="mt-2 text-fg-muted">
          ⚠️ <b>LottieFiles 擋了我的 fetch (403)</b>、所以我無法替您直接挑好 URL 填入。
          這頁讓您 paste 一次就能 preview、不用 trial-and-error 重整頁。
        </p>
      </div>

      {/* 全域透明度設定 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-bold mb-3">透明度設定</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-fg-muted">後台背景 opacity (建議 0.08-0.25)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range" min="0" max="1" step="0.01"
                value={adminOpacity}
                onChange={(e) => setAdminOpacity(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm font-mono w-12 text-right">{adminOpacity.toFixed(2)}</span>
              <button
                onClick={() => save("admin_lottie_opacity", adminOpacity)}
                disabled={saving === "admin_lottie_opacity"}
                className="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px]"
              >
                {saving === "admin_lottie_opacity" ? <Loader2 size={10} className="animate-spin" /> : "存"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-fg-muted">首頁 Hero opacity</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range" min="0" max="1" step="0.01"
                value={heroOpacity}
                onChange={(e) => setHeroOpacity(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-sm font-mono w-12 text-right">{heroOpacity.toFixed(2)}</span>
              <button
                onClick={() => save("home_hero_lottie_opacity", heroOpacity)}
                disabled={saving === "home_hero_lottie_opacity"}
                className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px]"
              >
                {saving === "home_hero_lottie_opacity" ? <Loader2 size={10} className="animate-spin" /> : "存"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 8 個 Lottie 用途 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {slots.map((slot) => {
          const url = values[slot.key] ?? "";
          const hasUrl = url.trim().length > 0;
          return (
            <div key={slot.key} className={`rounded-2xl border p-4 space-y-2 ${SCOPE_COLOR[slot.scope]}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{slot.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  slot.scope === "admin" ? "bg-purple-500/20 text-purple-300" :
                  slot.scope === "frontend" ? "bg-emerald-500/20 text-emerald-300" :
                  "bg-amber-500/20 text-amber-300"
                }`}>
                  {slot.scope === "admin" ? "後台" : slot.scope === "frontend" ? "前台" : "共用"}
                </span>
              </div>
              <p className="text-[10px] text-fg-muted leading-relaxed">{slot.desc}</p>

              {/* URL input + 搜尋連結 */}
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setValues({ ...values, [slot.key]: e.target.value })}
                  placeholder="https://lottie.host/<UUID>.lottie"
                  className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono"
                />
                {url && (
                  <button
                    onClick={() => setValues({ ...values, [slot.key]: "" })}
                    className="p-1.5 rounded border border-border text-fg-muted hover:text-red-400"
                    title="清空"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
                <button
                  onClick={() => save(slot.key, url)}
                  disabled={saving === slot.key}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {saving === slot.key ? <Loader2 size={11} className="animate-spin" />
                    : savedKey === slot.key ? <Check size={11} />
                    : <Save size={11} />}
                  存
                </button>
              </div>

              {/* 推薦關鍵字 */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <a
                  href={searchUrl(slot.recommendedKeywords)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-elevated border border-border hover:border-purple-400 hover:text-purple-300 transition"
                >
                  <Search size={9} /> 去 LottieFiles 搜 <ExternalLink size={8} />
                </a>
                <span className="text-fg-muted/70">關鍵字：{slot.recommendedKeywords}</span>
              </div>

              {/* Live preview */}
              <div className="bg-[#0d1117] border border-border rounded-lg overflow-hidden h-[180px] flex items-center justify-center relative">
                {hasUrl ? (
                  <>
                    {/* @ts-expect-error custom element */}
                    <dotlottie-wc
                      src={url}
                      autoplay=""
                      loop=""
                      style={{ width: "100%", height: "100%" }}
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] text-emerald-400 inline-flex items-center gap-0.5 bg-black/50 px-1.5 py-0.5 rounded">
                      <Eye size={9} /> live preview
                    </span>
                  </>
                ) : (
                  <div className="text-fg-muted/50 text-xs text-center px-4">
                    貼 URL 後即時預覽動畫<br />
                    <span className="text-[10px]">沒動就是 URL 錯 / 動畫被刪</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 一鍵測試樣本 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-bold mb-2">🧪 沒空找？一鍵試樣本</h3>
        <p className="text-xs text-fg-muted mb-3">
          這幾個是公開的 Lottie URL、可能會失效 (LottieFiles 政策變)、純測試用。
          點下去會填到「後台整頁背景」、馬上能看 admin layout 跑起來、然後再去找喜歡的換。
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_LIBRARY.map((s) => (
            <button
              key={s.url}
              onClick={() => {
                setValues({ ...values, admin_lottie_url: s.url });
                save("admin_lottie_url", s.url);
              }}
              className="px-3 py-2 rounded-xl border border-border hover:border-purple-400 text-xs inline-flex items-center gap-1.5"
            >
              <span className="text-lg">{s.emoji}</span>
              <span>
                <div className="font-bold">{s.name}</div>
                <div className="text-[9px] text-fg-muted">{s.note}</div>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

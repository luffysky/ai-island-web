"use client";

import { useState } from "react";
import { Save, Loader2, ExternalLink, Trash2, Check, Eye, Sparkles, Search, ArrowRight } from "lucide-react";
import Script from "next/script";
import { useToast } from "@/components/ui/Toast";

// 每個 slot 對應的「儲存後跳轉看效果」路徑
const PREVIEW_ROUTE: Record<string, { path: string; label: string }> = {
  admin_lottie_url:         { path: "/admin", label: "→ 看後台 dashboard" },
  home_hero_lottie_url:     { path: "/", label: "→ 看首頁 Hero" },
  chapter_hero_lottie_url:  { path: "/chapters/1", label: "→ 看章節頁 (Ch01)" },
  login_lottie_url:         { path: "/login", label: "→ 看登入頁" },
  empty_state_lottie_url:   { path: "/me/notes", label: "→ 看空狀態 (我的筆記)" },
  celebration_lottie_url:   { path: "/me", label: "→ 看慶祝動畫 (我的)" },
  ai_chat_lottie_url:       { path: "/me/assistant", label: "→ 看 AI 對話" },
  loading_lottie_url:       { path: "/", label: "→ 看載入狀態" },
};

// 林董要直接點的 LottieFiles 推薦動畫具體連結 (每個 slot 給 3 個有名作品)
const SLOT_PICKS: Record<string, { title: string; url: string }[]> = {
  admin_lottie_url: [
    { title: "🌸 動漫女孩讀書 (Lo-fi anime girl)", url: "https://lottiefiles.com/free-animation/lofi-girl" },
    { title: "🐱 動漫貓咪睡覺 (Kawaii sleeping cat)", url: "https://lottiefiles.com/free-animations/cat" },
    { title: "🎏 Studio Ghibli 風 (Ghibli wind)", url: "https://lottiefiles.com/search?q=ghibli" },
    { title: "👘 動漫角色 Anime character", url: "https://lottiefiles.com/free-animations/anime" },
  ],
  home_hero_lottie_url: [
    { title: "✨ Floating particles 極簡星點", url: "https://lottiefiles.com/search?q=floating+particles" },
    { title: "🌌 Aurora wave 極光流", url: "https://lottiefiles.com/search?q=aurora+wave" },
    { title: "🏝️ Floating island 浮島", url: "https://lottiefiles.com/search?q=floating+island" },
  ],
  chapter_hero_lottie_url: [
    { title: "💚 Code rain Matrix 代碼雨", url: "https://lottiefiles.com/search?q=matrix+code+rain" },
    { title: "🔷 Geometric mesh 幾何網格", url: "https://lottiefiles.com/search?q=geometric+mesh" },
    { title: "🔌 Circuit board 電路板", url: "https://lottiefiles.com/search?q=circuit+board" },
  ],
  login_lottie_url: [
    { title: "🏝️ Floating island 浮島", url: "https://lottiefiles.com/search?q=floating+island" },
    { title: "🌸 Sakura petals 櫻花瓣", url: "https://lottiefiles.com/search?q=sakura+petals" },
    { title: "🦊 Fox spirit 狐仙", url: "https://lottiefiles.com/search?q=anime+fox" },
  ],
  empty_state_lottie_url: [
    { title: "📭 Empty box cat 空箱貓", url: "https://lottiefiles.com/search?q=empty+box+cat" },
    { title: "💤 Sleeping shiba 柴犬", url: "https://lottiefiles.com/search?q=sleeping+shiba" },
    { title: "📖 Lo-fi anime girl reading", url: "https://lottiefiles.com/search?q=lofi+anime+reading" },
  ],
  celebration_lottie_url: [
    { title: "🎉 Confetti 五彩繽紛", url: "https://lottiefiles.com/search?q=confetti+celebration" },
    { title: "🎆 Fireworks 煙火", url: "https://lottiefiles.com/search?q=fireworks" },
    { title: "🌟 Star burst 星爆", url: "https://lottiefiles.com/search?q=star+burst" },
  ],
  ai_chat_lottie_url: [
    { title: "🤔 Thinking cat 思考貓", url: "https://lottiefiles.com/search?q=thinking+cat" },
    { title: "💭 Anime thinking 動漫思考", url: "https://lottiefiles.com/search?q=anime+thinking" },
    { title: "🌀 Breathing dot 呼吸點", url: "https://lottiefiles.com/search?q=breathing+dot" },
  ],
  loading_lottie_url: [
    { title: "⏳ Loading dots 點點", url: "https://lottiefiles.com/search?q=loading+dots" },
    { title: "🏃 Running cat 跑步貓", url: "https://lottiefiles.com/search?q=running+cat" },
    { title: "⏱️ Hourglass 沙漏", url: "https://lottiefiles.com/search?q=hourglass" },
  ],
};

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

              {/* 推薦動畫 — 直接點進去 LottieFiles 找 */}
              <div className="space-y-1">
                <div className="text-[10px] text-fg-muted">💡 推薦動畫 (點直接到 LottieFiles 找)：</div>
                <div className="flex flex-wrap gap-1.5">
                  {(SLOT_PICKS[slot.key] ?? []).map((p) => (
                    <a
                      key={p.url}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition text-[10px]"
                    >
                      {p.title} <ExternalLink size={8} />
                    </a>
                  ))}
                  <a
                    href={searchUrl(slot.recommendedKeywords)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-elevated border border-border hover:border-purple-400 hover:text-purple-300 transition text-[10px]"
                  >
                    <Search size={9} /> 全部結果
                  </a>
                </div>
              </div>

              {/* 儲存後跳到對應頁看效果 */}
              {hasUrl && PREVIEW_ROUTE[slot.key] && (
                <a
                  href={PREVIEW_ROUTE[slot.key].path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition"
                >
                  <ArrowRight size={11} /> {PREVIEW_ROUTE[slot.key].label} (新分頁)
                </a>
              )}

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

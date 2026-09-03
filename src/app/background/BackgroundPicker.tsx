"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { ProceduralScene } from "@/components/background/ProceduralScene";
import {
  SCENE_CATEGORIES,
  scenesByCategory,
  sceneById,
  type BackgroundSpec,
  type SceneCategory,
} from "@/lib/background/scenes";

/** 8 組精選漸層預設（type:'gradient'）。 */
const GRADIENT_PRESETS: { id: string; label: string; css: string }[] = [
  { id: "sunrise", label: "晨曦", css: "linear-gradient(160deg,#ff9a9e,#fad0c4,#fbc2eb)" },
  { id: "ocean", label: "海洋", css: "linear-gradient(160deg,#2193b0,#6dd5ed)" },
  { id: "polar-night", label: "極夜", css: "linear-gradient(160deg,#0f2027,#203a43,#2c5364)" },
  { id: "peach", label: "蜜桃", css: "linear-gradient(160deg,#ffd9c4,#ffb9cf,#e7b8ff)" },
  { id: "mint", label: "薄荷", css: "linear-gradient(160deg,#c6f2e0,#b9e0f0,#d2d6ff)" },
  { id: "grape", label: "紫醉", css: "linear-gradient(160deg,#654ea3,#eaafc8)" },
  { id: "forest", label: "森林", css: "linear-gradient(160deg,#134e5e,#71b280)" },
  { id: "neon-night", label: "霓虹夜", css: "linear-gradient(160deg,#12103a,#3a1030,#08242e)" },
];

type Tab = SceneCategory | "漸層";
const TABS: Tab[] = [...SCENE_CATEGORIES, "漸層"];

function specEq(a: BackgroundSpec, b: BackgroundSpec): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.type === b.type &&
    a.proceduralId === b.proceduralId &&
    a.gradientCss === b.gradientCss
  );
}

export function BackgroundPicker({ initial }: { initial: BackgroundSpec }) {
  const toast = useToast();
  const [selected, setSelected] = useState<BackgroundSpec>(initial);
  const [tab, setTab] = useState<Tab>(() => {
    if (initial?.type === "gradient") return "漸層";
    if (initial?.type === "procedural") {
      const sc = sceneById(initial.proceduralId);
      if (sc) return sc.category;
    }
    return "天氣";
  });
  const [saving, setSaving] = useState(false);
  // 「只要粒子」：不鋪場景自帶的深色底，只把粒子疊在主題底色上（預設開，見 BackgroundSpec）。
  const [particlesOnly, setParticlesOnly] = useState(initial?.particlesOnly !== false);

  const previewScene = useMemo(
    () => (selected?.type === "procedural" ? sceneById(selected.proceduralId) : null),
    [selected]
  );
  // 靜態場景只有底色、沒粒子 → 這個開關對它無效（一律鋪底色）。
  const particlesOnlyApplies = previewScene?.kind === "dynamic";
  const showBase = !(particlesOnlyApplies && particlesOnly);

  async function apply() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/background/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          selected?.type === "procedural" ? { ...selected, particlesOnly } : (selected ?? { spec: null })
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(`套用失敗：${data?.error ?? res.status}`);
        return;
      }
      // API 已設好 ai_bg cookie；這裡只需通知背景層即時換。
      window.dispatchEvent(new CustomEvent("ai-bg-change", { detail: data.spec ?? null }));
      toast.success(selected ? "背景已套用" : "已清除背景");
    } catch {
      toast.error("套用失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">背景</h1>
        <p className="text-sm text-fg-muted mt-1">
          挑一個動態粒子場景或漸層，套用成你的全站背景。會即時預覽，也會跨裝置同步。
        </p>
        {/* 背景的底色其實來自主題 → 直接把兩頁互相接起來，別讓人以為背景會自己變色。 */}
        <p className="text-xs text-fg-muted mt-2">
          「只要粒子」模式的底色來自你的主題（粒子顏色會自動配合主題深淺）。
          <Link href="/theme-studio" className="ml-1 text-accent hover:underline">
            去主題工作室調底色 →
          </Link>
        </p>
      </header>

      {/* 目前選取的大預覽 */}
      <div
        className={`relative w-full h-48 sm:h-60 rounded-card overflow-hidden border border-border mb-6 ${
          showBase ? "bg-bg-elevated" : "bg-bg"
        }`}
      >
        {selected?.type === "procedural" && previewScene ? (
          <ProceduralScene
            scene={previewScene}
            density={selected.density ?? 1}
            showBase={showBase}
          />
        ) : selected?.type === "gradient" && selected.gradientCss ? (
          <div className="absolute inset-0" style={{ background: selected.gradientCss }} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-fg-muted text-sm">
            無背景（使用預設）
          </div>
        )}
        <div className="absolute bottom-2 left-3 text-xs px-2 py-1 rounded-md bg-black/45 text-white backdrop-blur">
          {selected?.type === "procedural"
            ? (previewScene?.label ?? "未知場景")
            : selected?.type === "gradient"
              ? (GRADIENT_PRESETS.find((g) => g.css === selected.gradientCss)?.label ?? "自訂漸層")
              : "無背景"}
        </div>
      </div>

      {/* 套用列 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={apply}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-accent text-accent-contrast font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? "套用中…" : "套用"}
        </button>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={`px-4 py-2 rounded-lg border transition ${
            selected === null
              ? "border-accent text-accent"
              : "border-border text-fg-muted hover:text-fg hover:border-border-hover"
          }`}
        >
          無背景
        </button>
      </div>

      {/* 只要粒子 開關：一律顯示（沒選到動態場景時變灰），不然使用者根本找不到它。 */}
      <label
        className={`flex items-start gap-3 mb-6 p-3 rounded-card border border-border bg-bg-card ${
          particlesOnlyApplies ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
        }`}
      >
        <input
          type="checkbox"
          checked={particlesOnly}
          disabled={!particlesOnlyApplies}
          onChange={(e) => setParticlesOnly(e.target.checked)}
          className="mt-0.5 size-4 accent-accent shrink-0"
        />
        <span className="text-sm">
          <span className="font-semibold">只要粒子（保留平台底色）</span>
          <span className="block text-xs text-fg-muted mt-0.5">
            {particlesOnlyApplies
              ? "只留飄動的粒子，底色沿用你的主題色，不會整站變深色。取消勾選才會鋪上場景自帶的深色底。"
              : "先在下面挑一個標「動態」的場景，這個選項才會生效（漸層 / 靜態場景本身就只有底色、沒有粒子）。"}
          </span>
        </span>
      </label>

      {/* 分類頁籤 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              tab === tb
                ? "bg-accent text-accent-contrast border-accent font-semibold"
                : "bg-bg-card border-border text-fg-muted hover:text-fg hover:border-border-hover"
            }`}
          >
            {tb}
          </button>
        ))}
      </div>

      {/* 格網：漸層 swatch + 標籤 */}
      {tab === "漸層" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {GRADIENT_PRESETS.map((g) => {
            const spec: BackgroundSpec = { type: "gradient", gradientCss: g.css };
            const active = specEq(selected, spec);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelected(spec)}
                className={`group text-left rounded-card overflow-hidden border transition ${
                  active ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-border-hover"
                }`}
              >
                <div className="h-20 w-full" style={{ background: g.css }} />
                <div className="px-2 py-1.5 text-xs bg-bg-card text-fg">{g.label}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {scenesByCategory(tab).map((sc) => {
            const spec: BackgroundSpec = { type: "procedural", proceduralId: sc.id };
            const active = specEq(selected, spec);
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelected(spec)}
                className={`group text-left rounded-card overflow-hidden border transition ${
                  active ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-border-hover"
                }`}
              >
                {/* 縮圖固定用場景底色當「識別色」（只要粒子模式下實際不會鋪這個底） */}
                <div className="h-20 w-full" style={{ background: sc.base }} />
                <div className="px-2 py-1.5 text-xs bg-bg-card text-fg flex items-center justify-between gap-1">
                  <span className="truncate">{sc.label}</span>
                  {sc.kind === "dynamic" && (
                    <span className="text-[10px] text-accent shrink-0">動態</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

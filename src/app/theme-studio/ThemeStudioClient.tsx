"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeTheme,
  defaultThemeDefinition,
  parseColor,
  toHex,
  suggestFix,
  PRESET_THEMES,
  PRESET_CATEGORY,
  type ThemeDefinition,
  type ThemeColors,
  type SurfaceStyle,
  type ShadowPreset,
  type MotionPreset,
  type A11yReport,
} from "@/lib/theme/engine";
import {
  applyThemeToDom,
  applyThemeToPreview,
  currentMode,
} from "@/lib/theme/apply";
import { loadThemeFonts, type FontCatalog, type FontCatalogEntry } from "@/lib/theme/font-loader";
import Link from "next/link";
import { ProceduralScene } from "@/components/background/ProceduralScene";
import {
  isParticlesOnly,
  readBackgroundCookie,
  sceneById,
  type BackgroundSpec,
} from "@/lib/background/scenes";

export type SavedTheme = {
  id: string;
  name: string;
  definition: ThemeDefinition;
  source: string | null;
  a11y_report: A11yReport | null;
  is_favorite: boolean | null;
  updated_at: string;
};

type Props = {
  initialThemes: SavedTheme[];
  initialActiveDefinition: ThemeDefinition | null;
};

// 使用者可直接編輯的顏色欄位（含中文標籤）。
const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "primary", label: "主色 Primary" },
  { key: "secondary", label: "次色 Secondary" },
  { key: "accent", label: "點綴 Accent" },
  { key: "background", label: "背景 Background" },
  { key: "surface", label: "卡面 Surface" },
  { key: "surfaceAlt", label: "卡面(替代) SurfaceAlt" },
  { key: "textPrimary", label: "主文字 Text" },
  { key: "textSecondary", label: "次文字 Text muted" },
  { key: "border", label: "邊框 Border" },
  { key: "focusRing", label: "焦點框 Focus ring" },
  { key: "success", label: "成功 Success" },
  { key: "warning", label: "警告 Warning" },
  { key: "danger", label: "危險 Danger" },
];

const SURFACE_STYLES: SurfaceStyle[] = ["solid", "glass", "soft", "outline"];
const SHADOW_PRESETS: ShadowPreset[] = ["none", "soft", "medium", "dramatic"];
const MOTION_PRESETS: MotionPreset[] = ["none", "soft", "float", "playful", "cinematic"];

/** 把任意色值正規化成 <input type=color> 能接受的 #rrggbb。 */
function toColorInputValue(v: string): string {
  const p = parseColor(v);
  return p ? toHex(p) : "#000000";
}

export function ThemeStudioClient({ initialThemes, initialActiveDefinition }: Props) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<ThemeDefinition>(
    () => initialActiveDefinition ?? defaultThemeDefinition(),
  );
  const [name, setName] = useState<string>(draft.name || "我的主題");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark");
  const [themes, setThemes] = useState<SavedTheme[]>(initialThemes);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fontCatalog, setFontCatalog] = useState<FontCatalog>({ fonts: [], pairs: [] });
  // 主題跟背景是疊在一起看的（背景的粒子就飄在主題的 --color-bg 上）→
  // 預覽框也要把使用者目前的背景畫進去，不然調完主題套上去才發現不搭。
  const [bgSpec, setBgSpec] = useState<BackgroundSpec>(null);

  // 掛載後讀使用者目前套用的背景（ai_bg cookie，client-only）
  useEffect(() => {
    const fromCookie = readBackgroundCookie();
    if (fromCookie !== undefined) setBgSpec(fromCookie);
  }, []);

  // 掛載後讀真正的站台模式
  useEffect(() => {
    setPreviewMode(currentMode());
  }, []);

  // 掛載時抓字體目錄（給字體選單用）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fonts", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as FontCatalog;
        if (!cancelled) setFontCatalog(json);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 草稿變動 → 即時刷新右側預覽（不碰 :root）
  useEffect(() => {
    if (previewRef.current) applyThemeToPreview(draft, previewMode, previewRef.current);
  }, [draft, previewMode]);

  // 預覽字體：在 applyThemeToPreview 之後跑（用 setProperty、不會被 cssText 覆蓋）→
  // 標題/內文/介面選了字體、右側預覽即時看得到（@font-face 注入 <head>、swap）。
  useEffect(() => {
    if (previewRef.current) loadThemeFonts(draft, fontCatalog, previewRef.current);
  }, [draft, fontCatalog, previewMode]);

  const report = useMemo(() => analyzeTheme(draft), [draft]);

  // 目前背景：只有「動態場景」在預覽框裡才畫得出東西（靜態/漸層＝純底色）。
  const bgScene = useMemo(
    () => (bgSpec?.type === "procedural" ? sceneById(bgSpec.proceduralId) : null),
    [bgSpec],
  );
  const bgParticlesOnly = isParticlesOnly(bgSpec);

  // ── draft 更新工具 ──────────────────────────────
  function setColor(key: keyof ThemeColors, val: string) {
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: val } }));
  }
  function setTypography<K extends keyof ThemeDefinition["typography"]>(
    key: K,
    val: ThemeDefinition["typography"][K],
  ) {
    setDraft((d) => ({ ...d, typography: { ...d.typography, [key]: val } }));
  }
  function setSurfaces<K extends keyof ThemeDefinition["surfaces"]>(
    key: K,
    val: ThemeDefinition["surfaces"][K],
  ) {
    setDraft((d) => ({ ...d, surfaces: { ...d.surfaces, [key]: val } }));
  }
  function setEffects<K extends keyof ThemeDefinition["effects"]>(
    key: K,
    val: ThemeDefinition["effects"][K],
  ) {
    setDraft((d) => ({ ...d, effects: { ...d.effects, [key]: val } }));
  }
  function setMotion<K extends keyof ThemeDefinition["motion"]>(
    key: K,
    val: ThemeDefinition["motion"][K],
  ) {
    setDraft((d) => ({ ...d, motion: { ...d.motion, [key]: val } }));
  }

  function loadPreset(def: ThemeDefinition) {
    const clone = structuredClone(def);
    setDraft(clone);
    setName(clone.name);
    setMsg(`已載入預設「${clone.name}」`);
  }

  async function refreshThemes() {
    try {
      const res = await fetch("/api/themes", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { themes: SavedTheme[] };
        setThemes(json.themes ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  // 只在本頁面套用到全站（不存 DB）
  function previewOnSite() {
    applyThemeToDom(draft, currentMode());
    setMsg("已套用到全站（未儲存）。重新整理即回原本主題。");
  }

  // 儲存並套用：建立 → 翻指標 → 立即套 DOM → refresh
  async function saveAndApply() {
    setBusy(true);
    setMsg(null);
    try {
      const def = { ...draft, name };
      const createRes = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, definition: def, source: "manual" }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        setMsg(`儲存失敗：${err.error ?? createRes.status}`);
        return;
      }
      const { theme } = (await createRes.json()) as { theme: SavedTheme };

      const applyRes = await fetch(`/api/themes/${theme.id}/apply`, { method: "POST" });
      if (!applyRes.ok) {
        setMsg("已儲存，但套用失敗。");
        await refreshThemes();
        return;
      }

      applyThemeToDom(def, currentMode());
      setMsg(`已儲存並套用「${name}」。`);
      await refreshThemes();
      router.refresh();
    } catch (e) {
      setMsg(`發生錯誤：${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function applySaved(t: SavedTheme) {
    setBusy(true);
    try {
      const res = await fetch(`/api/themes/${t.id}/apply`, { method: "POST" });
      if (res.ok) {
        applyThemeToDom(t.definition, currentMode());
        setMsg(`已套用「${t.name}」。`);
        router.refresh();
      } else {
        setMsg("套用失敗。");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteSaved(t: SavedTheme) {
    setBusy(true);
    try {
      const res = await fetch(`/api/themes/${t.id}`, { method: "DELETE" });
      if (res.ok) {
        setThemes((list) => list.filter((x) => x.id !== t.id));
        setMsg(`已刪除「${t.name}」。`);
      } else {
        setMsg("刪除失敗。");
      }
    } finally {
      setBusy(false);
    }
  }

  // 預設庫分組
  const grouped = useMemo(() => {
    const map = new Map<string, ThemeDefinition[]>();
    for (const t of PRESET_THEMES) {
      const cat = PRESET_CATEGORY[t.name] ?? "其他";
      const arr = map.get(cat) ?? [];
      arr.push(t);
      map.set(cat, arr);
    }
    return Array.from(map.entries());
  }, []);

  const failingPairs = report.pairs.filter((p) => p.level === "fail" && !p.advisory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-fg">主題工作室</h1>
        <p className="mt-1 text-sm text-fg-muted">
          調配色與質感、即時預覽、無障礙檢查，滿意了就一鍵套用全站。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* 左：控制 */}
        <div className="space-y-6">
          {/* 名稱 + 動作 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <label className="block text-xs font-medium text-fg-muted">主題名稱</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
              placeholder="我的主題"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={saveAndApply}
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-50"
              >
                儲存並套用
              </button>
              <button
                onClick={previewOnSite}
                disabled={busy}
                className="rounded-lg border border-border bg-bg px-4 py-2 text-sm text-fg disabled:opacity-50"
              >
                只預覽（全站，不儲存）
              </button>
              <button
                onClick={() => loadPreset(defaultThemeDefinition())}
                disabled={busy}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg-muted disabled:opacity-50"
              >
                還原預設
              </button>
            </div>
            {msg && <p className="mt-2 text-xs text-fg-muted">{msg}</p>}
          </section>

          {/* 顏色 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">顏色</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toColorInputValue(draft.colors[key])}
                    onChange={(e) => setColor(key, e.target.value)}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                    aria-label={label}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-fg-muted">{label}</div>
                    <input
                      value={draft.colors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="w-full rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
                      spellCheck={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 字體 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">字體</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FontRoleField
                label="標題字體"
                value={draft.typography.headingFontId}
                catalog={fontCatalog}
                onChange={(v) => setTypography("headingFontId", v)}
              />
              <FontRoleField
                label="內文字體"
                value={draft.typography.bodyFontId}
                catalog={fontCatalog}
                onChange={(v) => setTypography("bodyFontId", v)}
              />
              <FontRoleField
                label="介面字體"
                value={draft.typography.uiFontId}
                catalog={fontCatalog}
                onChange={(v) => setTypography("uiFontId", v)}
              />
            </div>
            {fontCatalog.fonts.length === 0 && (
              <p className="mt-2 text-xs text-fg-muted">
                目前沒有已安裝的自訂字體（後台「字體安裝器」可上傳）。
              </p>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <RangeField
                label="標題縮放"
                min={0.8}
                max={1.6}
                step={0.01}
                value={draft.typography.headingScale}
                onChange={(v) => setTypography("headingScale", v)}
              />
              <RangeField
                label="內文縮放"
                min={0.8}
                max={1.4}
                step={0.01}
                value={draft.typography.bodyScale}
                onChange={(v) => setTypography("bodyScale", v)}
              />
              <RangeField
                label="行高"
                min={1.1}
                max={2}
                step={0.05}
                value={draft.typography.lineHeight}
                onChange={(v) => setTypography("lineHeight", v)}
              />
            </div>
          </section>

          {/* 表面 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">表面質感</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="材質"
                value={draft.surfaces.style}
                options={SURFACE_STYLES}
                onChange={(v) => setSurfaces("style", v as SurfaceStyle)}
              />
              <RangeField
                label="圓角 (px)"
                min={0}
                max={32}
                step={1}
                value={draft.surfaces.radius}
                onChange={(v) => setSurfaces("radius", v)}
              />
              <RangeField
                label="透明度"
                min={0}
                max={1}
                step={0.01}
                value={draft.surfaces.opacity}
                onChange={(v) => setSurfaces("opacity", v)}
              />
              <RangeField
                label="模糊 (px)"
                min={0}
                max={40}
                step={1}
                value={draft.surfaces.blur}
                onChange={(v) => setSurfaces("blur", v)}
              />
            </div>
          </section>

          {/* 效果 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">效果</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SelectField
                label="陰影"
                value={draft.effects.shadow}
                options={SHADOW_PRESETS}
                onChange={(v) => setEffects("shadow", v as ShadowPreset)}
              />
              <ToggleField
                label="光暈 Glow"
                value={draft.effects.glow}
                onChange={(v) => setEffects("glow", v)}
              />
              <ToggleField
                label="噪點 Noise"
                value={draft.effects.noise}
                onChange={(v) => setEffects("noise", v)}
              />
            </div>
          </section>

          {/* 動態 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">動態</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="動畫預設"
                value={draft.motion.preset}
                options={MOTION_PRESETS}
                onChange={(v) => setMotion("preset", v as MotionPreset)}
              />
              <RangeField
                label="強度"
                min={0}
                max={1}
                step={0.05}
                value={draft.motion.intensity}
                onChange={(v) => setMotion("intensity", v)}
              />
            </div>
          </section>

          {/* 預設庫 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">預設庫</h2>
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              {grouped.map(([cat, defs]) => (
                <div key={cat}>
                  <div className="mb-2 text-xs font-medium text-fg-muted">{cat}</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {defs.map((d) => (
                      <button
                        key={d.name}
                        onClick={() => loadPreset(d)}
                        className="group rounded-lg border border-border p-2 text-left transition hover:border-accent"
                        title={d.name}
                        style={{ background: d.colors.background }}
                      >
                        <div className="mb-1 flex gap-1">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ background: d.colors.primary }}
                          />
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ background: d.colors.accent }}
                          />
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ background: d.colors.secondary }}
                          />
                        </div>
                        <div
                          className="truncate text-[11px]"
                          style={{ color: d.colors.textPrimary }}
                        >
                          {d.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 右：預覽 + a11y + 已存 */}
        <div className="space-y-6">
          {/* 預覽 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">即時預覽</h2>
              <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
                {(["light", "dark"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPreviewMode(m)}
                    className={`rounded px-2 py-1 ${
                      previewMode === m ? "bg-accent text-accent-contrast" : "text-fg-muted"
                    }`}
                  >
                    {m === "light" ? "淺色" : "深色"}
                  </button>
                ))}
              </div>
            </div>
            <div
              ref={previewRef}
              data-mode={previewMode}
              className="relative overflow-hidden rounded-xl border p-5"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-fg)",
              }}
            >
              {/* 目前套用的背景（動態場景才畫得出來）：粒子就飄在這個主題的底色上，
                  主題跟背景本來就是疊在一起看的 → 預覽也要一起看。 */}
              {bgScene?.kind === "dynamic" && (
                <ProceduralScene scene={bgScene} showBase={!bgParticlesOnly} />
              )}
              <div className="relative">
                <h3
                  style={{
                    color: "var(--color-fg)",
                    fontSize: "calc(1.5rem * var(--scale-heading, 1))",
                    fontWeight: "var(--weight-heading, 700)" as unknown as number,
                    lineHeight: "var(--line-height, 1.5)" as unknown as number,
                  }}
                >
                  標題預覽 Heading
                </h3>
                <p className="mt-2" style={{ color: "var(--color-fg-muted)" }}>
                  這是一段內文，用來檢查你選的文字色跟背景色好不好讀。The quick brown fox。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    className="px-4 py-2 text-sm font-medium"
                    style={{
                      background: "var(--color-accent)",
                      color: "var(--color-accent-contrast)",
                      borderRadius: "var(--radius-card, 12px)",
                      boxShadow: "var(--shadow-md, none)",
                    }}
                  >
                    主要按鈕
                  </button>
                  <span
                    className="px-3 py-1 text-xs font-medium"
                    style={{
                      background: "var(--color-accent-2)",
                      color: "var(--color-accent-2-contrast)",
                      borderRadius: "999px",
                    }}
                  >
                    Accent Chip
                  </span>
                </div>
                <div
                  className="mt-4 p-4"
                  style={{
                    background: "var(--color-bg-card)",
                    borderRadius: "var(--radius-card, 12px)",
                    border: "var(--border-width, 1px) solid var(--color-border)",
                    boxShadow: "var(--shadow-sm, none)",
                  }}
                >
                  <div style={{ color: "var(--color-fg)" }} className="text-sm font-medium">
                    卡片 Card
                  </div>
                  <div style={{ color: "var(--color-fg-muted)" }} className="mt-1 text-xs">
                    卡片內文，套用 surface / radius / shadow。
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <span style={{ color: "var(--color-success)" }}>● 成功</span>
                    <span style={{ color: "var(--color-warning)" }}>● 警告</span>
                    <span style={{ color: "var(--color-danger)" }}>● 危險</span>
                  </div>
                </div>
              </div>
            </div>
            {/* 主題 × 背景要一起看：這裡說清楚目前疊的是哪個背景、怎麼換。 */}
            <p className="mt-2 text-xs text-fg-muted">
              目前背景：
              <span className="text-fg">
                {bgScene
                  ? `${bgScene.label}${bgParticlesOnly ? "（只要粒子）" : "（含場景底色）"}`
                  : bgSpec?.type === "gradient"
                    ? "自訂漸層"
                    : "無（只有主題底色）"}
              </span>
              {bgParticlesOnly && "　粒子的顏色會自動配合這個主題的底色深淺。"}
              {bgScene && !bgParticlesOnly && "　場景底色會蓋掉主題底色 —— 想看到主題色請到背景頁勾「只要粒子」。"}
              <Link href="/background" className="ml-2 text-accent hover:underline">
                去換背景 →
              </Link>
            </p>
          </section>

          {/* a11y */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">無障礙檢查</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  report.passesAA
                    ? "bg-green-500/15 text-green-500"
                    : "bg-red-500/15 text-red-500"
                }`}
              >
                {report.passesAA ? "通過 AA" : "未過 AA"}
              </span>
            </div>
            <p className="text-xs text-fg-muted">
              最差對比：{report.worstRatio.toFixed(2)}:1
            </p>
            {failingPairs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {failingPairs.map((p) => (
                  <li key={p.label} className="text-xs text-red-500">
                    {p.label}：{p.ratio.toFixed(2)}:1（需 {p.required}:1）
                    {suggestFix(p) ? <span className="text-fg-muted"> — {suggestFix(p)}</span> : null}
                  </li>
                ))}
              </ul>
            )}
            {report.advisories.length > 0 && (
              <ul className="mt-2 space-y-1">
                {report.advisories.map((a) => (
                  <li key={a} className="text-xs text-fg-muted">
                    參考：{a}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 已存主題 */}
          <section className="rounded-xl border border-border bg-bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">我存的主題</h2>
            {themes.length === 0 ? (
              <p className="text-xs text-fg-muted">還沒有存過主題。</p>
            ) : (
              <ul className="space-y-2">
                {themes.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ background: t.definition?.colors?.primary ?? "#888" }}
                      />
                      <span className="truncate text-sm text-fg">{t.name}</span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => loadPreset(t.definition)}
                        className="rounded px-2 py-1 text-xs text-fg-muted hover:text-fg"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => applySaved(t)}
                        disabled={busy}
                        className="rounded bg-accent px-2 py-1 text-xs text-accent-contrast disabled:opacity-50"
                      >
                        套用
                      </button>
                      <button
                        onClick={() => deleteSaved(t)}
                        disabled={busy}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── 小元件 ──────────────────────────────────────
function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-fg-muted">
        <span>{label}</span>
        <span>{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-fg-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm text-fg"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 字體角色選單：選項 = 已安裝字體目錄 + 目前值（若不在目錄裡也保留可見）。 */
function FontRoleField({
  label,
  value,
  catalog,
  onChange,
}: {
  label: string;
  value: string;
  catalog: FontCatalog;
  onChange: (v: string) => void;
}) {
  const inCatalog = catalog.fonts.some(
    (f: FontCatalogEntry) => f.slug === value || f.id === value,
  );
  return (
    <label className="block">
      <span className="text-xs text-fg-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm text-fg"
      >
        {/* 目前值不在目錄（預設 slug 或已停用）→ 保留一個選項讓下拉停在原值 */}
        {value && !inCatalog && <option value={value}>{value}（目前）</option>}
        <option value="">系統預設 / 繼承</option>
        {catalog.fonts.map((f: FontCatalogEntry) => (
          <option key={f.id} value={f.slug}>
            {f.display_name ? `${f.display_name}（${f.family}）` : f.family}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 pt-5">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span className="text-sm text-fg">{label}</span>
    </label>
  );
}

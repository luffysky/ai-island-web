"use client";
import { useState } from "react";
import { Search, Save, Check } from "lucide-react";

interface SeoPage {
  id?: string;
  path: string;
  title?: string;
  description?: string;
  keywords?: string[];
  og_image?: string;
  canonical_url?: string;
  robots?: string;
  schema_jsonld?: any;
  custom_head_html?: string;
  priority?: number;
  changefreq?: string;
  geo_target?: string;
  hreflang?: any;
}

interface Route {
  path: string;
  title: string;
  isCore: boolean;
}

export function SEOManagerClient({
  defaultRoutes,
  existingPages,
}: {
  defaultRoutes: Route[];
  existingPages: SeoPage[];
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SeoPage | null>(null);
  const [saved, setSaved] = useState(false);

  // 合併
  const allPages = defaultRoutes.map((r) => {
    const existing = existingPages.find((p) => p.path === r.path);
    return existing || { path: r.path, title: r.title };
  });

  const filtered = allPages.filter((p) =>
    p.path.toLowerCase().includes(search.toLowerCase()) ||
    (p.title?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const save = async () => {
    if (!editing) return;
    await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
      {/* 列表 */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-fg-muted)]" />
          <input
            type="text"
            placeholder="搜尋路徑..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl max-h-[600px] overflow-y-auto">
          {filtered.map((p) => {
            const hasOverride = existingPages.some((e) => e.path === p.path);
            return (
              <button
                key={p.path}
                onClick={() => setEditing(p)}
                className={`w-full text-left p-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] ${
                  editing?.path === p.path ? "bg-[var(--color-bg-elevated)]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono">{p.path}</code>
                  {hasOverride && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">✓ 已設定</span>}
                </div>
                <div className="text-sm mt-0.5 truncate">{p.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 編輯 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        {!editing ? (
          <div className="text-center text-[var(--color-fg-muted)] py-12">
            <Search size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">選一個頁面開始編輯</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="font-bold">編輯：<code className="font-mono text-sm">{editing.path}</code></h3>
            </div>

            <Field label="Title" hint="60 字內、含 brand 名稱">
              <input
                type="text"
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
                placeholder="頁面標題 - AI 島"
              />
              <CharCount value={editing.title} max={60} />
            </Field>

            <Field label="Description" hint="160 字內、Google 搜尋摘要">
              <textarea
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
                placeholder="簡短說明這個頁面"
              />
              <CharCount value={editing.description} max={160} />
            </Field>

            <Field label="Keywords" hint="用逗號分隔">
              <input
                type="text"
                value={(editing.keywords ?? []).join(", ")}
                onChange={(e) => setEditing({
                  ...editing,
                  keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
                placeholder="HTML, CSS, 教學, 全端"
              />
            </Field>

            <Field label="OG Image" hint="1200x630 推薦">
              <input
                type="text"
                value={editing.og_image ?? ""}
                onChange={(e) => setEditing({ ...editing, og_image: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm font-mono"
                placeholder="/og.png 或 https://..."
              />
            </Field>

            <Field label="Canonical URL" hint="避免重複內容、預設自己">
              <input
                type="text"
                value={editing.canonical_url ?? ""}
                onChange={(e) => setEditing({ ...editing, canonical_url: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm font-mono"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Robots">
                <select
                  value={editing.robots ?? "index,follow"}
                  onChange={(e) => setEditing({ ...editing, robots: e.target.value })}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
                >
                  <option value="index,follow">index, follow</option>
                  <option value="noindex,follow">noindex, follow</option>
                  <option value="index,nofollow">index, nofollow</option>
                  <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
              </Field>
              <Field label="Sitemap Priority">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={editing.priority ?? 0.5}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
                />
              </Field>
            </div>

            <Field label="GEO Target" hint="目標地區、影響 hreflang">
              <select
                value={editing.geo_target ?? "TW"}
                onChange={(e) => setEditing({ ...editing, geo_target: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-sm"
              >
                <option value="global">Global</option>
                <option value="TW">台灣 (TW)</option>
                <option value="HK">香港 (HK)</option>
                <option value="CN">中國 (CN)</option>
                <option value="JP">日本 (JP)</option>
                <option value="US">美國 (US)</option>
              </select>
            </Field>

            <Field label="Hreflang（JSON）" hint='{ "en": "https://...", "ja": "..." }'>
              <textarea
                value={JSON.stringify(editing.hreflang ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    setEditing({ ...editing, hreflang: JSON.parse(e.target.value) });
                  } catch {}
                }}
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs font-mono"
              />
            </Field>

            <Field label="Schema.org JSON-LD" hint="結構化資料">
              <textarea
                value={JSON.stringify(editing.schema_jsonld ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    setEditing({ ...editing, schema_jsonld: JSON.parse(e.target.value) });
                  } catch {}
                }}
                rows={4}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs font-mono"
              />
            </Field>

            <Field label="Custom HTML（&lt;head&gt;）" hint="額外 meta / script">
              <textarea
                value={editing.custom_head_html ?? ""}
                onChange={(e) => setEditing({ ...editing, custom_head_html: e.target.value })}
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs font-mono"
              />
            </Field>

            <button
              onClick={save}
              className="w-full px-4 py-2 bg-[var(--color-accent)] text-black rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {saved ? <><Check size={16} /> 已存</> : <><Save size={16} /> 儲存</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs text-[var(--color-fg-muted)] font-medium">{label}</label>
        {hint && <span className="text-xs text-[var(--color-fg-muted)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CharCount({ value, max }: { value?: string; max: number }) {
  const len = value?.length ?? 0;
  const over = len > max;
  return (
    <div className={`text-xs mt-0.5 text-right ${over ? "text-red-400" : "text-[var(--color-fg-muted)]"}`}>
      {len} / {max}
    </div>
  );
}

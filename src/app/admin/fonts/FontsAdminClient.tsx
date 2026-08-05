"use client";

import { useState } from "react";

export type FontRow = {
  id: string;
  slug: string;
  family: string;
  display_name: string | null;
  category: string | null;
  weights: number[] | null;
  supported_languages: string[] | null;
  file_manifest: Record<string, { path?: string }> | null;
  fallback_stack: string | null;
  css_url: string | null;
  license_name: string | null;
  license_url: string | null;
  enabled: boolean | null;
  sort_order: number | null;
};

const CATEGORIES = ["sans", "serif", "mono", "display", "handwriting"] as const;

/** 字體來源：Google Fonts 內建 / 已上傳自架 / 佔位待上傳。 */
function fontSource(f: FontRow): { label: string; cls: string } {
  if (f.css_url) return { label: "Google 內建", cls: "text-emerald-500" };
  if (f.file_manifest && Object.keys(f.file_manifest).length > 0)
    return { label: "自架", cls: "text-sky-500" };
  return { label: "待上傳", cls: "text-amber-500" };
}

export function FontsAdminClient({ initialFonts }: { initialFonts: FontRow[] }) {
  const [fonts, setFonts] = useState<FontRow[]>(initialFonts);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 上傳表單狀態
  const [file, setFile] = useState<File | null>(null);
  const [family, setFamily] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<string>("sans");
  const [weight, setWeight] = useState("400");
  const [languages, setLanguages] = useState("zh-Hant,en");
  const [licenseName, setLicenseName] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");

  async function refresh() {
    try {
      const res = await fetch("/api/admin/fonts", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { fonts: FontRow[] };
        setFonts(json.fonts ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMsg("請先選擇字型檔（.ttf/.otf/.woff/.woff2）");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("family", family);
      fd.set("display_name", displayName);
      fd.set("slug", slug);
      fd.set("category", category);
      fd.set("weight", weight);
      fd.set("languages", languages);
      fd.set("license_name", licenseName);
      fd.set("license_url", licenseUrl);

      const res = await fetch("/api/admin/fonts", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`上傳失敗：${json.message ?? json.error ?? res.status}`);
        return;
      }
      setMsg(`已安裝「${family}」（${weight}）`);
      setFile(null);
      await refresh();
    } catch (err) {
      setMsg(`發生錯誤：${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(f: FontRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/fonts?slug=${encodeURIComponent(f.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !f.enabled }),
      });
      if (res.ok) {
        setFonts((list) =>
          list.map((x) => (x.slug === f.slug ? { ...x, enabled: !x.enabled } : x)),
        );
      } else {
        setMsg("切換失敗。");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: FontRow) {
    if (!confirm(`確定刪除字體「${f.family}」（${f.slug}）？連同已上傳的字型檔一併移除。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/fonts?slug=${encodeURIComponent(f.slug)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFonts((list) => list.filter((x) => x.slug !== f.slug));
        setMsg(`已刪除「${f.family}」。`);
      } else {
        setMsg("刪除失敗。");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-fg">字體管理（安裝器）</h1>
        <p className="mt-1 text-sm text-fg-muted">
          目錄已內建 Space 全部字體。標「Google 內建」的直接啟用即可用（Google Fonts 供檔＋CJK 動態子集、免上傳）；
          標「待上傳」的是 Google 沒有的字體，用下方表單上傳字型檔安裝。安裝／啟用後可在主題工作室指定給標題／內文／介面。
        </p>
      </header>

      {msg && (
        <div className="rounded-lg border border-border bg-bg-card px-4 py-2 text-sm text-fg">
          {msg}
        </div>
      )}

      {/* 上傳表單 */}
      <section className="rounded-xl border border-border bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg">新增字體</h2>
        <form onSubmit={onUpload} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-fg-muted">字型檔（.ttf / .otf / .woff / .woff2）</span>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg file:mr-3 file:rounded file:border-0 file:bg-accent file:px-3 file:py-1 file:text-accent-contrast"
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">CSS 名稱 family（英文）</span>
            <input
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="jf-tsingsung"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
              spellCheck={false}
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">中文名 display_name（給人看）</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="清松手寫體"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">代號 slug（小寫英數-）</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="jf-openhuninn"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
              spellCheck={false}
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">分類 category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">字重 weight</span>
            <input
              type="number"
              min={100}
              max={900}
              step={100}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">支援語言（csv）</span>
            <input
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="zh-Hant,en"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
              spellCheck={false}
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">授權名稱（建議填，如 OFL-1.1）</span>
            <input
              value={licenseName}
              onChange={(e) => setLicenseName(e.target.value)}
              placeholder="SIL OFL 1.1"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">授權連結</span>
            <input
              value={licenseUrl}
              onChange={(e) => setLicenseUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
              spellCheck={false}
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-50"
            >
              {busy ? "處理中…" : "上傳並安裝"}
            </button>
            <span className="ml-3 text-xs text-fg-muted">
              同一 slug 再上傳其他字重 → 自動合併到同一字體。
            </span>
          </div>
        </form>
      </section>

      {/* 已安裝清單 */}
      <section className="rounded-xl border border-border bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg">已安裝字體（{fonts.length}）</h2>
        {fonts.length === 0 ? (
          <p className="text-xs text-fg-muted">還沒有安裝任何字體。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-fg-muted">
                <tr className="border-b border-border">
                  <th className="px-2 py-2">中文名</th>
                  <th className="px-2 py-2">family</th>
                  <th className="px-2 py-2">slug</th>
                  <th className="px-2 py-2">來源</th>
                  <th className="px-2 py-2">分類</th>
                  <th className="px-2 py-2">字重</th>
                  <th className="px-2 py-2">啟用</th>
                  <th className="px-2 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {fonts.map((f) => (
                  <tr key={f.id} className="border-b border-border/60">
                    <td className="px-2 py-2 text-fg">{f.display_name ?? "—"}</td>
                    <td className="px-2 py-2 text-fg-muted">{f.family}</td>
                    <td className="px-2 py-2 font-mono text-xs text-fg-muted">{f.slug}</td>
                    <td className={`px-2 py-2 text-xs font-medium ${fontSource(f).cls}`}>
                      {fontSource(f).label}
                    </td>
                    <td className="px-2 py-2 text-fg-muted">{f.category ?? "—"}</td>
                    <td className="px-2 py-2 text-fg-muted">
                      {(f.weights ?? []).join(" / ") || "—"}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => toggleEnabled(f)}
                        disabled={busy}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                          f.enabled
                            ? "bg-accent text-accent-contrast"
                            : "border border-border text-fg-muted"
                        }`}
                      >
                        {f.enabled ? "啟用中" : "已停用"}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => remove(f)}
                        disabled={busy}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

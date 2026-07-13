"use client";

import { useEffect, useState } from "react";
import { Rss, Plus, Trash2, Power, Check, X, ExternalLink, Loader2, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";

interface Source { id: string; name: string; url: string; kind: string; category_hint?: string | null; enabled: boolean; last_fetched_at?: string | null; last_status?: string | null; last_count?: number | null; notes?: string | null; }
interface Candidate { id: string; source_name?: string | null; raw_title: string; raw_url?: string | null; raw_summary?: string | null; raw_published_at?: string | null; created_at: string; }

export function RadarClient() {
  const [sources, setSources] = useState<Source[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // 新增來源表單
  const [nName, setNName] = useState("");
  const [nUrl, setNUrl] = useState("");
  const [nKind, setNKind] = useState("rss");
  const [nCat, setNCat] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");
  // 每張候選卡的分類覆寫 + 忙碌狀態
  const [catOverride, setCatOverride] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  // AI 抽取結果（供核准時當 overrides）
  const [sug, setSug] = useState<Record<string, { category: string | null; application_deadline: string | null; prize_text: string | null; is_free: boolean | null; organizer: string | null }>>({});
  const [extractingId, setExtractingId] = useState("");

  const load = async () => {
    const [s, c] = await Promise.all([
      fetch("/api/admin/opportunities/sources").then((r) => (r.ok ? r.json() : { sources: [], pendingCandidates: 0 })).catch(() => ({ sources: [], pendingCandidates: 0 })),
      fetch("/api/admin/opportunities/candidates?status=pending").then((r) => (r.ok ? r.json() : { candidates: [] })).catch(() => ({ candidates: [] })),
    ]);
    setSources(s.sources ?? []);
    setPendingCount(s.pendingCandidates ?? 0);
    setCandidates(c.candidates ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addSource = async () => {
    if (adding) return;
    if (!nName.trim() || !/^https?:\/\//.test(nUrl.trim())) { setErr("填來源名稱 + http(s) 網址"); return; }
    setAdding(true); setErr("");
    try {
      const r = await fetch("/api/admin/opportunities/sources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nName.trim(), url: nUrl.trim(), kind: nKind, category_hint: nCat.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "新增失敗"); return; }
      setSources((cur) => [d.source, ...cur]);
      setNName(""); setNUrl(""); setNCat("");
    } catch { setErr("連線失敗"); } finally { setAdding(false); }
  };

  const toggleSource = async (s: Source) => {
    const next = !s.enabled;
    setSources((cur) => cur.map((x) => (x.id === s.id ? { ...x, enabled: next } : x)));
    await fetch(`/api/admin/opportunities/sources?id=${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }) }).catch(() => {});
  };
  const deleteSource = async (id: string) => {
    setSources((cur) => cur.filter((x) => x.id !== id));
    await fetch(`/api/admin/opportunities/sources?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  const aiExtract = async (id: string) => {
    if (extractingId) return;
    setExtractingId(id);
    try {
      const r = await fetch("/api/admin/opportunities/candidates/extract", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const d = await r.json();
      if (r.ok && d.suggestion) {
        setSug((m) => ({ ...m, [id]: d.suggestion }));
        if (d.suggestion.category) setCatOverride((m) => ({ ...m, [id]: d.suggestion.category }));
      }
    } catch { /* ignore */ } finally { setExtractingId(""); }
  };

  const review = async (id: string, action: "approve" | "reject") => {
    if (busyId) return;
    setBusyId(id);
    try {
      const s = sug[id];
      const overrides = action === "approve"
        ? { category: catOverride[id] || s?.category || undefined, application_deadline: s?.application_deadline || undefined, prize_text: s?.prize_text || undefined, is_free: s?.is_free ?? undefined, organizer: s?.organizer || undefined }
        : undefined;
      const r = await fetch("/api/admin/opportunities/candidates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, overrides }),
      });
      if (r.ok) { setCandidates((cur) => cur.filter((x) => x.id !== id)); setPendingCount((n) => Math.max(0, n - 1)); }
    } catch { /* ignore */ } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Rss className="w-5 h-5 text-accent" /> 機會雷達 · 來源 & 待審</h1>
        <p className="text-sm text-fg-muted mt-1">只從你加的 RSS/API 來源抓「候選」進待審佇列；<b>你按核准才會變成真機會（且標 unverified）</b>。雷達不自動上線、不捏資料。</p>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> cron `opportunity-radar` 每天抓一次（要在 cron-job.org 加 job #9，見 §五）。</p>
      </div>

      {/* 新增來源 */}
      <div className="rounded-2xl border border-border bg-bg-card p-4">
        <div className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Plus className="w-4 h-4" /> 新增來源</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="來源名稱（例：經濟部 SBIR 公告）" className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent" />
          <input value={nUrl} onChange={(e) => setNUrl(e.target.value)} placeholder="RSS / Atom 網址 https://..." className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent" />
          <select value={nKind} onChange={(e) => setNKind(e.target.value)} className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm">
            <option value="rss">RSS</option><option value="atom">Atom</option>
            <option value="api" disabled>API（之後支援）</option><option value="sitemap" disabled>Sitemap（之後支援）</option>
          </select>
          <input value={nCat} onChange={(e) => setNCat(e.target.value)} placeholder="預設分類（選填，例：補助 / AI）" className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent" />
        </div>
        {err && <div className="text-[11px] text-rose-500 mt-1.5">{err}</div>}
        <div className="flex justify-end mt-2">
          <button onClick={addSource} disabled={adding} className="inline-flex items-center gap-1.5 text-sm rounded-lg bg-accent text-white px-3.5 py-1.5 disabled:opacity-50">{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 新增</button>
        </div>
      </div>

      {/* 來源清單 */}
      <div>
        <div className="text-sm font-semibold mb-2">來源清單（{sources.length}）</div>
        {loading ? <div className="text-xs text-fg-muted py-4 text-center">載入中…</div> : sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-fg-muted">還沒有來源。先加幾個官方公告 RSS 吧（政府補助、大學競賽、獎金獵人站…）。</div>
        ) : (
          <div className="space-y-1.5">
            {sources.map((s) => (
              <div key={s.id} className={`rounded-xl border border-border p-3 ${s.enabled ? "" : "opacity-55"}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium flex items-center gap-1.5">{s.name} <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted uppercase">{s.kind}</span>{s.category_hint && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">{s.category_hint}</span>}</div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-[11px] text-fg-muted hover:text-accent inline-flex items-center gap-1 break-all">{s.url} <ExternalLink className="w-3 h-3 shrink-0" /></a>
                    <div className="text-[11px] text-fg-muted mt-0.5">
                      {s.last_fetched_at ? `上次抓 ${new Date(s.last_fetched_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · 新增 ${s.last_count ?? 0} 筆 · ${s.last_status ?? ""}` : "尚未抓取"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleSource(s)} title={s.enabled ? "停用" : "啟用"} className={`p-1.5 rounded-lg hover:bg-bg-elevated ${s.enabled ? "text-emerald-500" : "text-fg-muted"}`}><Power className="w-4 h-4" /></button>
                    <button onClick={() => deleteSource(s.id)} title="刪除" className="p-1.5 rounded-lg hover:bg-rose-500/10 text-fg-muted hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 待審佇列 */}
      <div>
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">待審佇列（{pendingCount}）<button onClick={load} className="text-[11px] text-fg-muted hover:text-accent inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 刷新</button></div>
        {loading ? <div className="text-xs text-fg-muted py-4 text-center">載入中…</div> : candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-fg-muted">目前沒有待審候選。cron 抓到新的會出現在這；核准才會進機會島。</div>
        ) : (
          <div className="space-y-1.5">
            {candidates.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-bg-card p-3">
                <div className="text-sm font-medium">{c.raw_title}</div>
                {c.source_name && <div className="text-[11px] text-fg-muted mt-0.5">來源：{c.source_name}{c.raw_published_at ? ` · ${new Date(c.raw_published_at).toLocaleDateString("zh-TW")}` : ""}</div>}
                {c.raw_summary && <div className="text-xs text-fg-muted mt-1 line-clamp-3">{c.raw_summary}</div>}
                {c.raw_url && <a href={c.raw_url} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline inline-flex items-center gap-1 mt-1 break-all">看原文 <ExternalLink className="w-3 h-3 shrink-0" /></a>}
                {sug[c.id] && (
                  <div className="mt-2 text-[11px] text-fg-muted flex flex-wrap gap-x-3 gap-y-0.5 rounded-lg bg-accent/5 px-2 py-1.5">
                    <span className="text-accent font-medium">🤖 AI 讀原文抽到：</span>
                    {sug[c.id].category && <span>分類：{sug[c.id].category}</span>}
                    {sug[c.id].application_deadline && <span>截止：{sug[c.id].application_deadline}</span>}
                    {sug[c.id].prize_text && <span>獎金：{sug[c.id].prize_text}</span>}
                    {sug[c.id].organizer && <span>主辦：{sug[c.id].organizer}</span>}
                    {sug[c.id].is_free != null && <span>{sug[c.id].is_free ? "免費" : "需報名費"}</span>}
                    <span className="text-amber-600 dark:text-amber-400">（核准會一起帶入，仍請核對）</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <input value={catOverride[c.id] ?? ""} onChange={(e) => setCatOverride((m) => ({ ...m, [c.id]: e.target.value }))} placeholder="分類（選填）" className="rounded-lg border border-border bg-bg-elevated px-2 py-1 text-xs w-32" />
                  <button onClick={() => aiExtract(c.id)} disabled={!!extractingId} title="AI 讀原文、抽出截止/獎金/分類" className="inline-flex items-center gap-1 text-xs rounded-lg border border-accent/40 text-accent px-2.5 py-1.5 hover:bg-accent/10 disabled:opacity-50">{extractingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI 幫填</button>
                  <button onClick={() => review(c.id, "approve")} disabled={!!busyId} className="inline-flex items-center gap-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> 核准上線</button>
                  <button onClick={() => review(c.id, "reject")} disabled={!!busyId} className="inline-flex items-center gap-1 text-xs rounded-lg border border-border px-2.5 py-1.5 hover:bg-bg-elevated disabled:opacity-50"><X className="w-3.5 h-3.5" /> 拒絕</button>
                  <span className="text-[10px] text-fg-muted">核准＝進機會島（標 unverified）</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

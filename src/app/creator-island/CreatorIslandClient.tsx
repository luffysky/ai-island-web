"use client";

import { useState } from "react";

type Fragment = { id: string; title: string; content: string; tags: string[]; source_type: string };

async function api(url: string, body?: any, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

export function CreatorIslandClient({ workspaceId, initialFragments }: { workspaceId: string; initialFragments: Fragment[] }) {
  const [fragments, setFragments] = useState<Fragment[]>(initialFragments);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nt, setNt] = useState("");
  const [ntags, setNtags] = useState("");
  const [workType, setWorkType] = useState("article");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const sel = Array.from(selected);
  const toggle = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function addFragment() {
    if (!nt.trim()) return;
    setErr(null); setBusy("add");
    try {
      const { fragment } = await api("/api/creator-island/fragments", {
        workspaceId, title: nt.trim(),
        tags: ntags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean),
      });
      setFragments((p) => [fragment, ...p]); setNt(""); setNtags("");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function run(action: "synthesize" | "evolve" | "compose") {
    setErr(null); setResult(null); setBusy(action);
    try {
      let json: any;
      if (action === "synthesize") json = await api("/api/creator-island/ai/synthesize", { workspaceId, fragmentIds: sel });
      else if (action === "evolve") json = await api("/api/creator-island/ai/evolve", { workspaceId, fragmentId: sel[0], count: 6 });
      else json = await api("/api/creator-island/ai/compose", { workspaceId, fragmentIds: sel, workType });
      setResult({ action, ...json });
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function saveFragment(title: string, content: string) {
    try {
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title, content, sourceType: "ai_assisted" });
      setFragments((p) => [fragment, ...p]); setResult(null); setSelected(new Set());
    } catch (e: any) { setErr(e.message); }
  }

  async function saveWork() {
    const r = result?.result;
    if (!r) return;
    setBusy("savework");
    try {
      const body = workType === "song"
        ? { workspaceId, title: r.title, workType, body: r.lyricsSectioned, fragmentIds: sel, sourceType: "ai_assisted", meta: { sunoPrompt: r.sunoPrompt, mvPrompt: r.mvPrompt } }
        : { workspaceId, title: r.title, workType, body: r.body, fragmentIds: sel, sourceType: "ai_assisted" };
      await api("/api/creator-island/works", body);
      setResult(null); setSelected(new Set());
      alert("✅ 已存成作品（之後在作品庫看）");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const empty = fragments.length === 0;

  return (
    <div className="space-y-5">
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm flex justify-between">
          <span>⚠️ {err}</span><button onClick={() => setErr(null)}>✕</button>
        </div>
      )}

      {empty && (
        <div className="bg-gradient-to-br from-accent-3/10 to-violet-500/10 border border-accent-3/30 rounded-2xl p-5 text-sm">
          <b>🌱 從一句話開始</b>
          <p className="text-fg-muted mt-1">寫下一句想法 → 勾選它 → 按「演化」生出更多 → 再「編織」成作品。試試看？</p>
        </div>
      )}

      {/* 捕捉 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="font-bold text-sm">✍️ 捕捉碎片</div>
        <input value={nt} onChange={(e) => setNt(e.target.value)} placeholder="一句想法 / 一段回憶 / 一個點子…"
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
        <div className="flex gap-2">
          <input value={ntags} onChange={(e) => setNtags(e.target.value)} placeholder="標籤（逗號分隔）"
            className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={addFragment} disabled={busy === "add" || !nt.trim()}
            className="px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">＋ 新增</button>
        </div>
      </div>

      {/* 創作工具 */}
      <div className="bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-fg-muted mr-auto">已選 <b className="text-fg">{sel.length}</b> 個碎片</span>
        <button onClick={() => run("synthesize")} disabled={busy !== null || sel.length < 2}
          className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🧲 凝聚</button>
        <button onClick={() => run("evolve")} disabled={busy !== null || sel.length !== 1}
          className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🌿 演化</button>
        <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-1.5 text-xs">
          <option value="article">文章</option><option value="song">歌曲</option><option value="story">故事</option>
        </select>
        <button onClick={() => run("compose")} disabled={busy !== null || sel.length < 1}
          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-sm font-bold disabled:opacity-40">🧵 編織</button>
      </div>
      {busy && busy !== "add" && (
        <div className="text-sm text-fg-muted">{busy === "synthesize" ? "正在凝聚碎片…" : busy === "evolve" ? "正在演化想法…" : busy === "compose" ? "正在編織作品…" : "處理中…"}</div>
      )}

      {/* 結果 */}
      {result && (
        <div className="bg-bg-card border border-accent/40 rounded-2xl p-4 space-y-3">
          {result.action === "synthesize" && (
            <>
              <div className="font-bold">🧲 {result.result.title}</div>
              <p className="text-sm text-fg-muted whitespace-pre-wrap">{result.result.summary}</p>
              <div className="text-xs"><b className="text-accent">核心：</b>{result.result.coreIdea}</div>
              {result.result.connections?.length > 0 && (
                <ul className="text-xs text-fg-muted list-disc list-inside">{result.result.connections.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
              )}
              <button onClick={() => saveFragment(result.result.title, `${result.result.coreIdea}\n\n${result.result.summary}`)}
                className="px-3 py-1.5 rounded-full bg-accent text-white text-sm">存成碎片</button>
            </>
          )}
          {result.action === "evolve" && (
            <>
              <div className="font-bold">🌿 演化出 {result.variants.length} 個</div>
              <div className="space-y-2">
                {result.variants.map((v: any, i: number) => (
                  <div key={i} className="bg-bg-elevated rounded-lg p-2 text-sm flex justify-between gap-2">
                    <div><b>{v.title}</b><div className="text-xs text-fg-muted whitespace-pre-wrap">{v.content}</div></div>
                    <button onClick={() => saveFragment(v.title, v.content)} className="shrink-0 text-xs text-accent">＋存</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {result.action === "compose" && (
            <>
              <div className="font-bold">🧵 {result.result.title}</div>
              <pre className="text-sm text-fg-muted whitespace-pre-wrap font-sans">{result.result.lyricsSectioned ?? result.result.body}</pre>
              {result.result.sunoPrompt && (
                <div className="text-xs bg-bg-elevated rounded-lg p-2"><b>🎵 Suno：</b>{result.result.sunoPrompt}<br /><b>🎬 MV：</b>{result.result.mvPrompt}</div>
              )}
              <button onClick={saveWork} disabled={busy === "savework"} className="px-3 py-1.5 rounded-full bg-accent text-white text-sm disabled:opacity-40">存成作品</button>
            </>
          )}
        </div>
      )}

      {/* 碎片庫 */}
      <div>
        <div className="text-sm uppercase tracking-wider text-fg-muted mb-2">碎片（{fragments.length}）</div>
        <div className="space-y-2">
          {fragments.map((f) => (
            <label key={f.id} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition ${selected.has(f.id) ? "border-accent bg-accent/[0.06]" : "border-border bg-bg-card"}`}>
              <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="mt-1" />
              <div className="min-w-0">
                <div className="font-bold text-sm">{f.title}</div>
                {f.content && <div className="text-xs text-fg-muted mt-0.5 line-clamp-2 whitespace-pre-wrap">{f.content}</div>}
                {f.tags?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{f.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>)}</div>}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

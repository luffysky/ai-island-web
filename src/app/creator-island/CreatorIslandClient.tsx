"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { EggHatch } from "./EggHatch";

type Fragment = { id: string; title: string; subtitle?: string | null; content: string; tags: string[]; mood?: string | null; category?: string | null; source_type: string };
type Collection = { id: string; name: string; assetIds: string[] };

async function api(url: string, body?: any) {
  const res = await fetch(url, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

const SRC_ICON: Record<string, string> = {
  human_original: "✍️", ai_assisted: "🤖", ai_generated: "🤖", egg_generated: "🥚",
  work_recycled: "♻️", transcreated: "🌏", market_imported: "🍴", human_selected: "👆",
};

export function CreatorIslandClient({ workspaceId, initialFragments, initialCollections = [] }: { workspaceId: string; initialFragments: Fragment[]; initialCollections?: Collection[] }) {
  const [fragments, setFragments] = useState<Fragment[]>(initialFragments);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nt, setNt] = useState("");
  const [ntags, setNtags] = useState("");
  const [workType, setWorkType] = useState("article");
  const [transLang, setTransLang] = useState("日語");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [dust, setDust] = useState<number | null>(null);
  const [pairs, setPairs] = useState<any[] | null>(null);
  const [related, setRelated] = useState<any[] | null>(null);
  const [recording, setRecording] = useState<{ agent: string; params?: any }[]>([]);
  const [workflows, setWorkflows] = useState<any[] | null>(null);
  const [panel, setPanel] = useState<"none" | "pairs" | "flows">("none");
  const [editing, setEditing] = useState<Fragment | null>(null);
  const [advice, setAdvice] = useState<any>(null);

  useEffect(() => { fetch("/api/creator-island/dust").then((r) => r.json()).then((j) => setDust(j.balance ?? 0)).catch(() => {}); }, []);

  async function patchFragment(id: string, body: any) {
    const res = await fetch(`/api/creator-island/fragments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
    return j.fragment as Fragment;
  }
  async function saveEdit(updated: Fragment) {
    try {
      const f = await patchFragment(updated.id, { title: updated.title, subtitle: updated.subtitle, content: updated.content, tags: updated.tags, mood: updated.mood, category: updated.category });
      setFragments((p) => p.map((x) => (x.id === f.id ? f : x))); setEditing(null);
    } catch (e: any) { setErr(e.message); }
  }
  async function deleteFragment(id: string) {
    if (!confirm("刪除這個碎片？")) return;
    try {
      const res = await fetch(`/api/creator-island/fragments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("刪除失敗");
      setFragments((p) => p.filter((x) => x.id !== id)); setEditing(null);
      setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
    } catch (e: any) { setErr(e.message); }
  }

  // === 自訂分類（Collections） ===
  async function createCollection() {
    const name = prompt("新分類名稱："); if (!name?.trim()) return;
    try {
      const { collection } = await api("/api/creator-island/collections", { workspaceId, name: name.trim() });
      setCollections((p) => [...p, { id: collection.id, name: collection.name, assetIds: [] }]);
    } catch (e: any) { setErr(e.message); }
  }
  async function deleteCollection(id: string) {
    if (!confirm("刪除這個分類？（碎片本身不會刪）")) return;
    try {
      await fetch(`/api/creator-island/collections/${id}`, { method: "DELETE" });
      setCollections((p) => p.filter((c) => c.id !== id));
      if (activeCol === id) setActiveCol(null);
    } catch (e: any) { setErr(e.message); }
  }
  async function addToCollection(colId: string, assetId: string) {
    setCollections((p) => p.map((c) => (c.id === colId && !c.assetIds.includes(assetId) ? { ...c, assetIds: [...c.assetIds, assetId] } : c)));
    try { await api(`/api/creator-island/collections/${colId}/items`, { assetId, assetType: "fragment" }); }
    catch (e: any) { setErr(e.message); }
  }
  function onDragEnd(e: DragEndEvent) {
    setDropTarget(null);
    const colId = e.over?.id ? String(e.over.id) : null;
    const assetId = e.active?.id ? String(e.active.id) : null;
    if (colId && assetId && colId.startsWith("col:")) addToCollection(colId.slice(4), assetId);
  }

  const shownFragments = activeCol ? fragments.filter((f) => collections.find((c) => c.id === activeCol)?.assetIds.includes(f.id)) : fragments;

  const sel = Array.from(selected);
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function addFragment() {
    if (!nt.trim()) return;
    setErr(null); setBusy("add");
    try {
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title: nt.trim(), tags: ntags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) });
      setFragments((p) => [fragment, ...p]); setNt(""); setNtags("");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function openEgg() {
    const j = await api("/api/creator-island/eggs/open", { workspaceId });
    setFragments((p) => [j.fragment, ...p]); setDust(j.balance ?? dust);
    return { title: j.fragment?.title as string, rarity: j.rarity as string };
  }
  async function seedPool() {
    setErr(null); setBusy("seed");
    try { const j = await api("/api/creator-island/seed-pool", { workspaceId }); if (j.skipped) { setErr(j.message); setBusy(null); return; } window.location.reload(); }
    catch (e: any) { setErr(e.message); setBusy(null); }
  }
  function startVoice() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setErr("此瀏覽器不支援語音輸入"); return; }
    const rec = new SR(); rec.lang = "zh-TW"; rec.interimResults = false;
    rec.onresult = (e: any) => setNt((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rec.onerror = () => setErr("語音輸入失敗"); rec.start();
  }
  async function onPhoto(file: File) {
    setErr(null); setBusy("photo");
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (!up.url) throw new Error(up.message || "上傳失敗");
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title: file.name.slice(0, 60) || "圖片碎片", content: `![](${up.url})`, tags: ["圖片"] });
      setFragments((p) => [fragment, ...p]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function transcreateSel() {
    const fid = sel[0]; if (!fid) return;
    setErr(null); setBusy("transcreate");
    try { const j = await api("/api/creator-island/ai/transcreate", { workspaceId, fragmentId: fid, targetLanguage: transLang, targetCulture: transLang }); setFragments((p) => [j.fragment, ...p]); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function explorePairs() {
    setErr(null); setBusy("pairs"); setPanel("pairs");
    try { const j = await api("/api/creator-island/fragments/pairs", { workspaceId }); setPairs(j.pairs ?? []); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function findRelated(fragmentId: string) {
    setErr(null); setBusy("related");
    try { const j = await fetch(`/api/creator-island/fragments/related?workspaceId=${workspaceId}&fragmentId=${fragmentId}`).then((r) => r.json()); setRelated(j.related ?? []); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function run(action: "synthesize" | "evolve" | "compose") {
    setErr(null); setResult(null); setBusy(action);
    try {
      let json: any;
      if (action === "synthesize") json = await api("/api/creator-island/ai/synthesize", { workspaceId, fragmentIds: sel });
      else if (action === "evolve") json = await api("/api/creator-island/ai/evolve", { workspaceId, fragmentId: sel[0], count: 6 });
      else json = await api("/api/creator-island/ai/compose", { workspaceId, fragmentIds: sel, workType });
      setResult({ action, ...json });
      setRecording((p) => [...p, { agent: action, params: action === "evolve" ? { count: 6 } : action === "compose" ? { workType } : {} }]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function getAdvice() {
    setErr(null); setAdvice(null); setBusy("advise");
    try { const j = await api("/api/creator-island/ai/advise", { workspaceId, fragmentIds: sel }); setAdvice(j); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function composeAs(wt: string) {
    setWorkType(wt); setAdvice(null); setErr(null); setResult(null); setBusy("compose");
    try {
      const json = await api("/api/creator-island/ai/compose", { workspaceId, fragmentIds: sel, workType: wt });
      setResult({ action: "compose", ...json });
      setRecording((p) => [...p, { agent: "compose", params: { workType: wt } }]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function saveFragment(title: string, content: string) {
    try { const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title, content, sourceType: "ai_assisted" }); setFragments((p) => [fragment, ...p]); setResult(null); setSelected(new Set()); }
    catch (e: any) { setErr(e.message); }
  }
  async function saveWork() {
    const r = result?.result; if (!r) return; setBusy("savework");
    try {
      const body = workType === "song"
        ? { workspaceId, title: r.title, workType, body: r.lyricsSectioned, fragmentIds: sel, sourceType: "ai_assisted", meta: { sunoPrompt: r.sunoPrompt, mvPrompt: r.mvPrompt } }
        : { workspaceId, title: r.title, workType, body: r.body, fragmentIds: sel, sourceType: "ai_assisted" };
      await api("/api/creator-island/works", body); setResult(null); setSelected(new Set()); alert("✅ 已存成作品（作品庫看）");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function saveWorkflow() {
    const title = prompt(`把剛剛這 ${recording.length} 步存成工作流，取個名字：`); if (!title) return;
    try { await api("/api/creator-island/workflows", { workspaceId, title, steps: recording }); setRecording([]); alert("✅ 已存成工作流"); }
    catch (e: any) { setErr(e.message); }
  }
  async function loadWorkflows() {
    setPanel("flows");
    try { const j = await fetch(`/api/creator-island/workflows?workspaceId=${workspaceId}`).then((r) => r.json()); setWorkflows(j.workflows ?? []); }
    catch (e: any) { setErr(e.message); }
  }
  async function replay(id: string) {
    setErr(null); setBusy("replay");
    try { const j = await api(`/api/creator-island/workflows/${id}/run`, { fragmentIds: sel }); setResult({ action: "replay", results: j.results }); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const empty = fragments.length === 0;
  const busyMsg = busy === "synthesize" ? "綠寶正在凝聚碎片…" : busy === "evolve" ? "綠寶正在演化想法…" : busy === "compose" ? "綠寶正在編織作品…" : busy === "transcreate" ? "文化轉譯中…" : busy === "pairs" ? "探索意外配對…" : busy === "related" ? "搜尋相關碎片…" : busy === "replay" ? "重播工作流…" : null;

  return (
    <div className="space-y-5 pb-32">
      {/* HUD */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-200">🪙 Dust {dust ?? "…"}</span>
        <span className="px-3 py-1.5 rounded-full bg-bg-card border border-border text-fg-muted">🌲 碎片 {fragments.length}</span>
        {sel.length > 0 && <span className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent">已選 {sel.length}</span>}
        <span className="ml-auto text-fg-muted">綠寶 ✨ 陪你創作中</span>
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm flex justify-between"><span>⚠️ {err}</span><button onClick={() => setErr(null)}>✕</button></div>}

      {fragments.length < 50 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-accent-3/15 via-pink-500/10 to-violet-500/15 border border-accent-3/30 rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-bold">🎁 讓島嶼長滿靈感</div>
            <p className="text-sm text-fg-muted mt-1">從全站碎片庫抽 <b>300 顆</b>靈感碎片到你的島（含稀有 SSR），自動分好類。也可以自己寫第一句。</p>
          </div>
          <button onClick={seedPool} disabled={busy === "seed"} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-sm font-bold disabled:opacity-50 whitespace-nowrap">{busy === "seed" ? "種島中…" : "種 300 顆 🌱"}</button>
        </motion.div>
      )}

      {/* 頂部雙卡：靈感蛋 + 捕捉 */}
      <div className="grid sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2">
          <EggHatch onOpen={openEgg} disabled={busy !== null} />
        </div>
        <div className="sm:col-span-3 rounded-2xl p-4 bg-bg-card border border-border space-y-2">
          <div className="font-bold text-sm flex items-center gap-2">✍️ 捕捉碎片
            <button onClick={startVoice} title="語音" className="ml-auto text-base hover:scale-110 transition">🎤</button>
            <label title="拍照/圖片" className="text-base cursor-pointer hover:scale-110 transition">📷<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.currentTarget.value = ""; }} /></label>
          </div>
          <input value={nt} onChange={(e) => setNt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFragment(); }} placeholder="一句想法 / 回憶 / 點子…"
            className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <div className="flex gap-2">
            <input value={ntags} onChange={(e) => setNtags(e.target.value)} placeholder="標籤（逗號分隔）" className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
            <button onClick={addFragment} disabled={busy === "add" || !nt.trim()} className="px-4 rounded-lg bg-accent text-white text-sm font-bold disabled:opacity-40">＋</button>
          </div>
        </div>
      </div>

      {/* 探索列 */}
      <div className="flex gap-2 text-xs flex-wrap">
        <button onClick={explorePairs} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-200 hover:bg-violet-500/25 disabled:opacity-40">🔗 意外配對</button>
        <button onClick={loadWorkflows} className="px-3 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent">🛠️ 工作流{recording.length > 0 ? `（錄製 ${recording.length}）` : ""}</button>
        {recording.length > 0 && <button onClick={saveWorkflow} className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-200">存成工作流</button>}
      </div>

      {/* 意外配對面板 */}
      <AnimatePresence>
        {panel === "pairs" && pairs && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-bg-card border border-violet-500/30 rounded-2xl p-4 overflow-hidden">
            <div className="text-sm font-bold mb-2">🔗 AI 意外配對 <span className="text-xs font-normal text-fg-muted">點一對 → 凝聚/編織</span></div>
            {pairs.length === 0 ? <div className="text-xs text-fg-muted">碎片太少、或需要更多語意向量，多寫幾個再探索。</div> : (
              <div className="grid sm:grid-cols-2 gap-2">
                {pairs.map((p, i) => (
                  <button key={i} onClick={() => setSelected(new Set([p.a_id, p.b_id]))} className="text-left bg-bg-elevated rounded-lg px-3 py-2 text-xs hover:ring-1 hover:ring-violet-400">
                    <b>{p.a_title}</b> <span className="text-violet-300">×</span> <b>{p.b_title}</b> <span className="text-fg-muted">{Math.round(p.similarity * 100)}%</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {panel === "flows" && workflows && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-bg-card border border-border rounded-2xl p-4 overflow-hidden space-y-1">
            <div className="text-sm font-bold mb-1">🛠️ 我的工作流</div>
            {workflows.length === 0 ? <div className="text-xs text-fg-muted">還沒有。做幾個動作後「存成工作流」，下次一鍵重播。</div> :
              workflows.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs bg-bg-elevated rounded-lg px-3 py-2">
                  <span><b>{w.title}</b> <span className="text-fg-muted">· {(w.steps ?? []).map((s: any) => s.agent).join("→")}</span></span>
                  <button onClick={() => replay(w.id)} disabled={busy !== null || sel.length < 1} className="text-accent disabled:opacity-40">▶ 重播</button>
                </div>
              ))}
          </motion.div>
        )}
        {related && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="text-sm font-bold mb-1">🔍 你可能也想到過…</div>
            {related.length === 0 ? <div className="text-xs text-fg-muted">沒找到明顯相關的舊碎片。</div> :
              related.map((r) => <button key={r.id} onClick={() => setSelected((p) => new Set([...p, r.id]))} className="block text-left text-xs text-fg-muted hover:text-accent">＋ {r.title} <span className="opacity-60">{Math.round((r.similarity ?? 0) * 100)}%</span></button>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💡 創作顧問建議 */}
      <AnimatePresence>
        {advice && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between"><div className="font-bold">💡 這些碎片適合做什麼</div><button onClick={() => setAdvice(null)} className="text-fg-muted hover:text-fg text-sm">✕</button></div>
            {advice.insight && <p className="text-sm text-fg-muted">{advice.insight}</p>}
            <div className="grid sm:grid-cols-2 gap-2">
              {(advice.suggestions ?? []).map((s: any, i: number) => (
                <div key={i} className="bg-bg-card/60 rounded-lg p-3 text-sm">
                  <div className="font-bold">{s.workType} <span className="text-xs text-accent">· {s.genre}</span></div>
                  <div className="text-xs text-fg-muted mt-0.5">{s.why}</div>
                  {s.angle && <div className="text-xs text-accent-3 mt-0.5">切入：{s.angle}</div>}
                  <button onClick={() => composeAs(s.genre ? `${s.workType}（${s.genre}）` : s.workType)} disabled={busy !== null} className="mt-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 disabled:opacity-40">用這個編織 →</button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI 結果 */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-bg-card border-2 border-accent/40 rounded-2xl p-4 space-y-3 shadow-lg shadow-accent/5">
            {result.action === "synthesize" && (<>
              <div className="font-bold">🧲 {result.result.title}</div>
              <p className="text-sm text-fg-muted whitespace-pre-wrap">{result.result.summary}</p>
              <div className="text-xs"><b className="text-accent">核心：</b>{result.result.coreIdea}</div>
              {result.result.connections?.length > 0 && <ul className="text-xs text-fg-muted list-disc list-inside">{result.result.connections.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>}
              <button onClick={() => saveFragment(result.result.title, `${result.result.coreIdea}\n\n${result.result.summary}`)} className="px-3 py-1.5 rounded-full bg-accent text-white text-sm">存成碎片</button>
            </>)}
            {result.action === "evolve" && (<>
              <div className="font-bold">🌿 演化出 {result.variants.length} 個</div>
              <div className="space-y-2">{result.variants.map((v: any, i: number) => (
                <div key={i} className="bg-bg-elevated rounded-lg p-2 text-sm flex justify-between gap-2"><div><b>{v.title}</b><div className="text-xs text-fg-muted whitespace-pre-wrap">{v.content}</div></div><button onClick={() => saveFragment(v.title, v.content)} className="shrink-0 text-xs text-accent">＋存</button></div>
              ))}</div>
            </>)}
            {result.action === "replay" && (<>
              <div className="font-bold">▶ 工作流重播</div>
              {result.results?.map((s: any, i: number) => <div key={i} className="text-xs bg-bg-elevated rounded-lg p-2"><b>{s.agent}</b> {s.ok ? "✅" : `❌ ${s.error}`}{s.ok && <div className="text-fg-muted mt-0.5">{s.output?.title ?? s.output?.coreIdea ?? (s.output?.variants ? `${s.output.variants.length} 變體` : "")}</div>}</div>)}
            </>)}
            {result.action === "compose" && (<>
              <div className="font-bold">🧵 {result.result.title}</div>
              <pre className="text-sm text-fg-muted whitespace-pre-wrap font-sans">{result.result.lyricsSectioned ?? result.result.body}</pre>
              {result.result.sunoPrompt && <div className="text-xs bg-bg-elevated rounded-lg p-2"><b>🎵 Suno：</b>{result.result.sunoPrompt}<br /><b>🎬 MV：</b>{result.result.mvPrompt}</div>}
              <button onClick={saveWork} disabled={busy === "savework"} className="px-3 py-1.5 rounded-full bg-accent text-white text-sm disabled:opacity-40">存成作品</button>
            </>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自訂分類 + 碎片森林（可拖曳複製到分類） */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd} onDragOver={(e) => setDropTarget(e.over ? String(e.over.id) : null)} onDragCancel={() => setDropTarget(null)}>
        <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
          <span className="text-fg-muted">🗂 分類：</span>
          <button onClick={() => setActiveCol(null)} className={`px-2.5 py-1 rounded-full border transition ${activeCol === null ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>全部 {fragments.length}</button>
          {collections.map((c) => (
            <CollectionChip key={c.id} c={c} active={activeCol === c.id} isOver={dropTarget === `col:${c.id}`}
              onClick={() => setActiveCol(activeCol === c.id ? null : c.id)} onDelete={() => deleteCollection(c.id)} />
          ))}
          <button onClick={createCollection} className="px-2.5 py-1 rounded-full border border-dashed border-border text-fg-muted hover:text-accent">＋ 新分類</button>
        </div>
        <div className="text-[10px] text-fg-muted mb-3">把碎片卡拖到分類上＝複製進該分類（一個碎片可同時屬於多類）。</div>

        <div className="text-sm uppercase tracking-wider text-fg-muted mb-2">🌲 碎片森林（{shownFragments.length}）</div>
        <div className="columns-1 sm:columns-2 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
          {shownFragments.map((f) => (
            <DraggableFragment key={f.id} f={f} on={selected.has(f.id)} onToggle={() => toggle(f.id)} onEdit={() => setEditing(f)} />
          ))}
        </div>
      </DndContext>

      {/* 浮層創作工具（選了碎片才亮） */}
      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,720px)] bg-bg-card/95 backdrop-blur border-2 border-accent/40 rounded-2xl shadow-2xl shadow-accent/10 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-fg-muted mr-auto">🪄 已選 <b className="text-fg">{sel.length}</b> 個碎片</span>
              <button onClick={() => run("synthesize")} disabled={busy !== null || sel.length < 2} className="px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🧲 凝聚</button>
              <button onClick={() => run("evolve")} disabled={busy !== null || sel.length !== 1} className="px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🌿 演化</button>
              <button onClick={() => findRelated(sel[0])} disabled={busy !== null || sel.length !== 1} className="px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🔍 相關</button>
              <button onClick={getAdvice} disabled={busy !== null || sel.length < 1} className="px-3 py-2 rounded-full bg-amber-500/15 text-amber-200 text-sm hover:bg-amber-500/25 disabled:opacity-40">💡 適合做什麼</button>
              <select value={transLang} onChange={(e) => setTransLang(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-2 text-xs">{["日語", "韓語", "English", "法語", "西班牙語", "粵語", "文言文"].map((l) => <option key={l} value={l}>{l}</option>)}</select>
              <button onClick={transcreateSel} disabled={busy !== null || sel.length !== 1} className="px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🌏 轉譯</button>
              <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-2 text-xs">
                <option value="article">文章</option>
                <option value="散文">散文</option>
                <option value="song">歌曲</option>
                <option value="詩">詩</option>
                <option value="短篇小說">短篇小說</option>
                <option value="story">故事</option>
                <option value="劇本">劇本</option>
                <option value="短影音腳本">短影音腳本</option>
                <option value="文案">文案/Slogan</option>
                <option value="品牌故事">品牌故事</option>
                <option value="世界觀">世界觀設定</option>
                <option value="角色設定">角色設定</option>
                <option value="課程大綱">課程大綱</option>
                <option value="產品企劃">產品企劃</option>
              </select>
              <button onClick={() => run("compose")} disabled={busy !== null || sel.length < 1} className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-sm font-bold disabled:opacity-40">🧵 編織</button>
              <button onClick={() => setSelected(new Set())} className="text-fg-muted hover:text-fg text-sm px-1">✕</button>
            </div>
            {busyMsg && <div className="text-xs text-accent mt-2 animate-pulse">{busyMsg}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 碎片編輯 modal */}
      <AnimatePresence>
        {editing && <FragmentEditModal frag={editing} onClose={() => setEditing(null)} onSave={saveEdit} onDelete={deleteFragment} />}
      </AnimatePresence>
    </div>
  );
}

function CollectionChip({ c, active, isOver, onClick, onDelete }: { c: Collection; active: boolean; isOver: boolean; onClick: () => void; onDelete: () => void }) {
  const { setNodeRef } = useDroppable({ id: `col:${c.id}` });
  return (
    <span ref={setNodeRef}
      className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition ${isOver ? "border-accent bg-accent/25 scale-110" : active ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
      <button onClick={onClick}>🗂 {c.name} {c.assetIds.length}</button>
      <button onClick={onDelete} title="刪除分類" className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400">✕</button>
    </span>
  );
}

function DraggableFragment({ f, on, onToggle, onEdit }: { f: Fragment; on: boolean; onToggle: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: f.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onToggle} role="button" tabIndex={0}
      className={`group relative block w-full text-left rounded-xl p-3 border transition cursor-grab active:cursor-grabbing ${isDragging ? "opacity-70 ring-2 ring-accent z-50 shadow-xl" : on ? "border-accent bg-accent/[0.08] ring-1 ring-accent/40" : "border-border bg-bg-card hover:border-accent/40"}`}>
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} onPointerDown={(e) => e.stopPropagation()} title="編輯"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-fg-muted hover:text-accent text-sm">✎</button>
      <div className="font-bold text-sm flex items-start gap-1.5 pr-5"><span>{SRC_ICON[f.source_type] ?? "✍️"}</span><span className="flex-1">{f.title}</span>{on && <span className="text-accent">✓</span>}</div>
      {f.subtitle && <div className="text-xs text-accent-3 mt-0.5">{f.subtitle}</div>}
      {f.content && !f.content.startsWith("![](") && <div className="text-xs text-fg-muted mt-1 line-clamp-3 whitespace-pre-wrap">{f.content}</div>}
      {f.content?.startsWith("![](") && <img src={f.content.slice(4, -1)} alt="" className="mt-2 rounded-lg max-h-40 w-full object-cover" />}
      <div className="mt-1.5 flex flex-wrap gap-1 items-center">
        {f.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">🗂 {f.category}</span>}
        {f.mood && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300">{f.mood}</span>}
        {f.tags?.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>)}
      </div>
    </div>
  );
}

function FragmentEditModal({ frag, onClose, onSave, onDelete }: { frag: Fragment; onClose: () => void; onSave: (f: Fragment) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(frag.title);
  const [subtitle, setSubtitle] = useState(frag.subtitle ?? "");
  const [content, setContent] = useState(frag.content);
  const [tags, setTags] = useState((frag.tags ?? []).join("、"));
  const [mood, setMood] = useState(frag.mood ?? "");
  const [category, setCategory] = useState(frag.category ?? "");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
        className="w-[min(94vw,560px)] max-h-[88vh] overflow-y-auto bg-bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between"><div className="font-bold">✎ 編輯碎片</div><button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button></div>
        <label className="block text-xs text-fg-muted">標題
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent" /></label>
        <label className="block text-xs text-fg-muted">副標題
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="一句副標 / 註解" className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent" /></label>
        <label className="block text-xs text-fg-muted">內容
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent resize-y" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-fg-muted">類別
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例：歌詞素材" className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent" /></label>
          <label className="block text-xs text-fg-muted">心情
            <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="例：懷舊" className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent" /></label>
        </div>
        <label className="block text-xs text-fg-muted">標籤（逗號分隔）
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent" /></label>
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => onSave({ ...frag, title, subtitle, content, mood, category, tags: tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) })}
            disabled={!title.trim()} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">儲存</button>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-bg-elevated text-sm">取消</button>
          <button onClick={() => onDelete(frag.id)} className="ml-auto px-3 py-2 rounded-full bg-red-500/15 text-red-300 text-sm hover:bg-red-500/25">刪除</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

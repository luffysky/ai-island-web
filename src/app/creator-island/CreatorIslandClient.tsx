"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  Coins, Trees, PenLine, Mic, Camera, Plus, Shuffle, Wrench, Play, Search,
  Lightbulb, Magnet, Leaf, Wand2, Languages, FolderTree, Pencil, Copy, Music, Film, PenTool,
  X, Check, Bot, Egg, Recycle, GitFork, Hand, ScrollText, BrainCircuit, type LucideIcon,
} from "lucide-react";
import { EggHatch } from "./EggHatch";
import { IslandTour } from "./IslandTour";
import { IslandChat } from "./IslandChat";
import { DriftBottleSea } from "./DriftBottleSea";

type Fragment = { id: string; title: string; subtitle?: string | null; content: string; tags: string[]; mood?: string | null; category?: string | null; source_type: string };
type Collection = { id: string; name: string; assetIds: string[] };

async function api(url: string, body?: any) {
  const res = await fetch(url, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

const SRC_ICON: Record<string, LucideIcon> = {
  human_original: PenLine, ai_assisted: Bot, ai_generated: Bot, egg_generated: Egg,
  work_recycled: Recycle, transcreated: Languages, market_imported: GitFork, human_selected: Hand,
};
function SrcIcon({ type }: { type: string }) {
  const I = SRC_ICON[type] ?? PenLine;
  return <I size={14} className="inline shrink-0" />;
}

/** 編織 workType（中文label/含括號子類）→ 創作引擎 type key。 */
function engineTypeFromWorkType(wt: string): string {
  const s = wt || "";
  if (s.includes("歌")) return "song";
  if (s.includes("詩")) return "poem";
  if (s.includes("劇本") || s.includes("腳本") || s.includes("短影音")) return "script";
  if (s.includes("短篇") || s.includes("故事")) return "short_story";
  if (s.includes("小說")) return "novel";
  if (s.includes("文案") || s.includes("品牌") || s.includes("slogan")) return "copy";
  return "article";
}
function composeBodyToHtml(text: string): string {
  return (text || "").split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
}

// 預置工作流範例：選幾個碎片就能一鍵重播的常用組合（步驟串是真的 agent pipeline）。
const PRESET_WORKFLOWS: { title: string; desc: string; steps: { agent: string; params?: Record<string, any> }[] }[] = [
  { title: "凝聚 → 短文", desc: "先把碎片凝成一個核心，再編織成短文", steps: [{ agent: "synthesize" }, { agent: "compose", params: { workType: "article" } }] },
  { title: "演化 → 編織", desc: "先演化出多個變體，再編成一篇作品", steps: [{ agent: "evolve", params: { count: 6 } }, { agent: "compose", params: { workType: "article" } }] },
  { title: "凝聚 → 一首歌", desc: "碎片凝聚後編成完整歌詞 + Suno/MV 提示", steps: [{ agent: "synthesize" }, { agent: "compose", params: { workType: "song" } }] },
  { title: "編織 → 英文轉譯", desc: "編成短文後轉譯成道地英文", steps: [{ agent: "compose", params: { workType: "article" } }, { agent: "transcreate", params: { targetLanguage: "English", targetCulture: "natural" } }] },
];

export function CreatorIslandClient({ workspaceId, initialFragments, initialCollections = [] }: { workspaceId: string; initialFragments: Fragment[]; initialCollections?: Collection[] }) {
  const [fragments, setFragments] = useState<Fragment[]>(initialFragments);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [q, setQ] = useState("");
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
  const [toast, setToast] = useState<string | null>(null);
  const [todayPair, setTodayPair] = useState<{ a_id: string; a_title: string; b_id: string; b_title: string; similarity: number } | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 1600); }

  useEffect(() => { fetch("/api/creator-island/dust").then((r) => r.json()).then((j) => setDust(j.balance ?? 0)).catch(() => {}); }, []);
  // 今日 AI 配對：碎片夠多才抽；依「今天是第幾天」決定性挑一組（同一天固定、回訪誘因）。
  useEffect(() => {
    if (fragments.length < 8) return;
    fetch("/api/creator-island/fragments/pairs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) })
      .then((r) => r.json()).then((j) => {
        const list = (j.pairs ?? []) as any[];
        if (!list.length) return;
        const day = Math.floor(Date.now() / 86400000);
        setTodayPair(list[day % list.length]);
      }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const colFiltered = activeCol ? fragments.filter((f) => collections.find((c) => c.id === activeCol)?.assetIds.includes(f.id)) : fragments;
  const qLower = q.trim().toLowerCase();
  const shownFragments = qLower
    ? colFiltered.filter((f) => [f.title, f.subtitle, f.content, f.category, f.mood, ...(f.tags ?? [])]
        .some((s) => s && String(s).toLowerCase().includes(qLower)))
    : colFiltered;

  const sel = Array.from(selected);
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const focusFrags = fragments.filter((f) => selected.has(f.id)).map((f) => ({ id: f.id, title: f.title, content: f.content }));
  // 全選：目前顯示（含搜尋/分類過濾）的碎片。再按一次＝取消。
  const allShownSelected = shownFragments.length > 0 && shownFragments.every((f) => selected.has(f.id));
  const toggleSelectAllShown = () => setSelected((p) => {
    const n = new Set(p);
    if (allShownSelected) shownFragments.forEach((f) => n.delete(f.id));
    else shownFragments.forEach((f) => n.add(f.id));
    return n;
  });

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
    setDust(j.balance ?? dust);
    if (j.duplicate) {
      return { rarity: j.rarity as string, duplicate: true, message: j.message as string };
    }
    setFragments((p) => [j.fragment, ...p]);
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
  async function onVideo(file: File) {
    setErr(null); setBusy("photo");
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (!up.url) throw new Error(up.message || "上傳失敗（影片上限 30MB）");
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title: file.name.slice(0, 60) || "影片碎片", content: `!video(${up.url})`, tags: ["影片"] });
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
      const evolveCount = sel.length > 1 ? Math.min(12, sel.length * 3) : 6;
      if (action === "synthesize") json = await api("/api/creator-island/ai/synthesize", { workspaceId, fragmentIds: sel });
      else if (action === "evolve") json = await api("/api/creator-island/ai/evolve", { workspaceId, fragmentIds: sel, count: evolveCount });
      else json = await api("/api/creator-island/ai/compose", { workspaceId, fragmentIds: sel, workType });
      setResult({ action, sourceIds: [...sel], ...json });
      setRecording((p) => [...p, { agent: action, params: action === "evolve" ? { count: evolveCount } : action === "compose" ? { workType } : {} }]);
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
      setResult({ action: "compose", sourceIds: [...sel], ...json });
      setRecording((p) => [...p, { agent: "compose", params: { workType: wt } }]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function saveFragment(title: string, content: string) {
    try { const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title, content, sourceType: "ai_assisted", derivedFrom: result?.sourceIds ?? [], relationType: "condensed_from" }); setFragments((p) => [fragment, ...p]); flash("已存成碎片 ✓"); setResult(null); setSelected(new Set()); }
    catch (e: any) { setErr(e.message); }
  }
  // 演化變體：單獨存（不關面板、標記已存、跳提示），可全部存
  async function saveVariant(v: { title: string; content: string }, key: string) {
    if (savedKeys.has(key)) return;
    try {
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title: v.title, content: v.content, sourceType: "ai_assisted", derivedFrom: result?.sourceIds ?? [], relationType: "evolved_from" });
      setFragments((p) => [fragment, ...p]); setSavedKeys((p) => new Set(p).add(key)); flash("已存成碎片 ✓");
    } catch (e: any) { setErr(e.message); }
  }
  async function saveAllVariants(variants: { title: string; content: string }[]) {
    setBusy("saveall");
    try {
      const created: Fragment[] = [];
      for (let i = 0; i < variants.length; i++) {
        const key = `evolve:${i}`; if (savedKeys.has(key)) continue;
        const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title: variants[i].title, content: variants[i].content, sourceType: "ai_assisted", derivedFrom: result?.sourceIds ?? [], relationType: "evolved_from" });
        created.push(fragment); setSavedKeys((p) => new Set(p).add(key));
      }
      if (created.length) { setFragments((p) => [...created.reverse(), ...p]); flash(`已存 ${created.length} 個碎片 ✓`); }
      else flash("都已經存過了");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
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
  async function importToEngine() {
    const r = result?.result; if (!r) return;
    setBusy("import"); setErr(null);
    try {
      const isSong = !!r.lyricsSectioned;
      const html = composeBodyToHtml(r.lyricsSectioned ?? r.body ?? "");
      const { draft } = await api("/api/creator-island/drafts", {
        workspaceId, workType: engineTypeFromWorkType(workType),
        title: r.title || "未命名草稿", body: html, fragmentIds: sel,
        meta: isSong ? { sunoPrompt: r.sunoPrompt, mvPrompt: r.mvPrompt } : {},
      });
      window.location.href = `/creator-island/create/${draft.id}`;
    } catch (e: any) { setErr(e.message); setBusy(null); }
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
  async function addPreset(p: typeof PRESET_WORKFLOWS[number]) {
    setErr(null);
    try { await api("/api/creator-island/workflows", { workspaceId, title: p.title, steps: p.steps }); await loadWorkflows(); flash("已加入工作流 ✓、選碎片後就能重播"); }
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
      <div data-tour="hud" className="flex items-center gap-2 flex-wrap text-xs">
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200"><Coins size={13} /> Dust {dust ?? "…"}</span>
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-bg-card border border-border text-fg-muted"><Trees size={13} /> 碎片 {fragments.length}</span>
        {sel.length > 0 && <span className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent">已選 {sel.length}</span>}
        <span className="ml-auto text-fg-muted">綠寶陪你創作中</span>
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm flex justify-between items-center gap-2"><span>{err}</span><button onClick={() => setErr(null)}><X size={14} /></button></div>}

      {fragments.length < 50 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <DriftBottleSea className="border border-cyan-400/25 shadow-xl">
            <div className="p-5 sm:p-6 flex items-center justify-between gap-3 flex-wrap text-white">
              <div className="max-w-md drop-shadow">
                <div className="text-lg font-bold inline-flex items-center gap-1.5">🌊 海上漂來了 300 個故事</div>
                <p className="text-sm text-cyan-50/90 mt-1">海面漂來 <b>300 個</b>來自各地的靈感碎片（含稀有 SSR）——生活、夢境、回憶、街景、遺憾……它們不是你的，卻可以和你的回憶相遇。也可以自己先寫第一句。</p>
              </div>
              <button onClick={seedPool} disabled={busy === "seed"} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-300 to-blue-400 text-black text-sm font-bold shadow-lg disabled:opacity-50 whitespace-nowrap hover:scale-105 transition">{busy === "seed" ? "打撈中…" : <>🌊 撈起 300 個漂流瓶</>}</button>
            </div>
          </DriftBottleSea>
        </motion.div>
      )}

      {/* 今日 AI 配對（每天一組、回訪誘因） */}
      {todayPair && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-500/12 to-fuchsia-500/10 border border-violet-400/30 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs font-bold text-violet-600 dark:text-violet-300 inline-flex items-center gap-1.5"><Shuffle size={13} /> 今日 AI 配對</div>
            <div className="text-sm mt-1"><b>{todayPair.a_title}</b> <span className="text-violet-400">×</span> <b>{todayPair.b_title}</b></div>
            <div className="text-[11px] text-fg-muted mt-0.5">AI 覺得這兩個撞在一起有戲——今天就從這裡開始寫？</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setSelected(new Set([todayPair.a_id, todayPair.b_id]))} className="text-xs px-3 py-1.5 rounded-full bg-bg-card border border-border hover:border-accent">選起來</button>
            <Link href={`/creator-island/reason?seed=${todayPair.a_id},${todayPair.b_id}`} className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold inline-flex items-center gap-1"><BrainCircuit size={13} /> 來推理</Link>
          </div>
        </motion.div>
      )}

      {/* 頂部雙卡：靈感蛋 + 捕捉 */}
      <div className="grid sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2" data-tour="egg">
          <EggHatch onOpen={openEgg} disabled={busy !== null} />
        </div>
        <div data-tour="capture" className="sm:col-span-3 rounded-2xl p-4 bg-bg-card border border-border space-y-2">
          <div className="font-bold text-sm flex items-center gap-2"><PenLine size={15} /> 捕捉碎片
            <button onClick={startVoice} title="語音" className="ml-auto hover:scale-110 transition"><Mic size={17} /></button>
            <label title="拍照/圖片" className="cursor-pointer hover:scale-110 transition"><Camera size={17} /><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.currentTarget.value = ""; }} /></label>
            <label title="影片（上限 30MB）" className="cursor-pointer hover:scale-110 transition"><Film size={17} /><input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onVideo(f); e.currentTarget.value = ""; }} /></label>
          </div>
          <input value={nt} onChange={(e) => setNt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFragment(); }} placeholder="一句想法 / 回憶 / 點子…"
            className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <div className="flex gap-2">
            <input value={ntags} onChange={(e) => setNtags(e.target.value)} placeholder="標籤（逗號分隔）" className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
            <button onClick={addFragment} disabled={busy === "add" || !nt.trim()} title="新增" className="px-4 rounded-lg bg-accent text-white font-bold disabled:opacity-40 grid place-items-center"><Plus size={16} /></button>
          </div>
        </div>
      </div>

      {/* 探索列 */}
      <div data-tour="explore" className="flex gap-2 text-xs flex-wrap">
        <button onClick={explorePairs} disabled={busy !== null} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-200 hover:bg-violet-500/25 disabled:opacity-40"><Shuffle size={13} /> 意外配對</button>
        <button onClick={loadWorkflows} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent"><Wrench size={13} /> 工作流{recording.length > 0 ? `（錄製 ${recording.length}）` : ""}</button>
        {recording.length > 0 && <button onClick={saveWorkflow} className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-200">存成工作流</button>}
        <Link href={`/creator-island/activity?ws=${workspaceId}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-bg-card border border-border hover:text-accent"><ScrollText size={13} /> 操作記錄</Link>
        <Link href="/creator-island/reason" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"><BrainCircuit size={13} /> 推理台</Link>
        <Link href="/creator-island/universe" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/15 to-indigo-500/15 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-400/30 hover:opacity-90">🌌 碎片宇宙</Link>
      </div>

      {/* 意外配對面板 */}
      <AnimatePresence>
        {panel === "pairs" && pairs && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-bg-card border border-violet-500/30 rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <div className="text-sm font-bold inline-flex items-center gap-1.5"><Shuffle size={14} /> AI 意外配對 <span className="text-xs font-normal text-fg-muted">可點多對累加碎片 → 凝聚/編織 或丟進推理台</span></div>
              <div className="flex items-center gap-2">
                {sel.length > 0 && <Link href={`/creator-island/reason?seed=${sel.join(",")}`} className="text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-0.5"><BrainCircuit size={12} /> 丟進推理台（{sel.length}）</Link>}
                {sel.length > 0 && <button onClick={() => setSelected(new Set())} className="text-[11px] text-fg-muted hover:text-accent inline-flex items-center gap-0.5"><X size={11} /> 清空</button>}
              </div>
            </div>
            {pairs.length === 0 ? <div className="text-xs text-fg-muted">碎片太少、或需要更多語意向量，多寫幾個再探索。</div> : (
              <div className="grid sm:grid-cols-2 gap-2">
                {pairs.map((p, i) => {
                  const active = selected.has(p.a_id) && selected.has(p.b_id);
                  return (
                    <button key={i} onClick={() => setSelected((prev) => { const n = new Set(prev); if (n.has(p.a_id) && n.has(p.b_id)) { n.delete(p.a_id); n.delete(p.b_id); } else { n.add(p.a_id); n.add(p.b_id); } return n; })}
                      className={`text-left rounded-lg px-3 py-2 text-xs transition inline-flex items-start gap-1.5 ${active ? "bg-violet-500/20 ring-1 ring-violet-400" : "bg-bg-elevated hover:ring-1 hover:ring-violet-400"}`}>
                      {active && <Check size={13} className="text-violet-400 shrink-0 mt-0.5" />}
                      <span><b>{p.a_title}</b> <span className="text-violet-300">×</span> <b>{p.b_title}</b> <span className="text-fg-muted">{Math.round(p.similarity * 100)}%</span></span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
        {panel === "flows" && workflows && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-bg-card border border-border rounded-2xl p-4 overflow-hidden space-y-1">
            <div className="text-sm font-bold mb-1 inline-flex items-center gap-1.5"><Wrench size={14} /> 我的工作流</div>
            {workflows.length === 0 ? <div className="text-xs text-fg-muted">還沒有自己的工作流。做幾個動作後「存成工作流」，或直接從下面的範例加入。</div> :
              workflows.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs bg-bg-elevated rounded-lg px-3 py-2">
                  <span><b>{w.title}</b> <span className="text-fg-muted">· {(w.steps ?? []).map((s: any) => s.agent).join("→")}</span></span>
                  <button onClick={() => replay(w.id)} disabled={busy !== null || sel.length < 1} className="text-accent disabled:opacity-40">▶ 重播</button>
                </div>
              ))}
            {/* 預置範例工作流：一鍵加入（尚未加入的才顯示） */}
            {(() => {
              const have = new Set((workflows ?? []).map((w: any) => w.title));
              const avail = PRESET_WORKFLOWS.filter((p) => !have.has(p.title));
              if (avail.length === 0) return null;
              return (
                <div className="pt-2 mt-1 border-t border-border/60 space-y-1">
                  <div className="text-[11px] text-fg-muted px-1">✨ 範例工作流（點加入，選碎片後即可重播）</div>
                  {avail.map((p) => (
                    <div key={p.title} className="flex items-center justify-between gap-2 text-xs bg-bg-elevated/60 rounded-lg px-3 py-2">
                      <span className="min-w-0"><b>{p.title}</b> <span className="text-fg-muted">· {p.desc}</span></span>
                      <button onClick={() => addPreset(p)} className="shrink-0 text-accent hover:underline">＋ 加入</button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        )}
        {related && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="text-sm font-bold mb-1 inline-flex items-center gap-1.5"><Search size={14} /> 你可能也想到過…</div>
            {related.length === 0 ? <div className="text-xs text-fg-muted">沒找到明顯相關的舊碎片。</div> :
              related.map((r) => <button key={r.id} onClick={() => setSelected((p) => new Set([...p, r.id]))} className="block text-left text-xs text-fg-muted hover:text-accent">＋ {r.title} <span className="opacity-60">{Math.round((r.similarity ?? 0) * 100)}%</span></button>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💡 創作顧問建議 */}
      <AnimatePresence>
        {advice && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between"><div className="font-bold inline-flex items-center gap-1.5"><Lightbulb size={16} /> 這些碎片適合做什麼</div><button onClick={() => setAdvice(null)} className="text-fg-muted hover:text-fg"><X size={15} /></button></div>
            {advice.insight && <p className="text-sm text-fg-muted">{advice.insight}</p>}
            <div className="grid sm:grid-cols-2 gap-2">
              {(advice.suggestions ?? []).map((s: any, i: number) => (
                <div key={i} className="bg-bg-card/60 rounded-lg p-3 text-sm">
                  <div className="font-bold">{s.workType} <span className="text-xs text-accent">· {s.genre}</span></div>
                  <div className="text-xs text-fg-muted mt-0.5">{s.why}</div>
                  {s.angle && <div className="text-xs text-accent-3 mt-0.5">切入：{s.angle}</div>}
                  <button onClick={() => composeAs(s.genre ? `${s.workType}（${s.genre}）` : s.workType)} disabled={busy !== null} className="mt-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-200 disabled:opacity-40">用這個編織 →</button>
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
              <div className="font-bold inline-flex items-center gap-1.5"><Magnet size={15} /> {result.result.title}</div>
              <p className="text-sm text-fg-muted whitespace-pre-wrap">{result.result.summary}</p>
              <div className="text-xs"><b className="text-accent">核心：</b>{result.result.coreIdea}</div>
              {result.result.connections?.length > 0 && <ul className="text-xs text-fg-muted list-disc list-inside">{result.result.connections.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>}
              <div className="flex gap-2">
                <button onClick={() => saveFragment(result.result.title, `${result.result.coreIdea}\n\n${result.result.summary}`)} className="px-3 py-1.5 rounded-full bg-accent text-white text-sm">存成碎片</button>
                <button onClick={() => navigator.clipboard?.writeText(`${result.result.title}\n${result.result.coreIdea}\n\n${result.result.summary}`)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent"><Copy size={12} /> 複製</button>
              </div>
            </>)}
            {result.action === "evolve" && (<>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-bold inline-flex items-center gap-1.5"><Leaf size={16} /> 演化出 {result.variants.length} 個</div>
                <button onClick={() => saveAllVariants(result.variants)} disabled={busy === "saveall"} className="ml-auto inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-accent text-white font-bold disabled:opacity-40">{busy === "saveall" ? "存入中…" : <><Plus size={12} /> 全部存起來</>}</button>
              </div>
              <div className="space-y-2">{result.variants.map((v: any, i: number) => {
                const saved = savedKeys.has(`evolve:${i}`);
                return (
                <div key={i} className="bg-bg-elevated rounded-lg p-2 text-sm flex justify-between gap-2"><div><b>{v.title}</b><div className="text-xs text-fg-muted whitespace-pre-wrap">{v.content}</div></div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => saveVariant(v, `evolve:${i}`)} disabled={saved}
                    className={`shrink-0 inline-flex items-center gap-0.5 text-xs px-2 self-start rounded-full ${saved ? "text-emerald-500" : "text-accent hover:bg-accent/10"}`}>{saved ? <><Check size={12} /> 已存</> : <><Plus size={12} /> 存</>}</motion.button>
                </div>
              ); })}</div>
            </>)}
            {result.action === "replay" && (<>
              <div className="font-bold inline-flex items-center gap-1.5"><Play size={15} /> 工作流重播</div>
              {result.results?.map((s: any, i: number) => <div key={i} className="text-xs bg-bg-elevated rounded-lg p-2"><b>{s.agent}</b> {s.ok ? "✅" : `❌ ${s.error}`}{s.ok && <div className="text-fg-muted mt-0.5">{s.output?.title ?? s.output?.coreIdea ?? (s.output?.variants ? `${s.output.variants.length} 變體` : "")}</div>}</div>)}
            </>)}
            {result.action === "compose" && (<>
              <div className="font-bold inline-flex items-center gap-1.5"><Wand2 size={15} /> {result.result.title}</div>
              <pre className="text-sm text-fg-muted whitespace-pre-wrap font-sans">{result.result.lyricsSectioned ?? result.result.body}</pre>
              {result.result.sunoPrompt && <div className="text-xs bg-bg-elevated rounded-lg p-2"><b className="inline-flex items-center gap-1"><Music size={12} /> Suno：</b>{result.result.sunoPrompt}<br /><b className="inline-flex items-center gap-1"><Film size={12} /> MV：</b>{result.result.mvPrompt}</div>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigator.clipboard?.writeText(result.result.lyricsSectioned ?? result.result.body ?? "")} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent"><Copy size={12} /> 複製{result.result.lyricsSectioned ? "歌詞" : "內容"}</button>
                {result.result.sunoPrompt && <button onClick={() => navigator.clipboard?.writeText(result.result.sunoPrompt)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent"><Copy size={12} /> Suno</button>}
                {result.result.mvPrompt && <button onClick={() => navigator.clipboard?.writeText(result.result.mvPrompt)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent"><Copy size={12} /> MV</button>}
                <button onClick={importToEngine} disabled={busy === "import"} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-200 text-sm hover:bg-violet-500/30 disabled:opacity-40">{busy === "import" ? "導入中…" : <><PenTool size={13} /> 導入創作引擎續寫</>}</button>
                <button onClick={saveWork} disabled={busy === "savework"} className="px-3 py-1.5 rounded-full bg-accent text-white text-sm disabled:opacity-40">存成作品</button>
              </div>
            </>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自訂分類 + 碎片森林（可拖曳複製到分類） */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd} onDragOver={(e) => setDropTarget(e.over ? String(e.over.id) : null)} onDragCancel={() => setDropTarget(null)}>
        <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
          <span className="text-fg-muted inline-flex items-center gap-1"><FolderTree size={13} /> 分類：</span>
          <button onClick={() => setActiveCol(null)} className={`px-2.5 py-1 rounded-full border transition ${activeCol === null ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>全部 {fragments.length}</button>
          {collections.map((c) => (
            <CollectionChip key={c.id} c={c} active={activeCol === c.id} isOver={dropTarget === `col:${c.id}`}
              onClick={() => setActiveCol(activeCol === c.id ? null : c.id)} onDelete={() => deleteCollection(c.id)} />
          ))}
          <button onClick={createCollection} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-fg-muted hover:text-accent"><Plus size={12} /> 新分類</button>
        </div>
        <div className="text-[10px] text-fg-muted mb-3">把碎片卡拖到分類上＝複製進該分類（一個碎片可同時屬於多類）。</div>

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div data-tour="forest" className="text-sm uppercase tracking-wider text-fg-muted inline-flex items-center gap-1.5"><Trees size={14} /> 碎片森林（{shownFragments.length}）</div>
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋碎片…"
              className="w-full bg-bg-elevated border border-border rounded-full pl-7 pr-7 py-1.5 text-xs outline-none focus:border-accent" />
            {q && <button onClick={() => setQ("")} title="清除" className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"><X size={12} /></button>}
          </div>
          {shownFragments.length > 0 && (
            <button onClick={toggleSelectAllShown} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border bg-bg-card text-xs hover:border-accent/40 whitespace-nowrap">
              <Check size={12} /> {allShownSelected ? "取消全選" : `全選${qLower || activeCol ? "本頁" : ""}`}
            </button>
          )}
        </div>
        <div className="columns-1 sm:columns-2 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid max-h-[78vh] overflow-y-auto pr-1">
          {shownFragments.map((f) => (
            <DraggableFragment key={f.id} f={f} on={selected.has(f.id)} onToggle={() => toggle(f.id)} onEdit={() => setEditing(f)} />
          ))}
        </div>
      </DndContext>

      {/* 浮層創作工具（選了碎片才亮） */}
      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-[5.5rem] md:bottom-4 left-1/2 -translate-x-1/2 z-[52] w-[min(92vw,720px)] max-h-[55vh] overflow-y-auto bg-bg-card/95 backdrop-blur border-2 border-accent/40 rounded-2xl shadow-2xl shadow-accent/10 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-fg-muted mr-auto inline-flex items-center gap-1"><Wand2 size={13} /> 已選 <b className="text-fg">{sel.length}</b> 個碎片</span>
              <button onClick={() => run("synthesize")} disabled={busy !== null || sel.length < 2} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40"><Magnet size={14} /> 凝聚</button>
              <button onClick={() => run("evolve")} disabled={busy !== null || sel.length < 1} title={sel.length > 1 ? "把選中的碎片交叉演化" : "演化這個碎片"} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40"><Leaf size={14} /> 演化{sel.length > 1 ? `×${sel.length}` : ""}</button>
              <button onClick={() => findRelated(sel[0])} disabled={busy !== null || sel.length !== 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40"><Search size={14} /> 相關</button>
              <button onClick={getAdvice} disabled={busy !== null || sel.length < 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-200 text-sm hover:bg-amber-500/25 disabled:opacity-40"><Lightbulb size={14} /> 適合做什麼</button>
              <select value={transLang} onChange={(e) => setTransLang(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-2 text-xs">{["日語", "韓語", "English", "法語", "西班牙語", "粵語", "文言文"].map((l) => <option key={l} value={l}>{l}</option>)}</select>
              <button onClick={transcreateSel} disabled={busy !== null || sel.length !== 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40"><Languages size={14} /> 轉譯</button>
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
              <button onClick={() => run("compose")} disabled={busy !== null || sel.length < 1} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-sm font-bold disabled:opacity-40"><Wand2 size={14} /> 編織</button>
              <button onClick={() => setSelected(new Set())} title="清除選取" className="text-fg-muted hover:text-fg px-1"><X size={15} /></button>
            </div>
            {busyMsg && <div className="text-xs text-accent mt-2 animate-pulse">{busyMsg}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 碎片編輯 modal */}
      <AnimatePresence>
        {editing && <FragmentEditModal frag={editing} onClose={() => setEditing(null)} onSave={saveEdit} onDelete={deleteFragment} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[5.5rem] md:bottom-6 left-1/2 -translate-x-1/2 z-[58] px-4 py-2 rounded-full bg-emerald-500 text-black text-sm font-bold shadow-lg">{toast}</motion.div>
        )}
      </AnimatePresence>

      <IslandTour />
      <IslandChat workspaceId={workspaceId} focusFragments={focusFrags} onClearFocus={() => setSelected(new Set())} />
    </div>
  );
}

function CollectionChip({ c, active, isOver, onClick, onDelete }: { c: Collection; active: boolean; isOver: boolean; onClick: () => void; onDelete: () => void }) {
  const { setNodeRef } = useDroppable({ id: `col:${c.id}` });
  return (
    <span ref={setNodeRef}
      className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition ${isOver ? "border-accent bg-accent/25 scale-110" : active ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
      <button onClick={onClick} className="inline-flex items-center gap-1"><FolderTree size={12} /> {c.name} {c.assetIds.length}</button>
      <button onClick={onDelete} title="刪除分類" className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400"><X size={12} /></button>
    </span>
  );
}

// 稀有度分級（存在 tags 第一項：SSR/SR/R；碎片蛋/首抽帶）。每級不同底色/邊框，一眼分辨。
const RARITY = ["N", "R", "SR", "SSR", "UR"];
type RarityStyle = { card: string; pill: string; label: string };
const RARITY_STYLE: Record<string, RarityStyle> = {
  UR:  { card: "border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500/15 to-amber-400/10 hover:border-fuchsia-400", pill: "bg-gradient-to-r from-fuchsia-500 to-amber-400 text-black font-bold", label: "UR" },
  SSR: { card: "border-amber-400/50 bg-amber-400/[0.10] hover:border-amber-400", pill: "bg-amber-400/90 text-black font-bold", label: "SSR" },
  SR:  { card: "border-violet-400/45 bg-violet-500/[0.09] hover:border-violet-400", pill: "bg-violet-500/85 text-white font-bold", label: "SR" },
  R:   { card: "border-sky-400/35 bg-sky-500/[0.07] hover:border-sky-400", pill: "bg-sky-500/80 text-white font-bold", label: "R" },
  N:   { card: "border-border bg-bg-card hover:border-accent/40", pill: "bg-bg-elevated text-fg-muted", label: "N" },
};
/** 從 tags 找稀有度（大小寫容錯），沒有就回 N。 */
function fragRarity(tags?: string[]): string {
  for (const t of tags ?? []) { const u = t.trim().toUpperCase(); if (RARITY.includes(u)) return u; }
  return "N";
}

function DraggableFragment({ f, on, onToggle, onEdit }: { f: Fragment; on: boolean; onToggle: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: f.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const rarity = fragRarity(f.tags);
  const rs = RARITY_STYLE[rarity] ?? RARITY_STYLE.N;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onToggle} role="button" tabIndex={0}
      className={`group relative block w-full text-left rounded-xl p-3 border transition cursor-grab active:cursor-grabbing ${isDragging ? "opacity-70 ring-2 ring-accent z-50 shadow-xl" : on ? "border-accent bg-accent/[0.08] ring-1 ring-accent/40" : rs.card}`}>
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} onPointerDown={(e) => e.stopPropagation()} title="編輯"
        className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition text-fg-muted hover:text-accent p-1 -m-1"><Pencil size={14} /></button>
      <div className="font-bold text-sm flex items-start gap-1.5 pr-5"><span className="mt-0.5"><SrcIcon type={f.source_type} /></span><span className="flex-1">{f.title}</span>{on && <Check size={14} className="text-accent shrink-0" />}</div>
      {f.subtitle && <div className="text-xs text-accent-3 mt-0.5">{f.subtitle}</div>}
      {f.content && !f.content.startsWith("![](") && !f.content.startsWith("!video(") && <div className="text-xs text-fg-muted mt-1 line-clamp-3 whitespace-pre-wrap">{f.content}</div>}
      {f.content?.startsWith("![](") && <img src={f.content.slice(4, -1)} alt="" className="mt-2 rounded-lg max-h-40 w-full object-cover" />}
      {f.content?.startsWith("!video(") && <video src={f.content.slice(7, -1)} controls playsInline className="mt-2 rounded-lg max-h-40 w-full bg-black" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} />}
      <div className="mt-1.5 flex flex-wrap gap-1 items-center">
        {f.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent inline-flex items-center gap-0.5"><FolderTree size={10} /> {f.category}</span>}
        {f.mood && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-700 dark:text-pink-300">{f.mood}</span>}
        {f.tags?.map((t) => RARITY.includes(t.trim().toUpperCase())
          ? <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full ${(RARITY_STYLE[t.trim().toUpperCase()] ?? RARITY_STYLE.N).pill}`}>{t.trim().toUpperCase()}</span>
          : <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>)}
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
        <div className="flex items-center justify-between"><div className="font-bold inline-flex items-center gap-1.5"><Pencil size={15} /> 編輯碎片</div><button onClick={onClose} className="text-fg-muted hover:text-fg"><X size={16} /></button></div>
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

"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Sparkles, Plus, Trash2, Pencil, Search, Loader2, Wand2,
  Bookmark, BookmarkCheck, ListTodo, FileText, X, Check,
  List, Clock, Hash, Share2, Rocket, FolderPlus, Folder as FolderIcon,
  CheckSquare, Square, MousePointerClick, GripVertical,
} from "lucide-react";
import { DailyIdeaCard } from "./DailyIdeaCard";
import { TagCloud } from "./views/TagCloud";
import { Timeline } from "./views/Timeline";
import { RelationshipGraph } from "./views/RelationshipGraph";

type ViewMode = "list" | "timeline" | "tags" | "graph";

type Folder = { id: string; name: string; color: string | null; created_at: string };

type Fragment = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mood: string | null;
  category: string | null;
  ai_summary: string | null;
  potential_uses: string[];
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

type Idea = {
  id: string;
  title: string;
  summary: string;
  idea_type: string | null;
  source_fragment_ids: string[];
  why_it_works: string | null;
  next_steps: string[];
  connections: string[];
  saved: boolean;
  created_at: string;
};

// 資料夾 filter 的特殊值
const ALL = "__all__";
const UNFILED = "__unfiled__";

async function api(url: string, method: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

export function IdeaFragmentsClient({
  initialFragments,
  initialIdeas,
  initialDaily,
  initialFolders,
}: {
  initialFragments: Fragment[];
  initialIdeas: Idea[];
  initialDaily: Idea | null;
  initialFolders: Folder[];
}) {
  const [fragments, setFragments] = useState<Fragment[]>(initialFragments);
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string>(ALL); // ALL / UNFILED / folderId
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  // 新增碎片表單
  const [nt, setNt] = useState("");
  const [nc, setNc] = useState("");
  const [ntags, setNtags] = useState("");
  const [nfolder, setNfolder] = useState<string>(""); // 新碎片要丟進的資料夾
  const [adding, setAdding] = useState(false);

  // 手選碎片組合
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 各種 loading state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<Fragment | null>(null);
  const [busyIdea, setBusyIdea] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    fragments.forEach((f) => f.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [fragments]);

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? null;

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return fragments.filter((f) => {
      if (folderFilter === UNFILED && f.folder_id) return false;
      if (folderFilter !== ALL && folderFilter !== UNFILED && f.folder_id !== folderFilter) return false;
      if (tagFilter && !f.tags?.includes(tagFilter)) return false;
      if (!kw) return true;
      return (
        f.title.toLowerCase().includes(kw) ||
        (f.content || "").toLowerCase().includes(kw) ||
        (f.ai_summary || "").toLowerCase().includes(kw)
      );
    });
  }, [fragments, q, tagFilter, folderFilter]);

  const fragTitle = (id: string) => fragments.find((f) => f.id === id)?.title ?? "（已刪除碎片）";

  // 每個資料夾的碎片數
  const folderCount = (id: string) => fragments.filter((f) => f.folder_id === id).length;
  const unfiledCount = fragments.filter((f) => !f.folder_id).length;

  async function addFragment() {
    if (!nt.trim()) return;
    setAdding(true);
    setErr(null);
    try {
      // 預設丟進「目前篩選的資料夾」或表單選的
      const folderId = nfolder || (folderFilter !== ALL && folderFilter !== UNFILED ? folderFilter : "");
      const { fragment } = await api("/api/admin/idea-fragments", "POST", {
        title: nt,
        content: nc,
        tags: ntags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean),
        folderId: folderId || null,
      });
      setFragments((prev) => [fragment, ...prev]);
      setNt(""); setNc(""); setNtags(""); setNfolder("");
    } catch (e: any) { setErr(e.message); }
    finally { setAdding(false); }
  }

  // ===== 資料夾 =====
  async function createFolder() {
    const name = prompt("資料夾名稱（例如：我的碎片 / Nami 的碎片）")?.trim();
    if (!name) return;
    try {
      const { folder } = await api("/api/admin/idea-folders", "POST", { name });
      setFolders((prev) => [...prev, folder]);
      setFolderFilter(folder.id);
    } catch (e: any) { setErr(e.message); }
  }

  async function renameFolder(f: Folder) {
    const name = prompt("改名", f.name)?.trim();
    if (!name || name === f.name) return;
    try {
      const { folder } = await api(`/api/admin/idea-folders/${f.id}`, "PATCH", { name });
      setFolders((prev) => prev.map((x) => (x.id === folder.id ? folder : x)));
    } catch (e: any) { setErr(e.message); }
  }

  async function deleteFolder(f: Folder) {
    if (!confirm(`刪除資料夾「${f.name}」？裡面的碎片不會刪、會變成「未分類」。`)) return;
    try {
      await api(`/api/admin/idea-folders/${f.id}`, "DELETE");
      setFolders((prev) => prev.filter((x) => x.id !== f.id));
      setFragments((prev) => prev.map((x) => (x.folder_id === f.id ? { ...x, folder_id: null } : x)));
      if (folderFilter === f.id) setFolderFilter(ALL);
    } catch (e: any) { setErr(e.message); }
  }

  async function moveFragmentToFolder(id: string, folderId: string | null) {
    try {
      const { fragment } = await api(`/api/admin/idea-fragments/${id}`, "PATCH", { folderId });
      setFragments((prev) => prev.map((f) => (f.id === id ? fragment : f)));
    } catch (e: any) { setErr(e.message); }
  }

  // ===== 手選碎片 =====
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function exitSelect() { setSelectMode(false); setSelectedIds(new Set()); }

  // 拖曳：碎片拖到資料夾 chip
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const fragId = String(e.active.id);
    const target = String(e.over.id); // folder id 或 UNFILED
    const newFolder = target === UNFILED ? null : target;
    const frag = fragments.find((f) => f.id === fragId);
    if (!frag || frag.folder_id === newFolder) return;
    // 樂觀更新 + 打 API
    setFragments((prev) => prev.map((f) => (f.id === fragId ? { ...f, folder_id: newFolder } : f)));
    moveFragmentToFolder(fragId, newFolder);
  }

  async function deleteFragment(id: string) {
    if (!confirm("確定刪除這個碎片？")) return;
    try {
      await api(`/api/admin/idea-fragments/${id}`, "DELETE");
      setFragments((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) { setErr(e.message); }
  }

  async function analyze(id: string) {
    setAnalyzingId(id);
    setErr(null);
    try {
      const { fragment } = await api(`/api/admin/idea-fragments/${id}/analyze`, "POST");
      setFragments((prev) => prev.map((f) => (f.id === id ? fragment : f)));
    } catch (e: any) { setErr(e.message); }
    finally { setAnalyzingId(null); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const { fragment } = await api(`/api/admin/idea-fragments/${editing.id}`, "PATCH", {
        title: editing.title,
        content: editing.content,
        tags: editing.tags,
        mood: editing.mood,
        category: editing.category,
        folderId: editing.folder_id,
      });
      setFragments((prev) => prev.map((f) => (f.id === fragment.id ? fragment : f)));
      setEditing(null);
    } catch (e: any) { setErr(e.message); }
  }

  async function generate() {
    setGenerating(true);
    setErr(null);
    try {
      // 優先：手選的碎片 → 其次：目前資料夾 → 否則：最近全部
      const body: any = { count: 3 };
      if (selectedIds.size >= 2) body.fragmentIds = Array.from(selectedIds);
      else if (folderFilter !== ALL && folderFilter !== UNFILED) body.folderId = folderFilter;
      const { ideas: fresh } = await api("/api/admin/idea-fragments/generate", "POST", body);
      setIdeas((prev) => [...fresh, ...prev]);
      exitSelect();
    } catch (e: any) { setErr(e.message); }
    finally { setGenerating(false); }
  }

  async function toggleSave(idea: Idea) {
    setBusyIdea(idea.id);
    try {
      const { idea: updated } = await api(`/api/admin/generated-ideas/${idea.id}`, "PATCH", { saved: !idea.saved });
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e: any) { setErr(e.message); }
    finally { setBusyIdea(null); }
  }

  async function deleteIdea(id: string) {
    if (!confirm("丟掉這個點子？")) return;
    try {
      await api(`/api/admin/generated-ideas/${id}`, "DELETE");
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { setErr(e.message); }
  }

  async function convert(id: string, target: "task" | "article" | "product_plan") {
    setBusyIdea(id);
    setErr(null);
    try {
      await api(`/api/admin/generated-ideas/${id}/convert`, "POST", { target });
      alert(
        target === "task" ? "✅ 已轉成任務（到「待辦」看）"
        : target === "article" ? "✅ 已建立文章草稿（到部落格草稿看）"
        : "✅ AI 已展開成產品企劃，存成部落格草稿（標題【產品企劃】…）"
      );
    } catch (e: any) { setErr(e.message); }
    finally { setBusyIdea(null); }
  }

  // 從時間軸 / 關聯圖點碎片 → 開編輯
  function openFragment(id: string) {
    const f = fragments.find((x) => x.id === id);
    if (f) setEditing(f);
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm flex items-center justify-between">
          <span>⚠️ {err}</span>
          <button onClick={() => setErr(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* ===== 今日點子（每日自動推薦） ===== */}
      <DailyIdeaCard initialDaily={initialDaily} fragmentCount={fragments.length} />

      {/* ===== 主行動：給我一個點子 ===== */}
      <div className="bg-gradient-to-br from-amber-500/10 to-violet-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-fg-muted">
          {selectedIds.size >= 2 ? (
            <>已選 <b className="text-fg">{selectedIds.size}</b> 個碎片，AI 會專門組合這幾個。</>
          ) : selectedIds.size === 1 ? (
            <>再選 1 個碎片（至少 2 個才能組合），或直接讓 AI 從全部找連結。</>
          ) : folderFilter !== ALL && folderFilter !== UNFILED ? (
            <>會用「<b className="text-fg">{folderName(folderFilter)}</b>」資料夾裡的碎片來重組。</>
          ) : (
            <>目前有 <b className="text-fg">{fragments.length}</b> 個碎片。{fragments.length < 2 ? " 至少收集 2 個，AI 才能重組。" : " 讓 AI 從中找出隱藏的連結。"}</>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating || fragments.length < 2}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {generating ? "AI 重組中…" : selectedIds.size >= 2 ? `✨ 組合這 ${selectedIds.size} 個` : "✨ 給我一個點子"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== 左：碎片 ===== */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {/* 新增碎片 */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm"><Plus size={16} /> 新增碎片</div>
            <input
              value={nt}
              onChange={(e) => setNt(e.target.value)}
              placeholder="標題（一句想法 / 一段回憶 / 一個概念…）"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <textarea
              value={nc}
              onChange={(e) => setNc(e.target.value)}
              placeholder="內容（可留空，之後再補）"
              rows={3}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none resize-y"
            />
            <input
              value={ntags}
              onChange={(e) => setNtags(e.target.value)}
              placeholder="標籤，用逗號分隔（青春, 創作, 咖啡）"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={nfolder || (folderFilter !== ALL && folderFilter !== UNFILED ? folderFilter : "")}
                onChange={(e) => setNfolder(e.target.value)}
                className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
              >
                <option value="">📂 未分類</option>
                {folders.map((f) => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
              </select>
              <button
                onClick={addFragment}
                disabled={adding || !nt.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 shrink-0"
              >
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 新增
              </button>
            </div>
          </div>

          {/* 搜尋 + 標籤篩選 */}
          <div className="bg-bg-card border border-border rounded-2xl p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜尋碎片…"
                className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:border-accent outline-none"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tagFilter && (
                  <button onClick={() => setTagFilter(null)} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                    清除篩選 ✕
                  </button>
                )}
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                    className={`text-[11px] px-2 py-0.5 rounded-full transition ${
                      tagFilter === t ? "bg-accent text-white" : "bg-bg-elevated text-fg-muted hover:text-accent"
                    }`}
                  >#{t}</button>
                ))}
              </div>
            )}
          </div>

          {/* 資料夾 */}
          <div className="bg-bg-card border border-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-fg-muted flex items-center gap-1"><FolderIcon size={13} /> 資料夾</div>
              <button onClick={createFolder} className="text-[11px] inline-flex items-center gap-1 text-accent hover:underline">
                <FolderPlus size={12} /> 新資料夾
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFolderFilter(ALL)}
                className={`text-[11px] px-2.5 py-1 rounded-full transition ${folderFilter === ALL ? "bg-accent text-white" : "bg-bg-elevated text-fg-muted hover:text-accent"}`}
              >全部 {fragments.length}</button>
              {folders.map((f) => (
                <FolderChip
                  key={f.id}
                  dropId={f.id}
                  active={folderFilter === f.id}
                  label={`📁 ${f.name} ${folderCount(f.id)}`}
                  onSelect={() => setFolderFilter(f.id)}
                  onRename={() => renameFolder(f)}
                  onDelete={() => deleteFolder(f)}
                />
              ))}
              {(folders.length > 0 || unfiledCount > 0) && (
                <FolderChip
                  dropId={UNFILED}
                  active={folderFilter === UNFILED}
                  label={`📂 未分類 ${unfiledCount}`}
                  onSelect={() => setFolderFilter(UNFILED)}
                />
              )}
            </div>
            {folders.length > 0 && <div className="text-[10px] text-fg-muted">💡 把碎片往資料夾上拖,就能分類</div>}
          </div>

          {/* 手選碎片組合 toolbar */}
          <div className={`flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs border ${selectMode ? "bg-amber-500/10 border-amber-500/40" : "bg-bg-card border-border"}`}>
            {selectMode ? (
              <>
                <span className="text-fg-muted">已選 <b className="text-fg">{selectedIds.size}</b> 個（勾要組合的碎片 → 上面按產生）</span>
                <button onClick={exitSelect} className="text-fg-muted hover:text-accent inline-flex items-center gap-1"><X size={12} /> 取消</button>
              </>
            ) : (
              <button onClick={() => setSelectMode(true)} className="text-fg-muted hover:text-accent inline-flex items-center gap-1.5 w-full">
                <MousePointerClick size={13} /> 手選碎片來組合點子
              </button>
            )}
          </div>

          {/* 檢視切換 */}
          <div className="flex items-center gap-1 bg-bg-card border border-border rounded-full p-1 text-xs">
            {([
              ["list", "列表", List],
              ["timeline", "時間軸", Clock],
              ["tags", "標籤雲", Hash],
              ["graph", "關聯圖", Share2],
            ] as [ViewMode, string, typeof List][]).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full transition ${
                  view === v ? "bg-accent text-white font-bold" : "text-fg-muted hover:text-accent"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {view === "timeline" && <Timeline fragments={filtered} onSelect={openFragment} />}
          {view === "tags" && (
            <TagCloud
              fragments={fragments}
              activeTag={tagFilter}
              onTagClick={(t) => { setTagFilter(tagFilter === t ? null : t); setView("list"); }}
            />
          )}
          {view === "graph" && <RelationshipGraph fragments={filtered} onSelect={openFragment} />}

          {/* 碎片列表 */}
          {view === "list" && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-center text-fg-muted text-sm py-8">
                {fragments.length === 0 ? "還沒有碎片，從上面開始收集吧 🌱" : "沒有符合的碎片"}
              </div>
            )}
            {filtered.map((f) => {
              const selected = selectedIds.has(f.id);
              return (
              <DraggableCard key={f.id} id={f.id} enabled={!selectMode} selected={selected}>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`min-w-0 flex-1 ${selectMode ? "cursor-pointer" : ""}`}
                    onClick={selectMode ? () => toggleSelect(f.id) : undefined}
                  >
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      {selectMode && (selected
                        ? <CheckSquare size={15} className="text-amber-400 shrink-0" />
                        : <Square size={15} className="text-fg-muted shrink-0" />)}
                      {f.title}
                    </div>
                    {f.content && <div className="text-xs text-fg-muted mt-0.5 line-clamp-2 whitespace-pre-wrap">{f.content}</div>}
                  </div>
                  {!selectMode && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button onClick={() => setEditing(f)} title="編輯" className="p-1.5 rounded-lg hover:bg-bg-elevated text-fg-muted hover:text-accent"><Pencil size={13} /></button>
                      <button onClick={() => deleteFragment(f.id)} title="刪除" className="p-1.5 rounded-lg hover:bg-bg-elevated text-fg-muted hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>

                {(f.category || f.mood || f.folder_id) && (
                  <div className="flex gap-1.5 mt-1.5 text-[11px] flex-wrap">
                    {f.folder_id && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">📁 {folderName(f.folder_id)}</span>}
                    {f.category && <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">{f.category}</span>}
                    {f.mood && <span className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-300">{f.mood}</span>}
                  </div>
                )}

                {f.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {f.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>)}
                  </div>
                )}

                {f.ai_summary && (
                  <div className="mt-2 text-xs bg-bg-elevated rounded-lg p-2 border-l-2 border-accent">
                    <span className="text-accent font-bold">AI：</span>{f.ai_summary}
                    {f.potential_uses?.length > 0 && (
                      <div className="mt-1 text-fg-muted">可能用途：{f.potential_uses.join("、")}</div>
                    )}
                  </div>
                )}

                {!selectMode && (
                  <button
                    onClick={() => analyze(f.id)}
                    disabled={analyzingId === f.id}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-accent/20 text-fg-muted hover:text-accent transition disabled:opacity-40"
                  >
                    {analyzingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {f.ai_summary ? "重新分析" : "分析碎片"}
                  </button>
                )}
              </DraggableCard>
              );
            })}
          </div>
          )}
        </div>
        </DndContext>

        {/* ===== 右：生成的點子 ===== */}
        <div className="space-y-2">
          <div className="font-bold text-sm flex items-center gap-2 px-1"><Sparkles size={16} className="text-amber-400" /> 點子（{ideas.length}）</div>
          {ideas.length === 0 && (
            <div className="text-center text-fg-muted text-sm py-8 bg-bg-card border border-dashed border-border rounded-xl">
              還沒有點子。收集幾個碎片後，點上面的「✨ 給我一個點子」。
            </div>
          )}
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className={`rounded-xl p-3.5 border ${idea.saved ? "bg-amber-500/[0.07] border-amber-500/40" : "bg-bg-card border-border"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold flex items-center gap-2">
                  {idea.title}
                  {idea.idea_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-normal">{idea.idea_type}</span>}
                </div>
                <button
                  onClick={() => toggleSave(idea)}
                  disabled={busyIdea === idea.id}
                  title={idea.saved ? "取消儲存" : "儲存這個點子"}
                  className={`p-1.5 rounded-lg shrink-0 ${idea.saved ? "text-amber-400" : "text-fg-muted hover:text-amber-400"} hover:bg-bg-elevated`}
                >
                  {idea.saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                </button>
              </div>

              {idea.summary && <p className="text-sm text-fg-muted mt-1 whitespace-pre-wrap">{idea.summary}</p>}

              {idea.connections?.length > 0 && (
                <div className="mt-2 text-xs bg-violet-500/[0.07] rounded-lg p-2 border-l-2 border-violet-400">
                  <div className="font-bold text-violet-300 mb-0.5">🔗 為什麼這些碎片值得組合</div>
                  <ul className="list-disc list-inside text-fg-muted space-y-0.5">
                    {idea.connections.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              {idea.why_it_works && (
                <div className="mt-2 text-xs">
                  <span className="font-bold text-accent">為什麼成立：</span>
                  <span className="text-fg-muted">{idea.why_it_works}</span>
                </div>
              )}

              {idea.next_steps?.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="font-bold mb-0.5">下一步：</div>
                  <ul className="list-disc list-inside text-fg-muted space-y-0.5">
                    {idea.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {idea.source_fragment_ids?.length > 0 && (
                <div className="mt-2 text-[11px] text-fg-muted">
                  用到碎片：{idea.source_fragment_ids.map(fragTitle).join("、")}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <button
                  onClick={() => convert(idea.id, "task")}
                  disabled={busyIdea === idea.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-accent/20 text-fg-muted hover:text-accent transition disabled:opacity-40"
                ><ListTodo size={12} /> 轉成任務</button>
                <button
                  onClick={() => convert(idea.id, "article")}
                  disabled={busyIdea === idea.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-accent/20 text-fg-muted hover:text-accent transition disabled:opacity-40"
                ><FileText size={12} /> 轉成文章草稿</button>
                <button
                  onClick={() => convert(idea.id, "product_plan")}
                  disabled={busyIdea === idea.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/15 hover:bg-violet-500/30 text-violet-300 transition disabled:opacity-40"
                >
                  {busyIdea === idea.id ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />} 轉成產品企劃
                </button>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-red-500/20 text-fg-muted hover:text-red-400 transition ml-auto"
                ><Trash2 size={12} /> 丟掉</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 編輯碎片 modal ===== */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-bg-card border border-border rounded-2xl p-4 w-full max-w-lg space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold flex items-center gap-2"><Pencil size={16} /> 編輯碎片</div>
            <input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              rows={5}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none resize-y"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editing.category ?? ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder="分類"
                className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
              />
              <input
                value={editing.mood ?? ""}
                onChange={(e) => setEditing({ ...editing, mood: e.target.value })}
                placeholder="情緒"
                className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
              />
            </div>
            <input
              value={editing.tags.join(", ")}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) })}
              placeholder="標籤，用逗號分隔"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <label className="flex items-center gap-2 text-sm">
              <span className="text-fg-muted shrink-0">資料夾</span>
              <select
                value={editing.folder_id ?? ""}
                onChange={(e) => setEditing({ ...editing, folder_id: e.target.value || null })}
                className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
              >
                <option value="">📂 未分類</option>
                {folders.map((f) => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full bg-bg-elevated text-sm hover:opacity-80">取消</button>
              <button onClick={saveEdit} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-bold hover:opacity-90"><Check size={14} /> 儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 可拖曳的碎片卡（拖到資料夾 chip 分類）；selectMode 時關閉拖曳 */
function DraggableCard({ id, enabled, selected, children }: { id: string; enabled: boolean; selected: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: !enabled });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-xl p-3 group relative border transition ${
        isDragging ? "opacity-80 border-amber-400 shadow-xl z-50" : selected ? "border-amber-400 bg-amber-500/[0.06]" : "border-border bg-bg-card"
      } ${enabled ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {children}
    </div>
  );
}

/** 資料夾 chip：可點選篩選、雙擊改名、可刪除，且是拖曳放置目標 */
function FolderChip({
  dropId, active, label, onSelect, onRename, onDelete,
}: {
  dropId: string;
  active: boolean;
  label: string;
  onSelect: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <span
      ref={setNodeRef}
      className={`group/folder relative inline-flex rounded-full transition ${isOver ? "ring-2 ring-amber-400 scale-105" : ""}`}
    >
      <button
        onClick={onSelect}
        onDoubleClick={onRename}
        title={onRename ? "點選篩選 · 雙擊改名 · 把碎片拖進來" : "點選篩選 · 把碎片拖進來"}
        className={`text-[11px] py-1 rounded-full transition ${onDelete ? "pl-2.5 pr-6" : "px-2.5"} ${
          active ? "bg-accent text-white" : "bg-bg-elevated text-fg-muted hover:text-accent"
        }`}
      >{label}</button>
      {onDelete && (
        <button
          onClick={onDelete}
          title="刪除資料夾"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 text-fg-muted hover:text-red-400"
        ><X size={11} /></button>
      )}
    </span>
  );
}

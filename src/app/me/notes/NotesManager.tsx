"use client";

import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { useNotePresence } from "./useNotePresence";
import { NoteCard } from "./NoteCard";
import { NotesBackgroundPicker } from "./NotesBackgroundPicker";
import { FloatingNotesOverlay } from "./FloatingNotesOverlay";
import { DEFAULT_NOTES_BG, loadNotesBg, saveNotesBg, notesBgStyle, type NotesBgConfig } from "@/lib/notes-background";
import { STICKY_COLORS, clampOpacity, noteBgImgStyle, DEFAULT_NOTE_BG, type NoteBg } from "@/lib/note-sticky";
import { nextSrs, isDue, dueLabel, type SrsRating } from "@/lib/note-srs";
import { loadFolders, saveFolders, folderDropId, FOLDER_DROP_PREFIX, UNCATEGORIZED } from "@/lib/note-folders";
import { useToast } from "@/components/ui/Toast";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";
import { trackEvent } from "@/lib/analytics";
import { Plus, X, Save, Loader2, Sparkles, GripVertical, Folder, FolderPlus, Image as ImageIcon, RotateCw, Copy, Link2, Search, Repeat2, SlidersHorizontal, ChevronRight, ChevronDown, FileText } from "lucide-react";

const UNCAT_FILTER = "__uncat__";

const BlogEditor = dynamic(
  () => import("@/components/blog/BlogEditor").then((m) => m.BlogEditor),
  { ssr: false, loading: () => <div className="text-xs text-fg-muted p-3">載入編輯器…</div> },
);

export type ManagedNote = {
  id: string;
  user_id: string;
  title: string | null;
  chapter_id: number | null;
  lesson_id: string | null;
  content: string;
  is_public: boolean;
  likes: number;
  updated_at: string;
  category: string | null;
  tags: string[] | null;
  color: string | null;
  opacity: number | null;
  sort_order: number | null;
  pinned: boolean | null;
  bg: NoteBg | null;
  note_refs?: string[] | null; // L2：引用的其他筆記 id（存 id → 來源改動全站同步）
  _owned?: boolean;  // 我是擁有者（page 標記）
  _shared?: boolean; // 此筆記有共用關係
  _role?: string;    // 我的權限：owner / editor / viewer
};

/**
 * 拖移排序用的卡片外殼。
 * 重點：dnd listeners 只掛在「右上角把手」上、不掛整張卡 → 內文可自由選取，
 * 選字不會跟拖曳打架（之前整卡可拖，一選字就變拖動）。
 */
function SortableNoteCard({ id, expanded, children }: { id: string; expanded?: boolean; children: React.ReactNode }) {
  const t = useTranslations("notes");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 30 : undefined,
    order: expanded ? -1 : undefined,   // 展開時視覺挪到最前（不動排序資料）
  };
  return (
    <div ref={setNodeRef} style={style} className={`relative ${expanded ? "sm:col-span-2" : ""}`}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 z-20 p-1 rounded text-black/35 hover:text-black/70 hover:bg-black/10 cursor-grab active:cursor-grabbing transition"
        style={{ touchAction: "none" }}
        title={t("dragToReorderHint")}
        aria-label={t("dragToReorder")}
      >
        <GripVertical size={15} />
      </button>
      {children}
    </div>
  );
}

/** 可放下便利貼的資料夾 chip（拖筆記進來 = 設定分類）+ 點選＝篩選 */
function DroppableFolderChip({
  dropId, label, count, active, droppable, onClick, onRemove,
}: {
  dropId: string; label: string; count?: number; active: boolean; droppable?: boolean;
  onClick: () => void; onRemove?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId, disabled: !droppable });
  return (
    <span
      ref={setNodeRef}
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition select-none ${
        isOver ? "ring-2 ring-accent scale-110 bg-accent/25" : ""
      } ${active ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted hover:text-fg"}`}
      title={droppable ? "點選篩選；把便利貼拖進來分類" : "點選篩選"}
    >
      {label}
      {typeof count === "number" && <span className="opacity-60">{count}</span>}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 leading-none hover:text-red-500"
          title="移除空資料夾"
        >×</span>
      )}
    </span>
  );
}

/** 知識樹的一行（Notion 側欄風）；資料夾可拖入分類（droppable）。 */
function FolderTreeRow({ dropId, active, droppable, indent, icon, label, count, onClick, onRemove, chevron, onToggle }: {
  dropId?: string; active: boolean; droppable?: boolean; indent?: boolean; icon: React.ReactNode; label: string;
  count?: number; onClick: () => void; onRemove?: () => void; chevron?: "open" | "closed" | "none"; onToggle?: () => void;
}) {
  const t = useTranslations("notes");
  const { setNodeRef, isOver } = useDroppable({ id: dropId ?? "__none__", disabled: !droppable || !dropId });
  return (
    <div ref={dropId ? setNodeRef : undefined} onClick={onClick}
      className={`group flex items-center gap-1 rounded-md pr-1.5 py-1 cursor-pointer transition select-none text-sm ${indent ? "pl-6" : "pl-1.5"} ${isOver ? "ring-1 ring-accent bg-accent/20" : ""} ${active ? "bg-accent/15 text-accent font-medium" : "text-fg-muted hover:bg-bg-elevated hover:text-fg"}`}
      title={droppable ? t("filterAndDrop") : t("filterOnly")}>
      {chevron && chevron !== "none" ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggle?.(); }} className="shrink-0 text-fg-muted hover:text-fg -ml-0.5">
          {chevron === "open" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : <span className="w-3.5 shrink-0" />}
      <span className="shrink-0 grid place-items-center w-4">{icon}</span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {typeof count === "number" && count > 0 && <span className="text-[10px] text-fg-muted/70 shrink-0">{count}</span>}
      {onRemove && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400 shrink-0"><X size={12} /></button>}
    </div>
  );
}

function FolderBar({
  folderList, folderCounts, uncategorizedCount, fCat, setFCat,
  onAddFolder, onRemoveFolder, allTags, fTag, setFTag, droppable,
}: {
  folderList: string[]; folderCounts: Record<string, number>; uncategorizedCount: number;
  fCat: string; setFCat: (v: string) => void;
  onAddFolder: (name: string) => void; onRemoveFolder: (name: string) => void;
  allTags: string[]; fTag: string; setFTag: (v: string) => void; droppable?: boolean;
}) {
  const t = useTranslations("notes");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [subFor, setSubFor] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const submit = () => { if (name.trim()) onAddFolder(name.trim()); setName(""); setAdding(false); };
  const submitSub = (parent: string) => { if (subName.trim()) onAddFolder(`${parent}/${subName.trim()}`); setSubName(""); setSubFor(null); };
  const total = Object.values(folderCounts).reduce((a, b) => a + b, 0) + uncategorizedCount;

  // 知識樹（2 層）：資料夾用「父/子」慣例
  const tree = useMemo(() => {
    const m = new Map<string, { name: string; children: { full: string; name: string }[] }>();
    for (const f of folderList) {
      const idx = f.indexOf("/");
      const parent = (idx === -1 ? f : f.slice(0, idx)).trim();
      if (!parent) continue;
      if (!m.has(parent)) m.set(parent, { name: parent, children: [] });
      if (idx !== -1) { const cn = f.slice(idx + 1).trim(); if (cn) m.get(parent)!.children.push({ full: f, name: cn }); }
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }, [folderList]);
  const activeParent = fCat && fCat !== UNCAT_FILTER ? (fCat.indexOf("/") === -1 ? fCat : fCat.slice(0, fCat.indexOf("/"))) : "";
  const isOpen = (n: string) => expanded.has(n) || activeParent === n;
  const toggle = (n: string) => setExpanded((p) => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; });
  const countUnder = (parent: string) => {
    let t = folderCounts[parent] ?? 0;
    for (const k in folderCounts) if (k.startsWith(parent + "/")) t += folderCounts[k];
    return t;
  };

  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-bold text-fg-muted px-1.5 mb-1 inline-flex items-center gap-1.5"><Folder size={13} /> {t("knowledgeTree")}</div>
      <FolderTreeRow dropId={undefined} active={!fCat} droppable={false} icon={<FileText size={14} />} label={t("allNotes")} count={total} onClick={() => setFCat("")} />
      <FolderTreeRow dropId={folderDropId(UNCATEGORIZED)} active={fCat === UNCAT_FILTER} droppable={droppable} icon={<span className="text-xs">📥</span>} label={t("uncategorized")} count={uncategorizedCount} onClick={() => setFCat(fCat === UNCAT_FILTER ? "" : UNCAT_FILTER)} />

      {tree.map((p) => (
        <div key={p.name}>
          <FolderTreeRow
            dropId={folderDropId(p.name)} active={activeParent === p.name} droppable={droppable}
            icon={<span className="text-xs">📁</span>} label={p.name} count={countUnder(p.name)}
            chevron={p.children.length ? (isOpen(p.name) ? "open" : "closed") : "none"}
            onToggle={() => toggle(p.name)}
            onClick={() => { setFCat(fCat === p.name ? "" : p.name); if (p.children.length) setExpanded((s) => new Set(s).add(p.name)); }}
            onRemove={countUnder(p.name) === 0 ? () => onRemoveFolder(p.name) : undefined}
          />
          {isOpen(p.name) && (
            <>
              {p.children.map((ch) => (
                <FolderTreeRow key={ch.full} dropId={folderDropId(ch.full)} active={fCat === ch.full} droppable={droppable} indent
                  icon={<span className="text-[10px]">📄</span>} label={ch.name} count={folderCounts[ch.full] ?? 0}
                  onClick={() => setFCat(fCat === ch.full ? p.name : ch.full)}
                  onRemove={(folderCounts[ch.full] ?? 0) === 0 ? () => onRemoveFolder(ch.full) : undefined} />
              ))}
              {subFor === p.name ? (
                <input autoFocus value={subName} onChange={(e) => setSubName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitSub(p.name); if (e.key === "Escape") { setSubName(""); setSubFor(null); } }}
                  onBlur={() => submitSub(p.name)} placeholder={t("subfolderName")}
                  className="ml-6 my-0.5 px-2 py-1 rounded-md bg-bg border border-border text-xs w-[calc(100%-1.5rem)] outline-none focus:border-accent" />
              ) : (
                <button type="button" onClick={() => { setSubFor(p.name); setSubName(""); }} className="pl-6 py-0.5 text-xs text-fg-muted/70 hover:text-accent inline-flex items-center gap-1"><FolderPlus size={11} /> {t("subfolder")}</button>
              )}
            </>
          )}
        </div>
      ))}

      {adding ? (
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setName(""); setAdding(false); } }}
          onBlur={submit} placeholder={t("folderName")}
          className="my-0.5 px-2 py-1 rounded-md bg-bg border border-border text-xs w-full outline-none focus:border-accent" />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="w-full text-left px-1.5 py-1 rounded-md text-xs text-fg-muted hover:bg-bg-elevated hover:text-fg inline-flex items-center gap-1.5"><FolderPlus size={13} /> {t("addFolder")}</button>
      )}

      {allTags.length > 0 && (
        <div className="pt-2 mt-1 border-t border-border/60">
          <div className="text-[11px] font-bold text-fg-muted px-1.5 mb-1">{t("tags")}</div>
          <div className="flex flex-wrap gap-1 px-1">
            {allTags.map((t) => (
              <button key={t} onClick={() => setFTag(t === fTag ? "" : t)} className={`px-2 py-0.5 rounded-full text-xs ${fTag === t ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted hover:text-fg"}`}>#{t}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type ReviewRow = { note_id: string; due_at: string; interval_days: number; ease: number; reviews: number };

export function NotesManager({
  initial,
  chapterMap,
  meId,
  initialReviews = [],
}: {
  initial: ManagedNote[];
  chapterMap: Record<string, { chapterTitle: string; lessonTitle: string }>;
  meId: string;
  initialReviews?: ReviewRow[];
}) {
  const t = useTranslations("notes");
  const supabase = createSupabaseBrowser();
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [notes, setNotes] = useState<ManagedNote[]>(initial);
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>(
    () => Object.fromEntries(initialReviews.map((r) => [r.note_id, r])),
  );

  // SRS：加入複習 / 評分重排 / 移除
  const addReview = async (noteId: string) => {
    const due = new Date(Date.now() + 86400_000).toISOString(); // 明天第一次
    const row: ReviewRow = { note_id: noteId, due_at: due, interval_days: 1, ease: 2.5, reviews: 0 };
    setReviews((r) => ({ ...r, [noteId]: row }));
    await supabase.from("note_reviews").upsert({ ...row, user_id: meId }, { onConflict: "note_id,user_id" });
    toast.success(t("addedToReview"));
  };
  const removeReview = async (noteId: string) => {
    setReviews((r) => { const c = { ...r }; delete c[noteId]; return c; });
    await supabase.from("note_reviews").delete().eq("note_id", noteId).eq("user_id", meId);
  };
  const rateReview = async (noteId: string, rating: SrsRating) => {
    const cur = reviews[noteId];
    if (!cur) return;
    const nx = nextSrs({ interval_days: cur.interval_days, ease: cur.ease, reviews: cur.reviews }, rating);
    const row: ReviewRow = { note_id: noteId, due_at: nx.due_at, interval_days: nx.interval_days, ease: nx.ease, reviews: nx.reviews };
    setReviews((r) => ({ ...r, [noteId]: row }));
    await supabase.from("note_reviews").update({
      due_at: nx.due_at, interval_days: nx.interval_days, ease: nx.ease, reviews: nx.reviews, last_reviewed_at: new Date().toISOString(),
    }).eq("note_id", noteId).eq("user_id", meId);
  };
  const dueNotes = notes.filter((n) => reviews[n.id] && isDue(reviews[n.id].due_at));
  const [editing, setEditing] = useState<ManagedNote | "new" | null>(null);
  const [fCat, setFCat] = useState("");
  const [fTag, setFTag] = useState("");
  const [bg, setBg] = useState<NotesBgConfig>(DEFAULT_NOTES_BG);
  useEffect(() => { setBg(loadNotesBg()); }, []);
  const updateBg = (c: NotesBgConfig) => { setBg(c); saveNotesBg(c); };
  const [floating, setFloating] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false); // 手機：工具列收合旋鈕

  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags ?? []))).slice(0, 40),
    [notes],
  );
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpandNote = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const shown = notes
    .filter((n) => {
      const catOk = !fCat || (fCat === UNCAT_FILTER ? !n.category : (n.category === fCat || (n.category?.startsWith(fCat + "/") ?? false)));
      const tagOk = !fTag || (n.tags ?? []).includes(fTag);
      const text = `${n.content.replace(/<[^>]*>/g, " ")} ${n.category ?? ""} ${(n.tags ?? []).join(" ")}`.toLowerCase();
      const qOk = !q || text.includes(q);
      return catOk && tagOk && qOk;
    })
    // 釘選的永遠排前面（穩定排序、組內維持原順序）
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const togglePin = async (n: ManagedNote) => {
    const pinned = !n.pinned;
    setNotes((p) => p.map((x) => (x.id === n.id ? { ...x, pinned } : x)));
    await supabase.from("notes").update({ pinned }).eq("id", n.id);
  };

  // 一鍵公開成部落格：同一份內容 → 生成一篇公開文章（不用複製貼上）
  const publishBlog = async (n: ManagedNote) => {
    toast.info?.(t("publishing"));
    try {
      const res = await fetch(`/api/me/notes/${n.id}/publish-blog`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message || t("publishFailed")); return; }
      setNotes((p) => p.map((x) => (x.id === n.id ? { ...x, is_public: true } : x)));
      toast.success(t("publishedToBlog"));
      if (j.url) window.open(j.url, "_blank");
    } catch { toast.error(t("publishFailedRetry")); }
  };

  // 資料夾（= 分類）：localStorage 名單 ∪ 現有筆記 category
  const [folders, setFolders] = useState<string[]>([]);
  useEffect(() => setFolders(loadFolders()), []);
  const folderCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of notes) if (n.category) m[n.category] = (m[n.category] ?? 0) + 1;
    return m;
  }, [notes]);
  const folderList = useMemo(() => {
    const fromNotes = notes.map((n) => n.category).filter(Boolean) as string[];
    return Array.from(new Set([...folders, ...fromNotes])).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [folders, notes]);
  const uncategorizedCount = useMemo(() => notes.filter((n) => !n.category).length, [notes]);
  const addFolder = (name: string) => {
    const n = name.trim();
    if (!n || folderList.includes(n)) return;
    const next = [...folders, n];
    setFolders(next); saveFolders(next);
  };
  const removeFolder = (name: string) => {
    const next = folders.filter((f) => f !== name);
    setFolders(next); saveFolders(next);
  };
  const assignCategory = async (noteId: string, category: string | null) => {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, category } : n)));
    await supabase.from("notes").update({ category }).eq("id", noteId);
  };

  // L2 引用：即時把 note_refs 解析成 {title, snippet}（讀當前 notes → 來源改動全站同步）
  const noteById = useMemo(() => { const m = new Map<string, ManagedNote>(); for (const n of notes) m.set(n.id, n); return m; }, [notes]);
  const resolveRefs = (n: ManagedNote) => (n.note_refs ?? [])
    .map((id) => { const r = noteById.get(id); return r ? { id, title: r.title?.trim() || t("untitledNote"), snippet: r.content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 50) } : null; })
    .filter(Boolean) as { id: string; title: string; snippet: string }[];
  const openRef = (id: string) => { const r = noteById.get(id); if (r) setEditing(r); };

  const del = async (n: ManagedNote) => {
    const owned = n._owned ?? (n.user_id === meId);
    if (owned) {
      if (!(await confirm({ title: t("confirmDeleteNote"), destructive: true, confirmLabel: t("delete") }))) return;
      setNotes((p) => p.filter((x) => x.id !== n.id));
      await supabase.from("notes").delete().eq("id", n.id);
    } else {
      if (!(await confirm({ title: t("confirmLeaveShare"), destructive: true, confirmLabel: t("leave") }))) return;
      setNotes((p) => p.filter((x) => x.id !== n.id));
      await fetch(`/api/me/notes/${n.id}/share`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
    }
  };

  // 用邀請碼 / 連結加入共用筆記
  const joinByCode = async () => {
    const raw = await prompt({ title: t("pasteInviteCode") });
    if (!raw) return;
    let code = raw.trim();
    const idx = code.indexOf("/join/");
    if (idx >= 0) code = code.slice(idx + 6);
    code = code.replace(/[/?#].*$/, "").toUpperCase();
    if (!code) { toast.error(t("cantReadCode")); return; }
    try {
      const res = await fetch("/api/notes/join", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.message || t("joinFailed")); return; }
      toast.success(j.alreadyOwner ? t("yourOwnNote") : t("joinedShare"));
      window.location.reload();
    } catch {
      toast.error(t("joinFailedRetry"));
    }
  };

  // 只 upsert 進列表、不關閉編輯器（關閉由 NoteEditor 的儲存按鈕另外呼叫 onClose）
  const onSaved = (n: ManagedNote) => {
    setNotes((p) => {
      const i = p.findIndex((x) => x.id === n.id);
      // DB row 沒有 _owned/_shared 旗標，沿用既有值，避免存檔後共用徽章消失
      if (i >= 0) { const c = [...p]; c[i] = { ...n, _owned: p[i]._owned, _shared: p[i]._shared, _role: p[i]._role }; return c; }
      return [{ ...n, _owned: true, _shared: false, _role: "owner" }, ...p];
    });
  };

  // 拖移排序（只在沒套用篩選/搜尋時開放、避免「拖動子集合」的順序歧義）
  const canReorder = !fCat && !fTag && !q;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    // 拖到資料夾 → 設定分類（不排序）
    const overId = String(over.id);
    if (overId.startsWith(FOLDER_DROP_PREFIX)) {
      const raw = overId.slice(FOLDER_DROP_PREFIX.length);
      const category = raw === UNCATEGORIZED ? null : raw;
      const note = notes.find((n) => n.id === active.id);
      if (note && (note.category ?? null) !== category) {
        await assignCategory(String(active.id), category);
      }
      return;
    }
    if (active.id === over.id) return;
    const oldIndex = notes.findIndex((n) => n.id === active.id);
    const newIndex = notes.findIndex((n) => n.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const origById = new Map(notes.map((n) => [n.id, n.sort_order] as const));
    const reordered = arrayMove(notes, oldIndex, newIndex).map((n, i) => ({ ...n, sort_order: i }));
    setNotes(reordered);
    const changed = reordered.filter((n) => origById.get(n.id) !== n.sort_order);
    await Promise.all(
      changed.map((n) => supabase.from("notes").update({ sort_order: n.sort_order }).eq("id", n.id)),
    );
  };

  const bgStyle = notesBgStyle(bg);
  const hasBg = bg.preset !== "none";

  return (
    <div
      className="relative rounded-2xl min-h-[60vh] transition"
      style={hasBg ? bgStyle : undefined}
    >
      {/* 液態玻璃層：在背景之上、內容之下。預設關 */}
      {bg.glass && hasBg && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            background: `rgba(255,255,255,${bg.glassOpacity})`,
          }}
        />
      )}

      <div className={`relative space-y-4 ${hasBg ? "p-3 sm:p-5" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
      {/* 主要 CTA：永遠顯示 */}
      <button
        onClick={() => setEditing("new")}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-black font-semibold rounded-lg hover:scale-105 transition"
      >
        <Plus size={16} /> {t("newNote")}
      </button>

      {/* 手機：收合旋鈕（點一下旋轉、展開其餘功能；省得工具列在小螢幕擠成一團）*/}
      <button
        type="button"
        onClick={() => setToolsOpen((o) => !o)}
        aria-expanded={toolsOpen}
        aria-label={toolsOpen ? t("collapseToolbar") : t("expandToolbar")}
        className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-bg-card hover:border-accent transition"
      >
        <SlidersHorizontal
          size={16}
          className="transition-transform duration-300"
          style={{ transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* 其餘功能：手機收合（展開才顯示、佔整行）；桌面永遠內聯 */}
      <div className={`${toolsOpen ? "flex" : "hidden"} sm:flex w-full sm:w-auto sm:flex-1 items-center gap-2 flex-wrap`}>
        <button
          onClick={joinByCode}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm hover:border-accent transition"
          title={t("joinShareHint")}
        >
          🤝 {t("joinShare")}
        </button>
        <NotesBackgroundPicker cfg={bg} onChange={updateBg} />
        {notes.length > 0 && (
          <button
            onClick={() => setFloating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm hover:border-accent transition"
          >
            <Sparkles size={15} /> {t("floatingPreview")}
          </button>
        )}
        {notes.length > 0 && (
          <div className="relative w-full sm:w-auto sm:ml-auto">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchNotesPlaceholder")}
              className="w-full sm:w-60 pl-8 pr-7 py-2 rounded-lg border border-border bg-bg-card text-sm outline-none focus:border-accent"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg" aria-label={t("clearSearch")}>
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {dueNotes.length > 0 && (
        <div className="rounded-xl border border-accent/40 bg-accent/[0.06] p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Repeat2 size={15} /> 📚 {t("todayReview", { n: dueNotes.length })}</div>
          {dueNotes.map((n) => {
            const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
            const preview = n.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
            return (
              <div key={n.id} className="rounded-lg bg-bg-card border border-border p-2.5 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title?.trim() || meta?.lessonTitle || t("freeNote")}</div>
                  <div className="text-xs text-fg-muted line-clamp-2">{preview || t("blank")}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => rateReview(n.id, "forgot")} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition">{t("forgot")}</button>
                  <button type="button" onClick={() => rateReview(n.id, "hard")} className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition">{t("vague")}</button>
                  <button type="button" onClick={() => rateReview(n.id, "good")} className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition">{t("remember")}</button>
                </div>
              </div>
            );
          })}
          <div className="text-[11px] text-fg-muted">{t("srsHint")}</div>
        </div>
      )}

      {editing && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          meId={meId}
          categories={folderList}
          tags={allTags}
          allNotes={notes.map((n) => ({ id: n.id, title: n.title?.trim() || t("untitledNote") }))}
          onCreateFolder={addFolder}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {floating && (
        <FloatingNotesOverlay
          notes={notes}
          chapterMap={chapterMap}
          onSelect={(n) => { setFloating(false); setEditing(n); }}
          onClose={() => setFloating(false)}
        />
      )}

      {canReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="flex flex-col md:flex-row gap-4">
            <aside className="md:w-56 md:shrink-0 md:border-r md:border-border/60 md:pr-3 md:self-start md:sticky md:top-2 md:max-h-[82vh] md:overflow-y-auto">
              <FolderBar
                folderList={folderList} folderCounts={folderCounts} uncategorizedCount={uncategorizedCount}
                fCat={fCat} setFCat={setFCat} onAddFolder={addFolder} onRemoveFolder={removeFolder}
                allTags={allTags} fTag={fTag} setFTag={setFTag} droppable
              />
            </aside>
            <div className="flex-1 min-w-0">
              {shown.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-2">
                  <GripVertical size={13} /> {t("reorderHint")}
                </div>
              )}
              <SortableContext items={shown.map((n) => n.id)} strategy={rectSortingStrategy}>
                <div className="grid sm:grid-cols-2 gap-3">
              {shown.map((n) => {
                const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
                return (
                  <SortableNoteCard key={n.id} id={n.id} expanded={n.id === expandedId}>
                    <NoteCard
                      note={n}
                      meId={meId}
                      chapterTitle={meta?.chapterTitle ?? ""}
                      lessonTitle={meta?.lessonTitle ?? (n.lesson_id ?? t("freeNote"))}
                      onEdit={() => setEditing(n)}
                      onDelete={() => del(n)}
                      onPin={() => togglePin(n)}
                      srsDue={reviews[n.id]?.due_at ?? null}
                      onToggleReview={() => (reviews[n.id] ? removeReview(n.id) : addReview(n.id))}
                      onPublishBlog={() => publishBlog(n)}
                      refNotes={resolveRefs(n)}
                      onOpenRef={openRef}
                      expanded={n.id === expandedId}
                      onToggleExpand={() => toggleExpandNote(n.id)}
                    />
                  </SortableNoteCard>
                );
              })}
                </div>
              </SortableContext>
            </div>
          </div>
        </DndContext>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          <aside className="md:w-56 md:shrink-0 md:border-r md:border-border/60 md:pr-3 md:self-start md:sticky md:top-2 md:max-h-[82vh] md:overflow-y-auto">
            <FolderBar
              folderList={folderList} folderCounts={folderCounts} uncategorizedCount={uncategorizedCount}
              fCat={fCat} setFCat={setFCat} onAddFolder={addFolder} onRemoveFolder={removeFolder}
              allTags={allTags} fTag={fTag} setFTag={setFTag}
            />
          </aside>
          <div className="flex-1 min-w-0">
          <div className="grid sm:grid-cols-2 gap-3">
            {shown.map((n) => {
              const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
              const isExp = n.id === expandedId;
              return (
                <div key={n.id} className={isExp ? "sm:col-span-2" : ""} style={isExp ? { order: -1 } : undefined}>
                  <NoteCard
                    note={n}
                    meId={meId}
                    chapterTitle={meta?.chapterTitle ?? ""}
                    lessonTitle={meta?.lessonTitle ?? (n.lesson_id ?? t("freeNote"))}
                    onEdit={() => setEditing(n)}
                    onDelete={() => del(n)}
                    onPin={() => togglePin(n)}
                    srsDue={reviews[n.id]?.due_at ?? null}
                    onToggleReview={() => (reviews[n.id] ? removeReview(n.id) : addReview(n.id))}
                    onPublishBlog={() => publishBlog(n)}
                    refNotes={resolveRefs(n)}
                    onOpenRef={openRef}
                    expanded={isExp}
                    onToggleExpand={() => toggleExpandNote(n.id)}
                  />
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
      {shown.length === 0 && (
        <div className="text-sm text-fg-muted py-8 text-center">{t("noMatchStart")}</div>
      )}
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  meId,
  categories,
  tags,
  allNotes,
  onCreateFolder,
  onClose,
  onSaved,
}: {
  note: ManagedNote | null;
  meId: string;
  categories: string[];
  tags: string[];
  allNotes: { id: string; title: string }[];
  onCreateFolder: (name: string) => void;
  onClose: () => void;
  onSaved: (n: ManagedNote) => void;
}) {
  const t = useTranslations("notes");
  const supabase = createSupabaseBrowser();
  const prompt = usePrompt();
  const owned = note ? (note._owned ?? note.user_id === meId) : true;
  const canEdit = !note || owned || note._role === "editor";
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [category, setCategory] = useState(note?.category ?? "");
  const [tagsInput, setTagsInput] = useState((note?.tags ?? []).join(", "));
  // 分類下拉 + 標籤下拉
  const [catOpen, setCatOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const catRef = useRef<HTMLDivElement | null>(null);
  const tagRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setTagOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);
  const currentTags = tagsInput.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean);
  const addTag = (t: string) => {
    if (currentTags.includes(t)) return;
    setTagsInput([...currentTags, t].join(", "));
  };
  const catTyped = category.trim();
  const catMatches = categories.filter((c) => c !== catTyped && c.toLowerCase().includes(catTyped.toLowerCase()));
  const tagSuggest = tags.filter((t) => !currentTags.includes(t));
  const [isPublic, setIsPublic] = useState(note?.is_public ?? false);
  const [color, setColor] = useState<string>(note?.color ?? "");
  const [opacity, setOpacity] = useState<number>(clampOpacity(note?.opacity));
  const [noteBg, setNoteBg] = useState<NoteBg | null>(note?.bg ?? null);
  const [noteId, setNoteId] = useState<string | null>(note?.id ?? null);
  const [noteRefs, setNoteRefs] = useState<string[]>(note?.note_refs ?? []);
  const [refPick, setRefPick] = useState(""); // 引用筆記搜尋字
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const refTitle = (id: string) => allNotes.find((x) => x.id === id)?.title || t("untitledNote");
  const refCandidates = allNotes.filter((x) => x.id !== noteId && !noteRefs.includes(x.id) && (!refPick.trim() || (x.title ?? "").toLowerCase().includes(refPick.trim().toLowerCase()))).slice(0, 6);

  // insert / update，回傳存好的 row（會 upsert 進列表、但不關閉）
  const persist = async (): Promise<ManagedNote | null> => {
    if (!content.replace(/<[^>]*>/g, "").trim()) { setErr(t("contentEmpty")); return null; }
    setErr("");
    const tagsArr = tagsInput.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 12);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr(t("pleaseLogin")); return null; }
    const payload: any = {
      title: title.trim() || null,
      content,
      category: category.trim() || null,
      tags: tagsArr,
      is_public: isPublic,
      color: color || null,
      opacity,
      bg: noteBg && noteBg.image ? noteBg : null,
      note_refs: noteRefs,
      updated_at: new Date().toISOString(),
    };
    try {
      if (noteId) {
        const { data, error } = await supabase.from("notes").update(payload).eq("id", noteId).select("*").single();
        if (error) throw error;
        onSaved(data as ManagedNote);
        return data as ManagedNote;
      }
      const { data, error } = await supabase.from("notes").insert({ ...payload, user_id: user.id }).select("*").single();
      if (error) throw error;
      setNoteId(data.id);
      onSaved(data as ManagedNote);
      return data as ManagedNote;
    } catch (e: any) {
      setErr(e?.message ?? t("saveFailed"));
      return null;
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = await persist();
      if (d) { trackEvent("note_save", { is_new: !noteId }); clearDraft(); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  // 共用面板要用：確保筆記已存在（新筆記先存一次拿到 id）、不關閉編輯器
  const ensureSaved = async (): Promise<string | null> => {
    if (noteId) return noteId;
    const d = await persist();
    return d?.id ?? null;
  };

  // ── 自動儲存 + 還原 ──
  const DRAFT_KEY = "ai-island-note-draft-new";
  const [autosaveAt, setAutosaveAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);
  const firstRender = useRef(true);

  // 開全新筆記時還原上次未存草稿
  useEffect(() => {
    if (note) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!(d.content || "").replace(/<[^>]*>/g, "").trim()) return;
      firstRender.current = true; // 還原後別馬上又觸發存草稿
      setTitle(d.title ?? ""); setContent(d.content ?? ""); setCategory(d.category ?? "");
      setTagsInput(d.tagsInput ?? ""); setColor(d.color ?? "");
      if (typeof d.opacity === "number") setOpacity(d.opacity);
      setNoteBg(d.bg ?? null); setIsPublic(!!d.isPublic); setRestored(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };
  const discardDraft = () => {
    setTitle(""); setContent(""); setCategory(""); setTagsInput("");
    setColor(""); setOpacity(1); setNoteBg(null); setIsPublic(false);
    clearDraft(); setRestored(false); setAutosaveAt(null);
  };

  // debounce 自動儲存：已存在的筆記 → 寫 DB；全新筆記 → 暫存 localStorage 草稿
  useEffect(() => {
    if (!canEdit) return;
    if (firstRender.current) { firstRender.current = false; return; }
    if (!content.replace(/<[^>]*>/g, "").trim()) return;
    setDirty(true);
    const t = setTimeout(async () => {
      if (noteId) {
        const d = await persist();
        if (d) { setAutosaveAt(Date.now()); setDirty(false); }
      } else {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, category, tagsInput, color, opacity, bg: noteBg, isPublic, ts: Date.now() }));
        } catch {}
        setAutosaveAt(Date.now()); setDirty(false);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, category, tagsInput, isPublic, color, opacity, noteBg, noteId]);

  // 共編 presence：誰也在這則共用筆記
  const { profile } = useAuth();
  const presenceMe = { id: meId, name: profile?.display_name || profile?.username || t("meLabel"), avatar: profile?.avatar_url ?? null };
  const presenceOthers = useNotePresence(noteId, !!noteId && (!!note?._shared || !owned), presenceMe, canEdit && dirty);

  return (
    <div className="rounded-2xl border border-accent/40 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold shrink-0">{!note ? t("newNote") : canEdit ? t("editNote") : t("viewNoteReadonly")}</span>
        <div className="flex items-center gap-2 ml-auto">
          {presenceOthers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {presenceOthers.slice(0, 4).map((p) => (
                  <span
                    key={p.user_id}
                    title={`${p.name}${p.editing ? t("editingSuffix") : t("viewingSuffix")}`}
                    className={`w-6 h-6 rounded-full border-2 ${p.editing ? "border-emerald-500" : "border-bg-card"} bg-bg-elevated overflow-hidden inline-flex items-center justify-center text-[10px] font-bold`}
                  >
                    {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : (p.name[0] ?? "?")}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-fg-muted hidden sm:inline">
                {presenceOthers.some((p) => p.editing) ? t("someoneEditing") : t("peopleOnline", { n: presenceOthers.length })}
              </span>
            </div>
          )}
          <button onClick={onClose} className="text-fg-muted hover:text-fg shrink-0" aria-label={t("close")}><X size={16} /></button>
        </div>
      </div>
      {restored && (
        <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
          <span className="text-amber-700 dark:text-amber-400">↩️ {t("draftRestored")}</span>
          <button type="button" onClick={discardDraft} className="text-fg-muted hover:text-fg underline">{t("discardDraft")}</button>
        </div>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!canEdit}
        placeholder={t("titlePlaceholder")}
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-base font-semibold outline-none focus:border-accent disabled:opacity-70"
      />
      <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
        <BlogEditor content={content} onChange={setContent} editable={canEdit} placeholder={t("notePlaceholder")} />
      </div>
      {!canEdit && (
        <div className="text-xs text-fg-muted bg-bg-elevated rounded-lg px-3 py-2">🔒 {t("readonlyCollabHint")}</div>
      )}
      {canEdit && (
      <>
      <div className="flex flex-wrap gap-2">
        {/* 分類：可選現有資料夾、可直接打、可從下拉建立 */}
        <div className="relative flex-1 min-w-[140px]" ref={catRef}>
          <input
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCatOpen(true); }}
            onFocus={() => setCatOpen(true)}
            placeholder={t("categoryPlaceholder")}
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          {catOpen && (
            <div className="absolute z-30 mt-1 left-0 right-0 max-h-52 overflow-auto rounded-lg border border-border bg-bg-card shadow-xl py-1">
              {category && (
                <button type="button" onClick={() => { setCategory(""); setCatOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-fg-muted hover:bg-bg-elevated">{t("noCategory")}</button>
              )}
              {catMatches.map((c) => (
                <button key={c} type="button" onClick={() => { setCategory(c); setCatOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-elevated">📁 {c}</button>
              ))}
              {catMatches.length === 0 && !catTyped && categories.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-fg-muted">{t("noCategoryYet")}</div>
              )}
              <button
                type="button"
                onClick={async () => {
                  const name = catTyped || (await prompt({ title: t("newCategoryName") }))?.trim() || "";
                  if (name) { onCreateFolder(name); setCategory(name); }
                  setCatOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-accent hover:bg-bg-elevated border-t border-border inline-flex items-center gap-1.5"
              >
                <FolderPlus size={13} /> {catTyped && !categories.includes(catTyped) ? t("createCategoryNamed", { name: catTyped }) : t("createNewCategory")}
              </button>
            </div>
          )}
        </div>

        {/* 標籤：可從下拉選現有、也可逗號分隔自己打 */}
        <div className="relative flex-1 min-w-[140px]" ref={tagRef}>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onFocus={() => setTagOpen(true)}
            placeholder={t("tagsPlaceholder")}
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          {tagOpen && tagSuggest.length > 0 && (
            <div className="absolute z-30 mt-1 left-0 right-0 max-h-52 overflow-auto rounded-lg border border-border bg-bg-card shadow-xl p-2">
              <div className="text-[11px] text-fg-muted mb-1">{t("tapToAddTag")}</div>
              <div className="flex flex-wrap gap-1">
                {tagSuggest.map((t) => (
                  <button key={t} type="button" onClick={() => addTag(t)} className="px-2 py-0.5 rounded-full text-xs bg-bg-elevated text-fg-muted hover:text-fg hover:bg-accent/20 transition">#{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 🔗 引用筆記（L2 區塊引用）：只存 id → 來源改動全站同步 */}
      <div className="space-y-1.5">
        <div className="text-xs text-fg-muted inline-flex items-center gap-1">🔗 {t("refNotesLabel")}{noteRefs.length > 0 ? t("refCountParen", { n: noteRefs.length }) : ""} <span className="opacity-60">· {t("refSyncHint")}</span></div>
        {noteRefs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {noteRefs.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                🔗 {refTitle(id)}
                {canEdit && <button type="button" onClick={() => setNoteRefs(noteRefs.filter((x) => x !== id))} className="hover:text-red-400">×</button>}
              </span>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="relative max-w-sm">
            <input value={refPick} onChange={(e) => setRefPick(e.target.value)} placeholder={t("searchToRef")} className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent" />
            {refPick.trim() && refCandidates.length > 0 && (
              <div className="absolute z-30 mt-1 left-0 right-0 max-h-52 overflow-auto rounded-lg border border-border bg-bg-card shadow-xl p-1">
                {refCandidates.map((x) => (
                  <button key={x.id} type="button" onClick={() => { setNoteRefs([...noteRefs, x.id]); setRefPick(""); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-elevated rounded truncate">🔗 {x.title || t("untitledNote")}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* 便利貼外觀：顏色 + 透明度 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-fg-muted">{t("stickyColor")}</span>
          <button
            type="button"
            onClick={() => setColor("")}
            className={`px-2 py-0.5 text-[11px] rounded-full border transition ${color === "" ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:border-accent"}`}
            title={t("autoColorHint")}
          >
            {t("auto")}
          </button>
          {STICKY_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              className={`w-6 h-6 rounded-full border transition hover:scale-110 ${color === c.key ? "ring-2 ring-accent border-fg" : "border-black/15"}`}
              style={{ background: c.bg }}
              title={c.label}
              aria-label={t("stickyColorNamed", { label: c.label })}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          {t("opacity")}
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-28 accent-accent cursor-pointer"
          />
          <span className="tabular-nums w-9 text-right">{Math.round(opacity * 100)}%</span>
        </label>
      </div>

      <NoteBackgroundEditor value={noteBg} onChange={setNoteBg} />

      {owned && <NoteSharePanel noteId={noteId} ensureSaved={ensureSaved} />}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {t("publicCheckbox")}
        </label>
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-400">{err}</span>}
          {canEdit && !err && (
            <span className="text-[11px] text-fg-muted">
              {dirty ? t("editing") : autosaveAt ? `✓ ${noteId ? t("autoSaved") : t("draftSaved")} ${new Date(autosaveAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
            </span>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-black font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t("save")}
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

type Collab = { user_id: string; role: string; username: string | null; display_name: string | null; avatar_url: string | null };

/** 共用設定（只有擁有者看得到）：產生邀請連結 + 多人協作者清單 + 權限(編輯/唯讀) + 解除 */
function NoteSharePanel({ noteId, ensureSaved }: { noteId: string | null; ensureSaved: () => Promise<string | null> }) {
  const t = useTranslations("notes");
  const toast = useToast();
  const [loading, setLoading] = useState(!!noteId);
  const [code, setCode] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor"); // 擁有者先決定加入者權限
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!noteId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/me/notes/${noteId}/share`);
        const j = await res.json();
        if (!cancelled && res.ok) {
          setCode(j.code); setUrl(j.url); setCollabs(j.collaborators ?? []);
          if (j.inviteRole) setInviteRole(j.inviteRole);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [noteId]);

  const generate = async (role: "editor" | "viewer", silent = false) => {
    setBusy(true);
    try {
      const id = noteId ?? (await ensureSaved()); // 新筆記先存一次拿到 id
      if (!id) { toast.error(t("enterContentFirst")); return; }
      const res = await fetch(`/api/me/notes/${id}/share`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message || j.error || t("generateFailed", { status: res.status })); return; }
      setCode(j.code); setUrl(j.url);
      if (!silent) toast.success(t("inviteLinkGenerated"));
    } finally { setBusy(false); }
  };
  // 切換邀請權限：若已有連結 → 換新連結套用新權限（舊連結失效）
  const changeInviteRole = (role: "editor" | "viewer") => {
    setInviteRole(role);
    if (url) { generate(role, true); toast.success(role === "viewer" ? t("changedToReadonly") : t("changedToEditor")); }
  };
  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast.success(t("inviteLinkCopied")); } catch { toast.error(t("copyFailed")); }
  };
  const setRole = async (uid: string, role: string) => {
    setCollabs((cs) => cs.map((c) => (c.user_id === uid ? { ...c, role } : c)));
    await fetch(`/api/me/notes/${noteId}/share`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, role }) });
  };
  const remove = async (uid: string) => {
    setCollabs((cs) => cs.filter((c) => c.user_id !== uid));
    await fetch(`/api/me/notes/${noteId}/share`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid }) });
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="text-xs font-medium text-fg-muted inline-flex items-center gap-1"><Link2 size={13} /> {t("shareSettings")}</div>

      {/* 先決定加入者權限、再產生連結 */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-fg-muted shrink-0">{t("afterJoin")}</span>
        <div className="inline-flex rounded border border-border overflow-hidden">
          <button type="button" onClick={() => changeInviteRole("editor")} className={`px-2.5 py-0.5 transition ${inviteRole === "editor" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}>{t("canEdit")}</button>
          <button type="button" onClick={() => changeInviteRole("viewer")} className={`px-2.5 py-0.5 transition ${inviteRole === "viewer" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}>{t("readonly")}</button>
        </div>
      </div>

      {url ? (
        <div className="flex items-center gap-2">
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs" />
          <button type="button" onClick={copy} className="text-xs px-2 py-1 rounded border border-border hover:border-accent transition inline-flex items-center gap-1"><Copy size={12} /> {t("copy")}</button>
        </div>
      ) : (
        <button type="button" onClick={() => generate(inviteRole)} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-accent text-black font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} {t("generateInviteLink", { role: inviteRole === "viewer" ? t("readonly") : t("canEdit") })}
        </button>
      )}
      {code && (
        <div className="text-[11px] text-fg-muted">
          {t("inviteCodeLabel")}<code className="px-1 rounded bg-bg-elevated">{code}</code>{t("inviteCodeSuffix", { role: inviteRole === "viewer" ? t("readonly") : t("canEdit") })}
        </div>
      )}

      {collabs.length > 0 ? (
        <div className="space-y-1 pt-1">
          <div className="text-[11px] text-fg-muted">{t("sharedWith", { n: collabs.length })}</div>
          {collabs.map((c) => (
            <div key={c.user_id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate">{c.display_name || c.username || c.user_id.slice(0, 8)}</span>
              <div className="inline-flex rounded border border-border overflow-hidden shrink-0">
                <button type="button" onClick={() => setRole(c.user_id, "editor")} className={`px-2 py-0.5 transition ${c.role !== "viewer" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}>{t("canEdit")}</button>
                <button type="button" onClick={() => setRole(c.user_id, "viewer")} className={`px-2 py-0.5 transition ${c.role === "viewer" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}>{t("readonly")}</button>
              </div>
              <button type="button" onClick={() => remove(c.user_id)} className="text-fg-muted hover:text-red-400 shrink-0" title={t("removeShare")}><X size={13} /></button>
            </div>
          ))}
        </div>
      ) : (
        !loading && <div className="text-[11px] text-fg-muted">{t("noOneJoined")}</div>
      )}
    </div>
  );
}

/** 便利貼單獨背景圖：上傳 + 縮放/位移裁切/旋轉 + 即時預覽 */
function NoteBackgroundEditor({ value, onChange }: { value: NoteBg | null; onChange: (b: NoteBg | null) => void }) {
  const t = useTranslations("notes");
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const bg = value ?? DEFAULT_NOTE_BG;
  const update = (patch: Partial<NoteBg>) => onChange({ ...bg, ...patch });

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(t("imagesOnly")); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error(t("fileTooLarge")); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "notes");
      const res = await fetch("/api/upload", { credentials: "include", method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || t("uploadFailed"));
      onChange({ ...DEFAULT_NOTE_BG, ...(value ?? {}), image: j.url });
      toast.success(t("bgUploaded"));
    } catch (e: any) {
      toast.error(e?.message || t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const Slider = ({ label, min, max, step, val, on, fmt }: { label: string; min: number; max: number; step: number; val: number; on: (v: number) => void; fmt: (v: number) => string }) => (
    <label className="flex items-center gap-2 text-xs text-fg-muted">
      <span className="w-8 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => on(Number(e.target.value))} className="flex-1 accent-accent cursor-pointer" />
      <span className="tabular-nums w-12 text-right">{fmt(val)}</span>
    </label>
  );

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted inline-flex items-center gap-1">
          <ImageIcon size={13} /> {t("stickyBg")}
        </span>
        {value?.image && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-fg-muted hover:text-red-400 inline-flex items-center gap-1">
            <X size={12} /> {t("remove")}
          </button>
        )}
      </div>

      {!value?.image ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 rounded-lg border border-dashed border-border text-xs text-fg-muted hover:border-accent hover:text-fg transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          {t("uploadAsBg")}
        </button>
      ) : (
        <>
          <div className="relative h-28 rounded-md overflow-hidden border border-border bg-bg">
            <img src={value.image} alt="" className="absolute left-1/2 top-1/2 w-[140%] h-[140%] max-w-none object-cover" style={noteBgImgStyle(bg)} draggable={false} />
          </div>
          <Slider label={t("sizeLabel")} min={1} max={3} step={0.05} val={bg.scale} on={(v) => update({ scale: v })} fmt={(v) => `${v.toFixed(2)}x`} />
          <Slider label={t("horizontalLabel")} min={0} max={100} step={1} val={bg.x} on={(v) => update({ x: v })} fmt={(v) => `${Math.round(v)}%`} />
          <Slider label={t("verticalLabel")} min={0} max={100} step={1} val={bg.y} on={(v) => update({ y: v })} fmt={(v) => `${Math.round(v)}%`} />
          <Slider label={t("rotateLabel")} min={-180} max={180} step={1} val={bg.rotate} on={(v) => update({ rotate: v })} fmt={(v) => `${Math.round(v)}°`} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:border-accent hover:text-fg transition inline-flex items-center gap-1 disabled:opacity-50">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} {t("changeImage")}
            </button>
            <button type="button" onClick={() => onChange({ ...DEFAULT_NOTE_BG, image: value.image })} className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:border-accent hover:text-fg transition inline-flex items-center gap-1">
              <RotateCw size={12} /> {t("resetPosition")}
            </button>
            <span className="text-[11px] text-fg-muted ml-auto">{t("bgOpacityHint")}</span>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}

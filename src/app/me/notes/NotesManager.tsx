"use client";

import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { NoteCard } from "./NoteCard";
import { NotesBackgroundPicker } from "./NotesBackgroundPicker";
import { FloatingNotesOverlay } from "./FloatingNotesOverlay";
import { DEFAULT_NOTES_BG, loadNotesBg, saveNotesBg, notesBgStyle, type NotesBgConfig } from "@/lib/notes-background";
import { STICKY_COLORS, clampOpacity, noteBgImgStyle, DEFAULT_NOTE_BG, type NoteBg } from "@/lib/note-sticky";
import { loadFolders, saveFolders, folderDropId, FOLDER_DROP_PREFIX, UNCATEGORIZED } from "@/lib/note-folders";
import { useToast } from "@/components/ui/Toast";
import { Plus, X, Save, Loader2, Sparkles, GripVertical, Folder, FolderPlus, Image as ImageIcon, RotateCw, Copy, Link2, Search } from "lucide-react";

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
  _owned?: boolean;  // 我是擁有者（page 標記）
  _shared?: boolean; // 此筆記有共用關係
  _role?: string;    // 我的權限：owner / editor / viewer
};

/**
 * 拖移排序用的卡片外殼。
 * 重點：dnd listeners 只掛在「右上角把手」上、不掛整張卡 → 內文可自由選取，
 * 選字不會跟拖曳打架（之前整卡可拖，一選字就變拖動）。
 */
function SortableNoteCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 30 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 z-20 p-1 rounded text-black/35 hover:text-black/70 hover:bg-black/10 cursor-grab active:cursor-grabbing transition"
        style={{ touchAction: "none" }}
        title="拖我調整順序"
        aria-label="拖移排序"
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

function FolderBar({
  folderList, folderCounts, uncategorizedCount, fCat, setFCat,
  onAddFolder, onRemoveFolder, allTags, fTag, setFTag, droppable,
}: {
  folderList: string[]; folderCounts: Record<string, number>; uncategorizedCount: number;
  fCat: string; setFCat: (v: string) => void;
  onAddFolder: (name: string) => void; onRemoveFolder: (name: string) => void;
  allTags: string[]; fTag: string; setFTag: (v: string) => void; droppable?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const submit = () => { if (name.trim()) onAddFolder(name); setName(""); setAdding(false); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-fg-muted inline-flex items-center gap-1"><Folder size={13} /> 資料夾：</span>
        <button onClick={() => setFCat("")} className={`px-2 py-0.5 rounded-full ${!fCat ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted hover:text-fg"}`}>全部</button>
        <DroppableFolderChip
          dropId={folderDropId(UNCATEGORIZED)} label="📥 未分類" count={uncategorizedCount}
          active={fCat === UNCAT_FILTER} droppable={droppable}
          onClick={() => setFCat(fCat === UNCAT_FILTER ? "" : UNCAT_FILTER)}
        />
        {folderList.map((c) => (
          <DroppableFolderChip
            key={c} dropId={folderDropId(c)} label={`📁 ${c}`} count={folderCounts[c] ?? 0}
            active={fCat === c} droppable={droppable}
            onClick={() => setFCat(c === fCat ? "" : c)}
            onRemove={(folderCounts[c] ?? 0) === 0 ? () => onRemoveFolder(c) : undefined}
          />
        ))}
        {adding ? (
          <input
            autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setName(""); setAdding(false); } }}
            onBlur={submit}
            placeholder="資料夾名稱"
            className="px-2 py-0.5 rounded-full bg-bg border border-border text-xs w-28 outline-none focus:border-accent"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-2 py-0.5 rounded-full border border-dashed border-border text-fg-muted hover:border-accent hover:text-fg inline-flex items-center gap-1"
          >
            <FolderPlus size={12} /> 新增資料夾
          </button>
        )}
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center text-xs">
          <span className="text-fg-muted">標籤：</span>
          {allTags.map((t) => (
            <button key={t} onClick={() => setFTag(t === fTag ? "" : t)} className={`px-2 py-0.5 rounded-full ${fTag === t ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted hover:text-fg"}`}>#{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotesManager({
  initial,
  chapterMap,
  meId,
}: {
  initial: ManagedNote[];
  chapterMap: Record<string, { chapterTitle: string; lessonTitle: string }>;
  meId: string;
}) {
  const supabase = createSupabaseBrowser();
  const toast = useToast();
  const [notes, setNotes] = useState<ManagedNote[]>(initial);
  const [editing, setEditing] = useState<ManagedNote | "new" | null>(null);
  const [fCat, setFCat] = useState("");
  const [fTag, setFTag] = useState("");
  const [bg, setBg] = useState<NotesBgConfig>(DEFAULT_NOTES_BG);
  useEffect(() => { setBg(loadNotesBg()); }, []);
  const updateBg = (c: NotesBgConfig) => { setBg(c); saveNotesBg(c); };
  const [floating, setFloating] = useState(false);

  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags ?? []))).slice(0, 40),
    [notes],
  );
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = notes
    .filter((n) => {
      const catOk = !fCat || (fCat === UNCAT_FILTER ? !n.category : n.category === fCat);
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

  const del = async (n: ManagedNote) => {
    const owned = n._owned ?? (n.user_id === meId);
    if (owned) {
      if (!confirm("刪除這則筆記？")) return;
      setNotes((p) => p.filter((x) => x.id !== n.id));
      await supabase.from("notes").delete().eq("id", n.id);
    } else {
      if (!confirm("退出這則共用筆記？（不會刪掉原筆記）")) return;
      setNotes((p) => p.filter((x) => x.id !== n.id));
      await fetch(`/api/me/notes/${n.id}/share`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
    }
  };

  // 用邀請碼 / 連結加入共用筆記
  const joinByCode = async () => {
    const raw = window.prompt("貼上邀請碼或邀請連結：");
    if (!raw) return;
    let code = raw.trim();
    const idx = code.indexOf("/join/");
    if (idx >= 0) code = code.slice(idx + 6);
    code = code.replace(/[/?#].*$/, "").toUpperCase();
    if (!code) { toast.error("看不出邀請碼"); return; }
    try {
      const res = await fetch("/api/notes/join", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.message || "加入失敗"); return; }
      toast.success(j.alreadyOwner ? "這是你自己的筆記" : "已加入共用筆記");
      window.location.reload();
    } catch {
      toast.error("加入失敗、請再試一次");
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
      <button
        onClick={joinByCode}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm hover:border-accent transition"
        title="用邀請碼或連結加入別人的共同筆記"
      >
        🤝 加入共用
      </button>
      <button
        onClick={() => setEditing("new")}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-black font-semibold rounded-lg hover:scale-105 transition"
      >
        <Plus size={16} /> 新增筆記
      </button>
      <NotesBackgroundPicker cfg={bg} onChange={updateBg} />
      {notes.length > 0 && (
        <button
          onClick={() => setFloating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm hover:border-accent transition"
        >
          <Sparkles size={15} /> 漂浮預覽
        </button>
      )}
      {notes.length > 0 && (
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋筆記內容 / 分類 / 標籤"
            className="w-48 sm:w-60 pl-8 pr-7 py-2 rounded-lg border border-border bg-bg-card text-sm outline-none focus:border-accent"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg" aria-label="清除搜尋">
              <X size={13} />
            </button>
          )}
        </div>
      )}
      </div>

      {editing && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          meId={meId}
          categories={folderList}
          tags={allTags}
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
          <FolderBar
            folderList={folderList} folderCounts={folderCounts} uncategorizedCount={uncategorizedCount}
            fCat={fCat} setFCat={setFCat} onAddFolder={addFolder} onRemoveFolder={removeFolder}
            allTags={allTags} fTag={fTag} setFTag={setFTag} droppable
          />
          {shown.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-fg-muted mt-2">
              <GripVertical size={13} /> 拖卡片排序；拖到上方資料夾＝分類
            </div>
          )}
          <SortableContext items={shown.map((n) => n.id)} strategy={rectSortingStrategy}>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              {shown.map((n) => {
                const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
                return (
                  <SortableNoteCard key={n.id} id={n.id}>
                    <NoteCard
                      note={n}
                      meId={meId}
                      chapterTitle={meta?.chapterTitle ?? ""}
                      lessonTitle={meta?.lessonTitle ?? (n.lesson_id ?? "自由筆記")}
                      onEdit={() => setEditing(n)}
                      onDelete={() => del(n)}
                      onPin={() => togglePin(n)}
                    />
                  </SortableNoteCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <>
          <FolderBar
            folderList={folderList} folderCounts={folderCounts} uncategorizedCount={uncategorizedCount}
            fCat={fCat} setFCat={setFCat} onAddFolder={addFolder} onRemoveFolder={removeFolder}
            allTags={allTags} fTag={fTag} setFTag={setFTag}
          />
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {shown.map((n) => {
              const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
              return (
                <NoteCard
                  key={n.id}
                  note={n}
                  meId={meId}
                  chapterTitle={meta?.chapterTitle ?? ""}
                  lessonTitle={meta?.lessonTitle ?? (n.lesson_id ?? "自由筆記")}
                  onEdit={() => setEditing(n)}
                  onDelete={() => del(n)}
                  onPin={() => togglePin(n)}
                />
              );
            })}
          </div>
        </>
      )}
      {shown.length === 0 && (
        <div className="text-sm text-fg-muted py-8 text-center">沒有符合的筆記。點「新增筆記」開始記吧。</div>
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
  onCreateFolder,
  onClose,
  onSaved,
}: {
  note: ManagedNote | null;
  meId: string;
  categories: string[];
  tags: string[];
  onCreateFolder: (name: string) => void;
  onClose: () => void;
  onSaved: (n: ManagedNote) => void;
}) {
  const supabase = createSupabaseBrowser();
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
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // insert / update，回傳存好的 row（會 upsert 進列表、但不關閉）
  const persist = async (): Promise<ManagedNote | null> => {
    if (!content.replace(/<[^>]*>/g, "").trim()) { setErr("內容不能空白"); return null; }
    setErr("");
    const tagsArr = tagsInput.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 12);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("請先登入"); return null; }
    const payload: any = {
      title: title.trim() || null,
      content,
      category: category.trim() || null,
      tags: tagsArr,
      is_public: isPublic,
      color: color || null,
      opacity,
      bg: noteBg && noteBg.image ? noteBg : null,
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
      setErr(e?.message ?? "儲存失敗");
      return null;
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = await persist();
      if (d) onClose();
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

  return (
    <div className="rounded-2xl border border-accent/40 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{!note ? "新增筆記" : canEdit ? "編輯筆記" : "查看筆記（唯讀）"}</span>
        <button onClick={onClose} className="text-fg-muted hover:text-fg" aria-label="關閉"><X size={16} /></button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!canEdit}
        placeholder="標題（可留空）"
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-base font-semibold outline-none focus:border-accent disabled:opacity-70"
      />
      <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
        <BlogEditor content={content} onChange={setContent} editable={canEdit} placeholder="寫下你的筆記…（可貼上 / 拖曳圖片）" />
      </div>
      {!canEdit && (
        <div className="text-xs text-fg-muted bg-bg-elevated rounded-lg px-3 py-2">🔒 你是這則共用筆記的「唯讀」協作者、看得到內容但不能編輯。</div>
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
            placeholder="分類（選現有或打新的）"
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          {catOpen && (
            <div className="absolute z-30 mt-1 left-0 right-0 max-h-52 overflow-auto rounded-lg border border-border bg-bg-card shadow-xl py-1">
              {category && (
                <button type="button" onClick={() => { setCategory(""); setCatOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-fg-muted hover:bg-bg-elevated">— 不分類 —</button>
              )}
              {catMatches.map((c) => (
                <button key={c} type="button" onClick={() => { setCategory(c); setCatOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-elevated">📁 {c}</button>
              ))}
              {catMatches.length === 0 && !catTyped && categories.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-fg-muted">還沒有分類、直接打字或按下面建立</div>
              )}
              <button
                type="button"
                onClick={() => {
                  const name = catTyped || window.prompt("新分類名稱：")?.trim() || "";
                  if (name) { onCreateFolder(name); setCategory(name); }
                  setCatOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-accent hover:bg-bg-elevated border-t border-border inline-flex items-center gap-1.5"
              >
                <FolderPlus size={13} /> {catTyped && !categories.includes(catTyped) ? `建立分類「${catTyped}」` : "建立新分類…"}
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
            placeholder="標籤、逗號分隔（如：hook, useEffect）"
            className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          {tagOpen && tagSuggest.length > 0 && (
            <div className="absolute z-30 mt-1 left-0 right-0 max-h-52 overflow-auto rounded-lg border border-border bg-bg-card shadow-xl p-2">
              <div className="text-[11px] text-fg-muted mb-1">點一下加入現有標籤</div>
              <div className="flex flex-wrap gap-1">
                {tagSuggest.map((t) => (
                  <button key={t} type="button" onClick={() => addTag(t)} className="px-2 py-0.5 rounded-full text-xs bg-bg-elevated text-fg-muted hover:text-fg hover:bg-accent/20 transition">#{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 便利貼外觀：顏色 + 透明度 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-fg-muted">便利貼顏色</span>
          <button
            type="button"
            onClick={() => setColor("")}
            className={`px-2 py-0.5 text-[11px] rounded-full border transition ${color === "" ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:border-accent"}`}
            title="依分類自動配色"
          >
            自動
          </button>
          {STICKY_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              className={`w-6 h-6 rounded-full border transition hover:scale-110 ${color === c.key ? "ring-2 ring-accent border-fg" : "border-black/15"}`}
              style={{ background: c.bg }}
              title={c.label}
              aria-label={`便利貼顏色 ${c.label}`}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          透明度
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
          公開（其他人看得到）
        </label>
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-400">{err}</span>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-black font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 儲存
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
  const toast = useToast();
  const [loading, setLoading] = useState(!!noteId);
  const [code, setCode] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!noteId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/me/notes/${noteId}/share`);
        const j = await res.json();
        if (!cancelled && res.ok) { setCode(j.code); setUrl(j.url); setCollabs(j.collaborators ?? []); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [noteId]);

  const generate = async () => {
    setBusy(true);
    try {
      const id = noteId ?? (await ensureSaved()); // 新筆記先存一次拿到 id
      if (!id) { toast.error("請先輸入內容、才能產生邀請"); return; }
      const res = await fetch(`/api/me/notes/${id}/share`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message || j.error || `產生失敗（${res.status}）`); return; }
      setCode(j.code); setUrl(j.url);
    } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast.success("已複製邀請連結"); } catch { toast.error("複製失敗"); }
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
      <div className="text-xs font-medium text-fg-muted inline-flex items-center gap-1"><Link2 size={13} /> 共用設定（邀請別人一起編輯）</div>
      {url ? (
        <div className="flex items-center gap-2">
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs" />
          <button type="button" onClick={copy} className="text-xs px-2 py-1 rounded border border-border hover:border-accent transition inline-flex items-center gap-1"><Copy size={12} /> 複製</button>
        </div>
      ) : (
        <button type="button" onClick={generate} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-accent text-black font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} 產生邀請連結
        </button>
      )}
      {code && <div className="text-[11px] text-fg-muted">邀請碼：<code className="px-1 rounded bg-bg-elevated">{code}</code> — 連結貼到聊天室會有預覽卡片；對方也可在「加入共用」直接輸入這組碼</div>}

      {collabs.length > 0 ? (
        <div className="space-y-1 pt-1">
          <div className="text-[11px] text-fg-muted">與這些人共用（{collabs.length}）</div>
          {collabs.map((c) => (
            <div key={c.user_id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate">{c.display_name || c.username || c.user_id.slice(0, 8)}</span>
              <div className="inline-flex rounded border border-border overflow-hidden shrink-0">
                <button type="button" onClick={() => setRole(c.user_id, "editor")} className={`px-2 py-0.5 transition ${c.role !== "viewer" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}>可編輯</button>
                <button type="button" onClick={() => setRole(c.user_id, "viewer")} className={`px-2 py-0.5 transition ${c.role === "viewer" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}>唯讀</button>
              </div>
              <button type="button" onClick={() => remove(c.user_id)} className="text-fg-muted hover:text-red-400 shrink-0" title="解除共用"><X size={13} /></button>
            </div>
          ))}
        </div>
      ) : (
        !loading && <div className="text-[11px] text-fg-muted">還沒有人加入。</div>
      )}
    </div>
  );
}

/** 便利貼單獨背景圖：上傳 + 縮放/位移裁切/旋轉 + 即時預覽 */
function NoteBackgroundEditor({ value, onChange }: { value: NoteBg | null; onChange: (b: NoteBg | null) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const bg = value ?? DEFAULT_NOTE_BG;
  const update = (patch: Partial<NoteBg>) => onChange({ ...bg, ...patch });

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("只支援圖片"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("檔案不可超過 8 MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "notes");
      const res = await fetch("/api/upload", { credentials: "include", method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "上傳失敗");
      onChange({ ...DEFAULT_NOTE_BG, ...(value ?? {}), image: j.url });
      toast.success("背景已上傳");
    } catch (e: any) {
      toast.error(e?.message || "上傳失敗");
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
          <ImageIcon size={13} /> 便利貼背景圖（可選）
        </span>
        {value?.image && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-fg-muted hover:text-red-400 inline-flex items-center gap-1">
            <X size={12} /> 移除
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
          上傳圖片當背景
        </button>
      ) : (
        <>
          <div className="relative h-28 rounded-md overflow-hidden border border-border bg-bg">
            <img src={value.image} alt="" className="absolute left-1/2 top-1/2 w-[140%] h-[140%] max-w-none object-cover" style={noteBgImgStyle(bg)} draggable={false} />
          </div>
          <Slider label="大小" min={1} max={3} step={0.05} val={bg.scale} on={(v) => update({ scale: v })} fmt={(v) => `${v.toFixed(2)}x`} />
          <Slider label="左右" min={0} max={100} step={1} val={bg.x} on={(v) => update({ x: v })} fmt={(v) => `${Math.round(v)}%`} />
          <Slider label="上下" min={0} max={100} step={1} val={bg.y} on={(v) => update({ y: v })} fmt={(v) => `${Math.round(v)}%`} />
          <Slider label="旋轉" min={-180} max={180} step={1} val={bg.rotate} on={(v) => update({ rotate: v })} fmt={(v) => `${Math.round(v)}°`} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:border-accent hover:text-fg transition inline-flex items-center gap-1 disabled:opacity-50">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} 換圖
            </button>
            <button type="button" onClick={() => onChange({ ...DEFAULT_NOTE_BG, image: value.image })} className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:border-accent hover:text-fg transition inline-flex items-center gap-1">
              <RotateCw size={12} /> 重設位置
            </button>
            <span className="text-[11px] text-fg-muted ml-auto">背景濃淡用上面「透明度」調</span>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPick} />
    </div>
  );
}

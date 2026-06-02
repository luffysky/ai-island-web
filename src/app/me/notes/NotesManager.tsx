"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { NoteCard } from "./NoteCard";
import { Plus, X, Save, Loader2 } from "lucide-react";

const BlogEditor = dynamic(
  () => import("@/components/blog/BlogEditor").then((m) => m.BlogEditor),
  { ssr: false, loading: () => <div className="text-xs text-fg-muted p-3">載入編輯器…</div> },
);

export type ManagedNote = {
  id: string;
  chapter_id: number | null;
  lesson_id: string | null;
  content: string;
  is_public: boolean;
  likes: number;
  updated_at: string;
  category: string | null;
  tags: string[] | null;
};

export function NotesManager({
  initial,
  chapterMap,
}: {
  initial: ManagedNote[];
  chapterMap: Record<string, { chapterTitle: string; lessonTitle: string }>;
}) {
  const supabase = createSupabaseBrowser();
  const [notes, setNotes] = useState<ManagedNote[]>(initial);
  const [editing, setEditing] = useState<ManagedNote | "new" | null>(null);
  const [fCat, setFCat] = useState("");
  const [fTag, setFTag] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(notes.map((n) => n.category).filter(Boolean))) as string[],
    [notes],
  );
  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags ?? []))).slice(0, 40),
    [notes],
  );
  const shown = notes.filter(
    (n) => (!fCat || n.category === fCat) && (!fTag || (n.tags ?? []).includes(fTag)),
  );

  const del = async (n: ManagedNote) => {
    if (!confirm("刪除這則筆記？")) return;
    setNotes((p) => p.filter((x) => x.id !== n.id));
    await supabase.from("notes").delete().eq("id", n.id);
  };

  const onSaved = (n: ManagedNote) => {
    setNotes((p) => {
      const i = p.findIndex((x) => x.id === n.id);
      if (i >= 0) { const c = [...p]; c[i] = n; return c; }
      return [n, ...p];
    });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing("new")}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-black font-semibold rounded-lg hover:scale-105 transition"
      >
        <Plus size={16} /> 新增筆記
      </button>

      {/* 篩選 */}
      {(categories.length > 0 || allTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {categories.length > 0 && (
            <>
              <span className="text-fg-muted">分類：</span>
              <button onClick={() => setFCat("")} className={`px-2 py-0.5 rounded-full ${!fCat ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted"}`}>全部</button>
              {categories.map((c) => (
                <button key={c} onClick={() => setFCat(c === fCat ? "" : c)} className={`px-2 py-0.5 rounded-full ${fCat === c ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted"}`}>📁 {c}</button>
              ))}
            </>
          )}
          {allTags.length > 0 && (
            <span className="ml-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-fg-muted">標籤：</span>
              {allTags.map((t) => (
                <button key={t} onClick={() => setFTag(t === fTag ? "" : t)} className={`px-2 py-0.5 rounded-full ${fTag === t ? "bg-accent text-black" : "bg-bg-elevated text-fg-muted"}`}>#{t}</button>
              ))}
            </span>
          )}
        </div>
      )}

      {editing && (
        <NoteEditor note={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {shown.map((n) => {
          const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
          return (
            <NoteCard
              key={n.id}
              note={n}
              chapterTitle={meta?.chapterTitle ?? ""}
              lessonTitle={meta?.lessonTitle ?? (n.lesson_id ?? "自由筆記")}
              onEdit={() => setEditing(n)}
              onDelete={() => del(n)}
            />
          );
        })}
      </div>
      {shown.length === 0 && (
        <div className="text-sm text-fg-muted py-8 text-center">沒有符合的筆記。點「新增筆記」開始記吧。</div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  onClose,
  onSaved,
}: {
  note: ManagedNote | null;
  onClose: () => void;
  onSaved: (n: ManagedNote) => void;
}) {
  const supabase = createSupabaseBrowser();
  const [content, setContent] = useState(note?.content ?? "");
  const [category, setCategory] = useState(note?.category ?? "");
  const [tagsInput, setTagsInput] = useState((note?.tags ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(note?.is_public ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!content.replace(/<[^>]*>/g, "").trim()) { setErr("內容不能空白"); return; }
    setSaving(true);
    setErr("");
    const tags = tagsInput.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 12);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr("請先登入"); return; }
      const payload: any = {
        content,
        category: category.trim() || null,
        tags,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      };
      if (note) {
        const { data, error } = await supabase.from("notes").update(payload).eq("id", note.id).select("*").single();
        if (error) throw error;
        onSaved(data as ManagedNote);
      } else {
        const { data, error } = await supabase.from("notes").insert({ ...payload, user_id: user.id }).select("*").single();
        if (error) throw error;
        onSaved(data as ManagedNote);
      }
    } catch (e: any) {
      setErr(e?.message ?? "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-accent/40 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{note ? "編輯筆記" : "新增筆記"}</span>
        <button onClick={onClose} className="text-fg-muted hover:text-fg" aria-label="關閉"><X size={16} /></button>
      </div>
      <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
        <BlogEditor content={content} onChange={setContent} placeholder="寫下你的筆記…（可貼上 / 拖曳圖片）" />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="分類（如：React / 面試 / 想法）"
          className="flex-1 min-w-[140px] bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="標籤、逗號分隔（如：hook, useEffect）"
          className="flex-1 min-w-[140px] bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>
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
    </div>
  );
}

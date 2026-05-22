"use client";
import { useEffect, useState } from "react";
import { StickyNote, Save, Check } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function NotePanel({
  lessonId,
  chapterId,
  isLoggedIn,
}: {
  lessonId: string;
  chapterId: number;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // 用最新一筆、避免歷史 duplicate 把 maybeSingle 炸掉
      const { data, error: loadErr } = await supabase
        .from("notes")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .eq("is_public", false)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (loadErr) {
        console.warn("[NotePanel] load failed:", loadErr.message);
        return;
      }
      if (data) {
        setNote(data.content);
        setNoteId(data.id);
      }
    })();
  }, [open, lessonId]);

  const save = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("筆記內容不能空白");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    try {
      if (noteId) {
        const { error: upErr } = await supabase
          .from("notes")
          .update({ content: trimmed, updated_at: new Date().toISOString() })
          .eq("id", noteId)
          .eq("user_id", user.id);
        if (upErr) throw upErr;
      } else {
        const { data, error: inErr } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            chapter_id: chapterId,
            lesson_id: lessonId,
            content: trimmed,
            is_public: false,
          })
          .select("id")
          .single();
        if (inErr) throw inErr;
        if (data) setNoteId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      console.error("[NotePanel] save failed:", e);
      setError(e?.message || "儲存失敗、請再試一次");
    } finally {
      setSaving(false);
    }
  };

  const handleOpen = async () => {
    // 點下去再驗 session、不依賴 prop（prop 在剛登入時可能還沒同步）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`p-1.5 rounded transition hover:bg-[var(--color-bg-elevated)] ${
          note ? "text-[var(--color-accent)]" : "text-[var(--color-fg-muted)]"
        }`}
        title={note ? "已有筆記" : "新增筆記"}
      >
        <StickyNote size={16} className={note ? "fill-current" : ""} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-80 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">📝 我的筆記</span>
            <button onClick={() => setOpen(false)} className="text-xs text-[var(--color-fg-muted)]">關閉</button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="紀錄你對這個 lesson 的想法、重點..."
            rows={6}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)] resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[var(--color-fg-muted)]">{note.length} 字</span>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1 bg-[var(--color-accent)] text-black text-xs font-semibold rounded hover:scale-105 transition disabled:opacity-50"
            >
              {saving ? "儲存中…" : saved ? <><Check size={12} /> 已存</> : <><Save size={12} /> 儲存</>}
            </button>
          </div>
          {error && (
            <div className="mt-2 px-2 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded">
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}

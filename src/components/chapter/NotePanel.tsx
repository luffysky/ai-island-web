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
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    if (!isLoggedIn || !open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notes")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .eq("is_public", false)
        .maybeSingle();
      if (data) {
        setNote(data.content);
        setNoteId(data.id);
      }
    })();
  }, [isLoggedIn, open, lessonId]);

  const save = async () => {
    if (!isLoggedIn) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (noteId) {
      await supabase.from("notes")
        .update({ content: note, updated_at: new Date().toISOString() })
        .eq("id", noteId);
    } else {
      const { data } = await supabase.from("notes").insert({
        user_id: user.id,
        chapter_id: chapterId,
        lesson_id: lessonId,
        content: note,
        is_public: false,
      }).select("id").single();
      if (data) setNoteId(data.id);
    }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isLoggedIn) {
    return (
      <button disabled className="p-1.5 rounded opacity-30" title="登入後可寫筆記">
        <StickyNote size={16} />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
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
              {saved ? <><Check size={12} /> 已存</> : <><Save size={12} /> 儲存</>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

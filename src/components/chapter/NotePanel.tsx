"use client";
import { useEffect, useState } from "react";
import { StickyNote, Save, Check } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useToast } from "@/components/ui/Toast";
import { usePopover, PopoverPanel } from "@/components/ui/Popover";
import { devLog } from "@/lib/dev-log";

export function NotePanel({
  lessonId,
  chapterId,
}: {
  lessonId: string;
  chapterId: number;
  isLoggedIn?: boolean;
}) {
  const toast = useToast();
  const popover = usePopover({ placement: "bottom-end", maxWidth: 360 });
  const { open, setOpen } = popover;
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
        devLog.warn("[NotePanel] load failed:", loadErr.message);
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
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pet:note-saved", { detail: { chapterId, lessonId } }),
      );
      window.dispatchEvent(new CustomEvent("sync:notes"));
    }
    setSaving(true);

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
    } catch (e: any) {
      devLog.error("[NotePanel] save failed:", e);
      setSaved(false);
      setError(e?.message || "儲存失敗、請再試一次");
      toast.error("筆記儲存失敗、內容已保留");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        ref={popover.refs.setReference}
        {...popover.getReferenceProps({
          onClick: async (e) => {
            if (open) return;
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              if (typeof window !== "undefined") {
                window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
              }
              return;
            }
            setOpen(true);
          },
        })}
        className={`p-1.5 rounded transition hover:bg-bg-elevated ${
          note ? "text-accent" : "text-fg-muted"
        }`}
        title={note ? "已有筆記" : "新增筆記"}
      >
        <StickyNote size={16} className={note ? "fill-current" : ""} />
      </button>

      <PopoverPanel api={popover} className="w-80 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">📝 我的筆記</span>
          <button onClick={() => setOpen(false)} className="text-xs text-fg-muted">關閉</button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="紀錄你對這個 lesson 的想法、重點..."
          rows={6}
          className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-fg-muted">{note.length} 字</span>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 bg-accent text-black text-xs font-semibold rounded hover:scale-105 transition disabled:opacity-50"
          >
            {saving ? "儲存中…" : saved ? <><Check size={12} /> 已存</> : <><Save size={12} /> 儲存</>}
          </button>
        </div>
        {error && (
          <div className="mt-2 px-2 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded">
            {error}
          </div>
        )}
      </PopoverPanel>
    </>
  );
}

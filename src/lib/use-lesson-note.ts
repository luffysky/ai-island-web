"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { devLog } from "@/lib/dev-log";

export function useLessonNote(
  lessonId: string,
  chapterId: number,
  enabled: boolean,
) {
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowser();
  // 用全站 AuthContext（getSession cookie cache）— getUser() 在靜態章節頁會 race 回 null
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const { data, error: loadErr } = await supabase
        .from("notes")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .eq("is_public", false)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (loadErr) {
        devLog.warn("[useLessonNote] load failed:", loadErr.message);
        return;
      }
      if (data) {
        setNote(data.content);
        setNoteId(data.id);
      } else {
        setNote("");
        setNoteId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, lessonId, user?.id]);

  const save = async (): Promise<{ ok: boolean }> => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("筆記內容不能空白");
      return { ok: false };
    }
    setError(null);

    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return { ok: false };
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
      return { ok: true };
    } catch (e: any) {
      devLog.error("[useLessonNote] save failed:", e);
      setSaved(false);
      setError(e?.message || "儲存失敗、請再試一次");
      return { ok: false };
    } finally {
      setSaving(false);
    }
  };

  return { note, setNote, noteId, saving, saved, error, save };
}

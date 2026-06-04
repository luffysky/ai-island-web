"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export type PresenceUser = { user_id: string; name: string; avatar: string | null; editing: boolean };

/**
 * 共同筆記的「誰在線上」：Supabase Realtime presence。
 * 同一則筆記的協作者進編輯器都會加入同一個 channel，互相看到對方在看 / 在編輯。
 */
export function useNotePresence(
  noteId: string | null,
  enabled: boolean,
  me: { id: string; name: string; avatar: string | null },
  editing: boolean,
): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const chanRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowser>["channel"]> | null>(null);

  useEffect(() => {
    if (!enabled || !noteId) { setOthers([]); return; }
    const supabase = createSupabaseBrowser();
    const channel = supabase.channel(`note-presence:${noteId}`, { config: { presence: { key: me.id } } });
    chanRef.current = channel;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const list: PresenceUser[] = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === me.id) continue;
        const m = (metas[0] ?? {}) as any;
        list.push({ user_id: key, name: m.name ?? "協作者", avatar: m.avatar ?? null, editing: !!m.editing });
      }
      setOthers(list);
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ name: me.name, avatar: me.avatar, editing });
    });
    return () => { supabase.removeChannel(channel); chanRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, enabled, me.id]);

  // 編輯狀態變了 → 廣播給其他人
  useEffect(() => {
    chanRef.current?.track({ name: me.name, avatar: me.avatar, editing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return others;
}

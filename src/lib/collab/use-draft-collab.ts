"use client";

/**
 * useDraftCollab — 把一個 ci_draft 接上即時共編（Yjs over Supabase Realtime）。
 *
 * 回傳 { collab, status, peers, seedEditor }：
 *  - collab：給 <BlogEditor collab={...} /> 的物件（doc/provider/user）。null = 用單人模式。
 *  - status："off"（旗標關 / 非成員 / 建立失敗）| "connecting" | "live" | "offline"（realtime 斷線但本地仍可編）。
 *  - peers：線上人數（含自己），給「N 人共編中」。
 *  - seedEditor(editor)：editor ready 後呼叫——冷開（無持久化快照且只有我）時，用既有 body HTML 種子一次。
 *
 * 安全：Supabase Realtime broadcast 預設沒有 RLS。訂閱前先打 draft GET 確認我是成員
 * （伺服端 requireWorkspaceRole）；不是成員就退回單人、不訂閱 channel。
 *
 * 特性旗標 flag_collab：預設開。要關 → localStorage.setItem("flag_collab","0")
 * 或在載入前設 window.__FLAG_COLLAB__ = false。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import type { Editor } from "@tiptap/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { SupabaseYjsProvider } from "./supabase-yjs-provider";
import { toBase64, fromBase64 } from "./base64";

export type CollabStatus = "off" | "connecting" | "live" | "offline";

export type DraftCollab = {
  doc: Y.Doc;
  provider: SupabaseYjsProvider;
  user: { name: string; color: string };
};

// 依 user id 穩定挑游標色（同一人每次同色）
const CURSOR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];
function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
}

function collabEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem("flag_collab") === "0") return false;
  } catch {
    /* ignore */
  }
  return (window as unknown as { __FLAG_COLLAB__?: boolean }).__FLAG_COLLAB__ !== false;
}

export function useDraftCollab(opts: {
  draftId: string;
  user: { id: string; name: string } | null;
  initialBody: string;
}) {
  const { draftId, user, initialBody } = opts;

  const [collab, setCollab] = useState<DraftCollab | null>(null);
  const [status, setStatus] = useState<CollabStatus>(() =>
    typeof window !== "undefined" && user && collabEnabled() ? "connecting" : "off",
  );
  const [peers, setPeers] = useState(1);

  // 種子控制：冷開（無持久化快照）時，editor ready 用 body 灌一次
  const seedNeededRef = useRef(false);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const bodyRef = useRef(initialBody);

  useEffect(() => {
    if (!user || !collabEnabled()) {
      setStatus("off");
      return;
    }
    let cancelled = false;
    let provider: SupabaseYjsProvider | null = null;
    let doc: Y.Doc | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createSupabaseBrowser();

    (async () => {
      // 1) 客戶端輕量成員檢查（broadcast 無 RLS → 先確認能存取這個 draft）
      try {
        const r = await fetch(`/api/creator-island/drafts/${draftId}`, { credentials: "include" });
        if (!r.ok) {
          if (!cancelled) setStatus("off");
          return;
        }
      } catch {
        if (!cancelled) setStatus("off");
        return;
      }

      // 2) 載入持久化 CRDT 快照（房間冷開 / 晚進場追平）
      let persisted: Uint8Array | null = null;
      try {
        const r = await fetch(`/api/creator-island/drafts/${draftId}/ydoc`, { credentials: "include" });
        if (r.ok) {
          const j = await r.json();
          if (j?.ydoc) persisted = fromBase64(j.ydoc);
        }
      } catch {
        /* 沒快照就算了、靠 peer sync 或 body 種子 */
      }
      if (cancelled) return;

      doc = new Y.Doc();
      const me = { name: user.name, color: colorFor(user.id) };
      try {
        provider = new SupabaseYjsProvider(
          supabase,
          doc,
          draftId,
          { id: user.id, name: me.name, color: me.color },
          {
            peers: (n) => !cancelled && setPeers(n),
            synced: () => !cancelled && setStatus("live"),
            status: (s) => {
              if (cancelled) return;
              if (s === "SUBSCRIBED") setStatus("live");
              else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
            },
          },
        );
      } catch {
        // provider 建立失敗 → 完全退回單人（別把 persisted 灌進去，交給單人 content=body）
        if (!cancelled) setStatus("off");
        try {
          doc.destroy();
        } catch {
          /* ignore */
        }
        return;
      }

      providerRef.current = provider;
      if (persisted) provider.applyPersisted(persisted);
      // 沒持久化快照 = 這個草稿第一次進共編 → 需要用既有 body 種子
      seedNeededRef.current = !persisted;

      // 3) debounced 存快照（獨立於 realtime；realtime 掛也照存 → 不掉資料）
      const scheduleSave = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          if (!doc) return;
          const b64 = toBase64(Y.encodeStateAsUpdate(doc));
          fetch(`/api/creator-island/drafts/${draftId}/ydoc`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ydoc: b64 }),
          }).catch(() => {});
        }, 1800);
      };
      doc.on("update", scheduleSave);

      if (!cancelled) setCollab({ doc, provider, user: me });
    })();

    return () => {
      cancelled = true;
      if (saveTimer) clearTimeout(saveTimer);
      providerRef.current = null;
      try {
        provider?.destroy();
      } catch {
        /* ignore */
      }
      try {
        doc?.destroy();
      } catch {
        /* ignore */
      }
      setCollab(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, user?.id]);

  /** editor ready 後呼叫：冷開（無快照 + 只有我）時用 body HTML 種子一次。 */
  const seedEditor = useCallback((editor: Editor) => {
    if (!seedNeededRef.current) return;
    seedNeededRef.current = false; // 只種一次
    const alone = (providerRef.current?.peerCount() ?? 1) <= 1;
    const body = bodyRef.current;
    // 只有「文件真的空 + 沒有別人（別人會帶來狀態）+ 有既有內容」才種，避免重複灌
    if (alone && editor.isEmpty && body && body.trim()) {
      editor.commands.setContent(body);
    }
  }, []);

  return { collab, status, peers, seedEditor };
}

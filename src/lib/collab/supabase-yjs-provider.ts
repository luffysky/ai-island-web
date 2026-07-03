/**
 * SupabaseYjsProvider — 用 Supabase Realtime（broadcast + presence）當 Yjs 的傳輸層。
 *
 * 設計：
 *  - 本地 Y.Doc update → channel.send({ event: 'yupdate', payload: base64(update) })。
 *  - 收到遠端 'yupdate' → Y.applyUpdate(doc, bytes, THIS_ORIGIN)；用 origin 防止把自己
 *    apply 進來的 update 又廣播回去（回聲）。
 *  - Awareness（游標 / 誰在打字）走 y-protocols/awareness，編碼後用 'awareness' 事件廣播。
 *  - 誰在線上：Supabase Presence（channel.track），給「N 人共編中」用。
 *  - 晚進場追平：join 後送 'sync-request'，在線的 peer 用 'sync-reply'（完整
 *    Y.encodeStateAsUpdate）回覆；CRDT 合併是冪等的，重複 apply 安全。
 *  - 空房（沒有 peer 回覆）→ 由呼叫端載入 DB 持久化快照（見 ydoc 欄位 / EngineWorkspace）。
 *
 * ⚠️ 安全：Supabase Realtime broadcast 預設「沒有 RLS」——任何知道 channel 名的人都能
 *   收發。本 provider 只是傳輸層，呼叫端必須在 subscribe 前先確認使用者是該 draft 的
 *   workspace 成員（EngineWorkspace 會先打 draft GET 確認）。正式環境建議再開
 *   Realtime Authorization / RLS 綁 channel（見報告的安全備註）。
 */
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { toBase64, fromBase64 } from "./base64";

export type PresenceUser = { id: string; name: string; color: string };

export type ProviderEvents = {
  /** 完成一次初始 sync 週期（送出 sync-request 後短暫等待）後觸發，帶目前 peer 數。 */
  synced?: (peerCount: number) => void;
  /** 線上人數變動（含自己）。給「N 人共編中」用。 */
  peers?: (count: number) => void;
  /** 連線狀態：'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'。 */
  status?: (status: string) => void;
};

const SYNC_GRACE_MS = 1200;

export class SupabaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private supabase: SupabaseClient;
  private channel: RealtimeChannel;
  private user: PresenceUser;
  private events: ProviderEvents;
  private destroyed = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  /** 用 this 當 origin：doc.on('update') 收到這個 origin = 遠端來的、別再廣播。 */
  private readonly origin = Symbol("supabase-yjs-provider");

  constructor(
    supabase: SupabaseClient,
    doc: Y.Doc,
    draftId: string,
    user: PresenceUser,
    events: ProviderEvents = {},
  ) {
    this.supabase = supabase;
    this.doc = doc;
    this.user = user;
    this.events = events;
    this.awareness = new Awareness(doc);
    this.awareness.setLocalStateField("user", { name: user.name, color: user.color });

    // 房名以 draftId 為界（每個草稿一間房）
    this.channel = supabase.channel(`draft:${draftId}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });

    this.doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);

    this.channel
      .on("broadcast", { event: "yupdate" }, ({ payload }) => this.onRemoteUpdate(payload))
      .on("broadcast", { event: "awareness" }, ({ payload }) => this.onRemoteAwareness(payload))
      .on("broadcast", { event: "sync-request" }, () => this.replyState())
      .on("broadcast", { event: "sync-reply" }, ({ payload }) => this.onRemoteUpdate(payload))
      .on("presence", { event: "sync" }, () => this.emitPeers());

    this.channel.subscribe((status) => {
      this.events.status?.(status);
      if (status === "SUBSCRIBED") {
        // 宣告在場 + 送初始狀態 + 要求 peer 回傳目前狀態
        this.channel.track({ user: this.user, online_at: new Date().toISOString() }).catch(() => {});
        this.replyState(); // 把自己已有的狀態先丟出去（可能已載入持久化快照）
        this.requestSync();
        this.broadcastAwareness();
      }
    });
  }

  /** 目前在線人數（含自己）。 */
  peerCount(): number {
    try {
      const state = this.channel.presenceState() as Record<string, unknown[]>;
      return Object.keys(state).length || 1;
    } catch {
      return 1;
    }
  }

  private emitPeers = () => {
    this.events.peers?.(this.peerCount());
  };

  // ---- 本地 → 遠端 ----
  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (this.destroyed) return;
    if (origin === this.origin) return; // 這是遠端 apply 進來的、別回廣播（防回聲）
    this.channel.send({ type: "broadcast", event: "yupdate", payload: { update: toBase64(update) } }).catch(() => {});
  };

  private onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
  ) => {
    if (this.destroyed) return;
    const changed = added.concat(updated, removed);
    const payload = toBase64(encodeAwarenessUpdate(this.awareness, changed));
    this.channel.send({ type: "broadcast", event: "awareness", payload: { update: payload } }).catch(() => {});
  };

  private broadcastAwareness() {
    const payload = toBase64(
      encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys())),
    );
    this.channel.send({ type: "broadcast", event: "awareness", payload: { update: payload } }).catch(() => {});
  }

  // ---- 遠端 → 本地 ----
  private onRemoteUpdate(payload: { update?: string } | null) {
    if (this.destroyed || !payload?.update) return;
    try {
      Y.applyUpdate(this.doc, fromBase64(payload.update), this.origin);
    } catch {
      /* 壞封包忽略 */
    }
  }

  private onRemoteAwareness(payload: { update?: string } | null) {
    if (this.destroyed || !payload?.update) return;
    try {
      applyAwarenessUpdate(this.awareness, fromBase64(payload.update), this.origin);
    } catch {
      /* ignore */
    }
  }

  /** 把自己完整狀態丟出去（回覆 sync-request，也用來讓晚進場者追平）。 */
  private replyState() {
    if (this.destroyed) return;
    const update = Y.encodeStateAsUpdate(this.doc);
    this.channel
      .send({ type: "broadcast", event: "sync-reply", payload: { update: toBase64(update) } })
      .catch(() => {});
  }

  /** 進場：要求 peer 回傳目前狀態；grace 後回報是否有人（呼叫端據此決定要不要載持久化）。 */
  private requestSync() {
    this.channel.send({ type: "broadcast", event: "sync-request", payload: {} }).catch(() => {});
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      if (this.destroyed) return;
      this.events.synced?.(this.peerCount());
    }, SYNC_GRACE_MS);
  }

  /** 手動把一段持久化 update 灌進 doc（不會回廣播，因為用了 provider origin）。 */
  applyPersisted(update: Uint8Array) {
    if (this.destroyed || !update?.length) return;
    Y.applyUpdate(this.doc, update, this.origin);
  }

  /** 乾淨拆除：解 listener、退出 channel、destroy awareness。 */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    try {
      this.awareness.setLocalState(null); // 通知別人我離開
    } catch {
      /* ignore */
    }
    this.awareness.destroy();
    try {
      this.channel.untrack().catch(() => {});
    } catch {
      /* ignore */
    }
    this.supabase.removeChannel(this.channel);
  }
}

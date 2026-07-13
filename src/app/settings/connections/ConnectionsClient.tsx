"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Check, X, Info } from "lucide-react";

interface Conn { id: string; provider: string; display_name: string; external_id?: string | null; status: string; has_token: boolean; connect_method: string; created_at: string; }

const PROVIDERS: { key: string; emoji: string; label: string; hint: string; needsToken?: boolean }[] = [
  { key: "telegram", emoji: "💬", label: "Telegram", hint: "貼你的 @username 或 chat id" },
  { key: "discord", emoji: "🎮", label: "Discord", hint: "貼你的 Discord 使用者名稱" },
  { key: "youtube", emoji: "▶️", label: "YouTube", hint: "貼你的頻道名稱 / 網址" },
  { key: "instagram", emoji: "📷", label: "Instagram", hint: "貼你的 @帳號（可綁多個）" },
  { key: "threads", emoji: "🧵", label: "Threads", hint: "貼你的 @帳號" },
  { key: "tiktok", emoji: "🎵", label: "抖音 / TikTok", hint: "貼你的 @帳號" },
  { key: "facebook", emoji: "👥", label: "Facebook 粉專", hint: "貼粉專名稱 / 網址" },
  { key: "x", emoji: "✖️", label: "X (Twitter)", hint: "貼你的 @帳號" },
  { key: "github", emoji: "🐙", label: "GitHub", hint: "貼你的 GitHub 使用者名稱" },
  { key: "gmail", emoji: "✉️", label: "Gmail", hint: "貼你的 Gmail 地址" },
  { key: "gcalendar", emoji: "📅", label: "Google 日曆", hint: "貼你的 Google 帳號" },
];

export function ConnectionsClient() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState<string>("");   // 正在新增哪個 provider
  const [handle, setHandle] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try { const r = await fetch("/api/me/connections"); if (r.ok) setConns((await r.json()).connections ?? []); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (provider: string) => {
    if (busy) return;
    if (!handle.trim()) { setErr("請填帳號名稱 / @handle"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/connections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, display_name: handle.trim(), external_id: handle.trim(), token: token.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "連結失敗"); return; }
      setConns((cur) => [d.connection, ...cur]);
      setHandle(""); setToken(""); setOpenForm("");
    } catch { setErr("連線失敗"); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setConns((cur) => cur.filter((c) => c.id !== id));
    await fetch(`/api/me/connections?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-fg-muted inline-flex items-start gap-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>目前為<b>手動連結</b>（先記錄你的帳號）。「用 X 一鍵登入授權」的 OAuth 待各平台開通後上線；需要 token 的進階功能可選填。</span>
      </div>

      {loading ? (
        <div className="text-sm text-fg-muted py-6 text-center">載入中…</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {PROVIDERS.map((p) => {
            const mine = conns.filter((c) => c.provider === p.key);
            const isOpen = openForm === p.key;
            return (
              <div key={p.key} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm flex items-center gap-2"><span className="text-lg">{p.emoji}</span> {p.label}{mine.length > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">· {mine.length} 個已連</span>}</div>
                  <button onClick={() => { setOpenForm(isOpen ? "" : p.key); setHandle(""); setToken(""); setErr(""); }} className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"><Plus className="w-3.5 h-3.5" /> 連結帳號</button>
                </div>

                {mine.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {mine.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs rounded-lg bg-black/[0.03] dark:bg-white/[0.05] px-2.5 py-1.5">
                        <span className="truncate">{c.display_name}{c.has_token && <span className="ml-1 text-[10px] text-emerald-500">🔑</span>}</span>
                        <button onClick={() => remove(c.id)} title="移除" className="text-fg-muted hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && (
                  <div className="mt-2 space-y-1.5">
                    <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={p.hint} className="w-full rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs outline-none focus:border-accent" />
                    <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="access token（選填、進階用、加密儲存）" className="w-full rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs outline-none focus:border-accent" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => add(p.key)} disabled={busy} className="inline-flex items-center gap-1 text-xs rounded-lg bg-accent text-white px-2.5 py-1.5 disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} 連結</button>
                      <button onClick={() => { setOpenForm(""); setErr(""); }} className="inline-flex items-center gap-1 text-xs rounded-lg border border-border px-2.5 py-1.5"><X className="w-3.5 h-3.5" /> 取消</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {err && <div className="text-xs text-rose-500">{err}</div>}
    </div>
  );
}

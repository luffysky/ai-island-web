"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

type P = { id: string; username?: string; display_name?: string; avatar_url?: string };
const nm = (p?: P) => p?.display_name || p?.username || "創作者";

async function call(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

function Avatar({ p }: { p?: P }) {
  return p?.avatar_url ? <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-accent/20 grid place-items-center text-xs">{nm(p)[0]}</div>;
}

export function FriendsClient({ initialFriends, initialPending, initialSent = [] }: { initialFriends: P[]; initialPending: any[]; initialSent?: any[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"friends" | "pending" | "sent" | "search">("friends");
  const [friends, setFriends] = useState<P[]>(initialFriends);
  const [pending, setPending] = useState<any[]>(initialPending);
  const [sent, setSent] = useState<any[]>(initialSent);
  const [q, setQ] = useState(""); const [results, setResults] = useState<P[]>([]);
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);

  async function search() {
    setErr(null); try { const j = await call(`/api/creator-island/social/friends?type=search&q=${encodeURIComponent(q)}`, "GET"); setResults(j.users ?? []); } catch (e: any) { setErr(e.message); }
  }
  async function add(id: string) {
    try { await call("/api/creator-island/social/friends", "POST", { addresseeId: id }); setMsg("已送出邀請");
      try { const j = await call(`/api/creator-island/social/friends?type=sent`, "GET"); setSent(j.sent ?? []); } catch { /* ignore */ }
    } catch (e: any) { setErr(e.message); }
  }
  async function cancelSent(addresseeId: string, fid: string) {
    try { await call(`/api/creator-island/social/friends?otherId=${addresseeId}`, "DELETE"); setSent((p) => p.filter((x) => x.id !== fid)); setMsg("已收回邀請"); } catch (e: any) { setErr(e.message); }
  }
  async function respond(fid: string, accept: boolean) {
    try { await call("/api/creator-island/social/friends/respond", "POST", { friendshipId: fid, accept }); setPending((p) => p.filter((x) => x.id !== fid)); if (accept) setMsg("已成為好友"); } catch (e: any) { setErr(e.message); }
  }
  async function dm(id: string) { try { const j = await call("/api/creator-island/social/dm/threads", "POST", { otherId: id }); router.push(`/creator-island/messages?t=${j.threadId}`); } catch (e: any) { setErr(e.message); } }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm flex-wrap">
        {(["friends", "pending", "sent", "search"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${tab === t ? "bg-accent text-white" : "bg-bg-elevated"}`}>
            {t === "friends" ? `好友 ${friends.length}` : t === "pending" ? `收到的邀請 ${pending.length}` : t === "sent" ? `送出的邀請 ${sent.length}` : <><Search size={14} /> 找人</>}
          </button>
        ))}
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2 text-sm">✅ {msg}</div>}

      {tab === "search" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") search(); }} placeholder="搜尋使用者名稱…" className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
            <button onClick={search} className="px-4 rounded-lg bg-accent text-white text-sm">搜尋</button>
          </div>
          {results.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3">
              <Avatar p={p} /><span className="text-sm flex-1">{nm(p)}</span>
              <button onClick={() => add(p.id)} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white">加好友</button>
            </div>
          ))}
        </div>
      )}
      {tab === "pending" && (
        <div className="space-y-2">
          {pending.length === 0 && <div className="text-sm text-fg-muted text-center py-8">沒有待處理的邀請。</div>}
          {pending.map((f) => (
            <div key={f.id} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3">
              <Avatar p={f.requester} /><span className="text-sm flex-1">{nm(f.requester)}</span>
              <button onClick={() => respond(f.id, true)} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white">接受</button>
              <button onClick={() => respond(f.id, false)} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated">拒絕</button>
            </div>
          ))}
        </div>
      )}
      {tab === "sent" && (
        <div className="space-y-2">
          {sent.length === 0 && <div className="text-sm text-fg-muted text-center py-8">沒有送出中的邀請。</div>}
          {sent.map((f) => (
            <div key={f.id} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3">
              <Avatar p={f.addressee} />
              <span className="text-sm flex-1">{nm(f.addressee)} <span className="text-xs text-fg-muted">· 等待回應</span></span>
              <button onClick={() => cancelSent(f.addressee_id, f.id)} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-red-400">收回</button>
            </div>
          ))}
        </div>
      )}
      {tab === "friends" && (
        <div className="space-y-2">
          {friends.length === 0 && <div className="text-sm text-fg-muted text-center py-8">還沒有好友。到「找人」搜尋並送出邀請。</div>}
          {friends.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3">
              <Avatar p={p} /><span className="text-sm flex-1">{nm(p)}</span>
              <button onClick={() => dm(p.id)} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated hover:text-accent">傳訊息</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

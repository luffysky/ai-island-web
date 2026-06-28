"use client";

import Link from "next/link";
import { useState } from "react";

type Ws = { id: string; name: string; type: "personal" | "studio"; role: string };

async function call(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

export function StudioClient({ initialWorkspaces }: { initialWorkspaces: Ws[] }) {
  const [list, setList] = useState<Ws[]>(initialWorkspaces);
  const [name, setName] = useState("");
  const [redeem, setRedeem] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createStudio() {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try { const { workspace } = await call("/api/creator-island/workspaces", "POST", { name: name.trim() });
      setList((p) => [...p, { ...workspace, role: "owner" }]); setName(""); setMsg("已建立工作室"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function redeemCode() {
    if (!redeem.trim()) return;
    setBusy(true); setErr(null);
    try { const { workspace } = await call(`/api/creator-island/invitations/${encodeURIComponent(redeem.trim())}/redeem`, "POST");
      setList((p) => p.some((w) => w.id === workspace.id) ? p : [...p, { ...workspace, role: "member" as any }]); setRedeem(""); setMsg("已加入工作室"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const studios = list.filter((w) => w.type === "studio");

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏢 工作室</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline">← 回島</Link>
      </header>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2 text-sm">✅ {msg}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="font-bold text-sm">➕ 建立工作室</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="工作室名稱" className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={createStudio} disabled={busy || !name.trim()} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">建立</button>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="font-bold text-sm">🎟️ 用邀請碼加入</div>
          <input value={redeem} onChange={(e) => setRedeem(e.target.value)} placeholder="貼上邀請碼" className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={redeemCode} disabled={busy || !redeem.trim()} className="px-4 py-2 rounded-full bg-bg-elevated text-sm disabled:opacity-40">加入</button>
        </div>
      </div>

      <div className="space-y-3">
        {studios.length === 0 && <div className="text-sm text-fg-muted text-center py-6">還沒有工作室。建立一個、邀請夥伴一起創作。</div>}
        {studios.map((w) => <StudioCard key={w.id} ws={w} onRemoved={() => setList((p) => p.filter((x) => x.id !== w.id))} />)}
      </div>
    </div>
  );
}

function StudioCard({ ws, onRemoved }: { ws: Ws; onRemoved: () => void }) {
  const [members, setMembers] = useState<any[] | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canManage = ws.role === "owner" || ws.role === "manager";

  async function loadMembers() {
    try { const { members } = await call(`/api/creator-island/workspaces/${ws.id}/members`, "GET"); setMembers(members); }
    catch (e: any) { setErr(e.message); }
  }
  async function invite() {
    try { const r = await call(`/api/creator-island/workspaces/${ws.id}/invitations`, "POST", { role: "contributor", maxUses: 10, expiresInDays: 14 }); setCode(r.code); }
    catch (e: any) { setErr(e.message); }
  }
  async function transfer() {
    const to = prompt("輸入要轉移擁有權的成員 userId");
    if (!to) return;
    try { await call(`/api/creator-island/workspaces/${ws.id}/transfer`, "POST", { toUserId: to.trim() }); alert("已轉移"); }
    catch (e: any) { setErr(e.message); }
  }
  async function del() {
    if (!confirm(`刪除工作室「${ws.name}」？`)) return;
    try { await call(`/api/creator-island/workspaces/${ws.id}`, "DELETE"); onRemoved(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-bold flex items-center gap-2">🏢 {ws.name} <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{ws.role}</span></div>
        <div className="flex items-center gap-3 text-xs">
          <a href={`/creator-island?ws=${ws.id}`} className="px-2.5 py-1 rounded-full bg-accent text-white font-bold">進入工作室 →</a>
          <button onClick={loadMembers} className="text-accent">成員</button>
        </div>
      </div>
      {err && <div className="text-xs text-red-400">⚠️ {err}</div>}
      {members && (
        <div className="text-xs text-fg-muted space-y-0.5">
          {members.map((m: any) => <div key={m.user_id}>{m.profile?.display_name || m.profile?.username || m.user_id} · {m.role}</div>)}
        </div>
      )}
      {canManage && (
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={invite} className="px-2.5 py-1 rounded-full bg-bg-elevated hover:text-accent">產生邀請碼</button>
          {ws.role === "owner" && <button onClick={transfer} className="px-2.5 py-1 rounded-full bg-bg-elevated hover:text-accent">轉移擁有權</button>}
          {ws.role === "owner" && <button onClick={del} className="px-2.5 py-1 rounded-full bg-bg-elevated hover:text-red-400">刪除</button>}
        </div>
      )}
      {code && <div className="text-xs bg-bg-elevated rounded-lg p-2">邀請碼（只顯示一次）：<b className="text-accent">{code}</b></div>}
    </div>
  );
}

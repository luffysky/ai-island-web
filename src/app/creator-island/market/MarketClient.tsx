"use client";

import Link from "next/link";
import { useState } from "react";

type Listing = { id: string; asset_id: string; asset_type: string; title: string; description: string; price_z: number };
type Asset = { id: string; type: "fragment" | "work"; title: string };

async function call(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

export function MarketClient({ workspaceId, listings, myAssets }: { workspaceId: string; listings: Listing[]; myAssets: Asset[] }) {
  const [tab, setTab] = useState<"browse" | "sell">("browse");
  const [rows, setRows] = useState<Listing[]>(listings);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // sell form
  const [assetKey, setAssetKey] = useState("");
  const [price, setPrice] = useState("0");

  async function buy(id: string) {
    setErr(null); setMsg(null); setBusy(id);
    try { const r = await call(`/api/creator-island/marketplace/listings/${id}/purchase`, "POST"); setMsg(r.already_owned ? "你已擁有" : `已購買（花 ${r.spent} Z 幣）`); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function act(kind: "like" | "collect" | "fork", l: Listing) {
    setErr(null); setBusy(l.id + kind);
    try {
      if (kind === "like") await call("/api/creator-island/community/like", "POST", { assetId: l.asset_id });
      else if (kind === "collect") await call("/api/creator-island/community/collect", "POST", { assetId: l.asset_id, assetType: l.asset_type });
      else { await call("/api/creator-island/community/fork", "POST", { assetId: l.asset_id, assetType: l.asset_type, toWorkspaceId: workspaceId }); setMsg("已 fork 進你的工作空間"); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function createListing() {
    const a = myAssets.find((x) => `${x.type}:${x.id}` === assetKey);
    if (!a) { setErr("請選一個要上架的碎片/作品"); return; }
    setBusy("sell"); setErr(null);
    try {
      const r = await call("/api/creator-island/marketplace/listings", "POST", { workspaceId, assetId: a.id, assetType: a.type, title: a.title, priceZ: Number(price) || 0 });
      setRows((p) => [r.listing, ...p]); setMsg("已上架"); setTab("browse");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏪 市集 <span className="text-xs font-normal text-fg-muted">Z 幣交易・抽成 0%</span></h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline">← 回島</Link>
      </header>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setTab("browse")} className={`px-3 py-1.5 rounded-full ${tab === "browse" ? "bg-accent text-white" : "bg-bg-elevated"}`}>瀏覽</button>
        <button onClick={() => setTab("sell")} className={`px-3 py-1.5 rounded-full ${tab === "sell" ? "bg-accent text-white" : "bg-bg-elevated"}`}>上架</button>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2 text-sm">✅ {msg}</div>}

      {tab === "sell" && (
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="font-bold text-sm">上架我的碎片 / 作品</div>
          <select value={assetKey} onChange={(e) => setAssetKey(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">選一個…</option>
            {myAssets.map((a) => <option key={`${a.type}:${a.id}`} value={`${a.type}:${a.id}`}>{a.type === "fragment" ? "碎片" : "作品"}｜{a.title}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-28 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
            <span className="text-xs text-fg-muted">Z 幣（0 = 免費分享）</span>
            <button onClick={createListing} disabled={busy === "sell"} className="ml-auto px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">上架</button>
          </div>
        </div>
      )}

      {tab === "browse" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.length === 0 && <div className="text-sm text-fg-muted col-span-2 text-center py-8">還沒有人上架。去「上架」分享你的第一個資產。</div>}
          {rows.map((l) => (
            <div key={l.id} className="bg-bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="font-bold text-sm">{l.title} <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300">{l.asset_type}</span></div>
              {l.description && <div className="text-xs text-fg-muted line-clamp-2">{l.description}</div>}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <button onClick={() => buy(l.id)} disabled={busy === l.id} className="px-3 py-1 rounded-full bg-accent text-white disabled:opacity-40">{l.price_z > 0 ? `購買 ${l.price_z} Z` : "免費取得"}</button>
                <button onClick={() => act("like", l)} className="px-2 py-1 rounded-full bg-bg-elevated hover:text-accent">👍 讚</button>
                <button onClick={() => act("collect", l)} className="px-2 py-1 rounded-full bg-bg-elevated hover:text-accent">🔖 收藏</button>
                <button onClick={() => act("fork", l)} className="px-2 py-1 rounded-full bg-bg-elevated hover:text-accent">🍴 Fork</button>
                <button onClick={async () => { const body = prompt("留言："); if (!body) return; setBusy(l.id + "c"); setErr(null); try { await call("/api/creator-island/community/comments", "POST", { assetId: l.asset_id, assetType: l.asset_type, body }); setMsg("已留言"); } catch (e: any) { setErr(e.message); } finally { setBusy(null); } }} className="px-2 py-1 rounded-full bg-bg-elevated hover:text-accent">💬 留言</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

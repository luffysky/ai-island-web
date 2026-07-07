"use client";

import Link from "next/link";
import { useState } from "react";
import { Store, ArrowLeft, Sparkles, Plus, ThumbsUp, Bookmark, GitFork, MessageCircle, Check, Tag } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { usePrompt } from "@/components/ui/ConfirmDialog";

type Listing = { id: string; workspace_id: string; asset_id: string; asset_type: string; title: string; description: string; price_z: number };
type Asset = { id: string; type: "fragment" | "work"; title: string };

async function call(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

type Pick = { id: string; text: string; category: string; rarity: string };

export function MarketClient({ workspaceId, listings, myAssets, poolPicks = [], ownedAssetIds = [], myWorkspaceIds = [], fruitBalance = 0 }: { workspaceId: string; listings: Listing[]; myAssets: Asset[]; poolPicks?: Pick[]; ownedAssetIds?: string[]; myWorkspaceIds?: string[]; fruitBalance?: number }) {
  const toast = useToast();
  const prompt = usePrompt();
  const [tab, setTab] = useState<"browse" | "sell">("browse");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Listing[]>(listings);
  const [picks, setPicks] = useState<Pick[]>(poolPicks);
  const [owned, setOwned] = useState<Set<string>>(new Set(ownedAssetIds));
  const mine = new Set(myWorkspaceIds);

  async function grabPick(p: Pick) {
    setBusy("pick" + p.id);
    try {
      await call("/api/creator-island/fragments", "POST", { workspaceId, title: p.text, category: p.category, tags: [p.rarity], sourceType: "market_imported" });
      setPicks((arr) => arr.filter((x) => x.id !== p.id)); toast.success("已加到你的島 🌴");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  const [busy, setBusy] = useState<string | null>(null);
  // sell form
  const [assetKey, setAssetKey] = useState("");
  const [price, setPrice] = useState("0");

  async function buy(l: Listing) {
    setBusy(l.id);
    try {
      const r = await call(`/api/creator-island/marketplace/listings/${l.id}/purchase`, "POST");
      setOwned((s) => new Set(s).add(l.asset_id));
      toast.success(r.already_owned ? "你已擁有此資產" : l.price_z > 0 ? `已購買（花 ${r.spent} Z 幣）` : "已免費取得");
    }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function act(kind: "like" | "collect" | "fork", l: Listing) {
    setBusy(l.id + kind);
    try {
      if (kind === "like") { const r = await call("/api/creator-island/community/like", "POST", { assetId: l.asset_id }); setLiked((s) => { const n = new Set(s); r.on ? n.add(l.asset_id) : n.delete(l.asset_id); return n; }); toast.success(r.on ? "已按讚 👍" : "已收回讚"); }
      else if (kind === "collect") { const r = await call("/api/creator-island/community/collect", "POST", { assetId: l.asset_id, assetType: l.asset_type }); setCollected((s) => { const n = new Set(s); r.on ? n.add(l.asset_id) : n.delete(l.asset_id); return n; }); toast.success(r.on ? "已收藏 🔖" : "已取消收藏"); }
      else { await call("/api/creator-island/community/fork", "POST", { assetId: l.asset_id, assetType: l.asset_type, toWorkspaceId: workspaceId }); toast.success("已 fork 進你的工作空間 🍴"); }
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function createListing() {
    const a = myAssets.find((x) => `${x.type}:${x.id}` === assetKey);
    if (!a) { toast.error("請選一個要上架的碎片/作品"); return; }
    setBusy("sell");
    try {
      const r = await call("/api/creator-island/marketplace/listings", "POST", { workspaceId, assetId: a.id, assetType: a.type, title: a.title, priceZ: Number(price) || 0 });
      setRows((p) => [r.listing, ...p]); toast.success("已上架 ✓"); setTab("browse");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold inline-flex items-center gap-1.5"><Store size={20} /> 市集 <span className="text-xs font-normal text-fg-muted">買家付 Z 幣・賣家賺 🌰 果實・抽成 0%</span></h1>
        <div className="inline-flex items-center gap-3">
          <Link href="/creator-island/payout" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-sm font-bold hover:border-amber-500/60 transition" title="創作收入（賣作品賺得）· 點我提現">🌰 {fruitBalance.toLocaleString()} 果實 · 提現</Link>
          <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> 回島</Link>
        </div>
      </header>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setTab("browse")} className={`px-3 py-1.5 rounded-full ${tab === "browse" ? "bg-accent text-white" : "bg-bg-elevated"}`}>瀏覽</button>
        <button onClick={() => setTab("sell")} className={`px-3 py-1.5 rounded-full ${tab === "sell" ? "bg-accent text-white" : "bg-bg-elevated"}`}>上架</button>
      </div>

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

      {tab === "browse" && picks.length > 0 && (
        <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/25 rounded-2xl p-4">
          <div className="text-sm font-bold mb-2 inline-flex items-center gap-1.5"><Sparkles size={14} /> 靈感精選 <span className="text-xs font-normal text-fg-muted">來自全站碎片庫，看到喜歡的就帶回島上</span></div>
          <div className="grid sm:grid-cols-2 gap-2">
            {picks.map((p) => (
              <div key={p.id} className="bg-bg-card/60 rounded-lg px-3 py-2 text-sm flex items-start gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${p.rarity === "SSR" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : p.rarity === "SR" ? "bg-violet-400/20 text-violet-700 dark:text-violet-300" : "bg-bg-elevated text-fg-muted"}`}>{p.rarity}</span>
                <span className="flex-1">{p.text}</span>
                <button onClick={() => grabPick(p)} disabled={busy === "pick" + p.id} className="shrink-0 text-xs text-accent hover:underline disabled:opacity-40 inline-flex items-center gap-1.5"><Plus size={12} />帶走</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "browse" && (
        <div className="grid sm:grid-cols-2 gap-3 max-h-[68vh] overflow-y-auto pr-1">
          {rows.length === 0 && <div className="text-sm text-fg-muted col-span-2 text-center py-8">還沒有人上架。去「上架」分享你的第一個資產。</div>}
          {rows.map((l) => {
            const isMine = mine.has(l.workspace_id);
            const isOwned = owned.has(l.asset_id);
            return (
            <div key={l.id} className="bg-bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="font-bold text-sm">{l.title} <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">{l.asset_type}</span>
                {isMine && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1"><Tag size={10} /> 你的作品</span>}
              </div>
              {l.description && <div className="text-xs text-fg-muted line-clamp-2">{l.description}</div>}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {isMine ? (
                  <span className="px-3 py-1 rounded-full bg-bg-elevated text-fg-muted">你上架的{l.price_z > 0 ? `・${l.price_z} Z` : "・免費"}</span>
                ) : isOwned ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1"><Check size={14} /> 已擁有</span>
                ) : (
                  <button onClick={() => buy(l)} disabled={busy === l.id} className="px-3 py-1 rounded-full bg-accent text-white disabled:opacity-40">{busy === l.id ? "…" : l.price_z > 0 ? `購買 ${l.price_z} Z` : "免費取得"}</button>
                )}
                <button onClick={() => act("like", l)} disabled={busy === l.id + "like"} className={`px-2 py-1 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50 ${liked.has(l.asset_id) ? "bg-accent/20 text-accent" : "bg-bg-elevated hover:text-accent"}`}><ThumbsUp size={14} className={liked.has(l.asset_id) ? "fill-current" : ""} /> 讚</button>
                <button onClick={() => act("collect", l)} disabled={busy === l.id + "collect"} className={`px-2 py-1 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50 ${collected.has(l.asset_id) ? "bg-amber-500/20 text-amber-600 dark:text-amber-300" : "bg-bg-elevated hover:text-accent"}`}><Bookmark size={14} className={collected.has(l.asset_id) ? "fill-current" : ""} /> 收藏</button>
                <button onClick={() => act("fork", l)} disabled={busy === l.id + "fork"} className="px-2 py-1 rounded-full bg-bg-elevated hover:text-accent inline-flex items-center gap-1.5 disabled:opacity-50"><GitFork size={14} /> Fork</button>
                <button onClick={async () => { const body = await prompt({ title: "留言", placeholder: "寫點什麼給作者…", multiline: true, confirmLabel: "送出", required: true }); if (!body) return; setBusy(l.id + "c"); try { await call("/api/creator-island/community/comments", "POST", { assetId: l.asset_id, assetType: l.asset_type, body }); toast.success("已留言 💬"); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); } }} disabled={busy === l.id + "c"} className="px-2 py-1 rounded-full bg-bg-elevated hover:text-accent inline-flex items-center gap-1.5 disabled:opacity-50"><MessageCircle size={14} /> 留言</button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

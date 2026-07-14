"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Loader2, Trash2, Clock, FileText, CheckCircle2, Link2, Megaphone } from "lucide-react";

const PLATFORMS: { key: string; label: string; emoji: string; tier: "green" | "yellow" | "red" }[] = [
  { key: "line", label: "LINE", emoji: "💬", tier: "green" },
  { key: "telegram", label: "Telegram", emoji: "✈️", tier: "green" },
  { key: "discord", label: "Discord", emoji: "🎮", tier: "green" },
  { key: "facebook", label: "Facebook", emoji: "📘", tier: "yellow" },
  { key: "instagram", label: "Instagram", emoji: "📷", tier: "yellow" },
  { key: "threads", label: "Threads", emoji: "🧵", tier: "yellow" },
  { key: "x", label: "X", emoji: "✖️", tier: "yellow" },
  { key: "youtube", label: "YouTube", emoji: "▶️", tier: "yellow" },
  { key: "tiktok", label: "抖音/TikTok", emoji: "🎵", tier: "red" },
  { key: "xiaohongshu", label: "小紅書", emoji: "📕", tier: "red" },
  { key: "dcard", label: "Dcard", emoji: "🗂️", tier: "red" },
];
const TIER_HINT: Record<string, string> = { green: "可最先接真發", yellow: "需該平台 OAuth/審核", red: "無開放 API·只能手動貼" };

type Post = { id: string; content: string; platforms: string[]; status: string; scheduled_at: string | null; source: string; note: string | null; created_at: string };
type Conn = { id: string; provider: string; display_name: string; status: string };

const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  draft: { label: "草稿", cls: "text-fg-muted", Icon: FileText },
  scheduled: { label: "已排程", cls: "text-amber-500", Icon: Clock },
  published: { label: "已發布", cls: "text-emerald-500", Icon: CheckCircle2 },
  failed: { label: "失敗", cls: "text-rose-500", Icon: FileText },
};

export function SocialClient() {
  const [content, setContent] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const [p, c] = await Promise.all([
      fetch("/api/social/posts").then((r) => (r.ok ? r.json() : { posts: [] })).catch(() => ({ posts: [] })),
      fetch("/api/me/connections").then((r) => (r.ok ? r.json() : { connections: [] })).catch(() => ({ connections: [] })),
    ]);
    setPosts(p.posts ?? []);
    setConns(c.connections ?? []);
  };
  useEffect(() => { load(); }, []);

  const connected = new Set(conns.map((c) => c.provider));
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const save = async (action: "draft" | "schedule") => {
    setErr("");
    if (!content.trim()) { setErr("先寫貼文內容"); return; }
    if (picked.size === 0) { setErr("至少選一個平台"); return; }
    if (action === "schedule" && !when) { setErr("排程要選時間"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/social/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platforms: [...picked], action, scheduled_at: when || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "儲存失敗"); return; }
      setContent(""); setPicked(new Set()); setWhen(""); load();
    } catch { setErr("連線失敗"); } finally { setBusy(false); }
  };

  const del = async (id: string) => { await fetch(`/api/social/posts?id=${id}`, { method: "DELETE" }).catch(() => {}); load(); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Megaphone className="text-accent" size={24} /> 社群媒體發布中心</h1>
        <p className="text-sm text-fg-muted mt-1">在一個地方寫、選平台、排程；你自己發或 AI 起草→你批准都走這裡。<Link href={"/settings/connections" as any} className="text-accent inline-flex items-center gap-0.5 hover:underline"><Link2 size={13} /> 連結帳號</Link></p>
      </div>

      {/* 撰稿器 */}
      <section className="surface-glass rounded-2xl p-4 space-y-3">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="想發什麼？（一次寫、多平台發）" className="w-full resize-none rounded-xl border border-border bg-bg/40 px-3 py-2 text-sm outline-none focus:border-accent" />
        <div>
          <div className="text-xs text-fg-muted mb-1.5">發到哪些平台</div>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => {
              const on = picked.has(p.key);
              const conn = connected.has(p.key);
              return (
                <button key={p.key} onClick={() => toggle(p.key)} title={`${TIER_HINT[p.tier]}${conn ? " · 已連結" : " · 未連結"}`}
                  className={`text-xs rounded-full px-2.5 py-1 border transition inline-flex items-center gap-1 ${on ? "bg-accent border-accent text-accent-contrast" : "border-border text-fg-muted hover:bg-bg-elevated"}`}>
                  {p.emoji} {p.label}
                  <span className={`w-1.5 h-1.5 rounded-full ${conn ? "bg-emerald-500" : "bg-fg-dim/40"}`} />
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-fg-dim mt-1.5">🟢 綠點=已連結。實際送出：LINE/TG/Discord 會最先能真發；Meta 系需 OAuth 審核；抖音/小紅書/Dcard 無開放 API（只能存草稿、手動貼）。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-lg border border-border bg-bg/40 px-2 py-1.5 text-xs" />
          <button onClick={() => save("schedule")} disabled={busy} className="text-xs rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 px-3 py-1.5 hover:bg-amber-500/10 disabled:opacity-50 inline-flex items-center gap-1"><Clock size={13} /> 排程</button>
          <button onClick={() => save("draft")} disabled={busy} className="ml-auto text-sm rounded-lg bg-accent text-accent-contrast px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={15} />} 存草稿</button>
        </div>
        {err && <div className="text-xs text-rose-500">{err}</div>}
      </section>

      {/* 貼文列表 */}
      <section>
        <h2 className="text-sm font-semibold mb-2">我的貼文</h2>
        {posts.length === 0 ? (
          <div className="surface-glass rounded-2xl p-6 text-center text-sm text-fg-muted">還沒有貼文。上面寫一則、選平台試試。</div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => {
              const sm = STATUS_META[post.status] ?? STATUS_META.draft;
              return (
                <div key={post.id} className="surface-glass rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${sm.cls}`}><sm.Icon size={12} /> {sm.label}</span>
                    {post.source === "ai" && <span className="text-[10px] px-1.5 rounded-full bg-accent-3/15 text-accent-3">AI 起草</span>}
                    {post.scheduled_at && <span className="text-[11px] text-fg-muted">· {new Date(post.scheduled_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                    <button onClick={() => del(post.id)} className="ml-auto text-fg-dim hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words line-clamp-4">{post.content}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.platforms.map((pk) => { const meta = PLATFORMS.find((x) => x.key === pk); return <span key={pk} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted">{meta?.emoji} {meta?.label ?? pk}</span>; })}
                  </div>
                  {post.note && <p className="text-[10px] text-fg-dim mt-1.5">ℹ️ {post.note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

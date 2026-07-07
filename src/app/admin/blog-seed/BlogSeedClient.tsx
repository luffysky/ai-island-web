"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Send, Check, RefreshCw, Trash2, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Persona = { id: string; username: string; display_name: string };
type Draft = { title: string; summary: string; content: string; tags: string[]; category: string; authorId: string; published?: string };

const ANGLES = [
  { id: "beginner", label: "新手/國中生角度" },
  { id: "dev_diary", label: "開發日記/心得" },
  { id: "howto", label: "實用教學/速查" },
];

export function BlogSeedClient({ personas }: { personas: Persona[] }) {
  const toast = useToast();
  const [angle, setAngle] = useState("beginner");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(3);
  const [defaultAuthor, setDefaultAuthor] = useState(personas[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/blog-seed/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() || undefined, count, angle }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "生成失敗");
      setDrafts((j.drafts as any[]).map((d) => ({
        title: d.title ?? "", summary: d.summary ?? "", content: d.content ?? "",
        tags: Array.isArray(d.tags) ? d.tags : [], category: "", authorId: defaultAuthor,
      })));
      toast.success(`生了 ${j.drafts.length} 篇草稿`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  function addManual() {
    setDrafts((d) => [{ title: "", summary: "", content: "<p></p>", tags: [], category: "", authorId: defaultAuthor }, ...d]);
  }
  function patch(i: number, p: Partial<Draft>) { setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...p } : x))); }
  function remove(i: number) { setDrafts((d) => d.filter((_, k) => k !== i)); }

  async function publish(i: number) {
    const d = drafts[i];
    if (!d.authorId || !d.title.trim() || !d.content.trim()) { toast.error("缺 作者 / 標題 / 內文"); return; }
    patch(i, { published: "publishing" });
    try {
      const res = await fetch("/api/admin/blog-seed/publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId: d.authorId, title: d.title, summary: d.summary, content: d.content, tags: d.tags, category: d.category || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "發佈失敗");
      patch(i, { published: j.href ?? "ok" });
      toast.success("已發佈 ✓");
    } catch (e: any) { toast.error(e.message); patch(i, { published: undefined }); }
  }

  return (
    <div className="space-y-5">
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">預設作者
            <select value={defaultAuthor} onChange={(e) => setDefaultAuthor(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm">
              {personas.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </label>
          <label className="text-sm">篇數
            <input type="number" min={1} max={6} value={count} onChange={(e) => setCount(Math.max(1, Math.min(6, Number(e.target.value) || 3)))} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="text-xs text-fg-muted w-full">角度</div>
          {ANGLES.map((a) => <button key={a.id} onClick={() => setAngle(a.id)} className={`text-xs px-3 py-1.5 rounded-full border ${angle === a.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated"}`}>{a.label}</button>)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="主題方向（可選，例：Python 爬蟲、前端切版、學習心態）" className="flex-1 min-w-[200px] bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={addManual} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-sm hover:border-accent"><Plus size={14} /> 手動新增</button>
          <button onClick={generate} disabled={busy} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-black font-bold disabled:opacity-40">
            {busy ? <><Loader2 size={16} className="animate-spin" /> 生成中…</> : <><Sparkles size={16} /> AI 生成</>}
          </button>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">草稿（{drafts.length}）· 審核 / 編輯後發</div>
            <button onClick={generate} disabled={busy} className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1"><RefreshCw size={12} /> 重生成</button>
          </div>
          {drafts.map((d, i) => {
            const done = d.published && d.published !== "publishing";
            return (
              <div key={i} className={`bg-bg-card border rounded-2xl p-4 space-y-2 ${done ? "border-emerald-500/40 opacity-90" : "border-border"}`}>
                <input value={d.title} onChange={(e) => patch(i, { title: e.target.value })} disabled={!!done} placeholder="標題" className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-accent/40 pb-1" />
                <input value={d.summary} onChange={(e) => patch(i, { summary: e.target.value })} disabled={!!done} placeholder="一句話摘要" className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-xs outline-none" />
                <textarea value={d.content} onChange={(e) => patch(i, { content: e.target.value })} disabled={!!done} rows={6} placeholder="內文（HTML）" className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-accent/50" />
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={d.tags.join("、")} onChange={(e) => patch(i, { tags: e.target.value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) })} disabled={!!done} placeholder="標籤（、分隔）" className="flex-1 min-w-[120px] bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
                  <input value={d.category} onChange={(e) => patch(i, { category: e.target.value })} disabled={!!done} placeholder="分類" className="w-28 bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
                  <select value={d.authorId} onChange={(e) => patch(i, { authorId: e.target.value })} disabled={!!done} className="bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs">
                    {personas.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {done ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Check size={13} /> 已發佈
                      {d.published !== "ok" && <Link href={d.published!} target="_blank" className="ml-1 underline inline-flex items-center gap-0.5">看文章 <ExternalLink size={11} /></Link>}
                    </span>
                  ) : (<>
                    <button onClick={() => remove(i)} className="text-xs text-fg-muted hover:text-red-400 inline-flex items-center gap-1"><Trash2 size={12} /> 丟棄</button>
                    <button onClick={() => publish(i)} disabled={d.published === "publishing"} className="text-xs px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1 disabled:opacity-40">
                      {d.published === "publishing" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} 發佈文章
                    </button>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

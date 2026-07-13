"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wand2, Loader2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

const KINDS = [
  { key: "elevator", label: "30 秒電梯簡報" },
  { key: "pitch", label: "Pitch 簡報大綱" },
  { key: "bizplan", label: "一頁商業計畫" },
  { key: "intro", label: "報名自我介紹" },
];

// AI 生成報名素材：選類型 + 描述作品 → 產出可編輯草稿。
export function GenerateMaterials({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("elevator");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (loading || !about.trim()) { if (!about.trim()) setErr("先描述你的作品／身分／目標"); return; }
    setLoading(true); setErr(""); setDraft("");
    try {
      const r = await fetch(`/api/opportunities/${id}/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about: about.trim(), kind }),
      });
      const d = await r.json();
      if (r.status === 401) { window.location.href = `/login?next=/opportunities/${id}`; return; }
      if (!r.ok) { setErr(d.error ?? "生成失敗"); return; }
      setDraft(d.draft ?? "");
    } catch { setErr("連線失敗，稍後再試"); } finally { setLoading(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  };

  return (
    <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <Wand2 className="w-4 h-4" /> AI 生成報名素材
        <span className="ml-auto text-xs text-black/40 dark:text-white/40 inline-flex items-center gap-1">{open ? <>收起 <ChevronUp className="w-3.5 h-3.5" /></> : <>展開 <ChevronDown className="w-3.5 h-3.5" /></>}</span>
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {KINDS.map((k) => (
              <button key={k.key} onClick={() => setKind(k.key)} className={`text-xs rounded-full px-2.5 py-1 border ${kind === k.key ? "bg-amber-600 border-amber-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>{k.label}</button>
            ))}
          </div>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3}
            placeholder="描述你的作品／身分／目標，AI 依這個生成。例：我做了一個給國中生的 AI 學習網站，已有 Demo 和 200 位使用者。"
            className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500 resize-none mb-2" />
          <div className="flex justify-end">
            <button onClick={run} disabled={loading || !about.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white px-3.5 py-1.5 text-sm font-medium">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {draft ? "重新生成" : "生成草稿"}
            </button>
          </div>
          {err && <p className="text-xs text-rose-500 mt-2">{err}</p>}
          {draft && (
            <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-3">
              <div className="flex justify-end mb-1">
                <button onClick={copy} className="inline-flex items-center gap-1 text-[11px] text-black/50 dark:text-white/50 hover:text-amber-600 dark:hover:text-amber-400">
                  {copied ? <><Check className="w-3.5 h-3.5" /> 已複製</> : <><Copy className="w-3.5 h-3.5" /> 複製</>}
                </button>
              </div>
              <div className="text-sm prose-sm max-w-none [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
              </div>
              <p className="text-[11px] text-black/40 dark:text-white/40 mt-2">這是 AI 草稿、請自行核對修改後再使用。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Save, Check, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Draft = {
  title: string; concept: string; intro: string; hint: string; expect: string;
  starter: string; parLines: number; xp: number; z: number; chapterId?: string;
  saved?: string; // level_id after save
};
type Existing = { level_id: string; title: string; concept: string; xp: number; z: number; created_at: string };

const DIFFS = [{ id: "easy", label: "簡單" }, { id: "medium", label: "中等" }, { id: "hard", label: "較難" }];

export function QuestLevelGenClient({ existing }: { existing: Existing[] }) {
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState("easy");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/quest-levels/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() || undefined, count, difficulty }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "生成失敗");
      setDrafts((j.levels as any[]).map((l) => ({
        title: l.title ?? "", concept: l.concept ?? "", intro: l.intro ?? "", hint: l.hint ?? "",
        expect: String(l.expect ?? ""), starter: l.starter ?? "", parLines: Number(l.parLines) || 4,
        xp: Number(l.xp) || 14, z: Number(l.z) || 7,
      })));
      toast.success(`生了 ${j.levels.length} 關草稿`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  function patch(i: number, p: Partial<Draft>) { setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...p } : x))); }
  function remove(i: number) { setDrafts((d) => d.filter((_, k) => k !== i)); }

  async function save(i: number) {
    const d = drafts[i];
    if (!d.title.trim() || !d.hint.trim() || !d.expect.trim()) { toast.error("缺 標題 / 參考解答 / 預期輸出"); return; }
    patch(i, { saved: "saving" });
    try {
      const res = await fetch("/api/admin/quest-levels/save", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: d }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "存檔失敗");
      patch(i, { saved: j.levelId });
      toast.success("已存進遊戲 ✓");
    } catch (e: any) { toast.error(e.message); patch(i, { saved: undefined }); }
  }

  return (
    <div className="space-y-5">
      {/* 生成設定 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="主題方向（可選，例：字串處理、費氏數列、九九乘法）" className="flex-1 min-w-[220px] bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <label className="text-sm text-fg-muted inline-flex items-center gap-1">關數
            <input type="number" min={1} max={6} value={count} onChange={(e) => setCount(Math.max(1, Math.min(6, Number(e.target.value) || 3)))} className="w-16 bg-bg-elevated border border-border rounded-lg px-2 py-2 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-fg-muted">難度</span>
          {DIFFS.map((d) => <button key={d.id} onClick={() => setDifficulty(d.id)} className={`text-xs px-3 py-1.5 rounded-full border ${difficulty === d.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated"}`}>{d.label}</button>)}
          <button onClick={generate} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-black font-bold disabled:opacity-40">
            {busy ? <><Loader2 size={16} className="animate-spin" /> 生成中…</> : <><Sparkles size={16} /> 生成草稿</>}
          </button>
        </div>
        <p className="text-[11px] text-fg-muted">⚠️ 存檔前請點「參考解答」比對「預期輸出」是否一致（AI 偶爾會算錯）。存好即上線、學員通關會發 XP/Z 幣。</p>
      </div>

      {/* 草稿審核 */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">草稿（{drafts.length}）· 審核 / 編輯後存</div>
            <button onClick={generate} disabled={busy} className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1"><RefreshCw size={12} /> 重生成</button>
          </div>
          {drafts.map((d, i) => {
            const done = d.saved && d.saved !== "saving";
            return (
              <div key={i} className={`bg-bg-card border rounded-2xl p-4 space-y-2 ${done ? "border-emerald-500/40 opacity-90" : "border-border"}`}>
                <div className="flex items-center gap-2">
                  <input value={d.title} onChange={(e) => patch(i, { title: e.target.value })} disabled={!!done} placeholder="標題" className="flex-1 bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-accent/40 pb-1" />
                  <input value={d.concept} onChange={(e) => patch(i, { concept: e.target.value })} disabled={!!done} placeholder="觀念" className="w-32 bg-bg-elevated border border-border rounded px-2 py-1 text-xs" />
                </div>
                <textarea value={d.intro} onChange={(e) => patch(i, { intro: e.target.value })} disabled={!!done} rows={2} placeholder="題目說明" className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-accent/50" />
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-fg-muted mb-1">參考解答（hint）</div>
                    <textarea value={d.hint} onChange={(e) => patch(i, { hint: e.target.value })} disabled={!!done} rows={5} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <div className="text-[11px] text-fg-muted mb-1">預期輸出（expect）</div>
                    <textarea value={d.expect} onChange={(e) => patch(i, { expect: e.target.value })} disabled={!!done} rows={5} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-accent/50" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-fg-muted mb-1">起手 code（starter）</div>
                  <textarea value={d.starter} onChange={(e) => patch(i, { starter: e.target.value })} disabled={!!done} rows={2} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-accent/50" />
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <label className="inline-flex items-center gap-1 text-fg-muted">par<input type="number" min={1} max={20} value={d.parLines} onChange={(e) => patch(i, { parLines: Number(e.target.value) || 4 })} disabled={!!done} className="w-14 bg-bg-elevated border border-border rounded px-1.5 py-1" /></label>
                  <label className="inline-flex items-center gap-1 text-fg-muted">xp<input type="number" min={1} max={50} value={d.xp} onChange={(e) => patch(i, { xp: Number(e.target.value) || 14 })} disabled={!!done} className="w-14 bg-bg-elevated border border-border rounded px-1.5 py-1" /></label>
                  <label className="inline-flex items-center gap-1 text-fg-muted">z<input type="number" min={0} max={30} value={d.z} onChange={(e) => patch(i, { z: Number(e.target.value) || 7 })} disabled={!!done} className="w-14 bg-bg-elevated border border-border rounded px-1.5 py-1" /></label>
                  <label className="inline-flex items-center gap-1 text-fg-muted">章節#<input value={d.chapterId ?? ""} onChange={(e) => patch(i, { chapterId: e.target.value })} disabled={!!done} placeholder="選填" className="w-16 bg-bg-elevated border border-border rounded px-1.5 py-1" /></label>
                  <div className="ml-auto flex items-center gap-2">
                    {done ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Check size={13} /> 已存
                        <Link href={`/quest/number/${d.saved}`} target="_blank" className="ml-1 underline inline-flex items-center gap-0.5">試玩 <ExternalLink size={11} /></Link>
                      </span>
                    ) : (<>
                      <button onClick={() => remove(i)} className="text-fg-muted hover:text-red-400 inline-flex items-center gap-1"><Trash2 size={12} /> 丟棄</button>
                      <button onClick={() => save(i)} disabled={d.saved === "saving"} className="px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1 disabled:opacity-40">
                        {d.saved === "saving" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} 存進遊戲
                      </button>
                    </>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 已上線的 AI 關卡 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <div className="text-sm font-bold mb-2">已上線的 AI 數字關（{existing.length}）</div>
        {existing.length === 0 ? (
          <div className="text-xs text-fg-muted">還沒有。上面生幾關存進去吧。</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {existing.map((e) => (
              <Link key={e.level_id} href={`/quest/number/${e.level_id}`} target="_blank" className="flex items-center justify-between gap-2 text-sm bg-bg-elevated rounded-lg px-3 py-2 hover:text-accent">
                <span className="truncate">{e.title} <span className="text-[11px] text-fg-muted">· {e.concept}</span></span>
                <span className="text-[11px] text-fg-muted shrink-0">+{e.xp}XP</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

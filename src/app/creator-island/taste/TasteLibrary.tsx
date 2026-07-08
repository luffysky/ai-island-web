"use client";

import { useEffect, useState } from "react";
import { Heart, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Mem = { id: string; kind: string; text: string; status: string; source: string; created_at?: string };

/**
 * 品味庫：創作者把「喜歡的作品／風格／句子／參考」餵給 AI。
 * 存成 personal scope 的 ci_memories（kind='taste'）→ getInjectableMemory 會自動把它們當「背景偏好」
 * 注入到編織/演化/凝聚等所有 AI 動作，讓 AI 產出越來越貼創作者的品味。
 */
export function TasteLibrary() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Mem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/creator-island/memory?scope=personal");
      const j = await r.json();
      setItems((j.memories ?? []) as Mem[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const val = text.trim();
    if (!val || adding) return;
    setAdding(true);
    try {
      const r = await fetch("/api/creator-island/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "personal", kind: "taste", text: val }),
      });
      const j = await r.json();
      if (j.memory) { setItems((p) => [j.memory as Mem, ...p]); setText(""); toast.success("已加入品味庫，AI 之後創作會參考 ✨"); }
      else toast.error("加入失敗，請再試一次");
    } catch { toast.error("加入失敗，請再試一次"); } finally { setAdding(false); }
  };

  const del = async (id: string) => {
    if (!(await confirm({ title: "從品味庫移除？", description: "AI 之後就不會再參考這一項。", confirmLabel: "移除", destructive: true }))) return;
    setItems((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/creator-island/memory/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-5">
      {/* 說明 */}
      <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4 text-sm text-fg-muted leading-relaxed">
        把你<b className="text-fg">喜歡的作品、風格、句子、參考</b>放進來（例如「我喜歡像村上春樹那種淡淡的疏離感」「偏好短句、留白多」「愛用海與季節的意象」）。
        AI 在<b className="text-fg">編織 / 演化 / 凝聚</b>時會把這些當背景偏好，產出越來越貼近你的品味。
      </div>

      {/* 新增 */}
      <div className="rounded-2xl border border-border bg-bg-card p-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add(); }}
          placeholder="貼上你喜歡的一段文字、或描述你偏好的風格…（Ctrl/⌘ + Enter 加入）"
          rows={3}
          className="w-full bg-bg border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={add}
            disabled={!text.trim() || adding}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition"
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} 加入品味庫
          </button>
        </div>
      </div>

      {/* 清單 */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-accent" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-fg-muted">
          <Heart size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">品味庫還是空的。加入第一個喜好，讓 AI 開始懂你。</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-fg-muted inline-flex items-center gap-1"><Sparkles size={12} /> 目前 {items.length} 項偏好，AI 創作時自動參考</div>
          {items.map((m) => (
            <div key={m.id} className="group flex items-start gap-2 rounded-xl border border-border bg-bg-card p-3">
              <span className="shrink-0 mt-0.5 text-pink-400"><Heart size={14} className="fill-current" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                {m.status === "candidate" && <span className="text-[10px] text-amber-500">· AI 推測、待你確認</span>}
              </div>
              <button onClick={() => del(m.id)} title="移除" className="shrink-0 text-fg-muted hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

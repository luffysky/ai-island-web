"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CREATION_TYPES, getType } from "./engine-types";
import { IslandChat } from "../IslandChat";

type Draft = { id: string; work_type: string; title: string; word_count: number; status: string; updated_at: string; series_id?: string | null };
type Series = { id: string; kind: string; title: string; category: string };

export function CreatePicker({ workspaceId, drafts, series = [] }: { workspaceId: string; drafts: Draft[]; series?: Series[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function startNew(workType: string) {
    setErr(null); setBusy(workType);
    try {
      const r = await fetch("/api/creator-island/drafts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workType, title: "未命名草稿" }),
      }).then((x) => x.json());
      if (!r.draft) throw new Error(r.message || "建立失敗");
      router.push(`/creator-island/create/${r.draft.id}`);
    } catch (e: any) { setErr(e.message); setBusy(null); }
  }

  return (
    <div className="space-y-7">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}

      {/* 開新創作 */}
      <section>
        <div className="text-sm font-bold text-fg-muted mb-3">🆕 開始一個新創作</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CREATION_TYPES.map((t) => (
            <motion.button key={t.key} onClick={() => startNew(t.key)} disabled={busy !== null}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
              className="text-left rounded-2xl p-4 bg-bg-card border border-border hover:border-accent/60 transition disabled:opacity-50 group">
              <div className="text-3xl">{t.emoji}</div>
              <div className="font-bold mt-2 group-hover:text-accent transition">{t.label}</div>
              <div className="text-[11px] text-fg-muted mt-1 leading-relaxed line-clamp-3">{t.blurb}</div>
              {busy === t.key && <div className="text-[11px] text-accent mt-1 animate-pulse">建立中…</div>}
            </motion.button>
          ))}
        </div>
      </section>

      {/* 系列 / 專輯（依分類分組） */}
      {series.length > 0 && (() => {
        const byCat: Record<string, Series[]> = {};
        series.forEach((s) => { (byCat[s.category || "未分類"] ??= []).push(s); });
        return (
          <section>
            <div className="text-sm font-bold text-fg-muted mb-3">📚 系列 / 💿 專輯（依分類）</div>
            <div className="space-y-4">
              {Object.entries(byCat).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-xs font-bold text-accent mb-1.5">🏷 {cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((s) => {
                      const items = drafts.filter((d) => d.series_id === s.id);
                      return (
                        <div key={s.id} className="rounded-xl border border-border bg-bg-card p-3">
                          <div className="font-bold text-sm flex items-center gap-1.5">
                            <span>{s.kind === "album" ? "💿" : "📚"}</span><span className="truncate">{s.title}</span>
                            <span className="ml-auto text-[11px] text-fg-muted shrink-0">{items.length} 篇</span>
                          </div>
                          {items.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {items.map((d) => (
                                <li key={d.id}>
                                  <button onClick={() => router.push(`/creator-island/create/${d.id}`)}
                                    className="w-full text-left text-xs text-fg-muted hover:text-accent truncate flex items-center gap-1.5">
                                    <span>{getType(d.work_type).emoji}</span><span className="truncate">{d.title || "未命名草稿"}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* 我的草稿 */}
      <section>
        <div className="text-sm font-bold text-fg-muted mb-3">📂 繼續未完成的草稿（{drafts.length}）</div>
        {drafts.length === 0 ? (
          <div className="text-sm text-fg-muted bg-bg-card border border-border rounded-2xl p-6 text-center">還沒有草稿。從上面挑一種開始，或在島上「編織」後一鍵導入。</div>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => {
              const t = getType(d.work_type);
              return (
                <li key={d.id}>
                  <button onClick={() => router.push(`/creator-island/create/${d.id}`)}
                    className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-3 bg-bg-card border border-border hover:border-accent/50 transition">
                    <span className="text-2xl shrink-0">{t.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold block truncate">{d.title || "未命名草稿"}</span>
                      <span className="text-xs text-fg-muted">{t.label} · {d.word_count} 字 · {new Date(d.updated_at).toLocaleDateString("zh-TW")}{d.status === "published" && " · 已發布"}</span>
                    </span>
                    <span className="text-accent text-sm shrink-0">開啟 →</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <IslandChat workspaceId={workspaceId} />
    </div>
  );
}

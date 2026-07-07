"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Library, Disc3, Tag, FolderOpen, Sparkles } from "lucide-react";
import { CREATION_TYPES, getType } from "./engine-types";
import { IslandChat } from "../IslandChat";

type Draft = { id: string; work_type: string; title: string; word_count: number; status: string; updated_at: string; series_id?: string | null };
type Series = { id: string; kind: string; title: string; category: string };

export function CreatePicker({ workspaceId, drafts, series = [] }: { workspaceId: string; drafts: Draft[]; series?: Series[] }) {
  const router = useRouter();
  const tr = useTranslations("creator");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function startNew(workType: string) {
    setErr(null); setBusy(workType);
    try {
      const r = await fetch("/api/creator-island/drafts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workType, title: tr("createUntitledDraft") }),
      }).then((x) => x.json());
      if (!r.draft) throw new Error(r.message || tr("createCreateFailed"));
      router.push(`/creator-island/create/${r.draft.id}`);
    } catch (e: any) { setErr(e.message); setBusy(null); }
  }

  return (
    <div className="space-y-7">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm">{err}</div>}

      {/* 開新創作 */}
      <section>
        <div className="text-sm font-bold text-fg-muted mb-3 inline-flex items-center gap-1.5"><Sparkles size={14} /> {tr("createStartNew")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CREATION_TYPES.map((t) => (
            <motion.button key={t.key} onClick={() => startNew(t.key)} disabled={busy !== null}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
              className="text-left rounded-2xl p-4 bg-bg-card border border-border hover:border-accent/60 transition disabled:opacity-50 group">
              <t.icon size={30} className="text-accent" />
              <div className="font-bold mt-2 group-hover:text-accent transition">{t.label}</div>
              <div className="text-[11px] text-fg-muted mt-1 leading-relaxed line-clamp-3">{t.blurb}</div>
              {busy === t.key && <div className="text-[11px] text-accent mt-1 animate-pulse">{tr("createCreating")}</div>}
            </motion.button>
          ))}
        </div>
      </section>

      {/* 系列 / 專輯（依分類分組） */}
      {series.length > 0 && (() => {
        const byCat: Record<string, Series[]> = {};
        series.forEach((s) => { (byCat[s.category || tr("createUncategorized")] ??= []).push(s); });
        return (
          <section>
            <div className="text-sm font-bold text-fg-muted mb-3 inline-flex items-center gap-1.5"><Library size={14} /> {tr("createSeries")} / <Disc3 size={14} /> {tr("createAlbumsByCategory")}</div>
            <div className="space-y-4">
              {Object.entries(byCat).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-xs font-bold text-accent mb-1.5 inline-flex items-center gap-1"><Tag size={12} /> {cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((s) => {
                      const items = drafts.filter((d) => d.series_id === s.id);
                      return (
                        <div key={s.id} className="rounded-xl border border-border bg-bg-card p-3">
                          <div className="font-bold text-sm flex items-center gap-1.5">
                            {s.kind === "album" ? <Disc3 size={14} className="shrink-0" /> : <Library size={14} className="shrink-0" />}<span className="truncate">{s.title}</span>
                            <span className="ml-auto text-[11px] text-fg-muted shrink-0">{tr("createPiecesCount", { n: items.length })}</span>
                          </div>
                          {items.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {items.map((d) => {
                                const DraftIcon = getType(d.work_type).icon;
                                return (
                                <li key={d.id}>
                                  <button onClick={() => router.push(`/creator-island/create/${d.id}`)}
                                    className="w-full text-left text-xs text-fg-muted hover:text-accent truncate flex items-center gap-1.5">
                                    <DraftIcon size={13} className="shrink-0" /><span className="truncate">{d.title || tr("createUntitledDraft")}</span>
                                  </button>
                                </li>
                                );
                              })}
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
        <div className="text-sm font-bold text-fg-muted mb-3 inline-flex items-center gap-1.5"><FolderOpen size={14} /> {tr("createContinueDrafts", { n: drafts.length })}</div>
        {drafts.length === 0 ? (
          <div className="text-sm text-fg-muted bg-bg-card border border-border rounded-2xl p-6 text-center">{tr("createNoDrafts")}</div>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => {
              const t = getType(d.work_type);
              return (
                <li key={d.id}>
                  <button onClick={() => router.push(`/creator-island/create/${d.id}`)}
                    className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-3 bg-bg-card border border-border hover:border-accent/50 transition">
                    <t.icon size={24} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="font-bold block truncate">{d.title || tr("createUntitledDraft")}</span>
                      <span className="text-xs text-fg-muted">{t.label} · {tr("createWordsCount", { n: d.word_count })} · {new Date(d.updated_at).toLocaleDateString("zh-TW")}{d.status === "published" && ` · ${tr("createPublished")}`}</span>
                    </span>
                    <span className="text-accent text-sm shrink-0">{tr("createOpen")} →</span>
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

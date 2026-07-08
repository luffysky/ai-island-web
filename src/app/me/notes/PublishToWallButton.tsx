"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, X, Check, Loader2, Plus, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/**
 * 把筆記發佈到「公開筆記牆」(/notes/public)：發佈時先選分類，分類清單最後有「自訂新增」。
 * 已公開的可改分類 / 取消公開。
 */
export function PublishToWallButton({
  noteId,
  isPublic: initialPublic,
  category: initialCategory,
}: {
  noteId: string;
  isPublic?: boolean | null;
  category?: string | null;
}) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(!!initialPublic);
  const [cats, setCats] = useState<string[]>([]);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [customMode, setCustomMode] = useState(false);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    fetch("/api/notes/public-categories").then((r) => r.json()).then((j) => setCats(j.categories ?? [])).catch(() => {});
  }, [open]);

  const finalCategory = customMode ? custom.trim() : category.trim();

  const doPublish = async (publish: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/me/notes/${noteId}/publish-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: publish, category: publish ? finalCategory || undefined : undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message || "操作失敗"); return; }
      setIsPublic(publish);
      toast.success(publish ? "已發佈到筆記牆 🌐" : "已取消公開", publish ? { action: { label: "看筆記牆", onClick: () => { window.location.href = "/notes/public"; } } } : undefined);
      setOpen(false);
    } catch { toast.error("操作失敗，請再試一次"); } finally { setBusy(false); }
  };

  const dialog = open && (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && setOpen(false)}>
      <div className="w-full max-w-sm bg-bg-card border border-border rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold inline-flex items-center gap-2"><Globe size={16} className="text-accent" /> 發佈到筆記牆</h3>
          <button onClick={() => setOpen(false)} className="text-fg-muted hover:text-fg"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-fg-muted">公開後會出現在 <a href="/notes/public" target="_blank" className="text-accent hover:underline inline-flex items-center gap-0.5">筆記牆 <ExternalLink size={10} /></a>，其他人看得到（可隨時取消）。先選一個分類：</p>

          {!customMode ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)} className={`text-xs px-2.5 py-1 rounded-full border transition ${category === c ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:border-accent"}`}>📁 {c}</button>
                ))}
                <button type="button" onClick={() => { setCustomMode(true); setCustom(""); }} className="text-xs px-2.5 py-1 rounded-full border border-dashed border-accent/50 text-accent hover:bg-accent/10 inline-flex items-center gap-1"><Plus size={11} /> 自訂新增</button>
              </div>
              {cats.length === 0 && <p className="text-[11px] text-fg-muted">還沒有分類，點「自訂新增」建一個。</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="輸入新分類名稱…" className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent" />
              <button type="button" onClick={() => { setCustomMode(false); setCustom(""); }} className="text-xs text-fg-muted hover:text-fg">用現有</button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => doPublish(true)} disabled={busy || !finalCategory} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 transition active:scale-95">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />} {isPublic ? "更新分類" : "發佈"}
            </button>
            {isPublic && (
              <button onClick={() => doPublish(false)} disabled={busy} className="px-3 py-2 rounded-lg border border-border text-sm text-fg-muted hover:text-red-400 hover:border-red-400/50 transition">取消公開</button>
            )}
          </div>
          {!finalCategory && <p className="text-[11px] text-amber-500">請先選或新增一個分類再發佈。</p>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition ${isPublic ? "border-accent/40 bg-accent/10 text-accent" : "border-black/15 text-black/50 hover:text-black/80 hover:border-black/30"}`}
        title={isPublic ? "已在筆記牆公開，點可改分類 / 取消" : "發佈到公開筆記牆"}
      >
        {isPublic ? <><Check size={11} /> 已公開</> : <><Globe size={11} /> 發佈到筆記牆</>}
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}

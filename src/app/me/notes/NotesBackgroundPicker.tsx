"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Palette, Upload, Loader2, Check, X } from "lucide-react";
import { NOTES_BG_PRESETS, type NotesBgConfig } from "@/lib/notes-background";

const GROUPS = ["純色", "漸層", "圖樣"] as const;
const GROUP_KEY: Record<(typeof GROUPS)[number], string> = { "純色": "bgSolid", "漸層": "bgGradient", "圖樣": "bgPattern" };

export function NotesBackgroundPicker({
  cfg,
  onChange,
}: {
  cfg: NotesBgConfig;
  onChange: (c: NotesBgConfig) => void;
}) {
  const t = useTranslations("notes");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  // 開啟時鎖背景捲動 + Esc 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "notes-bg");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.url) onChange({ ...cfg, preset: "image", imageUrl: j.url });
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm hover:border-accent transition"
      >
        <Palette size={15} /> {t("background")}
      </button>

      {/* 懸浮視窗（置中 modal + 遮罩，portal 到 body，不再疊在卡片上破版） */}
      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md max-h-[85vh] overflow-auto rounded-2xl border border-border bg-bg-card p-4 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold inline-flex items-center gap-1.5"><Palette size={16} /> {t("background")}</h3>
              <button onClick={() => setOpen(false)} className="text-fg-muted hover:text-fg transition" aria-label={t("close")}>
                <X size={18} />
              </button>
            </div>

            {GROUPS.map((g) => (
              <div key={g}>
                <div className="text-xs text-fg-muted mb-1.5">{t(GROUP_KEY[g])}</div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {NOTES_BG_PRESETS.filter((p) => p.group === g).map((p) => {
                    const sel = cfg.preset === p.id;
                    const hasBg = !!(p.style.background || p.style.backgroundImage || p.style.backgroundColor);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onChange({ ...cfg, preset: p.id })}
                        title={p.label}
                        className={`relative aspect-square w-full rounded-lg border overflow-hidden transition ${sel ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-accent/60"}`}
                        style={hasBg ? p.style : { background: "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px" }}
                      >
                        {sel && <Check size={14} className="absolute inset-0 m-auto text-accent drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 自訂圖片 */}
            <div>
              <div className="text-xs text-fg-muted mb-1.5">{t("customImage")}</div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:border-accent disabled:opacity-50 ${cfg.preset === "image" ? "border-accent" : "border-border"}`}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {cfg.preset === "image" ? t("changeBgImage") : t("uploadBgImage")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {/* 液態玻璃 */}
            <div className="border-t border-border pt-3">
              <label className="flex items-center justify-between text-sm cursor-pointer">
                <span className="flex items-center gap-1.5">🫧 {t("liquidGlass")}</span>
                <input
                  type="checkbox"
                  checked={cfg.glass}
                  onChange={(e) => onChange({ ...cfg, glass: e.target.checked })}
                />
              </label>
              <p className="text-[11px] text-fg-muted mt-1">{t("liquidGlassHint")}</p>
              {cfg.glass && (
                <div className="mt-2">
                  <div className="text-xs text-fg-muted mb-1">{t("glassIntensity", { n: Math.round(cfg.glassOpacity * 100) })}</div>
                  <input
                    type="range"
                    min={0}
                    max={0.8}
                    step={0.05}
                    value={cfg.glassOpacity}
                    onChange={(e) => onChange({ ...cfg, glassOpacity: Number(e.target.value) })}
                    className="w-full accent-accent"
                  />
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

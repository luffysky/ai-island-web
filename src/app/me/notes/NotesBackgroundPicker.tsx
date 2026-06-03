"use client";

import { useRef, useState } from "react";
import { Palette, Upload, Loader2, Check } from "lucide-react";
import { NOTES_BG_PRESETS, type NotesBgConfig } from "@/lib/notes-background";

const GROUPS = ["純色", "漸層", "圖樣"] as const;

export function NotesBackgroundPicker({
  cfg,
  onChange,
}: {
  cfg: NotesBgConfig;
  onChange: (c: NotesBgConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm hover:border-accent transition"
      >
        <Palette size={15} /> 背景
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-[300px] space-y-3 rounded-2xl border border-border bg-bg-card p-3 shadow-xl">
            {GROUPS.map((g) => (
              <div key={g}>
                <div className="text-xs text-fg-muted mb-1.5">{g}</div>
                <div className="flex flex-wrap gap-1.5">
                  {NOTES_BG_PRESETS.filter((p) => p.group === g).map((p) => {
                    const sel = cfg.preset === p.id;
                    const hasBg = !!(p.style.background || p.style.backgroundImage || p.style.backgroundColor);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onChange({ ...cfg, preset: p.id })}
                        title={p.label}
                        className={`relative w-10 h-10 rounded-lg border overflow-hidden ${sel ? "border-accent ring-2 ring-accent/40" : "border-border"}`}
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
              <div className="text-xs text-fg-muted mb-1.5">自訂圖片</div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:border-accent disabled:opacity-50 ${cfg.preset === "image" ? "border-accent" : "border-border"}`}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {cfg.preset === "image" ? "換一張背景圖" : "上傳背景圖"}
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
                <span className="flex items-center gap-1.5">🫧 液態玻璃</span>
                <input
                  type="checkbox"
                  checked={cfg.glass}
                  onChange={(e) => onChange({ ...cfg, glass: e.target.checked })}
                />
              </label>
              <p className="text-[11px] text-fg-muted mt-1">在背景上加一層霧面玻璃，讓圖片不搶戲、字更清楚。</p>
              {cfg.glass && (
                <div className="mt-2">
                  <div className="text-xs text-fg-muted mb-1">霧面強度 {Math.round(cfg.glassOpacity * 100)}%</div>
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
        </>
      )}
    </div>
  );
}

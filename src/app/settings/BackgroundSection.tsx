"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Check, Upload, X } from "lucide-react";
import { BG_PRESETS, backgroundCss } from "@/lib/user-background";

export function BackgroundSection({ initial }: { initial: string | null }) {
  const t = useTranslations("settings");
  const [bg, setBg] = useState<string>(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = async (value: string) => {
    setBg(value);
    setSaving(true);
    try {
      const res = await fetch("/api/me/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: value }),
      });
      if (res.ok) {
        setSavedKey(value || "default");
        setTimeout(() => setSavedKey(null), 1500);
      }
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (j.url) await apply(j.url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isCustomImage = !!bg && (/^https?:/.test(bg) || bg.startsWith("/"));

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-3">
      <div className="text-lg font-bold">🎨 {t("personalBackground")}</div>
      <p className="text-sm text-fg-muted">{t("backgroundDesc")}</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <button
          onClick={() => apply("")}
          className={`h-16 rounded-lg border flex items-center justify-center text-xs text-fg-muted bg-bg ${!bg ? "border-accent ring-2 ring-accent" : "border-border"}`}
        >
          {t("defaultBg")}
        </button>
        {BG_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => apply(p.key)}
            title={p.label}
            className={`h-16 rounded-lg border relative overflow-hidden ${bg === p.key ? "border-accent ring-2 ring-accent" : "border-border"}`}
            style={{ background: p.css }}
          >
            <span className="absolute bottom-1 left-1 text-[10px] text-white/80">{p.label}</span>
            {savedKey === p.key && <Check size={14} className="absolute top-1 right-1 text-accent" />}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:border-accent disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {t("uploadImageBg")}
        </button>
        {isCustomImage && (
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
            {t("usingCustomImage")}
            <button onClick={() => apply("")} className="text-red-400 hover:underline inline-flex items-center gap-0.5">
              <X size={12} /> {t("remove")}
            </button>
          </span>
        )}
        {saving && <Loader2 size={14} className="animate-spin text-fg-muted" />}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>

      {backgroundCss(bg) && (
        <div className="h-20 rounded-lg border border-border" style={{ background: backgroundCss(bg)! }} />
      )}
    </div>
  );
}

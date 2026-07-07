"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Volume2, Sparkles, Eraser, Image as ImgIcon } from "lucide-react";
import { isSoundOn, setSoundOn, resetInventory } from "./island-bus";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const QUALITY_KEY = "ai_island_quality";
const FX_KEY = "ai_island_fx";

export function readQuality(): "low" | "med" | "high" {
  if (typeof window === "undefined") return "med";
  try { return (localStorage.getItem(QUALITY_KEY) as any) || "med"; } catch { return "med"; }
}
export function readFx(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(FX_KEY) !== "0"; } catch { return true; }
}

const settingsSubs = new Set<() => void>();
export function emitSettingsToggle() {
  if (typeof document !== "undefined" && document.pointerLockElement) {
    try { document.exitPointerLock(); } catch {}
  }
  for (const f of settingsSubs) f();
}
export function subscribeSettingsToggle(fn: () => void) { settingsSubs.add(fn); return () => { settingsSubs.delete(fn); }; }

import { useOverlayRegister } from "@/lib/overlay-stack";
export function SettingsPanel() {
  const t = useTranslations("island");
  const [open, setOpen] = useState(false);
  useOverlayRegister(open);
  const [sound, setSound] = useState(true);
  const [quality, setQuality] = useState<"low" | "med" | "high">("med");
  const [fx, setFx] = useState(true);
  const confirm = useConfirm();

  useEffect(() => subscribeSettingsToggle(() => setOpen((v) => !v)), []);
  useEffect(() => { setSound(isSoundOn()); setQuality(readQuality()); setFx(readFx()); }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;

  const setQ = (q: "low" | "med" | "high") => {
    setQuality(q);
    try { localStorage.setItem(QUALITY_KEY, q); } catch {}
    location.reload();
  };
  const toggleFx = () => {
    const next = !fx;
    setFx(next);
    try { localStorage.setItem(FX_KEY, next ? "1" : "0"); } catch {}
    location.reload();
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundOn(next);
  };
  const clearAll = async () => {
    const ok = await confirm({
      title: t("confirmClearTitle"),
      description: t("confirmClearDesc"),
      destructive: true,
      confirmLabel: t("clearBtn"),
    });
    if (!ok) return;
    resetInventory();
    ["ai_island_quests_v1", "ai_island_chests_v1", "ai_island_ach_v1", "ai_island_pet_bond_v1", "ai_island_fortune_v1"]
      .forEach((k) => { try { localStorage.removeItem(k); } catch {} });
    location.reload();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(false)}>
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-md w-[92%] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">⚙️ {t("settingsTitle")}</h2>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
        </header>
        <div className="p-4 space-y-3">
          <Row icon={<Volume2 size={16} />} label={t("soundLabel")}>
            <button onClick={toggleSound} className={`text-xs px-3 py-1.5 rounded-full ${sound ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100" : "bg-bg-elevated text-fg-muted"}`}>
              {sound ? t("onLabel") : t("muteLabel")}
            </button>
          </Row>
          <Row icon={<Sparkles size={16} />} label={t("fxLabel")}>
            <button onClick={toggleFx} className={`text-xs px-3 py-1.5 rounded-full ${fx ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100" : "bg-bg-elevated text-fg-muted"}`}>
              {fx ? t("onLabel") : t("offLabel")}{t("reloadSuffix")}
            </button>
          </Row>
          <Row icon={<ImgIcon size={16} />} label={t("qualityLabel")}>
            <div className="flex gap-1">
              {(["low", "med", "high"] as const).map((q) => (
                <button key={q} onClick={() => setQ(q)} className={`text-xs px-3 py-1.5 rounded-full ${quality === q ? "bg-accent text-black font-bold" : "bg-bg-elevated text-fg-muted"}`}>
                  {q === "low" ? t("qualityLow") : q === "med" ? t("qualityMed") : t("qualityHigh")}
                </button>
              ))}
            </div>
          </Row>
          <hr className="border-border" />
          <Row icon={<Eraser size={16} />} label={t("clearProgressLabel")}>
            <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-full bg-red-500/15 text-red-900 dark:text-red-200 hover:bg-red-500/25">
              {t("clearBtn")}
            </button>
          </Row>
        </div>
        <footer className="px-5 py-2 border-t border-border text-[10px] text-fg-muted text-center">
          {t("settingsFooter")}
        </footer>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-elevated">
      <span className="text-fg-muted">{icon}</span>
      <span className="text-sm flex-1">{label}</span>
      {children}
    </div>
  );
}

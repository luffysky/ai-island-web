"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Loader2, Shield, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useOverlayRegister } from "@/lib/overlay-stack";

const STORAGE_KEY = "ai_island_geo_consent";

type ConsentState = "unset" | "granted" | "denied";

function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  try { return (localStorage.getItem(STORAGE_KEY) as ConsentState) || "unset"; } catch { return "unset"; }
}
function writeConsent(s: ConsentState) {
  try { localStorage.setItem(STORAGE_KEY, s); } catch {}
}

/**
 * 精準位置同意 modal — 透明告知 8 條好處 + 使用範圍
 *
 * 用法：
 * 1. 任何地方按按鈕觸發 → setOpen(true)
 * 2. 或從設定頁「精準位置」開關打開
 * 3. 用戶點「啟用」→ navigator.geolocation.getCurrentPosition
 *    → 收到 lat/lng 後 POST /api/me/geolocation 存到 profile
 */
export function GeolocationConsent({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConsentState>("unset");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  useOverlayRegister(open);

  useEffect(() => { setState(readConsent()); }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  const grant = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("瀏覽器不支援定位");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          await fetch("/api/me/geolocation", {
      credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude, accuracy }),
          });
          writeConsent("granted");
          setState("granted");
          toast.success("已啟用精準位置");
          setOpen(false);
        } catch { toast.error("儲存失敗"); }
        finally { setBusy(false); }
      },
      (err) => {
        setBusy(false);
        if (err.code === 1) {
          // PERMISSION_DENIED
          writeConsent("denied");
          setState("denied");
          toast.warning("已拒絕、之後可在設定改");
        } else {
          toast.error(`定位失敗：${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const revoke = async () => {
    const ok = await confirm({ title: "關閉精準位置？", description: "之後可從設定再次啟用。", confirmLabel: "關閉", destructive: true });
    if (!ok) return;
    await fetch("/api/me/geolocation", {
      credentials: "include", method: "DELETE" });
    writeConsent("denied");
    setState("denied");
    toast.info("已關閉、不再使用精準位置");
    setOpen(false);
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent inline-flex items-center gap-1">
            <MapPin size={12} />
            {state === "granted" ? "精準位置：已啟用" : state === "denied" ? "精準位置：已關" : "啟用精準位置"}
          </button>
        )}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOpen(false)}>
          <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-md w-[92%] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <header className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><MapPin size={16} /> 啟用精準位置？</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated"><X size={18} /></button>
            </header>
            <div className="p-5 overflow-y-auto">
              <p className="text-sm mb-3">啟用之後、我們會用你的位置做這 8 件事（都是為了你體驗更好）：</p>
              <ul className="space-y-2 text-sm">
                <Benefit icon="🔒" title="異常登入警告" desc="從陌生城市登入會立刻寄 email、防帳號被盜" />
                <Benefit icon="🕒" title="時間自動在地化" desc="課程截止 / 提醒時間用你的時區、不用手動設" />
                <Benefit icon="🌏" title="語系自動選擇" desc="繁中 / 簡中 / 英文自動帶、不用設定" />
                <Benefit icon="👥" title="找附近同學" desc="推薦同城市學員、組讀書會（同意才會配對）" />
                <Benefit icon="📅" title="線下活動通知" desc="你的城市有 meetup / 工作坊立刻通知" />
                <Benefit icon="🇪🇺" title="GDPR 合規" desc="歐盟用戶自動顯示 cookie banner、保護隱私" />
                <Benefit icon="⚡" title="頁面載入更快" desc="走最近 CDN、頁面 / 影片 / AI 回應快一倍" />
                <Benefit icon="💳" title="支付幣別自動帶" desc="NTD / USD / JPY 自動、信用卡風控更準" />
              </ul>

              <div className="mt-4 p-3 rounded-lg bg-bg-elevated text-xs text-fg-muted flex gap-2">
                <Shield size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <div className="font-bold text-fg mb-1">承諾</div>
                  <p className="leading-relaxed">
                    • 位置只用於上面 8 個用途、不對外販售<br />
                    • 不長期保存原始 GPS、只存「大致縣市」<br />
                    • 隨時可在設定關掉 / 撤回授權<br />
                    • 完整內容看 <a href="/privacy" className="text-accent">隱私權政策</a>
                  </p>
                </div>
              </div>

              {state === "denied" && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 text-xs text-yellow-300 flex gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>你目前已關閉。重新啟用、瀏覽器可能會再問一次。</span>
                </div>
              )}
            </div>
            <footer className="px-5 py-3 border-t border-border flex gap-2">
              {state === "granted" ? (
                <>
                  <button onClick={revoke} className="flex-1 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm">關閉</button>
                  <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-accent text-black font-bold text-sm">保持啟用</button>
                </>
              ) : (
                <>
                  <button onClick={() => { writeConsent("denied"); setState("denied"); setOpen(false); }} className="flex-1 py-2 rounded-lg border border-border text-sm">先不要</button>
                  <button onClick={grant} disabled={busy} className="flex-1 py-2 rounded-lg bg-accent text-black font-bold text-sm inline-flex items-center justify-center gap-1 disabled:opacity-50">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    啟用
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Benefit({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <li className="flex gap-2">
      <span className="text-base shrink-0">{icon}</span>
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-fg-muted leading-relaxed">{desc}</div>
      </div>
    </li>
  );
}

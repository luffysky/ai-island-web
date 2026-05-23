"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import confetti from "canvas-confetti";
import { Check, Flame, Gift } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// 7 天一輪的 XP 表（跟 checkin_migration.sql 的 do_checkin 一致）
const CYCLE_XP = [10, 15, 20, 25, 30, 40, 60];

// z 幣連續簽到獎勵：streak=1 → 5、+1 / 天、上限 15（從第 11 天起）
const zForStreak = (streak: number) => Math.min(15, 4 + streak);

interface CheckinStatus {
  checked_today: boolean;
  streak: number;
  day_in_cycle: number;
}

export function DailyCheckin() {
  const toast = useToast();
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justGotXp, setJustGotXp] = useState<number | null>(null);
  const [justGotZ, setJustGotZ] = useState<number | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.rpc("get_checkin_status");
      if (data?.ok) {
        setStatus({
          checked_today: data.checked_today,
          streak: data.streak,
          day_in_cycle: data.day_in_cycle,
        });
      }
      setLoading(false);
    })();
  }, []);

  const doCheckin = async () => {
    if (claiming || status?.checked_today) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("do_checkin");
    setClaiming(false);
    if (error || !data?.ok) {
      toast.error("簽到失敗：" + (error?.message || data?.error || "未知錯誤"));
      return;
    }
    if (data.already) {
      setStatus((s) => s ? { ...s, checked_today: true } : s);
      return;
    }
    // 簽到成功
    setStatus({
      checked_today: true,
      streak: data.streak,
      day_in_cycle: data.day_in_cycle,
    });
    setJustGotXp(data.xp_awarded);
    if (data.z_awarded) setJustGotZ(data.z_awarded);
    confetti({
      particleCount: data.day_in_cycle >= 7 ? 80 : 35,
      spread: data.day_in_cycle >= 7 ? 70 : 50,
      origin: { y: 0.7 },
      colors: ["#50fa7b", "#8be9fd", "#ffd700"],
    });
    setTimeout(() => {
      setJustGotXp(null);
      setJustGotZ(null);
    }, 2800);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4 animate-pulse h-32" />
    );
  }

  if (!status) return null; // 未登入不顯示

  // 目前在週期內第幾天（已簽到顯示 day_in_cycle、未簽到顯示「即將簽到的那天」）
  const today = status.checked_today
    ? status.day_in_cycle
    : (((status.streak) % 7) + 1);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <Gift size={18} className="text-accent" />
          每日簽到
        </h3>
        <div className="flex items-center gap-1 text-sm text-orange-400">
          <Flame size={14} />
          <span className="font-bold">{status.streak}</span>
          <span className="text-xs text-fg-muted">天連續</span>
        </div>
      </div>

      {/* 7 天格子 */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {CYCLE_XP.map((xp, i) => {
          const day = i + 1;
          const isDone = status.checked_today
            ? day <= status.day_in_cycle
            : day < today;
          const isToday = day === today;
          const isBig = day === 7;
          return (
            <div
              key={day}
              className={`rounded-lg p-1.5 text-center border transition ${
                isDone
                  ? "bg-accent/15 border-accent/40"
                  : isToday && !status.checked_today
                  ? "bg-accent/10 border-accent ring-1 ring-accent"
                  : "bg-bg-elevated border-border"
              }`}
            >
              <div className="text-[9px] text-fg-muted">D{day}</div>
              <div className="my-0.5 flex items-center justify-center h-5">
                {isDone ? (
                  <Check size={14} className="text-accent" />
                ) : (
                  <span className={isBig ? "text-sm" : "text-xs"}>
                    {isBig ? "🎁" : "⚡"}
                  </span>
                )}
              </div>
              <div className={`text-[9px] font-bold ${isBig ? "text-accent-3" : "text-fg-muted"}`}>
                {xp}
              </div>
            </div>
          );
        })}
      </div>

      {/* 簽到按鈕 */}
      <button
        onClick={doCheckin}
        disabled={status.checked_today || claiming}
        className={`w-full py-2.5 rounded-lg font-bold text-sm transition ${
          status.checked_today
            ? "bg-bg-elevated text-fg-muted cursor-default"
            : "bg-gradient-to-r from-accent to-accent-2 text-black hover:scale-[1.02]"
        }`}
      >
        {status.checked_today
          ? "✓ 今天已簽到"
          : claiming
          ? "簽到中..."
          : `📅 立即簽到 (+${CYCLE_XP[(today - 1) % 7]} XP · +${zForStreak(status.streak + (status.checked_today ? 0 : 1))} 🪙)`}
      </button>

      {/* +XP 飄出 */}
      {justGotXp !== null && (
        <div className="absolute inset-x-0 top-1/3 flex justify-center pointer-events-none">
          <div className="checkin-xp-pop px-4 py-2 rounded-xl bg-gradient-to-br from-accent to-accent-2 text-black font-extrabold text-xl shadow-2xl">
            ⚡ +{justGotXp} XP
          </div>
        </div>
      )}

      {/* +Z-coin 飄出（略晚於 XP）*/}
      {justGotZ !== null && (
        <div className="absolute inset-x-0 top-[44%] flex justify-center pointer-events-none">
          <div className="checkin-z-pop px-3 py-1.5 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-black font-extrabold text-lg shadow-2xl">
            🪙 +{justGotZ} Z-coin
          </div>
        </div>
      )}

      <style jsx>{`
        .checkin-xp-pop {
          animation: checkinPop 2.5s ease-out forwards;
        }
        .checkin-z-pop {
          animation: checkinPop 2.8s ease-out 0.4s forwards;
          opacity: 0;
        }
        @keyframes checkinPop {
          0% { opacity: 0; transform: translateY(20px) scale(0.6); }
          15% { opacity: 1; transform: translateY(0) scale(1.15); }
          30% { transform: scale(1); }
          75% { opacity: 1; transform: translateY(-30px); }
          100% { opacity: 0; transform: translateY(-70px); }
        }
      `}</style>
    </div>
  );
}

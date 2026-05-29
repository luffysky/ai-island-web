"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Sparkles, Loader2, X } from "lucide-react";

const PLAN_META: Record<string, { name: string; price: string; emoji: string; color: string; href: string }> = {
  single:  { name: "單章購買", price: "NT$ 99 一次性", emoji: "📘", color: "from-blue-500 to-cyan-500",    href: "/pricing#single" },
  monthly: { name: "月訂閱",   price: "NT$ 299 / 月",   emoji: "🚀", color: "from-pink-500 to-rose-500",  href: "/pricing#monthly" },
  yearly:  { name: "年訂閱",   price: "NT$ 2999 / 年",  emoji: "👑", color: "from-yellow-500 to-orange-500", href: "/pricing#yearly" },
};

const STORAGE_DISMISS_KEY = "subscription_recommend_dismissed_at";
const DISMISS_TTL_MS = 7 * 86400_000; // 7 天內不再顯示

export function SubscriptionRecommendCard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 7 天內 user 關過就 skip
    try {
      const at = localStorage.getItem(STORAGE_DISMISS_KEY);
      if (at && Date.now() - Number(at) < DISMISS_TTL_MS) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    } catch {}
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/subscription-recommend", { method: "POST", credentials: "include" });
      const j = await res.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_DISMISS_KEY, String(Date.now())); } catch {}
  }

  if (dismissed) return null;
  if (loading) return null; // 安靜載入、不要 placeholder 嚇人
  if (!data || data.already_subscribed) return null; // 已訂閱不顯示
  if (data.error || !data.recommended) return null;

  const meta = PLAN_META[data.recommended] ?? PLAN_META.monthly;

  return (
    <div className="relative overflow-hidden bg-bg-card border border-border rounded-2xl p-5 mb-4">
      {/* 漸層裝飾 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-5 pointer-events-none`} />

      <button
        onClick={dismiss}
        title="7 天內不再提醒"
        className="absolute top-2 right-2 p-1.5 text-fg-muted hover:text-fg rounded"
      >
        <X size={14} />
      </button>

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-accent-2" />
          <span className="text-xs font-semibold text-accent-2 uppercase tracking-wide">雪鑰建議</span>
          {data.urgency === "high" && (
            <span className="chip chip-warn text-[10px]">🔥 強推</span>
          )}
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-2xl shadow-lg`}>
            {meta.emoji}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">{meta.name}</h3>
            <p className="text-sm text-fg-muted">{meta.price}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-4 bg-bg-elevated rounded-lg p-3 border-l-2 border-accent-2 italic">
          💬 {data.reason}
        </p>

        <div className="flex gap-2">
          <Link
            href={meta.href as any}
            className="btn-chip btn-chip-success flex-1 justify-center font-semibold py-2.5 text-sm"
          >
            <Crown size={14} /> 看 {meta.name} 細節
          </Link>
          {data.alt && PLAN_META[data.alt] && (
            <Link
              href={PLAN_META[data.alt].href as any}
              className="btn-chip btn-chip-neutral text-xs"
              title={`第二適合：${PLAN_META[data.alt].name}`}
            >
              比較
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

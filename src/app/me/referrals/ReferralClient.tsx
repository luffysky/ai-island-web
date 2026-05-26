"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Share2, Users, Gift } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTWDate } from "@/lib/format-date";

type Referral = {
  id: string;
  signed_up_at: string;
  first_lesson_at: string | null;
  reward_granted: boolean;
  referred: { username: string; display_name: string | null; avatar_url: string | null; xp: number; level: number } | null;
};

export function ReferralClient({
  code,
  usesCount,
  siteUrl,
  referrals,
}: {
  code: string;
  usesCount: number;
  siteUrl: string;
  referrals: Referral[];
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const url = `${siteUrl}/signup?ref=${encodeURIComponent(code)}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("已複製邀請連結");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("複製失敗、請手動選取");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "來 AI 島跟我一起學",
          text: "用我的邀請碼 " + code,
          url,
        });
      } catch {}
    } else {
      copyUrl();
    }
  };

  const triggered = referrals.filter((r) => r.first_lesson_at).length;

  return (
    <div className="space-y-4">
      {/* Code 卡 */}
      <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-2 p-5 text-black">
        <div className="text-xs font-bold mb-1 uppercase tracking-wide">你的邀請碼</div>
        <div className="font-mono font-extrabold text-3xl">{code}</div>
        <div className="text-xs mt-2 opacity-80 break-all">{url}</div>
        <div className="flex gap-2 mt-3">
          <button onClick={copyUrl} className="px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-bold flex items-center gap-1 hover:bg-black/30">
            <Copy size={12} /> {copied ? "已複製" : "複製連結"}
          </button>
          <button onClick={share} className="px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-bold flex items-center gap-1 hover:bg-black/30">
            <Share2 size={12} /> 分享
          </button>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="總使用次數" value={usesCount} icon={<Users size={16} />} />
        <Stat label="已註冊" value={referrals.length} icon={<Users size={16} />} />
        <Stat label="已觸發獎勵" value={triggered} icon={<Gift size={16} />} />
      </div>

      {/* 列表 */}
      <div className="rounded-xl bg-bg-card border border-border">
        <div className="px-4 py-2 border-b border-border text-sm font-bold">我邀請的人</div>
        {referrals.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">
            還沒有人用你的邀請碼註冊。
            <br />
            分享出去看看吧！
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {referrals.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                {r.referred?.avatar_url ? (
                  <Image src={r.referred.avatar_url} alt="" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm">
                    {(r.referred?.display_name || r.referred?.username || "?")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.referred?.display_name || r.referred?.username || "—"}</div>
                  <div className="text-[10px] text-fg-muted">
                    註冊 {formatTWDate(r.signed_up_at)}
                    {r.referred && ` · Lv ${r.referred.level} · ${r.referred.xp} XP`}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  r.reward_granted
                    ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                    : "bg-yellow-500/15 text-yellow-900 dark:text-yellow-200"
                }`}>
                  {r.reward_granted ? "✓ 已獎勵" : "等首 lesson"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-bg-card border border-border p-3">
      <div className="text-xs text-fg-muted flex items-center gap-1">{icon} {label}</div>
      <div className="text-2xl font-bold mt-1 text-accent">{value.toLocaleString()}</div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, Coins, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Pet = {
  name: string;
  species: string;
  evolution_stage: string;
  total_z_spent: number;
};

const STAGES = [
  { id: "baby", label: "👶 幼體", emoji: "🐣", desc: "剛出生、可愛但弱小", cost: 0 },
  { id: "child", label: "🧒 小寵", emoji: "🐤", desc: "開始長大、有點活力", cost: 100 },
  { id: "teen", label: "🧑 青少", emoji: "🦅", desc: "好奇心爆棚、會學新招", cost: 300 },
  { id: "adult", label: "🧑‍🎓 成體", emoji: "🦉", desc: "智慧 +、給你建議更精準", cost: 800 },
  { id: "elder", label: "🧓 長者", emoji: "🐉", desc: "見多識廣、對話深度 +", cost: 2000 },
  { id: "legendary", label: "👑 傳說", emoji: "🌟", desc: "頂級造型、特殊頭飾、限定台詞", cost: 5000 },
];

const SPECIES_EMOJI: Record<string, Record<string, string>> = {
  hamster: { baby: "🐹", child: "🐹", teen: "🐹", adult: "🦫", elder: "🦫", legendary: "🌟" },
  cat: { baby: "🐱", child: "😼", teen: "🐈", adult: "🐈‍⬛", elder: "🦁", legendary: "🌟" },
  dog: { baby: "🐶", child: "🐕", teen: "🦮", adult: "🐕‍🦺", elder: "🐺", legendary: "🌟" },
  rabbit: { baby: "🐰", child: "🐇", teen: "🐇", adult: "🦊", elder: "🦊", legendary: "🌟" },
};

export function PetEvolveClient({ pet, zBalance }: { pet: Pet | null; zBalance: number }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(pet?.evolution_stage ?? "baby");
  const [balance, setBalance] = useState(zBalance);
  const [totalSpent, setTotalSpent] = useState(pet?.total_z_spent ?? 0);

  if (!pet) {
    return (
      <div className="rounded-xl bg-bg-card border border-border p-12 text-center">
        <div className="text-5xl mb-3">🥚</div>
        <p className="text-fg-muted">還沒有寵物。到 <Link href="/me/pet" className="text-accent">寵物設定頁</Link> 領一隻吧。</p>
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.id === stage);
  const next = STAGES[currentIdx + 1];

  const evolve = async () => {
    if (!next) return;
    const ok = await confirm({
      title: `花 ${next.cost} Z 幣進化成${next.label}？`,
      description: `當前 z 幣餘額 ${balance}、進化後剩 ${balance - next.cost}。不可退回。`,
      confirmLabel: "進化",
      destructive: false,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/pet/evolve", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cost: next.cost }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "失敗");
      setStage(j.new_stage);
      setBalance(j.z_balance);
      setTotalSpent((s) => s + next.cost);
      toast.success(`🎉 ${pet.name} 進化成${next.label}！`);
    } catch (e: any) {
      toast.error(`進化失敗：${e?.message || ""}`);
    } finally {
      setBusy(false);
    }
  };

  const emojiTable = SPECIES_EMOJI[pet.species] ?? SPECIES_EMOJI.hamster;

  return (
    <div className="space-y-4">
      {/* 當前狀態 */}
      <div className="rounded-2xl bg-gradient-to-br from-accent/15 to-accent-2/10 border border-accent/40 p-6 text-center">
        <div className="text-7xl mb-2">{emojiTable[stage] ?? "🐾"}</div>
        <div className="text-2xl font-bold">{pet.name}</div>
        <div className="text-sm text-fg-muted mt-1">
          {STAGES[currentIdx]?.label} · 累計花費 {totalSpent} 🪙
        </div>
        <div className="mt-3 text-lg flex items-center justify-center gap-1">
          <Coins size={18} className="text-yellow-400" />
          <span className="font-bold">{balance.toLocaleString()}</span>
          <span className="text-sm text-fg-muted ml-1">Z 幣可用</span>
        </div>
      </div>

      {/* 進化階段 */}
      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3">🌱 進化階段</h2>
        <ol className="space-y-2">
          {STAGES.map((s, i) => {
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isNext = i === currentIdx + 1;
            const isLocked = i > currentIdx + 1;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isCurrent ? "border-accent bg-accent/10" :
                  isNext ? "border-accent/40 bg-accent/5" :
                  isPast ? "border-emerald-500/30 bg-emerald-500/5 opacity-70" :
                  "border-border opacity-50"
                }`}
              >
                <span className="text-3xl">{emojiTable[s.id] ?? s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{s.label} {isCurrent && <span className="text-[10px] text-accent ml-1">當前</span>}</div>
                  <p className="text-xs text-fg-muted">{s.desc}</p>
                </div>
                {isPast && <span className="text-emerald-400 text-xs font-bold">✓ 已達成</span>}
                {isCurrent && next == null && <span className="text-xs text-accent font-bold">👑 已達頂點</span>}
                {isNext && (
                  <button
                    onClick={evolve}
                    disabled={busy || balance < s.cost}
                    className="text-sm px-4 py-2 rounded-lg bg-accent text-black font-bold disabled:opacity-50 flex items-center gap-1"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
                    {balance < s.cost ? `差 ${s.cost - balance} 🪙` : `${s.cost} 🪙 進化`}
                  </button>
                )}
                {isLocked && <span className="text-xs text-fg-muted">需先進化前面</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-[10px] text-fg-muted text-center">
        💡 z 幣可從每日簽到 / 任務 / 完成 lesson / 邀請好友拿到
      </p>
    </div>
  );
}

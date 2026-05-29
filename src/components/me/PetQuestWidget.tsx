"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cat, Check, Loader2, Sparkles } from "lucide-react";

export function PetQuestWidget() {
  const [quest, setQuest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [noPet, setNoPet] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/me/pet/quest", { credentials: "include" });
      const j = await r.json();
      if (j.error === "no_pet") { setNoPet(true); return; }
      if (j.quest) setQuest(j.quest);
    } catch {}
    finally { setLoading(false); }
  }

  async function complete() {
    if (completing || !quest || quest.completed) return;
    setCompleting(true);
    try {
      const r = await fetch("/api/me/pet/quest", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const j = await r.json();
      if (j.ok) {
        setQuest(j.quest);
        alert(`✨ 寵物開心啊！\n+${j.reward_z} 🪙 z 幣 / +${j.reward_affinity} 親密度`);
      } else {
        alert(j.error ?? "失敗");
      }
    } finally {
      setCompleting(false);
    }
  }

  if (loading || noPet || !quest) return null;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Cat size={16} className="text-pink-500" />
        <h3 className="font-bold">寵物今日 quest</h3>
        {quest.completed && <span className="chip chip-success text-[10px]">✓ 已完成</span>}
      </div>
      <p className="font-medium text-sm leading-snug mb-1">{quest.title}</p>
      <p className="text-xs text-fg-muted mb-3">{quest.description}</p>
      <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2">
        <span className="chip chip-neutral">📦 {quest.category}</span>
        <span className="text-fg-muted">獎勵: 🪙 {quest.reward_z} / 💝 +{quest.reward_affinity}</span>
      </div>
      {quest.completed ? (
        <Link href="/me/pet" className="btn-chip btn-chip-info w-full justify-center text-xs">
          看寵物 →
        </Link>
      ) : (
        <button onClick={complete} disabled={completing}
          className="btn-chip btn-chip-success w-full justify-center py-2 text-sm disabled:opacity-50">
          {completing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          已做完 / 領獎
        </button>
      )}
    </div>
  );
}

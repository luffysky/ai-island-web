"use client";

import { useState } from "react";
import { Search, Send } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Kind = "all" | "members" | "premium" | "xp_gte" | "level_gte";

export function AirdropForm() {
  const confirm = useConfirm();
  const [kind, setKind] = useState<Kind>("all");
  const [value, setValue] = useState(100);
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<{ count: number; capped: boolean } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const doPreview = async () => {
    setPreviewing(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ kind, value: String(value) });
      const res = await fetch(`/api/admin/zcoin/airdrop?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setResult(`預覽失敗：${data.error}`);
        setPreview(null);
      } else {
        setPreview({ count: data.count, capped: data.capped });
      }
    } finally {
      setPreviewing(false);
    }
  };

  const doExecute = async () => {
    if (!preview || preview.count === 0) {
      setResult("請先預覽 + 確認人數 > 0");
      return;
    }
    if (reason.trim().length < 5) {
      setResult("理由至少 5 字");
      return;
    }
    const ok = await confirm({
      title: `確認對 ${preview.count} 人發放 ${amount > 0 ? "+" : ""}${amount} Z-coin？`,
      description: "此操作無法撤銷、會直接寫入用戶餘額並記入 audit log。",
      confirmLabel: amount >= 0 ? "確認發放" : "確認扣除",
      destructive: amount < 0,
    });
    if (!ok) return;
    setExecuting(true);
    setResult(null);
    try {
      const segment: any = { kind };
      if (kind === "xp_gte" || kind === "level_gte") segment.value = value;
      const res = await fetch("/api/admin/zcoin/airdrop", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, amount, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`失敗：${data.error}`);
      } else {
        setResult(`✅ 已對 ${data.updated}/${data.targeted} 位用戶發放 ${data.delta} Z-coin`);
        setPreview(null);
      }
    } finally {
      setExecuting(false);
    }
  };

  const fld = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm";

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-muted block mb-1">對象 segment</label>
          <select className={fld} value={kind} onChange={(e) => { setKind(e.target.value as Kind); setPreview(null); }}>
            <option value="all">🌐 所有未封鎖用戶</option>
            <option value="members">👥 一般 member（不含 admin / editor）</option>
            <option value="premium">💎 付費訂閱中（subscriptions.active）</option>
            <option value="xp_gte">🎯 XP ≥ N</option>
            <option value="level_gte">⭐ 等級 ≥ N</option>
          </select>
        </div>
        {(kind === "xp_gte" || kind === "level_gte") && (
          <div>
            <label className="text-xs text-fg-muted block mb-1">門檻值 N</label>
            <input
              type="number"
              className={fld}
              value={value}
              onChange={(e) => { setValue(Number(e.target.value)); setPreview(null); }}
            />
          </div>
        )}
        <div>
          <label className="text-xs text-fg-muted block mb-1">每人發放 Z-coin（負數=扣除）</label>
          <input
            type="number"
            className={fld}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <p className="text-[10px] text-fg-muted mt-0.5">單次上限 ±5000、扣除若會超扣餘額會跳過該用戶</p>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-fg-muted block mb-1">理由（必填、至少 5 字、寫入 audit log）</label>
          <input
            type="text"
            className={fld}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：6/1 兒童節活動補償、Lv 10+ 老玩家回饋"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={doPreview}
          disabled={previewing}
          className="px-4 py-1.5 text-sm rounded-lg border border-border hover:bg-bg-elevated disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {previewing ? "計算中..." : <><Search className="w-4 h-4" /> 預覽人數</>}
        </button>
        {preview && (
          <div className="text-sm">
            匹配 <span className="font-bold text-accent">{preview.count}</span> 位用戶
            {preview.capped && <span className="text-orange-500 ml-2">（已被上限切到 5000）</span>}
            、總發放 <span className="font-bold">{(preview.count * amount).toLocaleString()}</span> Z-coin
          </div>
        )}
        <button
          onClick={doExecute}
          disabled={executing || !preview || preview.count === 0}
          className="ml-auto px-5 py-1.5 text-sm rounded-lg bg-red-500 text-white font-bold disabled:opacity-30 inline-flex items-center justify-center gap-1.5"
        >
          {executing ? "發放中..." : <><Send className="w-4 h-4" /> 確認發放</>}
        </button>
      </div>

      {result && (
        <div className="p-3 rounded-lg bg-bg-elevated text-sm">
          {result}
        </div>
      )}
    </div>
  );
}

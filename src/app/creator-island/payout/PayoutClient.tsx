"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Payout = { id: string; fruit_amount: number; ntd_amount: number; fee_ntd: number; status: string; admin_note?: string | null; requested_at: string; processed_at?: string | null };
type Cfg = { fruitPerNtd: number; minFruit: number; feePct: number };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "待撥款", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  approved: { label: "已核准", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  paid: { label: "已撥款", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  rejected: { label: "已駁回", cls: "bg-red-500/15 text-red-600 dark:text-red-300" },
};

export function PayoutClient({ balance, initialPayouts, cfg }: { balance: number; initialPayouts: Payout[]; cfg: Cfg }) {
  const toast = useToast();
  const [bal, setBal] = useState(balance);
  const [rows, setRows] = useState<Payout[]>(initialPayouts);
  const [fruit, setFruit] = useState(String(Math.max(cfg.minFruit, 0)));
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const fruitNum = Math.floor(Number(fruit) || 0);
  const gross = Math.floor(fruitNum / cfg.fruitPerNtd);
  const fee = Math.round((gross * cfg.feePct) / 100);
  const net = Math.max(0, gross - fee);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/creator/payout/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fruitAmount: fruitNum, accountName, bankName, bankAccount }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.message || "申請失敗");
      toast.success("提現申請已送出 · 待平台撥款");
      setBal((b) => b - fruitNum);
      setRows((r) => [{ id: j.id, fruit_amount: fruitNum, ntd_amount: gross, fee_ntd: fee, status: "pending", requested_at: new Date().toISOString() }, ...r]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold inline-flex items-center gap-1.5"><Banknote size={20} /> 果實提現</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> 回島</Link>
      </header>

      <div className="surface p-4">
        <div className="text-sm text-fg-muted">目前可提果實</div>
        <div className="text-3xl font-extrabold mt-0.5">🌰 {bal.toLocaleString()}</div>
        <div className="text-xs text-fg-muted mt-1">匯率 {cfg.fruitPerNtd} 果實 = NT$1{cfg.feePct > 0 ? ` · 手續費 ${cfg.feePct}%` : " · 免手續費"} · 最低提領 {cfg.minFruit.toLocaleString()} 果實</div>
      </div>

      <div className="surface p-4 space-y-3">
        <div className="font-bold text-sm">申請提現</div>
        <label className="block text-sm">提領果實
          <input type="number" min={cfg.minFruit} value={fruit} onChange={(e) => setFruit(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
        </label>
        <div className="text-xs text-fg-muted">預估實拿 <b className="text-accent">NT${net.toLocaleString()}</b>（毛額 NT${gross.toLocaleString()}{fee > 0 ? ` − 手續費 NT$${fee}` : ""}）</div>
        <div className="grid sm:grid-cols-3 gap-2">
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="收款人姓名" className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="銀行 / 分行" className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="帳號" className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={submit} disabled={busy || fruitNum < cfg.minFruit || fruitNum > bal} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-accent-contrast font-bold disabled:opacity-40">
          {busy ? <><Loader2 size={16} className="animate-spin" /> 送出中…</> : "送出申請"}
        </button>
        <p className="text-[11px] text-fg-muted">送出當下果實會先扣住；若被駁回會自動退回。撥款為人工作業，約 3–7 個工作天。</p>
      </div>

      <div className="surface p-4">
        <div className="font-bold text-sm mb-2">提現紀錄</div>
        {rows.length === 0 ? (
          <div className="text-xs text-fg-muted">還沒有提現紀錄。</div>
        ) : (
          <div className="space-y-2">
            {rows.map((p) => {
              const st = STATUS[p.status] ?? STATUS.pending;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm bg-bg-elevated rounded-lg px-3 py-2">
                  <div>
                    <div>🌰 {p.fruit_amount.toLocaleString()} → NT${p.ntd_amount.toLocaleString()}</div>
                    <div className="text-[11px] text-fg-muted">{new Date(p.requested_at).toLocaleString("zh-TW")}{p.admin_note ? ` · ${p.admin_note}` : ""}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

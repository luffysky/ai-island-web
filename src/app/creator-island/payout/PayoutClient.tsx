"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Banknote, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

type Payout = { id: string; fruit_amount: number; ntd_amount: number; fee_ntd: number; status: string; admin_note?: string | null; requested_at: string; processed_at?: string | null };
type Cfg = { fruitPerNtd: number; minFruit: number; feePct: number };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "待撥款", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  approved: { label: "已核准", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  paid: { label: "已撥款", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  rejected: { label: "已駁回", cls: "bg-red-500/15 text-red-600 dark:text-red-300" },
};

export function PayoutClient({ balance, initialPayouts, cfg }: { balance: number; initialPayouts: Payout[]; cfg: Cfg }) {
  const t = useTranslations("creator");
  const toast = useToast();
  const [bal, setBal] = useState(balance);
  const [rows, setRows] = useState<Payout[]>(initialPayouts);
  const [fruit, setFruit] = useState(String(Math.max(cfg.minFruit, 0)));
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [ledger, setLedger] = useState<{ id: string; amount: number; reason: string; created_at: string }[] | null>(null);

  // 果實收支明細（接 /api/creator-island/fruit）
  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/creator-island/fruit"); if (r.ok) setLedger((await r.json()).ledger ?? []); } catch { /* ignore */ }
    })();
  }, []);

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
      if (!res.ok || !j.ok) throw new Error(j.message || t("payoutErrorSubmitFailed"));
      toast.success(t("payoutToastSubmitted"));
      setBal((b) => b - fruitNum);
      setRows((r) => [{ id: j.id, fruit_amount: fruitNum, ntd_amount: gross, fee_ntd: fee, status: "pending", requested_at: new Date().toISOString() }, ...r]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold inline-flex items-center gap-1.5"><Banknote size={20} /> {t("payoutTitle")}</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {t("payoutBackToIsland")}</Link>
      </header>

      <div className="surface p-4">
        <div className="text-sm text-fg-muted">{t("payoutAvailable")}</div>
        <div className="text-3xl font-extrabold mt-0.5">🌰 {bal.toLocaleString()}</div>
        <div className="text-xs text-fg-muted mt-1">{t("payoutRate", { rate: cfg.fruitPerNtd })}{cfg.feePct > 0 ? t("payoutFeePct", { pct: cfg.feePct }) : t("payoutNoFee")} · {t("payoutMinWithdraw", { min: cfg.minFruit.toLocaleString() })}</div>
      </div>

      <div className="surface p-4 space-y-3">
        <div className="font-bold text-sm">{t("payoutApplyHeading")}</div>
        <label className="block text-sm">{t("payoutWithdrawFruit")}
          <input type="number" min={cfg.minFruit} value={fruit} onChange={(e) => setFruit(e.target.value)} className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
        </label>
        <div className="text-xs text-fg-muted">{t("payoutEstimateNet")} <b className="text-accent">NT${net.toLocaleString()}</b>（{t("payoutGross")} NT${gross.toLocaleString()}{fee > 0 ? ` − ${t("payoutFee")} NT$${fee}` : ""}）</div>
        <div className="grid sm:grid-cols-3 gap-2">
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={t("payoutAccountName")} className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={t("payoutBankName")} className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder={t("payoutBankAccount")} className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={submit} disabled={busy || fruitNum < cfg.minFruit || fruitNum > bal} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-accent-contrast font-bold disabled:opacity-40">
          {busy ? <><Loader2 size={16} className="animate-spin" /> {t("payoutSubmitting")}</> : t("payoutSubmit")}
        </button>
        <p className="text-[11px] text-fg-muted">{t("payoutNotice")}</p>
      </div>

      <div className="surface p-4">
        <div className="font-bold text-sm mb-2">{t("payoutHistory")}</div>
        {rows.length === 0 ? (
          <div className="text-xs text-fg-muted">{t("payoutHistoryEmpty")}</div>
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

      {/* 果實收支明細 */}
      <div className="surface p-4">
        <div className="font-bold text-sm mb-2">🌰 果實收支明細</div>
        {ledger === null ? (
          <div className="text-xs text-fg-muted">載入中…</div>
        ) : ledger.length === 0 ? (
          <div className="text-xs text-fg-muted">還沒有果實收支紀錄。</div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {ledger.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-sm bg-bg-elevated rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate">{l.reason}</div>
                  <div className="text-[11px] text-fg-muted">{new Date(l.created_at).toLocaleString("zh-TW")}</div>
                </div>
                <span className={`font-bold shrink-0 ${l.amount >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {l.amount >= 0 ? "+" : ""}{l.amount.toLocaleString()} 🌰
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

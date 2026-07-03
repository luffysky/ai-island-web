"use client";

import { useState } from "react";
import { Coins, Crown, Check, Sparkles, CreditCard, Loader2, Info } from "lucide-react";

type Pkg = { id: string; twd: number; zcoin: number; bonusPct: number; popular?: boolean };
type Plan = { id: string; label: string; twd: number; period: string; months: number; perMonth: number; popular?: boolean };
type Provider = { id: string; label: string; fee: string; methods: string[] };

export function StoreClient({ balance, isPro, packages, plans, perks, providers, methodLabels }: {
  balance: number; isPro: boolean; packages: Pkg[]; plans: Plan[]; perks: string[];
  providers: Provider[]; methodLabels: Record<string, string>;
}) {
  const [tab, setTab] = useState<"zcoin" | "pro">("zcoin");
  const [pkgId, setPkgId] = useState(packages.find((p) => p.popular)?.id ?? packages[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans.find((p) => p.popular)?.id ?? plans[0]?.id ?? "");
  const [provider, setProvider] = useState(providers[0]?.id ?? "");
  const curProvider = providers.find((p) => p.id === provider);
  const [method, setMethod] = useState(curProvider?.methods[0] ?? "credit");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const noProviders = providers.length === 0;

  function pickProvider(id: string) {
    setProvider(id);
    const p = providers.find((x) => x.id === id);
    if (p && !p.methods.includes(method)) setMethod(p.methods[0]);
  }

  async function pay() {
    setErr(null); setBusy(true);
    try {
      const body = tab === "zcoin"
        ? { purpose: "zcoin", itemId: pkgId, provider, method }
        : { purpose: "pro", itemId: planId, provider, method };
      const res = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "建立訂單失敗");
      if (j.kind === "redirect") { window.location.href = j.url; return; }
      if (j.kind === "form") { submitForm(j.action, j.fields); return; }
      throw new Error("未知的付款回應");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Sparkles size={22} /> 商店</h1>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-sm font-bold"><Coins size={15} /> {balance.toLocaleString()} Z幣</span>
      </header>

      <div className="inline-flex rounded-full border border-border bg-bg-card p-1 text-sm">
        <button onClick={() => setTab("zcoin")} className={`px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 ${tab === "zcoin" ? "bg-accent text-white" : "text-fg-muted"}`}><Coins size={15} /> Z幣儲值</button>
        <button onClick={() => setTab("pro")} className={`px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 ${tab === "pro" ? "bg-accent text-white" : "text-fg-muted"}`}><Crown size={15} /> Pro 訂閱{isPro && <span className="text-[10px] px-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">已訂閱</span>}</button>
      </div>

      {tab === "zcoin" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {packages.map((p) => (
            <button key={p.id} onClick={() => setPkgId(p.id)}
              className={`relative text-left rounded-2xl border-2 p-4 transition ${pkgId === p.id ? "border-accent bg-accent/[0.06]" : "border-border bg-bg-card hover:border-accent/40"}`}>
              {p.popular && <span className="absolute -top-2 right-3 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black font-bold">最划算</span>}
              <div className="text-lg font-bold inline-flex items-center gap-1 text-amber-600 dark:text-amber-300"><Coins size={16} /> {p.zcoin.toLocaleString()}</div>
              {p.bonusPct > 0 && <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">加碼 +{p.bonusPct}%</div>}
              <div className="text-sm text-fg-muted mt-1">NT$ {p.twd.toLocaleString()}</div>
              {pkgId === p.id && <Check size={16} className="absolute top-3 left-3 text-accent" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {plans.map((p) => (
              <button key={p.id} onClick={() => setPlanId(p.id)}
                className={`relative text-left rounded-2xl border-2 p-4 transition ${planId === p.id ? "border-accent bg-accent/[0.06]" : "border-border bg-bg-card hover:border-accent/40"}`}>
                {p.popular && <span className="absolute -top-2 right-3 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black font-bold">省最多</span>}
                <div className="font-bold inline-flex items-center gap-1.5"><Crown size={16} /> {p.label}</div>
                <div className="text-2xl font-bold mt-1">NT$ {p.twd.toLocaleString()}<span className="text-sm text-fg-muted font-normal"> / {p.period === "year" ? "年" : "月"}</span></div>
                {p.period === "year" && <div className="text-[11px] text-emerald-600 dark:text-emerald-400">平均每月 NT$ {p.perMonth}</div>}
                {planId === p.id && <Check size={16} className="absolute top-3 left-3 text-accent" />}
              </button>
            ))}
          </div>
          <ul className="text-sm text-fg-muted space-y-1 bg-bg-card border border-border rounded-2xl p-4">
            {perks.map((x, i) => <li key={i} className="inline-flex items-start gap-2"><Check size={15} className="text-emerald-500 mt-0.5 shrink-0" /> {x}</li>)}
          </ul>
        </div>
      )}

      {/* 付款方式 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="text-sm font-bold inline-flex items-center gap-1.5"><CreditCard size={15} /> 付款方式</div>
        {noProviders ? (
          <div className="text-sm text-amber-700 dark:text-amber-300 inline-flex items-start gap-2"><Info size={15} className="mt-0.5 shrink-0" /> 金流設定中，尚未開通線上付款。請稍後再試或聯絡我們。</div>
        ) : (<>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <button key={p.id} onClick={() => pickProvider(p.id)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${provider === p.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated hover:border-accent/40"}`}>{p.label}</button>
            ))}
          </div>
          {curProvider && (
            <div className="flex flex-wrap gap-2">
              {curProvider.methods.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 rounded-full border text-xs transition ${method === m ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated hover:border-accent/40"}`}>{methodLabels[m] ?? m}</button>
              ))}
            </div>
          )}
          {curProvider && <div className="text-[11px] text-fg-muted inline-flex items-center gap-1"><Info size={12} /> 手續費約：{curProvider.fee}</div>}
        </>)}
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm">{err}</div>}

      <button onClick={pay} disabled={busy || noProviders} className="w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2">
        {busy ? <><Loader2 size={18} className="animate-spin" /> 前往付款…</> : <>前往付款</>}
      </button>
      <p className="text-[11px] text-fg-muted text-center">付款由第三方金流處理，AI 島不接觸你的卡號。Z幣不可退換、Pro 到期不自動續訂（一次性）。</p>
    </div>
  );
}

function submitForm(action: string, fields: Record<string, string>) {
  const f = document.createElement("form");
  f.method = "POST"; f.action = action; f.style.display = "none";
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden"; i.name = k; i.value = v; f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

"use client";

import { useState } from "react";
import { Check, X, Copy, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export type ProviderStatus = {
  key: string;
  label: string;
  region: string;
  currency: string;
  note?: string;
  enabled: boolean;
  envs: { name: string; set: boolean; optional?: boolean; hint?: string }[];
  webhooks: { label: string; url: string }[];
  steps: string[];
};

function Copyable({ text }: { text: string }) {
  const toast = useToast();
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("已複製"); } catch { toast.error("複製失敗"); } }}
      className="inline-flex items-center gap-1 text-fg-muted hover:text-accent shrink-0"
      title="複製"
    >
      <Copy size={12} />
    </button>
  );
}

export function PaymentsStatusClient({ live, site, usdRate, providers }: { live: boolean; site: string; usdRate: number; providers: ProviderStatus[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const enabledCount = providers.filter((p) => p.enabled).length;

  return (
    <div className="space-y-4">
      {/* 模式 + 摘要 */}
      <div className={`rounded-2xl border p-4 ${live ? "bg-emerald-500/5 border-emerald-500/30" : "bg-amber-500/5 border-amber-500/30"}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-bold inline-flex items-center gap-1.5 ${live ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}`}>
            {live ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            目前模式：{live ? "正式（PAYMENTS_LIVE=1）" : "測試機（PAYMENTS_LIVE 未設）"}
          </span>
          <span className="text-xs text-fg-muted">· {enabledCount} 家已設定會出現在 /store</span>
        </div>
        <p className="text-[11px] text-fg-muted mt-2 leading-relaxed">
          {live
            ? "正在打各家「正式」端點。務必已用測試機各過一筆再切正式。"
            : "綠界/藍新正在打「測試機」。用測試憑證跑；要切正式再設 PAYMENTS_LIVE=1。"}
        </p>
        <div className="text-[11px] text-fg-muted mt-2 flex items-center gap-2 flex-wrap">
          <span>站點網址（webhook 用）：</span>
          <code className="px-1.5 py-0.5 rounded bg-bg-elevated text-fg break-all">{site}</code>
          <Copyable text={site} />
          <span className="ml-1">· 海外匯率 1 USD = {usdRate} TWD</span>
        </div>
        <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-2 inline-flex items-start gap-1">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>webhook 是金流商「主動打你的網址」→ 站點網址必須外網可達（localhost 收不到入帳）。本機測用 ngrok/cloudflared 開隧道並把 NEXT_PUBLIC_SITE_URL 指過去。</span>
        </p>
      </div>

      {/* 各 provider */}
      <div className="grid md:grid-cols-2 gap-3">
        {providers.map((p) => {
          const isOpen = open === p.key;
          return (
            <div key={p.key} className={`surface p-4 ${p.enabled ? "" : "opacity-95"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold inline-flex items-center gap-2">
                  {p.enabled ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-fg-muted" />}
                  {p.label}
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{p.region}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{p.currency}</span>
                </div>
              </div>

              <div className={`text-[11px] mt-1 font-medium ${p.enabled ? "text-emerald-600 dark:text-emerald-300" : "text-fg-muted"}`}>
                {p.enabled ? "✓ 已設定 · 會出現在 /store" : "尚未設定完成（缺必填金鑰、/store 不顯示）"}
              </div>

              {p.note && <div className="text-[11px] text-amber-600 dark:text-amber-300 mt-1.5 leading-relaxed">{p.note}</div>}

              {/* env 檢查 */}
              <div className="mt-2 space-y-0.5">
                {p.envs.map((e) => (
                  <div key={e.name} className="flex items-center gap-1.5 text-[11px]">
                    {e.set ? <Check size={12} className="text-emerald-500 shrink-0" /> : <X size={12} className={`shrink-0 ${e.optional ? "text-fg-muted" : "text-red-400"}`} />}
                    <code className={`px-1 rounded bg-bg-elevated ${e.set ? "text-fg" : e.optional ? "text-fg-muted" : "text-red-500 dark:text-red-300"}`}>{e.name}</code>
                    {e.optional && <span className="text-fg-muted">(選填)</span>}
                    {e.hint && <span className="text-fg-muted truncate">— {e.hint}</span>}
                  </div>
                ))}
              </div>

              {/* webhook URLs */}
              <div className="mt-2.5 space-y-1">
                {p.webhooks.map((w) => (
                  <div key={w.url} className="text-[11px]">
                    <div className="text-fg-muted">{w.label} — 後台填這個：</div>
                    <div className="flex items-center gap-1.5">
                      <code className="px-1.5 py-0.5 rounded bg-bg-elevated text-accent break-all flex-1 min-w-0">{w.url}</code>
                      <Copyable text={w.url} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 設定步驟 */}
              <button onClick={() => setOpen(isOpen ? null : p.key)} className="mt-2.5 text-xs text-accent hover:underline inline-flex items-center gap-1">
                {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} 設定步驟
              </button>
              {isOpen && (
                <ol className="mt-1.5 space-y-1 text-[11px] text-fg-muted list-decimal ml-4 leading-relaxed">
                  {p.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-fg-muted">完整逐步說明見 <code className="px-1 rounded bg-bg-elevated">docs/setup/payments_setup.md</code>。改完 env 要重部署（Zeabur runtime env）才生效。</p>
    </div>
  );
}

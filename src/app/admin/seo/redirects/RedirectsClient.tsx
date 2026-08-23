"use client";

import { useState } from "react";
import { PageHero } from "@/components/admin/PageHero";
import { Check, CornerDownRight, Plus, Loader2, Trash2, Power } from "lucide-react";

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  enabled: boolean;
  hits: number;
  created_at?: string;
}

export default function RedirectsClient({ initial }: { initial: Redirect[] }) {
  const [rows, setRows] = useState<Redirect[]>(initial);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [code, setCode] = useState(301);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [confirmId, setConfirmId] = useState("");

  const add = async () => {
    if (adding) return;
    setErr("");
    if (!from.trim().startsWith("/")) { setErr("from_path 要以 / 開頭"); return; }
    if (!to.trim()) { setErr("填 to_path"); return; }
    setAdding(true);
    try {
      const r = await fetch("/api/admin/seo-redirects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_path: from.trim(), to_path: to.trim(), status_code: code }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "新增失敗"); return; }
      setRows((cur) => [d.redirect, ...cur]);
      setFrom(""); setTo(""); setCode(301);
    } catch { setErr("連線失敗"); } finally { setAdding(false); }
  };

  const toggle = async (row: Redirect) => {
    setBusyId(row.id);
    const next = !row.enabled;
    setRows((cur) => cur.map((x) => (x.id === row.id ? { ...x, enabled: next } : x)));
    try {
      await fetch(`/api/admin/seo-redirects?id=${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } catch { /* 樂觀更新、失敗下次 reload 會校正 */ } finally { setBusyId(""); }
  };

  const remove = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/seo-redirects?id=${id}`, { method: "DELETE" });
      if (r.ok) setRows((cur) => cur.filter((x) => x.id !== id));
    } catch { /* ignore */ } finally { setBusyId(""); setConfirmId(""); }
  };

  return (
    <div className="space-y-4">
      <PageHero
        icon={CornerDownRight}
        title="轉址管理"
        desc="301 / 302 轉址、避免 404 影響 SEO。從舊網址 redirect 到新位置、保留 Google 連結權重。（middleware 即時套用，最多 60 秒快取生效）"
        gradient="from-lime-500/10 via-green-500/10 to-emerald-500/10"
        borderColor="border-lime-500/30"
      />

      {/* 新增表單 */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="font-semibold text-sm mb-2 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> 新增轉址</div>
        <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-start">
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="來源 /old-path" className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-mono outline-none focus:border-accent" />
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="目的 /new-path 或 https://…" className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-mono outline-none focus:border-accent" />
          <select value={code} onChange={(e) => setCode(Number(e.target.value))} className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm">
            <option value={301}>301 永久</option>
            <option value={302}>302 暫時</option>
            <option value={307}>307</option>
            <option value={308}>308</option>
          </select>
          <button onClick={add} disabled={adding} className="inline-flex items-center gap-1.5 text-sm rounded-lg bg-accent text-black px-3.5 py-2 font-semibold disabled:opacity-50">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 新增
          </button>
        </div>
        {err && <div className="text-[11px] text-rose-500 mt-1.5">{err}</div>}
      </div>

      {/* 列表 */}
      {rows.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center text-fg-muted">還沒有轉址規則</div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
              <tr>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">命中</th>
                <th className="px-4 py-3">啟用</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-border ${r.enabled ? "" : "opacity-50"}`}>
                  <td className="px-4 py-3 font-mono text-xs break-all">{r.from_path}</td>
                  <td className="px-4 py-3 font-mono text-xs break-all">→ {r.to_path}</td>
                  <td className="px-4 py-3">{r.status_code}</td>
                  <td className="px-4 py-3">{r.hits ?? 0}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(r)} disabled={busyId === r.id} title={r.enabled ? "點擊停用" : "點擊啟用"}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${r.enabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-bg-elevated text-fg-muted"}`}>
                      {r.enabled ? <Check className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}{r.enabled ? "啟用中" : "停用"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.id)} disabled={busyId === r.id}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${confirmId === r.id ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-500"}`}>
                      <Trash2 className="w-3.5 h-3.5" />{confirmId === r.id ? "確認刪除" : "刪除"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

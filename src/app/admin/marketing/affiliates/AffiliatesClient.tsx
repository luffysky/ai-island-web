"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Row = {
  id: string;
  code: string;
  owner_name: string | null;
  description?: string | null;
  commission_pct: number;
  discount_pct: number;
  max_uses?: number | null;
  click_count: number;
  conversion: number;
  revenue: number;
  commission_paid: number;
  enabled: boolean;
};

export function AffiliatesClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    code: "",
    owner_name: "",
    description: "",
    commission_pct: "10",
    discount_pct: "0",
    max_uses: "",
  });

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const totalCommission = rows.reduce((s, r) => s + Number(r.commission_paid ?? 0), 0);
  const activeCount = rows.filter((r) => r.enabled).length;

  const create = () => {
    if (!form.code.trim()) {
      toast.warning("填代碼");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/affiliates", {
      credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code,
            owner_name: form.owner_name || null,
            description: form.description || null,
            commission_pct: Number(form.commission_pct) || 10,
            discount_pct: Number(form.discount_pct) || 0,
            max_uses: form.max_uses ? Number(form.max_uses) : null,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          toast.error(j.error || "建立失敗");
          return;
        }
        toast.success(`建立 ${form.code.toUpperCase()}`);
        setShowAdd(false);
        setForm({ code: "", owner_name: "", description: "", commission_pct: "10", discount_pct: "0", max_uses: "" });
        router.refresh();
      } catch (e: any) {
        toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
      }
    });
  };

  const toggleEnabled = (row: Row) => {
    const prev = row.enabled;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, enabled: !prev } : r)));
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/affiliates", {
      credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, enabled: !prev }),
        });
        if (!res.ok) throw new Error();
        toast.success(!prev ? "已啟用" : "已停用");
      } catch {
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, enabled: prev } : r)));
        toast.error("失敗");
      }
    });
  };

  const remove = async (row: Row) => {
    const ok = await confirm({
      title: `停用 ${row.code}？`,
      description: "停用後該推薦碼將不再接受新使用、歷史紀錄保留。",
      confirmLabel: "停用",
      destructive: true,
    });
    if (!ok) return;
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/marketing/affiliates?id=${row.id}`, {
      credentials: "include", method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("已停用");
      } catch {
        setRows((rs) => [...rs, row]);
        toast.error("停用失敗");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-fg-muted">有效推薦碼</div>
          <div className="text-2xl font-bold">{activeCount}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-fg-muted">累積帶來營收</div>
          <div className="text-2xl font-bold">NT$ {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-fg-muted">已付佣金</div>
          <div className="text-2xl font-bold">NT$ {totalCommission.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-full bg-cyan-500/15 text-cyan-900 dark:text-cyan-100 border border-cyan-500/30 text-sm inline-flex items-center gap-1.5 hover:bg-cyan-500/25 transition"
        >
          {showAdd ? <X size={13} /> : <Plus size={13} />}
          {showAdd ? "取消" : "新增推薦碼"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-bg-card border border-cyan-500/30 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="代碼 (英數/_-, 自動轉大寫)">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="NAMI20"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono uppercase"
                maxLength={30}
              />
            </Field>
            <Field label="推薦人名稱">
              <input
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                placeholder="KOL Nami / 員工小明"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
                maxLength={100}
              />
            </Field>
            <Field label="佣金 % (給推薦人)">
              <input
                type="number"
                value={form.commission_pct}
                onChange={(e) => setForm({ ...form, commission_pct: e.target.value })}
                min={0}
                max={100}
                step={0.1}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
              />
            </Field>
            <Field label="折扣 % (給用戶)">
              <input
                type="number"
                value={form.discount_pct}
                onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                min={0}
                max={100}
                step={0.1}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
              />
            </Field>
            <Field label="使用上限 (空白=無限)">
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="無限"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
              />
            </Field>
            <Field label="說明 (選)">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="2026 春季活動"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
                maxLength={500}
              />
            </Field>
          </div>
          <button
            onClick={create}
            disabled={pending || !form.code.trim()}
            className="px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border border-emerald-500/30 text-sm inline-flex items-center gap-1.5 hover:bg-emerald-500/25 transition disabled:opacity-50"
          >
            <Save size={13} /> 建立
          </button>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-bg-elevated text-[10px] font-bold text-fg-muted border-b border-border">
          <div className="col-span-2">代碼</div>
          <div className="col-span-2">推薦人</div>
          <div className="col-span-2 text-center">折扣 / 佣金</div>
          <div className="col-span-2 text-right">點擊 / 轉換</div>
          <div className="col-span-2 text-right">營收 / 佣金</div>
          <div className="col-span-2 text-right">操作</div>
        </div>
        {rows.length === 0 && (
          <div className="p-8 text-center text-fg-muted text-xs">還沒有推薦碼。點上方「新增」開始。</div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className={`grid grid-cols-12 gap-2 px-3 py-2 border-b border-border last:border-0 text-xs items-center transition ${
              r.enabled ? "" : "opacity-50"
            }`}
          >
            <div className="col-span-2 font-mono text-purple-300">{r.code}</div>
            <div className="col-span-2 truncate">{r.owner_name ?? "—"}</div>
            <div className="col-span-2 text-center text-fg-muted">{Number(r.discount_pct).toFixed(0)}% / {Number(r.commission_pct).toFixed(0)}%</div>
            <div className="col-span-2 text-right">{r.click_count} / {r.conversion}</div>
            <div className="col-span-2 text-right text-fg-muted">NT$ {Number(r.revenue).toLocaleString()} / {Number(r.commission_paid).toLocaleString()}</div>
            <div className="col-span-2 text-right flex items-center justify-end gap-1">
              <button
                onClick={() => toggleEnabled(r)}
                disabled={pending}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:border-accent disabled:opacity-50"
              >
                {r.enabled ? "停用" : "啟用"}
              </button>
              <button
                onClick={() => remove(r)}
                disabled={pending}
                className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-900 dark:text-red-100 hover:bg-red-500/25 disabled:opacity-50 inline-flex items-center gap-0.5"
              >
                <Trash2 size={9} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-fg-muted block mb-0.5">{label}</label>
      {children}
    </div>
  );
}

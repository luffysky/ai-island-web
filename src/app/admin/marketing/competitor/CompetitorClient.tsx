"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Row = {
  id: string;
  name: string;
  url: string | null;
  category: string | null;
  threat_level: string | null;
  notes: string | null;
  snapshot_at: string;
};

const THREAT_STYLE: Record<string, string> = {
  direct: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-fg-muted/15 text-fg-muted border-fg-muted/30",
};

export function CompetitorClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    url: "",
    category: "",
    threat_level: "medium",
    notes: "",
  });

  const create = () => {
    if (!form.name.trim()) {
      toast.warning("填名稱");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/competitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const j = await res.json();
        if (!res.ok) {
          toast.error(j.error || "建立失敗");
          return;
        }
        toast.success(`已加 ${form.name}`);
        setShowAdd(false);
        setForm({ name: "", url: "", category: "", threat_level: "medium", notes: "" });
        router.refresh();
      } catch (e: any) {
        toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
      }
    });
  };

  const remove = async (row: Row) => {
    const ok = await confirm({
      title: `刪除 ${row.name}？`,
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/marketing/competitor?id=${row.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("已刪除");
      } catch {
        setRows((rs) => [...rs, row]);
        toast.error("刪除失敗");
      }
    });
  };

  const setThreat = (row: Row, level: string) => {
    const prev = row.threat_level;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, threat_level: level } : r)));
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/competitor", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, threat_level: level }),
        });
        if (!res.ok) throw new Error();
        toast.success(`威脅 → ${level}`);
      } catch {
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, threat_level: prev } : r)));
        toast.error("失敗");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 text-sm inline-flex items-center gap-1.5 hover:bg-orange-500/25 transition"
        >
          {showAdd ? <X size={13} /> : <Plus size={13} />}
          {showAdd ? "取消" : "新增競品"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-bg-card border border-orange-500/30 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="名稱">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Codecademy"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
                maxLength={100}
              />
            </Field>
            <Field label="URL (選)">
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://codecademy.com"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono text-xs"
              />
            </Field>
            <Field label="分類 (選)">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="edu / ai / self-learn"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
                maxLength={50}
              />
            </Field>
            <Field label="威脅等級">
              <select
                value={form.threat_level}
                onChange={(e) => setForm({ ...form, threat_level: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="direct">direct — 同類同價位</option>
                <option value="high">high — 重疊大</option>
                <option value="medium">medium — 部分重疊</option>
                <option value="low">low — 擦邊</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="筆記 (選、最多 2000 字)">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="價格 / 主打 / 痛點觀察 / 我們差異化點"
                  rows={3}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
                  maxLength={2000}
                />
              </Field>
            </div>
          </div>
          <button
            onClick={create}
            disabled={pending || !form.name.trim()}
            className="px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm inline-flex items-center gap-1.5 hover:bg-emerald-500/25 transition disabled:opacity-50"
          >
            <Save size={13} /> 加入
          </button>
        </div>
      )}

      <div className="bg-purple-500/5 border border-purple-500/30 rounded-2xl p-4 text-xs">
        <div className="font-bold text-purple-300 mb-2">📋 已記錄競品 ({rows.length})</div>
        {rows.length === 0 ? (
          <p className="text-fg-muted">
            還沒記錄任何競品。建議追蹤：
            <span className="text-fg ml-1">Hahow / Codecademy / freeCodeCamp / 六角學院 / W3 schools / Real Python</span>
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{r.name}</span>
                    <select
                      value={r.threat_level ?? "medium"}
                      onChange={(e) => setThreat(r, e.target.value)}
                      disabled={pending}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border bg-transparent ${THREAT_STYLE[r.threat_level ?? "medium"]}`}
                    >
                      <option value="direct">direct</option>
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </select>
                    {r.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted">{r.category}</span>}
                  </div>
                  <button
                    onClick={() => remove(r)}
                    disabled={pending}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-50 inline-flex items-center gap-0.5"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline">
                    {r.url}
                  </a>
                )}
                {r.notes && <p className="text-xs text-fg-muted mt-1 whitespace-pre-wrap">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-bg-elevated/40 border border-border rounded-2xl p-4 text-xs leading-relaxed text-fg-muted">
        <div className="font-bold text-fg mb-1">📐 競品分析框架</div>
        <ul className="list-disc list-inside space-y-1">
          <li><b className="text-fg">威脅分級</b>：direct (同類同價位) / high (重疊大) / medium (部分重疊) / low (擦邊)</li>
          <li><b className="text-fg">看 3 維度</b>：價格 / 內容深度 / 用戶體驗</li>
          <li><b className="text-fg">差異化</b>：我們強在 <span className="text-emerald-300">繁中台灣感 + AI 寵物陪伴 + Z-coin 經濟 + 完整 75 章</span></li>
          <li><b className="text-fg">週期</b>：每 2 個月跑一次 snapshot、看價格 / 新功能</li>
        </ul>
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

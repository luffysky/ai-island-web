"use client";

import { useState } from "react";
import { Save, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Row = {
  usage_key: string;
  description: string;
  model_name: string;
  enabled: boolean;
};

type ModelMeta = {
  model_name: string;
  display_name: string | null;
  provider: string;
  is_active: boolean;
};

export function UsageModelsClient({
  initialRows,
  models,
}: {
  initialRows: Row[];
  models: ModelMeta[];
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const activeModels = models.filter((m) => m.is_active);

  const update = (key: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.usage_key === key ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai/usage-models", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "save failed");
      toast.success(`✅ 已儲存 ${j.upserted ?? 0} 筆設定、快取已清`);
    } catch (e: any) {
      toast.error(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-bg-elevated text-[11px] font-bold text-fg-muted border-b border-border">
          <div className="col-span-3">用途 key</div>
          <div className="col-span-4">說明</div>
          <div className="col-span-4">使用 model</div>
          <div className="col-span-1 text-center">啟用</div>
        </div>
        {rows.map((r) => (
          <div
            key={r.usage_key}
            className="grid grid-cols-12 gap-2 px-3 py-2.5 border-b border-border last:border-0 items-center hover:bg-bg-elevated/40"
          >
            <code className="col-span-3 text-[11px] text-purple-300 font-mono">{r.usage_key}</code>
            <div className="col-span-4 text-xs text-fg-muted">{r.description}</div>
            <select
              className="col-span-4 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-purple-400"
              value={r.model_name}
              onChange={(e) => update(r.usage_key, { model_name: e.target.value })}
            >
              <option value="">— 用預設 fallback —</option>
              {activeModels.map((m) => (
                <option key={m.model_name} value={m.model_name}>
                  [{m.provider}] {m.display_name ?? m.model_name}
                </option>
              ))}
            </select>
            <div className="col-span-1 text-center">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => update(r.usage_key, { enabled: e.target.checked })}
                className="w-4 h-4 accent-purple-500"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          儲存全部
        </button>
        <span className="text-[11px] text-fg-muted">
          <Sparkles size={11} className="inline" /> 改完即時生效、不需要重啟 server
        </span>
      </div>
    </div>
  );
}

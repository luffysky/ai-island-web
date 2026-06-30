"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Power } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Keyword = {
  id: string;
  keyword: string;
  severity: string;
  category: string;
  enabled: boolean;
};

const SEV_COLOR: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-900 dark:text-blue-200",
  warn: "bg-yellow-500/15 text-yellow-900 dark:text-yellow-200",
  high: "bg-orange-500/15 text-orange-900 dark:text-orange-200",
  critical: "bg-red-500/15 text-red-900 dark:text-red-200",
};

export function KeywordsClient({ initial }: { initial: Keyword[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState(initial);
  const [newKw, setNewKw] = useState("");
  const [newSev, setNewSev] = useState("warn");
  const [newCat, setNewCat] = useState("general");

  const create = async () => {
    if (!newKw.trim()) return;
    try {
      const res = await fetch("/api/admin/ai-keywords", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKw.trim().toLowerCase(), severity: newSev, category: newCat }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success("已新增");
      setNewKw(""); setNewSev("warn"); setNewCat("general");
      router.refresh();
    } catch (e: any) {
      toast.error(`新增失敗：${e?.message || ""}`);
    }
  };

  const toggle = async (k: Keyword) => {
    setList((l) => l.map((x) => x.id === k.id ? { ...x, enabled: !x.enabled } : x));
    await fetch(`/api/admin/ai-keywords/${k.id}`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !k.enabled }),
    });
    toast.success(k.enabled ? "已停用" : "已啟用");
  };

  const del = async (k: Keyword) => {
    const ok = await confirm({ title: `刪除關鍵字「${k.keyword}」？`, destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/admin/ai-keywords/${k.id}`, {
      credentials: "include", method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((x) => x.id !== k.id));
      toast.success("已刪除");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-card border border-border p-3 space-y-2">
        <div className="text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> 新增關鍵字</div>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2">
          <input value={newKw} onChange={(e) => setNewKw(e.target.value)} placeholder="關鍵字（自動小寫）" className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
          <select value={newSev} onChange={(e) => setNewSev(e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm">
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
          <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm">
            <option value="general">general</option>
            <option value="self_harm">self_harm</option>
            <option value="pii_leak">pii_leak</option>
            <option value="harassment">harassment</option>
            <option value="hate_speech">hate_speech</option>
            <option value="sexual">sexual</option>
            <option value="illegal">illegal</option>
          </select>
          <button onClick={create} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm flex items-center gap-1">
            <Plus size={13} /> 新增
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-bg-elevated text-fg-muted text-xs">
            <tr>
              <th className="text-left px-3 py-2">關鍵字</th>
              <th className="text-left px-3 py-2">嚴重度</th>
              <th className="text-left px-3 py-2">類別</th>
              <th className="text-left px-3 py-2">狀態</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-fg-muted text-sm">尚無關鍵字</td></tr>
            ) : list.map((k) => (
              <tr key={k.id} className={k.enabled ? "" : "opacity-50"}>
                <td className="px-3 py-2 font-mono">{k.keyword}</td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${SEV_COLOR[k.severity]}`}>{k.severity}</span>
                </td>
                <td className="px-3 py-2 text-xs text-fg-muted">{k.category}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggle(k)} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${k.enabled ? "bg-accent/15 text-accent" : "bg-bg-elevated text-fg-muted"}`}>
                    <Power size={11} /> {k.enabled ? "啟用" : "停用"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => del(k)} className="p-1.5 text-fg-muted hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

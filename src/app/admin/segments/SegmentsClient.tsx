"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

type Segment = {
  id: string;
  name: string;
  description: string | null;
  filter_json: any;
  created_at: string;
};

export function SegmentsClient({ initial }: { initial: Segment[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFilter, setNewFilter] = useState('{"xp_gte": 100}');

  const create = async () => {
    let parsed: any;
    try { parsed = JSON.parse(newFilter); } catch { return toast.error("filter 不是合法 JSON"); }
    if (!newName.trim()) return toast.warning("name 必填");
    try {
      const res = await fetch("/api/admin/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, filter_json: parsed }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("已新增");
      setNewName(""); setNewDesc(""); setNewFilter('{"xp_gte": 100}');
      router.refresh();
    } catch (e: any) {
      toast.error(`新增失敗：${e?.message || ""}`);
    }
  };

  const preview = async (filter: any) => {
    try {
      const res = await fetch("/api/admin/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter_json: filter }),
      });
      const j = await res.json();
      toast.info(`匹配 ${j.count} 位使用者`);
    } catch {
      toast.error("預覽失敗");
    }
  };

  const del = async (id: string) => {
    const ok = await confirm({ title: "刪除這個 segment？", destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/admin/segments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((s) => s.id !== id));
      toast.success("已刪除");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-card border border-border p-3 space-y-2">
        <h2 className="text-sm font-bold">＋ 新增 segment</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名稱（e.g. high_xp_members）" className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="說明" className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <textarea value={newFilter} onChange={(e) => setNewFilter(e.target.value)} rows={3} className="w-full bg-bg border border-border rounded-lg p-2 text-xs font-mono" />
        <p className="text-[10px] text-fg-muted">支援欄位：xp_gte / level_gte / role（member / premium / admin / teacher / assistant / editor）</p>
        <div className="flex gap-2">
          <button onClick={create} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm flex items-center gap-1">
            <Plus size={13} /> 新增
          </button>
          <button onClick={() => { try { preview(JSON.parse(newFilter)); } catch { toast.error("JSON 無效"); } }} className="px-4 py-1.5 rounded-lg border border-border text-sm flex items-center gap-1">
            <Users size={13} /> 預覽人數
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-bg-card border border-border divide-y divide-border">
        {list.length === 0 ? (
          <div className="text-center py-8 text-fg-muted text-sm">尚無 segment</div>
        ) : list.map((s) => (
          <div key={s.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">{s.name}</h3>
              {s.description && <p className="text-xs text-fg-muted">{s.description}</p>}
              <code className="text-[10px] text-fg-muted font-mono bg-bg-elevated px-2 py-0.5 rounded inline-block mt-1">{JSON.stringify(s.filter_json)}</code>
              <div className="text-[10px] text-fg-muted mt-1">建立於 {formatTW(s.created_at)}</div>
            </div>
            <button onClick={() => preview(s.filter_json)} className="text-xs px-2 py-1 rounded-lg border border-border hover:text-accent flex items-center gap-1">
              <Users size={11} /> 預覽
            </button>
            <button onClick={() => del(s.id)} className="p-1.5 text-fg-muted hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

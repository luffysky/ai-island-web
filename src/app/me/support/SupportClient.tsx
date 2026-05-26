"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTW } from "@/lib/format-date";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-500/15 text-yellow-900 dark:text-yellow-200",
  waiting_user: "bg-purple-500/15 text-purple-900 dark:text-purple-200",
  resolved: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
  closed: "bg-gray-500/15 text-gray-900 dark:text-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  open: "已送出",
  in_progress: "處理中",
  waiting_user: "等你回覆",
  resolved: "已解決",
  closed: "已關閉",
};

export function SupportClient({ initial }: { initial: Ticket[] }) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.warning("主旨 / 內文必填");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tickets", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, category, priority }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success("已送出、admin 會儘速處理");
      setSubject(""); setBody(""); setCategory("general"); setPriority("normal");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(`送出失敗：${e?.message || ""}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full p-4 border border-dashed border-border rounded-xl hover:border-accent flex items-center justify-center gap-2"
        >
          <Plus size={16} /> 開新工單
        </button>
      ) : (
        <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="主旨"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm">
              <option value="general">一般</option>
              <option value="billing">付款 / 訂閱</option>
              <option value="bug">問題回報</option>
              <option value="feature">功能建議</option>
              <option value="complaint">投訴</option>
              <option value="refund">退費</option>
              <option value="account">帳號</option>
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm">
              <option value="low">低</option>
              <option value="normal">普通</option>
              <option value="high">高</option>
              <option value="urgent">緊急</option>
            </select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="詳細描述..."
            rows={6}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
          />
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={submit} disabled={busy} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50 flex items-center gap-1">
              <Send size={13} /> 送出
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-1.5 rounded-lg border border-border text-sm">取消</button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-bg-card border border-border">
        <div className="px-4 py-2 border-b border-border text-sm font-bold">我的工單</div>
        {list.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">尚無工單</div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{t.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{t.priority}</span>
                  <span className="text-[10px] text-fg-muted ml-auto">{formatTW(t.created_at)}</span>
                </div>
                <h3 className="font-semibold mt-1">{t.subject}</h3>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] text-fg-muted text-center">
        💡 急事可在工單裡留 LINE / Email、admin 會儘速主動聯繫
      </p>
    </div>
  );
}

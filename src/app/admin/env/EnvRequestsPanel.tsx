"use client";

import { useEffect, useState } from "react";
import { Plus, Check, X, Loader2, ExternalLink, Mail, Key } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTWRelative } from "@/lib/format-date";

type Request = {
  id: string;
  requested_by_username: string | null;
  requested_by_display_name: string | null;
  key_name: string;
  purpose: string;
  status: "pending" | "done" | "rejected";
  created_at: string;
  resolved_at: string | null;
  resolved_by_username: string | null;
  resolved_note: string | null;
};

export function EnvRequestsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/env-requests");
      const j = await r.json();
      setList(j.requests ?? []);
    } catch {
      toast.error("載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async (id: string, status: "done" | "rejected") => {
    const ok = await confirm({
      title: status === "done" ? "標記為已完成？" : "拒絕這條申請？",
      description: status === "done"
        ? "確認你已經到 Zeabur 把這個 ENV 設好了。"
        : "拒絕後申請人會看到狀態變紅色。",
      confirmLabel: status === "done" ? "✓ 標完成" : "✕ 拒絕",
      destructive: status === "rejected",
    });
    if (!ok) return;

    try {
      const r = await fetch(`/api/admin/env-requests/${id}`, {
      credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "處理失敗");
      setList((prev) => prev.map((req) => req.id === id ? j.request : req));
      toast.success(status === "done" ? "已標完成" : "已拒絕");
    } catch (e: any) {
      toast.error(e?.message || "處理失敗");
    }
  };

  const pending = list.filter((r) => r.status === "pending");
  const resolved = list.filter((r) => r.status !== "pending");

  return (
    <section className="rounded-xl bg-bg-card border border-border">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Mail className="w-4 h-4" /> ENV 變更申請
          {pending.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">{pending.length} 待處理</span>
          )}
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-3 py-1.5 rounded-full bg-accent text-black font-bold inline-flex items-center gap-1 hover:scale-105 transition"
        >
          <Plus size={12} /> 申請新增變數
        </button>
      </header>

      {loading ? (
        <div className="text-center py-8 text-fg-muted text-sm">
          <Loader2 size={14} className="animate-spin inline mr-1" /> 載入中
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="還沒有任何申請"
          desc="需要新增 / 修改 Zeabur 環境變數時、點上面按鈕提交申請、林董會收到 LINE 通知"
        />
      ) : (
        <ul className="divide-y divide-border">
          {pending.map((r) => (
            <RequestRow key={r.id} req={r} onResolve={resolve} />
          ))}
          {resolved.length > 0 && pending.length > 0 && (
            <li className="px-4 py-1.5 text-[10px] text-fg-muted uppercase tracking-wider bg-bg-elevated/30">已處理</li>
          )}
          {resolved.map((r) => (
            <RequestRow key={r.id} req={r} />
          ))}
        </ul>
      )}

      {showModal && (
        <RequestModal
          onClose={() => setShowModal(false)}
          onSubmitted={(req) => {
            setList((prev) => [req, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </section>
  );
}

function RequestRow({
  req,
  onResolve,
}: {
  req: Request;
  onResolve?: (id: string, status: "done" | "rejected") => void;
}) {
  const isPending = req.status === "pending";
  const who = req.requested_by_display_name || req.requested_by_username || "—";

  return (
    <li className="px-4 py-3 flex items-start gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="font-mono text-xs text-accent break-all">{req.key_name}</code>
          <StatusBadge status={req.status} />
          {req.resolved_by_username && (
            <span className="text-[10px] text-fg-muted">by {req.resolved_by_username}</span>
          )}
        </div>
        <div className="text-xs text-fg mt-1 leading-snug">{req.purpose}</div>
        <div className="text-[10px] text-fg-muted mt-1">
          申請人 <b className="text-fg">{who}</b> · {formatTWRelative(req.created_at)}
          {req.resolved_at && <> · 處理於 {formatTWRelative(req.resolved_at)}</>}
        </div>
      </div>
      {isPending && onResolve && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="https://zeabur.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-accent inline-flex items-center gap-1 text-fg-muted hover:text-accent transition"
          >
            <ExternalLink size={10} /> Zeabur
          </a>
          <button
            onClick={() => onResolve(req.id, "done")}
            className="text-[10px] px-2.5 py-1 rounded-full bg-accent text-black font-bold inline-flex items-center gap-1"
          >
            <Check size={10} /> 已完成
          </button>
          <button
            onClick={() => onResolve(req.id, "rejected")}
            className="text-[10px] px-2 py-1 rounded-full border border-red-500/40 text-red-400 inline-flex items-center gap-1"
          >
            <X size={10} /> 拒絕
          </button>
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: Request["status"] }) {
  if (status === "pending") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-bold">PENDING</span>;
  if (status === "done") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-900 dark:text-green-200 font-bold">DONE</span>;
  return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-900 dark:text-red-200 font-bold">REJECTED</span>;
}

function RequestModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (req: Request) => void;
}) {
  const toast = useToast();
  const [keyName, setKeyName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!keyName.trim() || !purpose.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/env-requests", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_name: keyName.trim().toUpperCase(), purpose: purpose.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "提交失敗");
      toast.success("已送出、林董已收到 LINE 通知");
      onSubmitted(j.request);
    } catch (e: any) {
      toast.error(e?.message || "提交失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><Key className="w-4 h-4" /> 申請新增 ENV 變數</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-elevated"><X size={16} /></button>
        </header>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-fg-muted mb-1 block">變數 key 名（大寫 / 數字 / 底線）</label>
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="例如 NEW_PROVIDER_API_KEY"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent"
              maxLength={120}
            />
          </div>
          <div>
            <label className="text-xs text-fg-muted mb-1 block">用途說明</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="這個變數做什麼用？為什麼需要？（值不要寫這、私下傳給林董）"
              rows={4}
              className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
              maxLength={500}
            />
            <div className="text-[10px] text-fg-muted mt-1">{purpose.length} / 500</div>
          </div>
          <div className="text-[10px] text-fg-muted leading-relaxed bg-bg-elevated rounded-lg p-2">
            🛡️ <b>提醒</b>：這只送出「申請單」、變數的 <b>值不要寫在用途欄</b>。
            林董收到 LINE 通知後會私下跟你確認、再到 Zeabur dashboard 加。
          </div>
        </div>
        <footer className="px-5 py-3 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm">取消</button>
          <button
            onClick={submit}
            disabled={!keyName.trim() || !purpose.trim() || busy}
            className="flex-1 py-2 rounded-lg bg-accent text-black font-bold text-sm inline-flex items-center justify-center gap-1 disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            送出申請
          </button>
        </footer>
      </div>
    </div>
  );
}

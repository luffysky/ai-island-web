"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";

type TargetType = "thread" | "reply" | "blog_article" | "blog_comment" | "user" | "ai_message";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "🗑 廣告 / spam" },
  { value: "harassment", label: "😡 騷擾 / 攻擊" },
  { value: "hate_speech", label: "🚫 仇恨言論" },
  { value: "sexual", label: "🔞 色情內容" },
  { value: "self_harm", label: "💔 自傷 / 自殺" },
  { value: "illegal", label: "⚖️ 違法內容" },
  { value: "other", label: "📋 其他" },
];

/**
 * 通用「檢舉」按鈕（小 flag 圖示）+ modal。
 * 使用：<ReportButton targetType="reply" targetId={r.id} targetOwnerId={r.user_id} />
 */
export function ReportButton({
  targetType,
  targetId,
  targetOwnerId,
  size = 11,
  className = "",
}: {
  targetType: TargetType;
  targetId: string;
  targetOwnerId?: string;
  size?: number;
  className?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, target_owner_id: targetOwnerId, reason, note }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "失敗");
      }
      toast.success("已送出檢舉、感謝你協助我們維持環境");
      setOpen(false);
      setReason("");
      setNote("");
    } catch (e: any) {
      toast.error(`送出失敗：${e?.message || ""}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs text-fg-muted hover:text-red-400 flex items-center gap-0.5 ${className}`}
        title="檢舉"
        aria-label="檢舉這則內容"
      >
        <Flag size={size} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !busy && setOpen(false)}
            className="fixed inset-0 bg-black/55 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  <Flag size={15} className="text-red-400" /> 檢舉
                </h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-bg-elevated" disabled={busy}>
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-fg-muted mb-3">
                請選擇原因。admin 收到後會儘速處理、惡意檢舉可能會被警告。
              </p>
              <div className="space-y-1.5 mb-3">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm border transition ${
                      reason === r.value
                        ? "border-red-400 bg-red-500/10"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="text-red-400"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="補充說明（選）"
                rows={3}
                maxLength={500}
                className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
              />
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm"
                >取消</button>
                <button
                  onClick={submit}
                  disabled={!reason || busy}
                  className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold disabled:opacity-50"
                >
                  {busy ? "送出中…" : "送出檢舉"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

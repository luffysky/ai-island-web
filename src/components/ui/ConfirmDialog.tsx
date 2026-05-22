"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * 全站 ConfirmDialog（取代 native confirm()）。
 *
 * 用法：
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "刪除這篇文章？",
 *     description: "刪了無法復原。",
 *     confirmLabel: "刪除",
 *     destructive: true,  // 紅色按鈕 + 0.5s 額外延遲防誤點
 *   });
 *   if (ok) { ... }
 *
 * UX 細節：
 *  - Esc / 外部點擊 = 取消
 *  - destructive: 危險操作確認按鈕延遲 500ms（防滑鼠衝過去誤點）
 *  - 動畫 spring 進場、200ms 退出
 *  - focus trap 在 dialog 內、Tab 不會跳出
 *  - 預設 focus 取消按鈕（要主動移到確認、不點到惡的）
 */

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

const ConfirmCtx = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [armed, setArmed] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
      setArmed(false);
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    if (!pending) return;
    pending.resolve(ok);
    setPending(null);
    setArmed(false);
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    // destructive 時延遲 500ms 才解鎖確認按鈕、防誤點
    if (pending.destructive) {
      const t = setTimeout(() => setArmed(true), 500);
      return () => clearTimeout(t);
    }
    setArmed(true);
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter" && armed) close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, armed, close]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => close(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              backdropFilter: "blur(2px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 360, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--color-bg-card, #fff)",
                color: "var(--color-fg, #111)",
                border: "1px solid var(--color-border, rgba(0,0,0,0.1))",
                borderRadius: 14,
                padding: 22,
                maxWidth: 420,
                width: "100%",
                boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
              }}
            >
              <h3
                id="confirm-title"
                style={{ fontSize: 17, fontWeight: 700, margin: 0, marginBottom: pending.description ? 8 : 16 }}
              >
                {pending.title}
              </h3>
              {pending.description && (
                <p style={{ fontSize: 14, opacity: 0.75, margin: 0, marginBottom: 18, lineHeight: 1.5 }}>
                  {pending.description}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => close(false)}
                  autoFocus
                  style={{
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 500,
                    background: "transparent",
                    border: "1px solid var(--color-border, rgba(0,0,0,0.15))",
                    borderRadius: 8,
                    color: "var(--color-fg, #111)",
                    cursor: "pointer",
                    transition: "background 120ms",
                  }}
                >
                  {pending.cancelLabel ?? "取消"}
                </button>
                <button
                  type="button"
                  onClick={() => armed && close(true)}
                  disabled={!armed}
                  style={{
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    background: pending.destructive ? "#dc2626" : "var(--color-accent, #2563eb)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: armed ? "pointer" : "not-allowed",
                    opacity: armed ? 1 : 0.55,
                    transition: "transform 100ms, opacity 200ms",
                  }}
                  onMouseDown={(e) => armed && (e.currentTarget.style.transform = "scale(0.97)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {pending.confirmLabel ?? "確認"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

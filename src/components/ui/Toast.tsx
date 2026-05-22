"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * 全站 Toast / Notification 系統。
 *
 * 設計目標（UX-first）：
 *  - 非阻塞：絕不擋使用者下一步操作
 *  - 立刻可見：< 100ms 出現、framer-motion 60fps slide-in
 *  - 多 toast 堆疊（最新在最上）
 *  - 4s 自動 dismiss、hover 時暫停
 *  - 支援 action（例如「撤銷」按鈕、給破壞性操作做 undo）
 *  - 鍵盤可關（focus 後 Esc）
 *  - a11y：aria-live="polite"
 *
 * 用法：
 *   const toast = useToast();
 *   toast.success("已儲存");
 *   toast.error("送出失敗");
 *   toast("自訂訊息", { duration: 6000, action: { label: "撤銷", onClick: () => ... } });
 */

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
  createdAt: number;
};

type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
};

type ToastApi = {
  (message: string, options?: ToastOptions): string;
  success: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  error: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  info: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  warning: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, any>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const handle = timeouts.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timeouts.current.delete(id);
    }
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
    timeouts.current.forEach((handle) => clearTimeout(handle));
    timeouts.current.clear();
  }, []);

  const schedule = useCallback((id: string, duration: number) => {
    const handle = setTimeout(() => dismiss(id), duration);
    timeouts.current.set(id, handle);
  }, [dismiss]);

  const pause = useCallback((id: string) => {
    const handle = timeouts.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timeouts.current.delete(id);
    }
  }, []);

  const resume = useCallback((id: string) => {
    const item = toasts.find((t) => t.id === id);
    if (!item) return;
    const elapsed = Date.now() - item.createdAt;
    const remaining = Math.max(1000, item.duration - elapsed);
    schedule(id, remaining);
  }, [toasts, schedule]);

  const push = useCallback((message: string, options?: ToastOptions): string => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const variant = options?.variant ?? "info";
    const duration = options?.duration ?? DEFAULT_DURATION;
    const item: ToastItem = {
      id,
      message,
      variant,
      duration,
      action: options?.action,
      createdAt: Date.now(),
    };
    setToasts((list) => [...list, item]);
    schedule(id, duration);
    return id;
  }, [schedule]);

  const api: ToastApi = Object.assign(push, {
    success: (m: string, o?: Omit<ToastOptions, "variant">) => push(m, { ...o, variant: "success" }),
    error: (m: string, o?: Omit<ToastOptions, "variant">) => push(m, { ...o, variant: "error" }),
    info: (m: string, o?: Omit<ToastOptions, "variant">) => push(m, { ...o, variant: "info" }),
    warning: (m: string, o?: Omit<ToastOptions, "variant">) => push(m, { ...o, variant: "warning" }),
    dismiss,
    dismissAll,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toasts.length > 0) {
        dismiss(toasts[toasts.length - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts, dismiss]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} pause={pause} resume={resume} />
    </ToastCtx.Provider>
  );
}

function ToastViewport({
  toasts,
  dismiss,
  pause,
  resume,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 8,
        pointerEvents: "none",
        maxWidth: "calc(100vw - 40px)",
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id)}
            style={{
              pointerEvents: "auto",
              minWidth: 280,
              maxWidth: 420,
              background: variantBg(t.variant),
              color: variantFg(t.variant),
              border: `1px solid ${variantBorder(t.variant)}`,
              borderRadius: 12,
              padding: "10px 14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
            }}
            role={t.variant === "error" ? "alert" : "status"}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{variantIcon(t.variant)}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: variantFg(t.variant),
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="關閉提示"
              style={{
                background: "transparent",
                border: "none",
                color: variantFg(t.variant),
                opacity: 0.6,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function variantBg(v: ToastVariant): string {
  switch (v) {
    case "success": return "linear-gradient(135deg, #10b981, #059669)";
    case "error": return "linear-gradient(135deg, #ef4444, #dc2626)";
    case "warning": return "linear-gradient(135deg, #f59e0b, #d97706)";
    default: return "linear-gradient(135deg, #3b82f6, #2563eb)";
  }
}

function variantFg(_v: ToastVariant): string {
  return "#ffffff";
}

function variantBorder(v: ToastVariant): string {
  switch (v) {
    case "success": return "rgba(16,185,129,0.4)";
    case "error": return "rgba(239,68,68,0.4)";
    case "warning": return "rgba(245,158,11,0.4)";
    default: return "rgba(59,130,246,0.4)";
  }
}

function variantIcon(v: ToastVariant): string {
  switch (v) {
    case "success": return "✓";
    case "error": return "✕";
    case "warning": return "⚠";
    default: return "ℹ";
  }
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

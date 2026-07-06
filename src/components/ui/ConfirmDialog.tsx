"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * 全站對話框系統（取代醜醜的 native confirm() / alert() / prompt()）。
 *
 * 三個 hook，全部走同一個 <ConfirmProvider>（layout 只掛一次）：
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "刪除？", description: "無法復原", confirmLabel: "刪除", destructive: true });
 *
 *   const alert = useAlert();
 *   await alert("已儲存");                         // 字串速記
 *   await alert({ title: "評分結果", description: "85 分\n寫得不錯" });
 *
 *   const prompt = usePrompt();
 *   const name = await prompt({ title: "新分類名稱", placeholder: "例：我的碎片" }); // string | null
 *   const val  = await prompt("留言：");           // 字串速記
 *
 * UX：Esc / 外部點擊 = 取消；spring 進場；focus trap；destructive 延遲 500ms 防誤點。
 */

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type AlertOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

export type PromptOptions = {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  required?: boolean;
};

type ConfirmPending = ConfirmOptions & { kind: "confirm"; resolve: (ok: boolean) => void };
type AlertPending = AlertOptions & { kind: "alert"; resolve: () => void };
type PromptPending = PromptOptions & { kind: "prompt"; resolve: (val: string | null) => void };
type Pending = ConfirmPending | AlertPending | PromptPending;

const ConfirmCtx = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);
const AlertCtx = createContext<((options: AlertOptions | string) => Promise<void>) | null>(null);
const PromptCtx = createContext<((options: PromptOptions | string) => Promise<string | null>) | null>(null);

const BTN_BASE: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  borderRadius: 8,
  cursor: "pointer",
  transition: "transform 100ms, opacity 200ms, background 120ms",
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [armed, setArmed] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, kind: "confirm", resolve });
      setArmed(false);
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    const opts = typeof options === "string" ? { title: options } : options;
    return new Promise<void>((resolve) => {
      setPending({ ...opts, kind: "alert", resolve });
      setArmed(false);
    });
  }, []);

  const prompt = useCallback((options: PromptOptions | string): Promise<string | null> => {
    const opts = typeof options === "string" ? { title: options } : options;
    return new Promise<string | null>((resolve) => {
      setValue(opts.defaultValue ?? "");
      setPending({ ...opts, kind: "prompt", resolve });
      setArmed(false);
    });
  }, []);

  const settle = useCallback((result: boolean | string | null) => {
    setPending((cur) => {
      if (cur) {
        if (cur.kind === "confirm") cur.resolve(result === true);
        else if (cur.kind === "alert") cur.resolve();
        else cur.resolve(result === false || result === null ? null : (result as string));
      }
      return null;
    });
    setArmed(false);
    setValue("");
  }, []);

  useEffect(() => {
    if (!pending) return;
    if (pending.kind === "confirm" && pending.destructive) {
      const t = setTimeout(() => setArmed(true), 500);
      return () => clearTimeout(t);
    }
    setArmed(true);
    if (pending.kind === "prompt") {
      const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select?.(); }, 60);
      return () => clearTimeout(t);
    }
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(pending.kind === "alert" ? true : false);
      if (e.key === "Enter" && armed) {
        // prompt 多行時 Enter 換行、Cmd/Ctrl+Enter 才送出
        if (pending.kind === "prompt") {
          if (pending.multiline && !(e.metaKey || e.ctrlKey)) return;
          e.preventDefault();
          if (pending.required && !value.trim()) return;
          settle(value);
        } else {
          settle(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, armed, value, settle]);

  const destructive = pending?.kind === "confirm" && pending.destructive;
  const promptBlocked = pending?.kind === "prompt" && pending.required && !value.trim();

  return (
    <ConfirmCtx.Provider value={confirm}>
      <AlertCtx.Provider value={alert}>
        <PromptCtx.Provider value={prompt}>
          {children}
          <AnimatePresence>
            {pending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => settle(pending.kind === "alert" ? true : false)}
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
                aria-labelledby="dialog-title"
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
                    maxWidth: 440,
                    width: "100%",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
                  }}
                >
                  <h3
                    id="dialog-title"
                    style={{ fontSize: 17, fontWeight: 700, margin: 0, marginBottom: pending.description || pending.kind === "prompt" ? 8 : 16, whiteSpace: "pre-wrap" }}
                  >
                    {pending.title}
                  </h3>
                  {pending.description && (
                    <p style={{ fontSize: 14, opacity: 0.75, margin: 0, marginBottom: 18, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {pending.description}
                    </p>
                  )}
                  {pending.kind === "prompt" && (
                    <div style={{ marginBottom: 18 }}>
                      {pending.label && (
                        <label style={{ fontSize: 13, opacity: 0.75, display: "block", marginBottom: 6 }}>{pending.label}</label>
                      )}
                      {pending.multiline ? (
                        <textarea
                          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder={pending.placeholder}
                          rows={4}
                          style={{
                            width: "100%",
                            fontSize: 14,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--color-border, rgba(0,0,0,0.15))",
                            background: "var(--color-bg-elevated, rgba(0,0,0,0.03))",
                            color: "var(--color-fg, #111)",
                            outline: "none",
                            resize: "vertical",
                            lineHeight: 1.5,
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder={pending.placeholder}
                          style={{
                            width: "100%",
                            fontSize: 14,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--color-border, rgba(0,0,0,0.15))",
                            background: "var(--color-bg-elevated, rgba(0,0,0,0.03))",
                            color: "var(--color-fg, #111)",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    {pending.kind !== "alert" && (
                      <button
                        type="button"
                        onClick={() => settle(pending.kind === "prompt" ? null : false)}
                        autoFocus={pending.kind === "confirm"}
                        style={{
                          ...BTN_BASE,
                          fontWeight: 500,
                          background: "transparent",
                          border: "1px solid var(--color-border, rgba(0,0,0,0.15))",
                          color: "var(--color-fg, #111)",
                        }}
                      >
                        {(pending.kind === "confirm" || pending.kind === "prompt" ? pending.cancelLabel : undefined) ?? "取消"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!armed || promptBlocked) return;
                        if (pending.kind === "prompt") settle(value);
                        else if (pending.kind === "alert") settle(true);
                        else settle(true);
                      }}
                      disabled={!armed || promptBlocked}
                      autoFocus={pending.kind === "alert"}
                      style={{
                        ...BTN_BASE,
                        fontWeight: 700,
                        background: destructive ? "#dc2626" : "var(--color-accent, #2563eb)",
                        color: destructive ? "#fff" : "var(--color-accent-contrast, #fff)",
                        border: "none",
                        cursor: armed && !promptBlocked ? "pointer" : "not-allowed",
                        opacity: armed && !promptBlocked ? 1 : 0.55,
                      }}
                      onMouseDown={(e) => armed && !promptBlocked && (e.currentTarget.style.transform = "scale(0.97)")}
                      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      {(pending.kind === "confirm" || pending.kind === "prompt" || pending.kind === "alert" ? pending.confirmLabel : undefined) ?? (pending.kind === "prompt" ? "確定" : pending.kind === "alert" ? "知道了" : "確認")}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </PromptCtx.Provider>
      </AlertCtx.Provider>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function useAlert() {
  const ctx = useContext(AlertCtx);
  if (!ctx) throw new Error("useAlert must be used within <ConfirmProvider>");
  return ctx;
}

export function usePrompt() {
  const ctx = useContext(PromptCtx);
  if (!ctx) throw new Error("usePrompt must be used within <ConfirmProvider>");
  return ctx;
}

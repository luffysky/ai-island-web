"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Flag, Repeat, Save } from "lucide-react";
import type { Todo, TodoPriority } from "@/lib/types-todo";
import { recurLabel, isValidRecurRule } from "@/lib/todo-recur";

/**
 * TODO 詳細編輯 modal：截止日 / 優先度 / 重複規則 / 備註。
 * Esc / 外部點擊 = 取消、無破壞性按鈕。
 */
export function TodoEditModal({
  todo,
  onClose,
  onSave,
}: {
  todo: Todo;
  onClose: () => void;
  onSave: (patch: Partial<Todo>) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes ?? "");
  const [dueDate, setDueDate] = useState(todo.due_date ?? "");
  const [priority, setPriority] = useState<TodoPriority>(todo.priority);
  const [recurKind, setRecurKind] = useState<"none" | "daily" | "weekly" | "monthly">(
    todo.recur_rule?.startsWith("daily")
      ? "daily"
      : todo.recur_rule?.startsWith("weekly")
        ? "weekly"
        : todo.recur_rule?.startsWith("monthly")
          ? "monthly"
          : "none",
  );
  const [weekdays, setWeekdays] = useState<number[]>(() => {
    if (todo.recur_rule?.startsWith("weekly:")) {
      return todo.recur_rule.slice(7).split(",").map(Number).filter((n) => n >= 0 && n <= 6);
    }
    return [1, 3, 5];
  });
  const [monthDay, setMonthDay] = useState<number>(() => {
    if (todo.recur_rule?.startsWith("monthly:")) {
      return Math.max(1, Math.min(31, parseInt(todo.recur_rule.slice(8), 10) || 1));
    }
    return 1;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buildRecur = (): string | null => {
    if (recurKind === "none") return null;
    if (recurKind === "daily") return "daily";
    if (recurKind === "weekly") {
      const sorted = Array.from(new Set(weekdays)).sort();
      if (sorted.length === 0) return null;
      return `weekly:${sorted.join(",")}`;
    }
    if (recurKind === "monthly") return `monthly:${monthDay}`;
    return null;
  };

  const handleSave = async () => {
    const recur = buildRecur();
    if (recur && !isValidRecurRule(recur)) return;
    const patch: Partial<Todo> = {
      title: title.trim() || todo.title,
      notes: notes.trim() || null,
      due_date: dueDate || null,
      priority,
      recur_rule: recur,
    };
    await onSave(patch);
    onClose();
  };

  const toggleWeekday = (d: number) => {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 10001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(2px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base">編輯待辦</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg-elevated)]" aria-label="關閉">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--color-fg-muted)] block mb-1">標題</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--color-fg-muted)] block mb-1">備註（選）</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--color-fg-muted)] mb-1 flex items-center gap-1">
                  <Calendar size={11} /> 截止日
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-fg-muted)] mb-1 flex items-center gap-1">
                  <Flag size={11} /> 優先度
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) as TodoPriority)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
                >
                  <option value={1}>🔴 高</option>
                  <option value={2}>🟡 中</option>
                  <option value={3}>🟢 低</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--color-fg-muted)] mb-1 flex items-center gap-1">
                <Repeat size={11} /> 重複
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(["none", "daily", "weekly", "monthly"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRecurKind(k)}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      recurKind === k
                        ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] font-semibold"
                        : "bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    {k === "none" ? "不重複" : k === "daily" ? "每日" : k === "weekly" ? "每週" : "每月"}
                  </button>
                ))}
              </div>
              {recurKind === "weekly" && (
                <div className="flex gap-1">
                  {["日", "一", "二", "三", "四", "五", "六"].map((label, d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      className={`w-8 h-8 text-xs rounded-full border transition ${
                        weekdays.includes(d)
                          ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] font-bold"
                          : "bg-[var(--color-bg)] border-[var(--color-border)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {recurKind === "monthly" && (
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={monthDay}
                  onChange={(e) => setMonthDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                  className="w-24 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
                />
              )}
              <div className="text-[10px] text-[var(--color-fg-muted)] mt-1">
                {recurLabel(buildRecur())}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[var(--color-border)]">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm rounded-lg bg-[var(--color-accent)] text-black font-bold flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Save size={13} /> 儲存
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

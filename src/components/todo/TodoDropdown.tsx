"use client";

import { useEffect, useState, useMemo } from "react";
import { useOverlayRegister } from "@/lib/overlay-stack";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckSquare, X, Plus, Loader2 } from "lucide-react";
import type { Todo } from "@/lib/types-todo";
import { TodoItem } from "./TodoItem";
import { TodoEditModal } from "./TodoEditModal";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { usePopover, PopoverPanel } from "@/components/ui/Popover";

export function TodoDropdownButton() {
  const { user } = useAuth();
  const popover = usePopover({ placement: "bottom-end", maxWidth: 420 });
  const { open, setOpen } = popover;
  const [todoCount, setTodoCount] = useState(0);
  useOverlayRegister(open);

  // shortcut: ⌘⇧T / Ctrl+Shift+T
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdShiftT = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "T" || e.key === "t");
      if (isCmdShiftT) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // todoCount badge
  useEffect(() => {
    if (!user) {
      setTodoCount(0);
      return;
    }
    const load = () => {
      fetch("/api/todo")
        .then((r) => r.json())
        .then((j) => setTodoCount((j.todos ?? []).filter((t: any) => !t.completed).length))
        .catch(() => {});
    };
    load();
    const onTodoEvent = () => load();
    window.addEventListener("pet:todo-completed", onTodoEvent);
    return () => window.removeEventListener("pet:todo-completed", onTodoEvent);
  }, [user?.id]);

  // 關閉後 refresh badge
  useEffect(() => {
    if (open || !user) return;
    fetch("/api/todo")
      .then((r) => r.json())
      .then((j) => setTodoCount((j.todos ?? []).filter((t: any) => !t.completed).length))
      .catch(() => {});
  }, [open, user?.id]);

  if (!user) return null;

  return (
    <>
      <button
        ref={popover.refs.setReference}
        {...popover.getReferenceProps()}
        aria-label="開啟待辦清單"
        title="待辦清單（⌘⇧T / Ctrl+Shift+T）"
        className="relative flex items-center p-1.5 rounded-lg hover:bg-bg-card transition active:scale-95"
      >
        <CheckSquare size={17} className={todoCount > 0 ? "text-accent" : ""} />
        {todoCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
            {todoCount > 99 ? "99+" : todoCount}
          </span>
        )}
      </button>
      <PopoverPanel api={popover} className="w-[420px] max-w-[calc(100vw-1rem)] flex flex-col">
        <TodoPanelBody onClose={() => setOpen(false)} />
      </PopoverPanel>
    </>
  );
}

function TodoPanelBody({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editTarget, setEditTarget] = useState<Todo | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/todo")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setTodos(j.todos ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("待辦載入失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { rootIds, childrenById } = useMemo(() => {
    const childrenById: Record<string, Todo[]> = {};
    const rootIds: string[] = [];
    const visibleTodos = showCompleted ? todos : todos.filter((t) => !t.completed);
    for (const t of visibleTodos) {
      if (t.parent_id) {
        if (!childrenById[t.parent_id]) childrenById[t.parent_id] = [];
        childrenById[t.parent_id].push(t);
      } else {
        rootIds.push(t.id);
      }
    }
    for (const arr of Object.values(childrenById)) {
      arr.sort((a, b) => a.sort_order - b.sort_order);
    }
    const rootArr = visibleTodos.filter((t) => !t.parent_id);
    rootArr.sort((a, b) => a.sort_order - b.sort_order);
    return { rootIds: rootArr.map((t) => t.id), childrenById };
  }, [todos, showCompleted]);

  const byId = useMemo(() => {
    const m = new Map<string, Todo>();
    for (const t of todos) m.set(t.id, t);
    return m;
  }, [todos]);

  const addTodo = async (parentId: string | null = null, title?: string) => {
    const t = (title ?? input).trim();
    if (!t || adding) return;
    setAdding(true);
    const tempId = `temp_${Date.now()}`;
    const temp: Todo = {
      id: tempId,
      user_id: "",
      parent_id: parentId,
      title: t,
      notes: null,
      completed: false,
      completed_at: null,
      due_date: null,
      priority: 2,
      sort_order: Date.now(),
      recur_rule: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTodos((prev) => [...prev, temp]);
    if (!title) setInput("");

    try {
      const res = await fetch("/api/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, parent_id: parentId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "新增失敗");
      setTodos((prev) => prev.map((x) => (x.id === tempId ? j.todo : x)));
    } catch (e: any) {
      setTodos((prev) => prev.filter((x) => x.id !== tempId));
      toast.error(`新增失敗：${e?.message || "未知錯誤"}`);
    } finally {
      setAdding(false);
    }
  };

  const patchTodo = async (id: string, patch: Partial<Todo>) => {
    const before = byId.get(id);
    if (!before) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      const res = await fetch(`/api/todo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "更新失敗");
      setTodos((prev) => {
        const next = prev.map((t) => (t.id === id ? j.todo : t));
        if (j.next) next.push(j.next);
        return next;
      });
    } catch (e: any) {
      setTodos((prev) => prev.map((t) => (t.id === id ? before : t)));
      toast.error(`更新失敗：${e?.message || "未知錯誤"}`);
    }
  };

  const toggle = async (id: string, completed: boolean) => {
    await patchTodo(id, { completed });
    if (completed && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pet:todo-completed", { detail: { id } }));
    }
  };

  const remove = async (id: string) => {
    const target = byId.get(id);
    if (!target) return;
    const childCount = todos.filter((t) => t.parent_id === id).length;
    const ok = await confirm({
      title: `刪除「${target.title}」？`,
      description: childCount > 0 ? `會連同 ${childCount} 個子任務一起刪除、5 秒內可撤銷。` : "5 秒內可撤銷。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;

    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parent_id !== id));

    let undone = false;
    toast.warning("已刪除待辦", {
      duration: 5000,
      action: {
        label: "撤銷",
        onClick: () => {
          undone = true;
          setTodos(snapshot);
        },
      },
    });

    setTimeout(async () => {
      if (undone) return;
      const res = await fetch(`/api/todo/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setTodos(snapshot);
        toast.error("刪除失敗、已恢復");
      }
    }, 5000);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeTodo = byId.get(active.id as string);
    const overTodo = byId.get(over.id as string);
    if (!activeTodo || !overTodo) return;
    if (activeTodo.parent_id !== overTodo.parent_id) return;

    const siblings = todos
      .filter((t) => t.parent_id === activeTodo.parent_id && !t.completed)
      .sort((a, b) => a.sort_order - b.sort_order);
    const oldIdx = siblings.findIndex((t) => t.id === active.id);
    const newIdx = siblings.findIndex((t) => t.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(siblings, oldIdx, newIdx);

    const updates = reordered.map((t, i) => ({ id: t.id, sort_order: (i + 1) * 1000 }));
    const updateMap = new Map(updates.map((u) => [u.id, u.sort_order]));
    setTodos((prev) =>
      prev.map((t) => (updateMap.has(t.id) ? { ...t, sort_order: updateMap.get(t.id)! } : t)),
    );

    try {
      const res = await fetch("/api/todo/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updates }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("排序儲存失敗、請重整");
    }
  };

  const remaining = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-accent" />
            <h3 className="font-bold text-sm">待辦清單</h3>
            <span className="text-[10px] text-fg-muted">{remaining} 未完</span>
          </div>
          <div className="flex items-center gap-1">
            {completedCount > 0 && (
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="text-[10px] text-fg-muted hover:text-accent px-2 py-0.5 rounded"
              >
                {showCompleted ? "隱藏已完成" : `顯示已完成 (${completedCount})`}
              </button>
            )}
            <button onClick={onClose} aria-label="關閉" className="p-1 rounded hover:bg-bg-elevated">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-border">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTodo(null);
              }}
              placeholder="加個待辦、Enter 送出"
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
              maxLength={200}
            />
            <button
              onClick={() => addTodo(null)}
              disabled={!input.trim() || adding}
              className="px-2.5 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform flex items-center"
              aria-label="新增"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1 py-1 max-h-[60vh]">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-fg-muted">
              <Loader2 size={16} className="animate-spin inline mr-1" /> 載入中...
            </div>
          ) : rootIds.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-fg-muted">
              目前沒有待辦事項。
              <br />
              上面輸入框寫一條開始吧 ✨
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
                {rootIds.map((id) => {
                  const todo = byId.get(id);
                  if (!todo) return null;
                  const children = childrenById[id];
                  return (
                    <TodoItem
                      key={id}
                      todo={todo}
                      children={children}
                      onToggle={toggle}
                      onDelete={remove}
                      onTitleChange={(id, title) => patchTodo(id, { title })}
                      onEditDetails={(t) => setEditTarget(t)}
                      onAddChild={(parentId) => {
                        const t = window.prompt("子任務內容：");
                        if (t && t.trim()) addTodo(parentId, t.trim());
                      }}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-border text-[10px] text-fg-muted flex items-center justify-between">
          <span>雙擊標題可編輯 · 拖曳排序</span>
          <kbd className="px-1 py-0.5 rounded bg-bg-elevated font-mono text-[9px]">
            ⌘⇧T
          </kbd>
        </div>

      {editTarget && (
        <TodoEditModal
          todo={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(patch) => patchTodo(editTarget.id, patch)}
        />
      )}
    </>
  );
}

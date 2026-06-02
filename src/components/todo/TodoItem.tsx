"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Calendar, Repeat, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import type { Todo } from "@/lib/types-todo";
import { recurLabel } from "@/lib/todo-recur";

const PRIORITY_COLOR: Record<number, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#10b981",
};

function dueLabel(due: string | null): { text: string; tone: string } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due);
  dueDate.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `逾期 ${-diff} 天`, tone: "#ef4444" };
  if (diff === 0) return { text: "今天", tone: "#f59e0b" };
  if (diff === 1) return { text: "明天", tone: "#f59e0b" };
  if (diff <= 7) return { text: `${diff} 天內`, tone: "#84cc16" };
  return { text: `${dueDate.getMonth() + 1}/${dueDate.getDate()}`, tone: "#94a3b8" };
}

export function TodoItem({
  todo,
  subTodos,
  onToggle,
  onDelete,
  onTitleChange,
  onEditDetails,
  onAddChild,
  depth = 0,
}: {
  todo: Todo;
  subTodos?: Todo[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onEditDetails: (todo: Todo) => void;
  onAddChild?: (parentId: string) => void;
  depth?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [expanded, setExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraftTitle(todo.title), [todo.title]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draftTitle.trim();
    if (next && next !== todo.title) onTitleChange(todo.id, next);
    setEditing(false);
  };

  const due = dueLabel(todo.due_date);
  const hasChildren = (subTodos?.length ?? 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <div
        className={`group flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-bg-elevated transition ${
          todo.completed ? "opacity-55" : ""
        }`}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-fg-muted opacity-0 group-hover:opacity-100 transition"
          aria-label="拖曳排序"
          title="拖曳排序"
        >
          <GripVertical size={13} />
        </button>

        {hasChildren && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-fg-muted hover:text-fg p-0.5"
            aria-label={expanded ? "收合子任務" : "展開子任務"}
          >
            <ChevronRight size={12} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}

        <button
          onClick={() => onToggle(todo.id, !todo.completed)}
          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
            todo.completed
              ? "bg-accent border-accent"
              : "border-border hover:border-accent"
          }`}
          aria-label={todo.completed ? "取消完成" : "標記完成"}
        >
          {todo.completed && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="black" strokeWidth="2">
              <polyline points="1,4 3,6 7,2" />
            </svg>
          )}
        </button>

        <span
          className="w-1 h-4 rounded-full shrink-0"
          style={{ background: PRIORITY_COLOR[todo.priority] }}
          title={`優先 ${todo.priority === 1 ? "高" : todo.priority === 2 ? "中" : "低"}`}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraftTitle(todo.title);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent text-sm outline-none border-b border-accent"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-text truncate ${todo.completed ? "line-through" : ""}`}
            title="雙擊編輯標題"
          >
            {todo.title}
          </span>
        )}

        {due && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 shrink-0"
            style={{ background: `${due.tone}22`, color: due.tone }}
          >
            <Calendar size={9} /> {due.text}
          </span>
        )}
        {todo.recur_rule && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold flex items-center gap-0.5 shrink-0"
            title={recurLabel(todo.recur_rule)}
          >
            <Repeat size={9} />
          </span>
        )}

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition gap-0.5 shrink-0">
          {onAddChild && depth === 0 && (
            <button
              onClick={() => onAddChild(todo.id)}
              className="p-1 rounded text-fg-muted hover:text-accent"
              title="新增子任務"
              aria-label="新增子任務"
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={() => onEditDetails(todo)}
            className="p-1 rounded text-fg-muted hover:text-fg"
            title="詳細編輯"
            aria-label="詳細編輯"
          >
            <MoreHorizontal size={12} />
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="p-1 rounded text-fg-muted hover:text-red-400"
            title="刪除"
            aria-label="刪除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {hasChildren && expanded && subTodos && (
        <div className="border-l border-border ml-4">
          {subTodos.map((c) => (
            <TodoItem
              key={c.id}
              todo={c}
              depth={depth + 1}
              onToggle={onToggle}
              onDelete={onDelete}
              onTitleChange={onTitleChange}
              onEditDetails={onEditDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

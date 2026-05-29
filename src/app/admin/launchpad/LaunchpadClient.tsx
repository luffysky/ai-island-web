"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, X, Loader2, Search } from "lucide-react";

type Board = { id: string; slug: string; title: string; emoji: string | null; description: string | null; position: number };
type Column = { id: string; board_id: string; title: string; emoji: string | null; color: string; position: number };
type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  category: string | null;
  labels: string[];
  position: number;
  meta: any;
  updated_at: string;
};

const COLOR_STYLES: Record<string, { bar: string; chip: string }> = {
  gray:   { bar: "bg-gray-400",   chip: "chip-neutral" },
  blue:   { bar: "bg-blue-500",   chip: "chip-info" },
  green:  { bar: "bg-green-500",  chip: "chip-success" },
  orange: { bar: "bg-orange-500", chip: "chip-warn" },
  red:    { bar: "bg-red-500",    chip: "chip-danger" },
  purple: { bar: "bg-purple-500", chip: "chip-info" },
};

// channel category 顯示用 emoji
const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  line_student: { emoji: "💚", label: "LINE 學員" },
  line_admin:   { emoji: "💼", label: "LINE admin" },
  tg:           { emoji: "✈️", label: "Telegram" },
  discord:      { emoji: "🎮", label: "Discord" },
  web_front:    { emoji: "🌐", label: "網站前台" },
  web_admin:    { emoji: "🔧", label: "網站後台" },
  ai:           { emoji: "🤖", label: "AI / 雪鑰" },
  cron:         { emoji: "⏰", label: "cron / 自動化" },
  content:      { emoji: "📚", label: "內容 / 章節" },
  idea:         { emoji: "💡", label: "想法" },
  bug:          { emoji: "🐛", label: "bug" },
  refactor:     { emoji: "♻️", label: "重構" },
  marketing:    { emoji: "📣", label: "行銷" },
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_META);

export function LaunchpadClient() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [adding, setAdding] = useState<{ columnId: string; boardSlug: string } | null>(null);

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kanban", { credentials: "include" });
      if (res.ok) {
        const j = await res.json();
        setBoards(j.boards ?? []);
        setColumns(j.columns ?? []);
        setCards(j.cards ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function patchCard(id: string, body: any) {
    const res = await fetch(`/api/admin/kanban/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = await res.json();
      setCards((cs) => cs.map((c) => (c.id === id ? j.card : c)));
    }
  }

  async function deleteCard(id: string) {
    if (!confirm("刪掉這張卡？")) return;
    const res = await fetch(`/api/admin/kanban/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setCards((cs) => cs.filter((c) => c.id !== id));
  }

  async function addCard(payload: any) {
    const res = await fetch("/api/admin/kanban", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const j = await res.json();
      setCards((cs) => [...cs, j.card]);
      setAdding(null);
    }
  }

  // 拖曳：onDragStart 記 id、onDrop 改 column_id
  function onDragStart(id: string) { setDraggingId(id); }
  function onDragEnd() { setDraggingId(null); }
  function onDropToColumn(columnId: string) {
    if (!draggingId) return;
    const card = cards.find((c) => c.id === draggingId);
    if (!card || card.column_id === columnId) return;
    // optimistic
    setCards((cs) => cs.map((c) => (c.id === draggingId ? { ...c, column_id: columnId } : c)));
    patchCard(draggingId, { column_id: columnId });
    setDraggingId(null);
  }

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (filterCategory && c.category !== filterCategory) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !(c.description ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [cards, filterCategory, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-fg-muted">
        <Loader2 size={20} className="animate-spin mr-2" /> 載入中...
      </div>
    );
  }

  return (
    <div>
      {/* 工具列：搜尋 + 分類過濾 */}
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-fg-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋卡片標題 / 描述..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm"
        >
          <option value="">全部分類</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
          ))}
        </select>
        <span className="text-xs text-fg-muted">{filteredCards.length} / {cards.length} 卡</span>
      </div>

      {/* 多 board horizontal sections */}
      <div className="space-y-6">
        {boards.map((board) => {
          const boardCols = columns.filter((c) => c.board_id === board.id).sort((a, b) => a.position - b.position);
          return (
            <section key={board.id}>
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <span>{board.emoji}</span>
                <span>{board.title}</span>
                {board.description && <span className="text-xs text-fg-muted font-normal">— {board.description}</span>}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {boardCols.map((col) => {
                  const colCards = filteredCards.filter((c) => c.column_id === col.id);
                  const style = COLOR_STYLES[col.color] ?? COLOR_STYLES.gray;
                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={() => onDropToColumn(col.id)}
                      className="bg-bg-card border border-border rounded-xl p-3 flex flex-col min-h-[160px]"
                    >
                      <div className={`-mx-3 -mt-3 mb-3 px-3 py-2 rounded-t-xl ${style.bar} bg-opacity-15 dark:bg-opacity-20 flex items-center justify-between`}>
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <span>{col.emoji}</span>
                          <span>{col.title}</span>
                          <span className="text-xs text-fg-muted">({colCards.length})</span>
                        </h3>
                        <button
                          onClick={() => setAdding({ columnId: col.id, boardSlug: board.slug })}
                          className="p-1 text-fg-muted hover:text-fg"
                          title="加卡片"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 flex-1">
                        {colCards.map((card) => {
                          const catMeta = card.category ? CATEGORY_META[card.category] : null;
                          return (
                            <div
                              key={card.id}
                              draggable
                              onDragStart={() => onDragStart(card.id)}
                              onDragEnd={onDragEnd}
                              onClick={() => setEditingCard(card)}
                              className={`bg-bg-elevated border border-border rounded-lg p-2.5 text-sm cursor-pointer hover:border-accent transition ${draggingId === card.id ? "opacity-40" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="flex-1 font-medium leading-snug">{card.title}</p>
                                {catMeta && <span className="text-xs">{catMeta.emoji}</span>}
                              </div>
                              {card.description && (
                                <p className="text-xs text-fg-muted mt-1 line-clamp-2">{card.description}</p>
                              )}
                              {(card.labels?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {card.labels!.slice(0, 4).map((l) => (
                                    <span key={l} className="chip chip-neutral text-[10px] px-1.5 py-0">{l}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {colCards.length === 0 && (
                          <div className="text-xs text-fg-muted py-3 text-center border border-dashed border-border rounded">
                            空、拖卡片過來 / 點 + 加
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* 編輯 modal */}
      {editingCard && (
        <Modal onClose={() => setEditingCard(null)}>
          <EditCardForm
            card={editingCard}
            onSave={async (body) => {
              await patchCard(editingCard.id, body);
              setEditingCard(null);
            }}
            onDelete={async () => {
              await deleteCard(editingCard.id);
              setEditingCard(null);
            }}
          />
        </Modal>
      )}

      {/* 新增 modal */}
      {adding && (
        <Modal onClose={() => setAdding(null)}>
          <NewCardForm
            onSave={(body) => addCard({ column_id: adding.columnId, ...body })}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-fg-muted hover:text-fg"><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}

function EditCardForm({ card, onSave, onDelete }: { card: Card; onSave: (body: any) => void | Promise<void>; onDelete: () => void | Promise<void> }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [category, setCategory] = useState(card.category ?? "");
  const [labelsRaw, setLabelsRaw] = useState((card.labels ?? []).join(", "));

  return (
    <div>
      <h3 className="font-bold mb-3">編輯卡片</h3>
      <label className="text-xs text-fg-muted">標題</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />
      <label className="text-xs text-fg-muted">描述</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3 min-h-[80px]" />
      <label className="text-xs text-fg-muted">分類</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3">
        <option value="">— 無 —</option>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
        ))}
      </select>
      <label className="text-xs text-fg-muted">標籤（逗號分隔）</label>
      <input value={labelsRaw} onChange={(e) => setLabelsRaw(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-4" placeholder="urgent, P0, frontend..." />
      <div className="flex items-center justify-between">
        <button onClick={onDelete} className="btn-chip btn-chip-danger">
          <Trash2 size={14} /> 刪除
        </button>
        <button
          onClick={() => onSave({
            title,
            description: description || null,
            category: category || null,
            labels: labelsRaw.split(",").map((l) => l.trim()).filter(Boolean),
          })}
          className="btn-chip btn-chip-success"
        >
          存檔
        </button>
      </div>
    </div>
  );
}

function NewCardForm({ onSave }: { onSave: (body: any) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  return (
    <div>
      <h3 className="font-bold mb-3">加新卡片</h3>
      <label className="text-xs text-fg-muted">標題（必填）</label>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />
      <label className="text-xs text-fg-muted">描述</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3 min-h-[80px]" />
      <label className="text-xs text-fg-muted">分類</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-4">
        <option value="">— 無 —</option>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
        ))}
      </select>
      <button
        disabled={!title.trim()}
        onClick={() => onSave({ title: title.trim(), description: description.trim() || null, category: category || null })}
        className="btn-chip btn-chip-success w-full justify-center disabled:opacity-50"
      >
        加進去
      </button>
    </div>
  );
}

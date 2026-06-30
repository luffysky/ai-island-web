"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, X, XCircle, Loader2, Search, Sparkles, Wand2, ExternalLink, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

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
  const [aiAddOpen, setAiAddOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [collapsedBoards, setCollapsedBoards] = useState<Record<string, boolean>>({});
  const [autoSyncing, setAutoSyncing] = useState(false);

  // 載 / 存收合狀態
  useEffect(() => {
    try {
      const saved = localStorage.getItem("launchpad_collapsed_boards");
      if (saved) setCollapsedBoards(JSON.parse(saved));
    } catch {}
  }, []);
  function toggleBoard(slug: string) {
    setCollapsedBoards((prev) => {
      const next = { ...prev, [slug]: !prev[slug] };
      try { localStorage.setItem("launchpad_collapsed_boards", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function setAllBoards(collapsed: boolean) {
    const next: Record<string, boolean> = {};
    for (const b of boards) next[b.slug] = collapsed;
    setCollapsedBoards(next);
    try { localStorage.setItem("launchpad_collapsed_boards", JSON.stringify(next)); } catch {}
  }

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

  async function aiAddCard(text: string, target_board: "todo" | "wishlist" | "") {
    const res = await fetch("/api/admin/kanban/ai-add", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_board: target_board || undefined }),
    });
    const j = await res.json();
    if (res.ok && j.ok) {
      setCards((cs) => [...cs, j.card]);
      setAiAddOpen(false);
      return j;
    }
    alert(`AI 建卡失敗：${j.error ?? "unknown"}`);
    return null;
  }

  async function loadSuggestions() {
    setSuggestLoading(true);
    setSuggestOpen(true);
    try {
      const res = await fetch("/api/admin/kanban/suggest", {
        method: "POST",
        credentials: "include",
      });
      // 防 502 回 HTML、res.json() 會 throw、要 catch
      const text = await res.text();
      let j: any;
      try { j = JSON.parse(text); }
      catch {
        j = { error: `Server ${res.status}: ${text.slice(0, 200).replace(/<[^>]+>/g, " ").trim() || "no body"}` };
      }
      setSuggestions(j);
    } catch (e: any) {
      setSuggestions({ error: e?.message ?? "fetch failed" });
    } finally {
      setSuggestLoading(false);
    }
  }

  async function autoSync() {
    if (autoSyncing) return;
    if (!confirm("讓雪鑰掃 GitHub 最近 commit、自動把已完成的卡移到 DONE？")) return;
    setAutoSyncing(true);
    try {
      const res = await fetch("/api/admin/kanban/auto-sync", { method: "POST", credentials: "include" });
      const j = await res.json();
      if (j.ok) {
        const msg = j.moved > 0
          ? `✨ 雪鑰移了 ${j.moved} 張到 DONE：\n${(j.moved_details ?? []).slice(0, 5).map((d: any) => `✓ ${d.title}`).join("\n")}`
          : `雪鑰掃了 ${j.scanned_commits} 個 commit / ${j.scanned_cards} 張卡、沒看到能自動完成的`;
        alert(msg);
        await reload();
      } else {
        alert(`❌ 自動掃失敗：${j.error ?? "unknown"}`);
      }
    } finally {
      setAutoSyncing(false);
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
      {/* 工具列：搜尋 + 分類過濾 + AI 助手 */}
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
        <button onClick={loadSuggestions} className="btn-chip btn-chip-info" title="雪鑰看 TODO/DOING 全部、推薦 Top 3 + 理由">
          <Sparkles size={14} /> 雪鑰建議
        </button>
        <button onClick={() => setAiAddOpen(true)} className="btn-chip btn-chip-success" title="貼一段話、AI 自動分類建卡">
          <Wand2 size={14} /> AI 建卡
        </button>
        <button onClick={autoSync} disabled={autoSyncing} className="btn-chip btn-chip-warn" title="雪鑰掃 GitHub commits、自動移已完成卡到 DONE">
          {autoSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 雪鑰自動掃
        </button>
        <button onClick={() => setAllBoards(true)} className="btn-chip btn-chip-neutral text-xs" title="全部收合">
          全收
        </button>
        <button onClick={() => setAllBoards(false)} className="btn-chip btn-chip-neutral text-xs" title="全部展開">
          全展
        </button>
        <span className="text-xs text-fg-muted">{filteredCards.length} / {cards.length} 卡</span>
      </div>

      {/* 多 board horizontal sections */}
      <div className="space-y-6">
        {boards.map((board) => {
          const boardCols = columns.filter((c) => c.board_id === board.id).sort((a, b) => a.position - b.position);
          const isCollapsed = !!collapsedBoards[board.slug];
          const boardCardCount = filteredCards.filter((c) => boardCols.some((col) => col.id === c.column_id)).length;
          return (
            <section key={board.id}>
              <button
                type="button"
                onClick={() => toggleBoard(board.slug)}
                className="w-full text-left text-lg font-bold mb-2 flex items-center gap-2 hover:text-accent transition"
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                <span>{board.emoji}</span>
                <span>{board.title}</span>
                <span className="text-xs text-fg-muted font-normal">({boardCardCount} 卡)</span>
                {board.description && !isCollapsed && (
                  <span className="text-xs text-fg-muted font-normal hidden md:inline">— {board.description}</span>
                )}
              </button>
              {!isCollapsed && (
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
                              {card.meta?.link && (
                                <a
                                  href={card.meta.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] text-accent-2 hover:underline mt-1"
                                >
                                  <ExternalLink size={10} /> 連結
                                </a>
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
              )}
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

      {/* AI 建卡 modal */}
      {aiAddOpen && (
        <Modal onClose={() => setAiAddOpen(false)}>
          <AiAddForm onSave={aiAddCard} />
        </Modal>
      )}

      {/* 雪鑰建議 modal */}
      {suggestOpen && (
        <Modal onClose={() => { setSuggestOpen(false); setSuggestions(null); }}>
          <SuggestPanel loading={suggestLoading} data={suggestions} onPick={(cardId) => {
            const card = cards.find((c) => c.id === cardId);
            if (card) { setEditingCard(card); setSuggestOpen(false); }
          }} />
        </Modal>
      )}
    </div>
  );
}

function AiAddForm({ onSave }: { onSave: (text: string, target: "todo" | "wishlist" | "") => Promise<any> }) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"todo" | "wishlist" | "">("");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <h3 className="font-bold mb-3 flex items-center gap-2"><Wand2 size={18} /> AI 建卡</h3>
      <p className="text-xs text-fg-muted mb-2">
        貼一段話、雪鑰幫你解析成 title / description / category、自動建卡。
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例：「我想做一個 LINE 命令、學員可以查自己這週上了幾課」"
        className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3 min-h-[100px]"
      />
      <label className="text-xs text-fg-muted">放哪個 board？</label>
      <select value={target} onChange={(e) => setTarget(e.target.value as any)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3">
        <option value="">AI 自己判斷（推薦）</option>
        <option value="todo">放待辦（todo）</option>
        <option value="wishlist">放許願池（wishlist）</option>
      </select>
      <button
        disabled={!text.trim() || busy}
        onClick={async () => { setBusy(true); await onSave(text.trim(), target); setBusy(false); }}
        className="btn-chip btn-chip-success w-full justify-center disabled:opacity-50"
      >
        {busy ? <><Loader2 size={14} className="animate-spin" /> 雪鑰思考中...</> : <><Sparkles size={14} /> 讓雪鑰建卡</>}
      </button>
    </div>
  );
}

function SuggestPanel({ loading, data, onPick }: { loading: boolean; data: any; onPick: (id: string) => void }) {
  if (loading) {
    return (
      <div className="py-8 text-center text-fg-muted">
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        雪鑰看待辦清單中...
      </div>
    );
  }
  if (data?.error) {
    return (
      <div>
        <h3 className="font-bold mb-2 text-red-500 flex items-center gap-2"><XCircle className="w-4 h-4" /> 雪鑰回應失敗</h3>
        <p className="text-sm bg-red-500/10 border border-red-500/30 rounded p-3 font-mono">
          {data.error}
        </p>
        <p className="text-xs text-fg-muted mt-3">
          常見原因：(1) Anthropic key 沒設 / 解不開 (2) AI_KEY_SECRET 跟 DB 不一致
          <br />修法：到 /admin/ai/models 重新貼 Anthropic key
        </p>
      </div>
    );
  }
  if (!data?.suggestions || data.suggestions.length === 0) {
    return <p className="text-fg-muted">{data?.message ?? "沒有建議（API 沒回東西、F12 看 console）"}</p>;
  }
  return (
    <div>
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-accent-2" /> 雪鑰建議：最該做的 3 件事
      </h3>
      {data.overall && (
        <p className="text-sm text-fg-muted mb-4 italic">「{data.overall}」</p>
      )}
      <div className="space-y-2">
        {data.suggestions.map((s: any) => (
          <button
            key={s.card_id}
            onClick={() => onPick(s.card_id)}
            className="w-full text-left bg-bg-elevated border border-border rounded-lg p-3 hover:border-accent transition"
          >
            <div className="flex items-start gap-2">
              <span className="font-bold text-accent-2 text-lg">#{s.rank}</span>
              <div className="flex-1">
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-fg-muted mt-1">{s.reason}</p>
                {s.category && CATEGORY_META[s.category] && (
                  <span className="chip chip-neutral text-[10px] mt-1.5">
                    {CATEGORY_META[s.category].emoji} {CATEGORY_META[s.category].label}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
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
  const [link, setLink] = useState(card.meta?.link ?? "");

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
      <input value={labelsRaw} onChange={(e) => setLabelsRaw(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" placeholder="urgent, P0, frontend..." />
      <label className="text-xs text-fg-muted">外部連結（GitHub PR / Notion / 章節 / Discord 等）</label>
      <input type="url" value={link} onChange={(e) => setLink(e.target.value)} className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-4" placeholder="https://github.com/... 或 /chapters/0" />
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
            meta: { ...(card.meta ?? {}), link: link.trim() || null },
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

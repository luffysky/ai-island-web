"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight, ChevronLeft, ChevronDown, BookOpen, Bookmark, FileText,
  Menu, X, Search, History, Star, Plus, Trash2,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type NavLesson = {
  id: string;
  number: string;
  title: string;
  outline: { level: number; text: string }[];
};
type NavChapter = {
  id: number;
  title: string;
  subtitle: string;
  stage: number | string;
  icon: string;
  difficulty: string;
  lessons: NavLesson[];
};

const STAGE_COLORS: Record<number, string> = {
  1: "#50fa7b", 2: "#8be9fd", 3: "#bd93f9",
  4: "#ff79c6", 5: "#ffb86c", 6: "#ffd700", 7: "#a78bfa",
};

type Tab = "chapters" | "bookmarks" | "notes" | "history";

export function SideNav() {
  const pathname = usePathname();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chapters");
  const [chapters, setChapters] = useState<NavChapter[]>([]);
  const [expandedCh, setExpandedCh] = useState<Set<number>>(new Set());
  const [expandedLs, setExpandedLs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [noteDraftOpen, setNoteDraftOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // 從 URL 自動展開當前 chapter
  useEffect(() => {
    const m = pathname?.match(/\/chapters\/(\d+)/);
    if (m) {
      const cid = Number(m[1]);
      setExpandedCh((prev) => new Set(prev).add(cid));
    }
  }, [pathname]);

  // 載 nav 資料
  useEffect(() => {
    fetch("/api/nav")
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters || []))
      .catch(() => {});
  }, []);

  // 載使用者狀態 + 個人資料
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      // 平行載 bookmarks / notes / history
      const [bm, nt, hi] = await Promise.all([
        supabase.from("bookmarks").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("notes").select("*").order("updated_at", { ascending: false }).limit(50),
        supabase.from("learning_events").select("*").order("created_at", { ascending: false }).limit(30),
      ]);
      setBookmarks(bm.data || []);
      setNotes(nt.data || []);
      setHistory(hi.data || []);
    });
  }, []);

  const toggleCh = (id: number) => {
    setExpandedCh((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const toggleLs = (id: string) => {
    setExpandedLs((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const saveNote = async () => {
    const content = noteDraft.trim();
    if (!user || !content || savingNote) return;
    setSavingNote(true);
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        chapter_id: null,
        lesson_id: null,
        content,
        is_public: false,
      })
      .select("*")
      .single();
    setSavingNote(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotes((current) => [data, ...current]);
    setNoteDraft("");
    setNoteDraftOpen(false);
    toast.success("已儲存筆記");
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    const snapshot = notes;
    const target = notes.find((n) => n.id === id);
    if (!target) return;

    // optimistic：立刻消失、5 秒 undo
    setNotes((current) => current.filter((note) => note.id !== id));

    let undone = false;
    toast.warning("已刪除一則筆記", {
      duration: 5000,
      action: {
        label: "撤銷",
        onClick: () => {
          undone = true;
          setNotes(snapshot);
        },
      },
    });

    setTimeout(async () => {
      if (undone) return;
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        setNotes(snapshot);
        toast.error(`刪除失敗、已恢復：${error.message}`);
      }
    }, 5000);
  };

  // 搜尋過濾
  const filtered = search
    ? chapters
        .map((c) => ({
          ...c,
          lessons: c.lessons.filter((l) =>
            (l.title + l.id).toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.lessons.length > 0)
    : chapters;

  return (
    <>
      {/* 開關按鈕（手機 + 桌機都有）*/}
      <button
        onClick={() => setOpen(true)}
        aria-label="開啟導覽"
        className="fixed left-3 top-20 z-30 p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition shadow-lg lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Side panel */}
      <aside
        className={`fixed top-0 left-0 h-screen overflow-hidden w-[85vw] max-w-sm z-50 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] transform transition-transform duration-200 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between p-3 border-b border-[var(--color-border)]">
          <div className="font-bold flex items-center gap-2">
            🏝️ <span>AI 島導覽</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="關閉"
            className="p-1 rounded hover:bg-[var(--color-bg-elevated)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0 overflow-x-auto border-b border-[var(--color-border)] text-xs">
          {[
            { key: "chapters" as const, label: "章節", icon: BookOpen },
            { key: "bookmarks" as const, label: "收藏", icon: Bookmark },
            { key: "notes" as const, label: "筆記", icon: FileText },
            { key: "history" as const, label: "歷程", icon: History },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`min-w-[72px] flex-1 flex flex-col items-center gap-1 py-2 transition ${
                tab === key
                  ? "bg-[var(--color-bg-elevated)] border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)]"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* === Chapters Tab === */}
        {tab === "chapters" && (
          <>
            <div className="p-2 border-b border-[var(--color-border)]">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋章節 / lesson..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((ch) => {
                const isOpenCh = expandedCh.has(ch.id) || search.length > 0;
                const stageColor = STAGE_COLORS[Number(ch.stage)] ?? "#888";
                const isCurrent = pathname?.includes(`/chapters/${ch.id}`);

                return (
                  <div key={ch.id} className="border-b border-[var(--color-border)]/30">
                    <button
                      onClick={() => toggleCh(ch.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-bg-elevated)] transition text-left ${
                        isCurrent ? "bg-[var(--color-bg-elevated)]" : ""
                      }`}
                    >
                      <div
                        className="w-1 h-6 rounded shrink-0"
                        style={{ background: stageColor }}
                      />
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform ${isOpenCh ? "" : "-rotate-90"}`}
                      />
                      <span className="text-xs text-[var(--color-fg-muted)] font-mono shrink-0">
                        Ch{String(ch.id).padStart(2, "0")}
                      </span>
                      <span className="text-sm flex-1 truncate font-medium">{ch.title}</span>
                      <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0">
                        {ch.lessons.length}
                      </span>
                    </button>

                    {isOpenCh &&
                      ch.lessons.map((l) => {
                        const isOpenLs = expandedLs.has(l.id);
                        const hasOutline = l.outline && l.outline.length > 0;
                        return (
                          <div key={l.id} className="bg-[var(--color-bg)]/40">
                            <div className="flex items-stretch">
                              <Link
                                href={`/chapters/${ch.id}#lesson-${l.id}`}
                                onClick={() => setOpen(false)}
                                className="flex-1 flex items-center gap-2 px-3 py-1.5 pl-9 text-xs hover:bg-[var(--color-bg-elevated)] transition min-w-0"
                              >
                                <span className="text-[var(--color-fg-muted)] font-mono shrink-0">
                                  {l.number}
                                </span>
                                <span className="truncate">{l.title}</span>
                              </Link>
                              {hasOutline && (
                                <button
                                  onClick={() => toggleLs(l.id)}
                                  aria-label="展開大綱"
                                  className="px-2 hover:bg-[var(--color-bg-elevated)] transition shrink-0"
                                >
                                  <ChevronDown
                                    size={12}
                                    className={`transition-transform ${isOpenLs ? "" : "-rotate-90"}`}
                                  />
                                </button>
                              )}
                            </div>

                            {isOpenLs && hasOutline && (
                              <ul className="pl-14 pr-3 py-1 bg-[var(--color-bg)]/60 space-y-0.5">
                                {l.outline!.map((item, i) => (
                                  <li
                                    key={i}
                                    className={`text-[11px] py-0.5 truncate ${
                                      item.level >= 3
                                        ? "text-[var(--color-fg-muted)] pl-3"
                                        : "text-[var(--color-fg)]"
                                    }`}
                                  >
                                    {item.level === 2 ? "▸ " : "・"}
                                    {item.text}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* === Bookmarks Tab === */}
        {tab === "bookmarks" && (
          <div className="flex-1 overflow-y-auto p-2">
            {!user ? (
              <EmptyHint icon={Bookmark} message="登入後可以收藏 lesson" />
            ) : bookmarks.length === 0 ? (
              <EmptyHint icon={Bookmark} message="還沒收藏任何內容" />
            ) : (
              <ul className="space-y-1">
                {bookmarks.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/chapters/${b.chapter_id}#lesson-${b.lesson_id}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-[var(--color-bg-elevated)] rounded transition"
                    >
                      <div className="flex items-center gap-2">
                        <Star size={12} className="text-[var(--color-warning)] shrink-0" fill="currentColor" />
                        <span className="text-xs text-[var(--color-fg-muted)] font-mono shrink-0">
                          {b.lesson_id}
                        </span>
                      </div>
                      <div className="truncate mt-1">{b.lesson_title ?? "—"}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* === Notes Tab === */}
        {tab === "notes" && (
          <div className="flex-1 overflow-y-auto p-2">
            {!user ? (
              <EmptyHint icon={FileText} message="登入後可以記筆記" />
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setNoteDraftOpen((value) => !value)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-bg-elevated)]"
                >
                  <Plus size={14} />
                  新增筆記
                </button>

                {noteDraftOpen && (
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={4}
                      placeholder="寫一則自由筆記..."
                      className="w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 text-sm outline-none focus:border-[var(--color-accent)]"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--color-fg-muted)]">{noteDraft.length} 字</span>
                      <button
                        onClick={saveNote}
                        disabled={!noteDraft.trim() || savingNote}
                        className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                      >
                        {savingNote ? "儲存中..." : "儲存"}
                      </button>
                    </div>
                  </div>
                )}

                {notes.length === 0 ? (
                  <EmptyHint icon={FileText} message="還沒筆記、開始寫吧" />
                ) : (
                  <ul className="space-y-1">
                    {notes.map((n) => {
                      const isFreeNote = !n.chapter_id;
                      return (
                        <li
                          key={n.id}
                          className="rounded px-3 py-2 hover:bg-[var(--color-bg-elevated)] transition"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            {isFreeNote ? (
                              <div className="text-xs text-[var(--color-fg-muted)]">自由筆記</div>
                            ) : (
                              <Link
                                href={`/chapters/${n.chapter_id}#lesson-${n.lesson_id}`}
                                onClick={() => setOpen(false)}
                                className="text-xs text-[var(--color-fg-muted)] font-mono hover:text-[var(--color-accent)]"
                              >
                                {n.lesson_id}
                              </Link>
                            )}
                            <button
                              onClick={() => deleteNote(n.id)}
                              className="rounded p-1 text-[var(--color-fg-muted)] hover:bg-red-500/10 hover:text-red-300"
                              aria-label="刪除筆記"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="text-sm line-clamp-3 whitespace-pre-wrap">
                            {n.content}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* === History Tab === */}
        {tab === "history" && (
          <div className="flex-1 overflow-y-auto p-2">
            {!user ? (
              <EmptyHint icon={History} message="登入後可以追蹤學習歷程" />
            ) : history.length === 0 ? (
              <EmptyHint icon={History} message="還沒有學習紀錄" />
            ) : (
              <ul className="space-y-1">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="px-3 py-2 text-xs border-l-2 border-[var(--color-accent)]/30"
                  >
                    <div className="text-[var(--color-fg-muted)]">
                      {h.event_type}
                    </div>
                    <div className="font-mono">{h.lesson_id ?? `Ch${h.chapter_id}`}</div>
                    <div className="text-[10px] text-[var(--color-fg-muted)] mt-1">
                      {new Date(h.created_at).toLocaleString("zh-TW", { hour12: false })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 p-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-fg-muted)] text-center">
          🐹 招財 Z-coin 守護
        </div>
      </aside>
    </>
  );
}

function EmptyHint({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--color-fg-muted)]">
      <Icon size={32} className="mb-3 opacity-50" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

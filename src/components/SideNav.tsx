"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { chapterDisplayNumberById } from "@/lib/chapter-display";
import {
  ChevronRight, ChevronLeft, ChevronDown, BookOpen, Bookmark, FileText,
  X, Search, History, Star, Plus, Trash2, Palmtree, PanelLeft,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useOverlayRegister } from "@/lib/overlay-stack";

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
  // 章節大綱 = 左側抽屜（桌機/手機都是 overlay drawer，靠左上角按鈕開；不再常駐佔版面）。
  // 開啟時鎖捲動 + Pet/Todo 讓位；isNav=true → 綠寶/Admin 不因大綱而隱藏（可蓋在大綱上）。
  useOverlayRegister(open, true, true);
  const [tab, setTab] = useState<Tab>("chapters");
  // hover 泡泡：顯示 lesson 完整名稱（側欄會 truncate，hover 看全名）
  const [mounted, setMounted] = useState(false);
  const [tip, setTip] = useState<{ num: string; text: string; x: number; y: number; w: number; side: "above" | "below" } | null>(null);
  useEffect(() => setMounted(true), []);
  // 泡泡放在該 li「上方」（放不下才放下方）、水平夾進視口 → 永不出界、也不會蓋住長按的那條 li。
  // 蓋到 nav 其他內容沒關係（林董說可以）。
  const tipFor = (el: HTMLElement, num: string, text: string) => {
    const r = el.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 360;
    const W = Math.min(300, vw - 16);
    const x = Math.max(8, Math.min(r.left, vw - W - 8));
    const above = r.top > 120;
    setTip({ num, text, x, y: above ? r.top - 6 : r.bottom + 6, w: W, side: above ? "above" : "below" });
  };
  const showTip = (e: React.MouseEvent<HTMLElement>, num: string, text: string) => tipFor(e.currentTarget, num, text);
  const hideTip = () => setTip(null);
  // 手機：hover 不會觸發 → 改用「長按」跳出泡泡（並抑制長按後那一下的導頁）。
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFired = useRef(false);
  const lpCancel = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };
  const onLessonTouchStart = (e: React.TouchEvent<HTMLElement>, num: string, text: string) => {
    lpFired.current = false;
    const el = e.currentTarget;
    lpCancel();
    hideTip();
    lpTimer.current = setTimeout(() => {
      lpFired.current = true;
      tipFor(el, num, text);
      if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* noop */ }
      setTimeout(() => setTip(null), 2600); // 自動收起
    }, 420);
  };
  const [chapters, setChapters] = useState<NavChapter[]>([]);
  const [expandedCh, setExpandedCh] = useState<Set<number>>(new Set());
  const [expandedLs, setExpandedLs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  // 登入狀態用全站共用 auth context（getSession + onAuthStateChange），
  // 不要自己 getUser() 一次定生死 → 之前 session 還沒 hydrate 就卡在「登入後可以記筆記」
  const { user } = useAuth();
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

  // 載使用者狀態 + 個人資料（user 來自 auth context，session 一就緒就觸發）
  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setBookmarks([]);
      setNotes([]);
      setHistory([]);
      return;
    }
    const supabase = createSupabaseBrowser();
    let cancelled = false;

    const loadAll = async (userId: string) => {
      const [bm, nt, hi] = await Promise.all([
        supabase.from("bookmarks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50),
        supabase.from("learning_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);
      if (cancelled) return;
      setBookmarks(bm.data || []);
      setNotes(nt.data || []);
      setHistory(hi.data || []);
    };

    loadAll(uid);

    // 同步監聽：BookmarkButton / NotePanel / SideNav 自己刪除 都會 dispatch
    const reload = () => loadAll(uid);
    window.addEventListener("pet:bookmark-added", reload);
    window.addEventListener("sync:bookmarks", reload);
    window.addEventListener("pet:note-saved", reload);
    window.addEventListener("sync:notes", reload);
    return () => {
      cancelled = true;
      window.removeEventListener("pet:bookmark-added", reload);
      window.removeEventListener("sync:bookmarks", reload);
      window.removeEventListener("pet:note-saved", reload);
      window.removeEventListener("sync:notes", reload);
    };
  }, [user?.id]);

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
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sync:notes"));
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
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sync:notes"));
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
      {/* 左上角切換鈕（桌機＋手機都有；開章節大綱抽屜）*/}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="開啟章節大綱"
          title="章節大綱"
          className="fixed left-3 top-[4.5rem] z-30 inline-flex items-center gap-1.5 py-2 pl-2 pr-3 rounded-full bg-bg-card/90 backdrop-blur border border-border hover:border-accent/50 hover:bg-bg-elevated transition shadow-lg"
        >
          <PanelLeft size={18} className="text-accent" />
          <span className="hidden sm:inline text-xs font-semibold">章節</span>
        </button>
      )}

      {/* Backdrop（桌機/手機都蓋黑幕，overlay drawer）*/}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 側欄：滑入抽屜（桌機/手機一致）*/}
      <aside
        className={`fixed top-0 left-0 h-screen overflow-hidden z-50 bg-bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out
          w-[85vw] max-w-sm lg:w-80 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* 完整內容 */}
        <div className="flex flex-col min-h-0 flex-1">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between p-3 border-b border-border">
          <div className="font-bold flex items-center gap-2">
            <Palmtree size={18} className="text-accent" /> <span>AI 島導覽</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="關閉"
            className="p-1 rounded hover:bg-bg-elevated"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 overflow-x-auto border-b border-border text-xs">
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
                  ? "bg-bg-elevated border-b-2 border-accent text-accent"
                  : "text-fg-muted hover:bg-bg-elevated"
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
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋章節 / lesson..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm bg-bg-elevated border border-border rounded outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((ch) => {
                const isOpenCh = expandedCh.has(ch.id) || search.length > 0;
                const stageColor = STAGE_COLORS[Number(ch.stage)] ?? "#888";
                const isCurrent = pathname?.includes(`/chapters/${ch.id}`);

                return (
                  <div key={ch.id} className="border-b border-border/30">
                    <button
                      onClick={() => toggleCh(ch.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition text-left ${
                        isCurrent ? "bg-bg-elevated" : ""
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
                      <span className="text-xs text-fg-muted font-mono shrink-0">
                        Ch{chapterDisplayNumberById(ch.id)}
                      </span>
                      <span className="text-sm flex-1 min-w-0 truncate font-medium">{ch.title}</span>
                      <span className="text-[10px] text-fg-muted shrink-0">
                        {ch.lessons.length}
                      </span>
                    </button>

                    {isOpenCh && (
                    <div className="animate-expand">
                    {ch.lessons.map((l) => {
                        const isOpenLs = expandedLs.has(l.id);
                        const hasOutline = l.outline && l.outline.length > 0;
                        return (
                          <div key={l.id} className="bg-bg/40">
                            <div className="flex items-stretch">
                              <Link
                                href={`/chapters/${ch.id}#lesson-${l.id}`}
                                onClick={(e) => { if (lpFired.current) { e.preventDefault(); lpFired.current = false; return; } setOpen(false); }}
                                onMouseEnter={(e) => showTip(e, l.number, l.title)}
                                onMouseLeave={hideTip}
                                onTouchStart={(e) => onLessonTouchStart(e, l.number, l.title)}
                                onTouchEnd={lpCancel}
                                onTouchMove={lpCancel}
                                className="flex-1 flex items-center gap-2 px-3 py-1.5 pl-9 text-xs hover:bg-bg-elevated transition min-w-0 select-none"
                              >
                                <span className="text-fg-muted font-mono shrink-0">
                                  {l.number}
                                </span>
                                <span className="truncate">{l.title}</span>
                              </Link>
                              {hasOutline && (
                                <button
                                  onClick={() => toggleLs(l.id)}
                                  aria-label="展開大綱"
                                  className="px-2 hover:bg-bg-elevated transition shrink-0"
                                >
                                  <ChevronDown
                                    size={12}
                                    className={`transition-transform ${isOpenLs ? "" : "-rotate-90"}`}
                                  />
                                </button>
                              )}
                            </div>

                            {isOpenLs && hasOutline && (
                              <ul className="pl-14 pr-3 py-1 bg-bg/60 space-y-0.5 animate-expand">
                                {l.outline!.map((item, i) => (
                                  <li
                                    key={i}
                                    className={`text-[11px] py-0.5 truncate ${
                                      item.level >= 3
                                        ? "text-fg-muted pl-3"
                                        : "text-fg"
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
                    )}
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
                      className="block px-3 py-2 text-sm hover:bg-bg-elevated rounded transition"
                    >
                      <div className="flex items-center gap-2">
                        <Star size={12} className="text-warning shrink-0" fill="currentColor" />
                        <span className="text-xs text-fg-muted font-mono shrink-0">
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg-elevated"
                >
                  <Plus size={14} />
                  新增筆記
                </button>

                {noteDraftOpen && (
                  <div className="rounded-lg border border-border bg-bg p-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={4}
                      placeholder="寫一則自由筆記..."
                      className="w-full resize-none rounded border border-border bg-bg-elevated p-2 text-sm outline-none focus:border-accent"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-fg-muted">{noteDraft.length} 字</span>
                      <button
                        onClick={saveNote}
                        disabled={!noteDraft.trim() || savingNote}
                        className="rounded bg-accent px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
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
                          className="rounded px-3 py-2 hover:bg-bg-elevated transition"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            {isFreeNote ? (
                              <div className="text-xs text-fg-muted">自由筆記</div>
                            ) : (
                              <Link
                                href={`/chapters/${n.chapter_id}#lesson-${n.lesson_id}`}
                                onClick={() => setOpen(false)}
                                className="text-xs text-fg-muted font-mono hover:text-accent"
                              >
                                {n.lesson_id}
                              </Link>
                            )}
                            <button
                              onClick={() => deleteNote(n.id)}
                              className="rounded p-1 text-fg-muted hover:bg-red-500/10 hover:text-red-300"
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
                    className="px-3 py-2 text-xs border-l-2 border-accent/30"
                  >
                    <div className="text-fg-muted">
                      {h.event_type}
                    </div>
                    <div className="font-mono">{h.lesson_id ?? `Ch${h.chapter_id}`}</div>
                    <div className="text-[10px] text-fg-muted mt-1">
                      {new Date(h.created_at).toLocaleString("zh-TW", { hour12: false })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 p-2 border-t border-border text-[10px] text-fg-muted text-center">
          🐹 招財 Z-coin 守護
        </div>
        </div>
      </aside>

      {/* Hover 泡泡：lesson 完整名稱（portal 到 body、不被側欄 overflow 裁切）*/}
      {mounted && tip && createPortal(
        <div
          className={`sidenav-tip pointer-events-none fixed z-[60] ${tip.side === "above" ? "-translate-y-full" : ""}`}
          style={{ left: tip.x, top: tip.y, width: tip.w }}
        >
          <div className="relative rounded-xl border border-accent/40 bg-bg-card/95 px-3 py-2 shadow-2xl backdrop-blur-sm">
            {/* 小箭頭：泡泡在上方→箭頭在底部指下；在下方→箭頭在頂部指上 */}
            {tip.side === "above" ? (
              <>
                <span className="absolute top-full left-5 -translate-y-px border-[6px] border-transparent border-t-accent/40" />
                <span className="absolute top-full left-5 -translate-y-[3px] border-[6px] border-transparent border-t-bg-card" />
              </>
            ) : (
              <>
                <span className="absolute bottom-full left-5 translate-y-px border-[6px] border-transparent border-b-accent/40" />
                <span className="absolute bottom-full left-5 translate-y-[3px] border-[6px] border-transparent border-b-bg-card" />
              </>
            )}
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-[10px] text-accent">{tip.num}</span>
              <span className="text-xs font-medium leading-snug text-fg">{tip.text}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function EmptyHint({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
      <Icon size={32} className="mb-3 opacity-50" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

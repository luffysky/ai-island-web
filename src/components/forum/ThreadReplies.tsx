"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { handleEnterSubmit, autoGrow } from "@/lib/composer";
import { Send, Trash2, CornerDownRight, Loader2, Check, BookmarkPlus, FileText, Pencil } from "lucide-react";
import type { ForumReply } from "@/lib/forum-types";
import { LikeButton } from "@/components/blog/LikeButton";
import { TranslateButton } from "@/components/ui/TranslateButton";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ReportButton } from "@/components/ui/ReportButton";
import { AnimatedEmojiPicker } from "@/components/ui/AnimatedEmojiPicker";
import { GifPicker } from "@/components/ui/GifPicker";
import { EmojiText } from "@/components/ui/EmojiText";

export function ThreadReplies({
  threadId,
  threadTitle,
  initialReplies,
  isLocked,
  threadOwnerId,
}: {
  threadId: string;
  threadTitle?: string;
  initialReplies: ForumReply[];
  isLocked: boolean;
  threadOwnerId: string;
}) {
  const t = useTranslations("forum");
  const toast = useToast();
  const confirm = useConfirm();
  const [replies, setReplies] = useState<ForumReply[]>(initialReplies);
  const [input, setInput] = useState("");
  const [myNotes, setMyNotes] = useState<{ id: string; title: string }[]>([]);
  const [showNotePick, setShowNotePick] = useState(false);
  const [noteQ, setNoteQ] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  // 用全站 AuthContext（單一來源、getSession cookie cache、不會像 getUser() 在靜態頁 hydration race 回 null）
  const { user, status } = useAuth();
  const currentUserId = user?.id ?? null;
  const isLoggedIn = status === "in";

  const isThreadOwner = currentUserId === threadOwnerId;

  const totalCount = replies.reduce((s, r) => s + 1 + (r.replies?.length ?? 0), 0);

  // optimistic：點 send 立刻 push、失敗 toast 退回
  const submit = async (content: string, parentId: string | null) => {
    if (!content.trim() || sending) return;
    const trimmed = content.trim();
    const tempId = `temp_${Date.now()}`;
    const author = {
      display_name: t("you"),
      username: "you",
      avatar_url: null,
      level: 1,
    };
    const temp: ForumReply = {
      id: tempId,
      thread_id: threadId,
      user_id: currentUserId ?? "",
      content: trimmed,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      is_answer: false,
      author,
      replies: [],
      _pending: true,
    } as any;

    // 立刻插入畫面
    if (parentId) {
      setReplies((list) =>
        list.map((r) => (r.id === parentId ? { ...r, replies: [...(r.replies ?? []), temp] } : r)),
      );
    } else {
      setReplies((list) => [...list, temp]);
    }
    if (parentId) {
      setReplyInput("");
      setReplyTo(null);
    } else {
      setInput("");
    }

    setSending(true);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, parent_id: parentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || t("sendFailed"));

      // 把暫時項換成 server 回的真實項
      const real = json.reply ?? json;
      const swap = (r: ForumReply): ForumReply =>
        r.id === tempId
          ? { ...real, replies: [] }
          : { ...r, replies: r.replies?.map(swap) };
      setReplies((list) => list.map(swap));
    } catch (e: any) {
      // 退回：移除暫時項
      const drop = (r: ForumReply): ForumReply => ({
        ...r,
        replies: r.replies?.filter((x) => x.id !== tempId).map(drop),
      });
      setReplies((list) => list.filter((r) => r.id !== tempId).map(drop));
      toast.error(t("replyFailed", { msg: e?.message || t("pleaseRetry") }));
    } finally {
      setSending(false);
    }
  };

  // optimistic：點刪立刻消失、5 秒 undo toast、過 5 秒才真刪
  const remove = async (replyId: string) => {
    const ok = await confirm({
      title: t("deleteReplyConfirm"),
      description: t("deleteReplyDesc"),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!ok) return;

    let snapshot: ForumReply[] = [];
    setReplies((list) => {
      snapshot = list;
      const drop = (r: ForumReply): ForumReply => ({
        ...r,
        replies: r.replies?.filter((x) => x.id !== replyId).map(drop),
      });
      return list.filter((r) => r.id !== replyId).map(drop);
    });

    let undone = false;
    toast.warning(t("replyDeleted"), {
      duration: 5000,
      action: {
        label: t("undo"),
        onClick: () => {
          undone = true;
          setReplies(snapshot);
        },
      },
    });

    // 5 秒後送 DELETE 請求（若 user 沒按 undo）
    setTimeout(async () => {
      if (undone) return;
      try {
        const res = await fetch(
          `/api/forum/threads/${threadId}/replies?reply=${replyId}`,
          {
      credentials: "include", method: "DELETE" },
        );
        if (!res.ok) throw new Error();
      } catch {
        // server 刪失敗、恢復狀態 + 提示
        setReplies(snapshot);
        toast.error(t("deleteFailed"));
      }
    }, 5000);
  };

  // 解答沉澱：把一則回覆存進「我的知識庫」（附回討論串的連結）
  const saveAsNote = async (reply: ForumReply) => {
    if (!isLoggedIn) { toast.error(t("pleaseLogin")); return; }
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error(t("pleaseLogin")); return; }
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<p>${esc(reply.content).replace(/\n/g, "<br>")}</p><p>${t("noteSourcePrefix")}<a href="/forum/thread/${threadId}">${esc(threadTitle || t("defaultThreadTitle"))}</a></p>`;
    const { error } = await supabase.from("notes").insert({ user_id: user.id, content: html, title: (threadTitle || t("defaultNoteTitle")).slice(0, 80), category: t("noteCategory"), tags: [t("noteTag")] });
    if (error) { toast.error(t("saveNoteFailed")); return; }
    toast.success(t("savedToKb"), { action: { label: t("view"), onClick: () => { window.location.href = "/me/notes"; } } });
  };

  // 討論↔筆記互引：載入我的筆記供插入引用
  const openNotePick = async () => {
    setShowNotePick((v) => !v);
    if (myNotes.length === 0) {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notes").select("id, title").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
      setMyNotes((data ?? []).map((n: any) => ({ id: n.id, title: n.title?.trim() || t("untitledNote") })));
    }
  };
  const insertNoteRef = (n: { id: string; title: string }) => {
    // 嵌入可解析 token（帶 note id）→ 顯示端渲染成可點連結、跳到該筆記
    const safeTitle = n.title.replace(/[[\]|]/g, "").slice(0, 80);
    setInput((prev) => `${prev}${prev && !prev.endsWith("\n") ? "\n" : ""}[[note:${n.id}|${safeTitle}]]`.trim());
    setShowNotePick(false); setNoteQ("");
  };

  const markAnswer = async (replyId: string, isAnswer: boolean) => {
    // optimistic：立刻切換採納狀態
    setReplies((list) =>
      list.map((r) =>
        r.id === replyId ? { ...r, is_answer: isAnswer } : { ...r, is_answer: isAnswer ? false : r.is_answer },
      ),
    );
    try {
      const res = await fetch(
        `/api/forum/threads/${threadId}/replies?reply=${replyId}`,
        {
      credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_answer: isAnswer }),
        },
      );
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message || j.error || t("actionFailed"));
      }
      toast.success(isAnswer ? t("markedAnswer") : t("unmarkedAnswer"));
    } catch (e: any) {
      // 退回
      setReplies((list) =>
        list.map((r) => (r.id === replyId ? { ...r, is_answer: !isAnswer } : r)),
      );
      toast.error(e?.message || t("actionFailed"));
    }
  };

  // 編輯回覆內文（限本人）— optimistic 更新巢狀樹、失敗退回
  const edit = async (replyId: string, newContent: string) => {
    const trimmed = newContent.trim();
    if (!trimmed) return { ok: false };
    let snapshot: ForumReply[] = [];
    const apply = (r: ForumReply): ForumReply =>
      r.id === replyId
        ? { ...r, content: trimmed, updated_at: new Date().toISOString() }
        : { ...r, replies: r.replies?.map(apply) };
    setReplies((list) => { snapshot = list; return list.map(apply); });
    try {
      const res = await fetch(
        `/api/forum/threads/${threadId}/replies?reply=${replyId}`,
        {
          credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || j.error || t("actionFailed"));
      }
      toast.success(t("edited"));
      return { ok: true };
    } catch (e: any) {
      setReplies(snapshot);
      toast.error(e?.message || t("actionFailed"));
      return { ok: false };
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-4">
        {totalCount > 0 ? t("replyCountHeading", { n: totalCount }) : t("replies")}
      </h2>

      {/* 回覆列表 */}
      {replies.length > 0 && (
        <div className="space-y-3 mb-6">
          {replies.map((r) => (
            <div key={r.id}>
              <ReplyItem reply={r} currentUserId={currentUserId} onDelete={remove} onEdit={edit} onReply={() => setReplyTo(replyTo === r.id ? null : r.id)} canMarkAnswer={isThreadOwner} onMarkAnswer={markAnswer} onSaveNote={isLoggedIn ? () => saveAsNote(r) : undefined} />
              {/* 回覆框 */}
              {replyTo === r.id && (
                <div className="ml-10 mt-2 flex gap-2">
                  <textarea
                    rows={1}
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onInput={(e) => autoGrow(e.currentTarget, 120)}
                    onKeyDown={(e) => handleEnterSubmit(e, () => submit(replyInput, r.id))}
                    placeholder={t("replyPlaceholder")}
                    className="flex-1 bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
                    style={{ maxHeight: "120px" }}
                  />
                  <button
                    onClick={() => submit(replyInput, r.id)}
                    disabled={!replyInput.trim() || sending}
                    className="px-3 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {t("send")}
                  </button>
                </div>
              )}
              {/* 巢狀回覆 */}
              {r.replies && r.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2 border-l-2 border-border pl-3">
                  {r.replies.map((sub) => (
                    <ReplyItem key={sub.id} reply={sub} currentUserId={currentUserId} onDelete={remove} onEdit={edit} isReply onSaveNote={isLoggedIn ? () => saveAsNote(sub) : undefined} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 發表回覆 */}
      {isLocked ? (
        <div className="surface text-sm text-fg-muted text-center py-4">
          {t("threadLocked")}
        </div>
      ) : !isLoggedIn ? (
        <div className="surface text-sm text-fg-muted text-center py-4">
          {t("loginToReply")}
        </div>
      ) : (
        <div className="surface p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("writeReply")}
            rows={3}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="relative flex items-center gap-1.5">
              <AnimatedEmojiPicker onSelect={(e) => setInput((v) => v + e)} />
              <GifPicker onSelect={(url) => setInput((v) => (v ? v + " " : "") + url + " ")} />
              <button onClick={openNotePick} className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1">
                <FileText size={13} /> {t("quoteMyNote")}
              </button>
              {showNotePick && (
                <div className="absolute z-30 bottom-full mb-1 left-0 w-64 max-h-56 overflow-auto surface-glass shadow-xl p-2">
                  <input value={noteQ} onChange={(e) => setNoteQ(e.target.value)} placeholder={t("searchMyNotes")} className="w-full bg-bg border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent mb-1" />
                  {myNotes.filter((n) => !noteQ.trim() || n.title.toLowerCase().includes(noteQ.trim().toLowerCase())).slice(0, 8).map((n) => (
                    <button key={n.id} onClick={() => insertNoteRef(n)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-bg-elevated rounded truncate">📄 {n.title}</button>
                  ))}
                  {myNotes.length === 0 && <div className="text-xs text-fg-muted px-2 py-2">{t("noNotes")}</div>}
                </div>
              )}
            </div>
            <button
              onClick={() => submit(input, null)}
              disabled={!input.trim()}
              className="px-4 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-transform"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {t("replyButton")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// 回覆內文渲染：引用筆記 token [[note:id|title]] → 可點連結；圖片/GIF 網址 → <img>；其餘網址 → 連結；純文字 → 動態 emoji
const IMG_URL_RE = /^https?:\/\/[^\s]+\.(gif|png|jpe?g|webp|svg)(\?[^\s]*)?$/i;
const GIPHY_URL_RE = /^https?:\/\/(media\d?\.giphy\.com|i\.giphy\.com)\/[^\s]+/i;
// 同時抓 note token 與 URL；note id 是 uuid
const CONTENT_RE = /\[\[note:([0-9a-fA-F-]{36})\|([^\]]*)\]\]|(https?:\/\/[^\s]+)/g;
function renderContent(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  CONTENT_RE.lastIndex = 0;
  while ((m = CONTENT_RE.exec(text)) !== null) {
    if (m.index > last) out.push(<EmojiText key={key++} text={text.slice(last, m.index)} size={18} />);
    if (m[1]) {
      // 引用筆記：可點 → 跳到該筆記
      out.push(
        <Link key={key++} href={`/me/notes/${m[1]}` as any} className="inline-flex items-center gap-0.5 text-accent underline decoration-dotted underline-offset-2 hover:opacity-80 break-all">
          📄 {m[2] || "筆記"}
        </Link>,
      );
    } else {
      const url = m[3];
      if (IMG_URL_RE.test(url) || GIPHY_URL_RE.test(url)) {
        // eslint-disable-next-line @next/next/no-img-element
        out.push(<img key={key++} src={url} alt="gif" loading="lazy" className="block max-w-[220px] max-h-[220px] rounded-lg my-1" />);
      } else {
        out.push(<a key={key++} href={url} target="_blank" rel="noreferrer" className="text-accent underline break-all">{url}</a>);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<EmojiText key={key++} text={text.slice(last)} size={18} />);
  return out;
}

function ReplyItem({
  reply,
  currentUserId,
  onDelete,
  onEdit,
  onReply,
  isReply,
  canMarkAnswer,
  onMarkAnswer,
  onSaveNote,
}: {
  reply: ForumReply & { _pending?: boolean };
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onEdit?: (id: string, content: string) => Promise<{ ok: boolean }>;
  onReply?: () => void;
  isReply?: boolean;
  canMarkAnswer?: boolean;
  onMarkAnswer?: (replyId: string, isAnswer: boolean) => void;
  onSaveNote?: () => void;
}) {
  const t = useTranslations("forum");
  const isOwn = currentUserId && reply.user_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.content);
  const [savingEdit, setSavingEdit] = useState(false);

  const submitEdit = async () => {
    if (!onEdit || !draft.trim() || savingEdit) return;
    setSavingEdit(true);
    const r = await onEdit(reply.id, draft);
    setSavingEdit(false);
    if (r.ok) setEditing(false);
  };
  const name = reply.author?.display_name || reply.author?.username || t("defaultUser");
  return (
    <div
      className={`surface p-3 transition-opacity ${reply.is_answer ? "glow-accent" : ""} ${reply._pending ? "opacity-60" : ""}`}
    >
      {reply.is_answer && (
        <div className="text-xs text-accent font-bold mb-1">{t("acceptedAnswer")}</div>
      )}
      <div className="flex items-start gap-2">
        {reply.author?.avatar_url ? (
          <Image
            src={reply.author.avatar_url}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="w-8 h-8 rounded-full shrink-0 object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-xs shrink-0">
            {name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{name}</span>
            <span className="px-1 py-px rounded bg-bg-elevated text-[9px] font-bold">
              Lv{reply.author?.level ?? 1}
            </span>
            <span className="text-[10px] text-fg-muted">
              {new Date(reply.created_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
            {reply._pending && (
              <span className="text-[10px] text-fg-muted italic">{t("sending")}</span>
            )}
          </div>
          {editing ? (
            <div className="mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onInput={(e) => autoGrow(e.currentTarget, 240)}
                rows={2}
                autoFocus
                className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
                style={{ maxHeight: "240px" }}
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={submitEdit}
                  disabled={!draft.trim() || savingEdit}
                  className="px-3 py-1 rounded-lg bg-accent text-black text-xs font-semibold disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {savingEdit ? t("sending") : t("saveEdit")}
                </button>
                <button
                  onClick={() => { setDraft(reply.content); setEditing(false); }}
                  className="px-3 py-1 rounded-lg text-xs text-fg-muted hover:text-fg"
                >
                  {t("cancelEdit")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">
              {renderContent(reply.content)}
              {reply.updated_at && (
                <span className="text-[10px] text-fg-muted ml-1.5">（{t("editedTag")}）</span>
              )}
            </p>
          )}
          <TranslateButton text={reply.content} />
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <LikeButton kind="forum" targetId={reply.id} />
            {onSaveNote && !reply._pending && (
              <button onClick={onSaveNote} title={t("saveNoteTitle")} className="text-xs text-fg-muted hover:text-accent flex items-center gap-0.5">
                <BookmarkPlus size={11} /> {t("saveNote")}
              </button>
            )}
            {!isReply && onReply && (
              <button onClick={onReply} className="text-xs text-fg-muted hover:text-accent flex items-center gap-0.5">
                <CornerDownRight size={11} /> {t("replyButton")}
              </button>
            )}
            {!isReply && canMarkAnswer && onMarkAnswer && (
              <button
                onClick={() => onMarkAnswer(reply.id, !reply.is_answer)}
                className={`text-xs flex items-center gap-0.5 ${
                  reply.is_answer
                    ? "text-accent font-semibold"
                    : "text-fg-muted hover:text-accent"
                }`}
              >
                <Check size={11} /> {reply.is_answer ? t("unmarkAnswer") : t("markAnswer")}
              </button>
            )}
            {isOwn && !reply._pending && onEdit && !editing && (
              <button onClick={() => { setDraft(reply.content); setEditing(true); }} className="text-xs text-fg-muted hover:text-accent flex items-center gap-0.5">
                <Pencil size={11} /> {t("editButton")}
              </button>
            )}
            {isOwn && !reply._pending && (
              <button onClick={() => onDelete(reply.id)} className="text-xs text-fg-muted hover:text-red-400 flex items-center gap-0.5">
                <Trash2 size={11} /> {t("delete")}
              </button>
            )}
            {!isOwn && !reply._pending && (
              <ReportButton targetType="reply" targetId={reply.id} targetOwnerId={reply.user_id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

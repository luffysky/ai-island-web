"use client";

import { useTranslations } from "next-intl";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { ShareButton } from "@/components/share/ShareButton";
import { BookmarkPlus } from "lucide-react";

/**
 * 討論串「主文」的操作列：存成筆記 + 分享。
 * （回覆的存成筆記在 ThreadReplies；這裡補主文本身也能收進知識庫 + 對外分享。）
 */
export function ThreadPostActions({
  threadId,
  threadTitle,
  threadContentHtml,
  threadUrl,
}: {
  threadId: string;
  threadTitle: string;
  threadContentHtml: string;
  threadUrl: string;
}) {
  const t = useTranslations("forum");
  const toast = useToast();
  const { status } = useAuth();

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const saveAsNote = async () => {
    if (status !== "in") { toast.error(t("pleaseLogin")); return; }
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error(t("pleaseLogin")); return; }
    const src = `<p>${t("noteSourcePrefix")}<a href="/forum/thread/${threadId}">${esc(threadTitle || t("defaultThreadTitle"))}</a></p>`;
    const html = `${threadContentHtml || ""}${src}`;
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      content: html,
      title: (threadTitle || t("defaultNoteTitle")).slice(0, 80),
      category: t("noteCategory"),
      tags: [t("noteTag")],
    });
    if (error) { toast.error(t("saveNoteFailed")); return; }
    toast.success(t("savedToKb"), { action: { label: t("view"), onClick: () => { window.location.href = "/me/notes"; } } });
  };

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
      <button
        onClick={saveAsNote}
        title={t("saveNoteTitle")}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-bg-card border border-border text-sm text-fg-muted hover:text-fg hover:border-accent/50 transition"
      >
        <BookmarkPlus size={14} /> {t("saveNote")}
      </button>
      <ShareButton
        url={threadUrl}
        title={threadTitle}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border text-sm text-fg-muted hover:text-fg hover:border-accent/50 transition"
      />
    </div>
  );
}

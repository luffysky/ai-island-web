import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import Link from "next/link";
import { BookmarkCheck, Bookmark } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTranslations } from "next-intl/server";

export default async function BookmarksPage() {
  const supabase = await createSupabaseServer();
  const t = await getTranslations("me");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 按章節分組
  const grouped: Record<number, any[]> = {};
  bookmarks?.forEach((b: any) => {
    if (!grouped[b.chapter_id]) grouped[b.chapter_id] = [];
    grouped[b.chapter_id].push(b);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🔖 {t("bookmarksTitle")}</h1>
      <p className="text-sm text-fg-muted">{t("bookmarksCount", { n: bookmarks?.length ?? 0 })}</p>

      {!bookmarks || bookmarks.length === 0 ? (
        <EmptyState icon={Bookmark} title={t("bookmarksEmptyTitle")} desc={t("bookmarksEmptyDesc")} action={{ label: t("bookmarksEmptyAction"), href: "/chapters" }} />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([chId, items]) => {
            const ch = chapters.find((c) => c.id === Number(chId));
            return (
              <div key={chId}>
                <h2 className="font-bold mb-3 text-accent">
                  Ch {chId.padStart(2, "0")} · {ch?.title}
                </h2>
                <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
                  {items.map((b) => (
                    <Link
                      key={b.id}
                      href={`/chapters/${b.chapter_id}` as any}
                      className="flex items-center gap-3 p-3 hover:bg-bg-elevated transition"
                    >
                      <BookmarkCheck size={18} className="text-yellow-400 fill-yellow-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{b.lesson_title}</div>
                        {b.note && (
                          <div className="text-xs text-fg-muted truncate">{b.note}</div>
                        )}
                      </div>
                      <div className="text-xs text-fg-muted shrink-0">
                        {new Date(b.created_at).toLocaleDateString('zh-TW')}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

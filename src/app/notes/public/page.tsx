import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { StickyNote, Eye, ArrowRight, BookOpen } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { chapterDisplayNumberById } from "@/lib/chapter-display";

// 筆記公開牆：使用者發佈到公開的筆記（is_public=true），可依分類篩選。公開頁、免登入。
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "筆記牆 — 公開筆記 | AI 島",
  description: "島上學習者公開分享的筆記，依分類瀏覽、互相偷師。",
  alternates: { canonical: "/notes/public" },
};

function snippet(content: string, n = 120): string {
  const isHtml = /<[a-z][\s\S]*>/i.test(content || "");
  const plain = isHtml ? (content || "").replace(/<[^>]*>/g, " ") : (content || "");
  return plain.replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

export default async function PublicNotesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const admin = createSupabaseAdmin();

  // 分類清單（公開筆記有用到的分類）
  const { data: catRows } = await admin.from("notes").select("category").eq("is_public", true).not("category", "is", null).limit(2000);
  const cats = Array.from(new Set((catRows ?? []).map((r: any) => r.category).filter(Boolean))).sort() as string[];

  // 公開筆記（可依分類過濾）
  let q = admin.from("notes").select("id, user_id, title, content, category, tags, chapter_id, lesson_id, likes, updated_at, color").eq("is_public", true).order("updated_at", { ascending: false }).limit(90);
  if (cat) q = q.eq("category", cat);
  const { data: notes } = await q;
  const rows = notes ?? [];

  // 作者名
  const uids = [...new Set(rows.map((n: any) => n.user_id).filter(Boolean))] as string[];
  const { data: profs } = uids.length ? await admin.from("profiles").select("id, username, display_name, avatar_url").in("id", uids) : { data: [] as any[] };
  const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));

  // 章節標題（給 pill）
  const chIds = [...new Set(rows.map((n: any) => n.chapter_id).filter(Boolean))] as number[];
  const { data: chs } = chIds.length ? await admin.from("chapters").select("id, title").in("id", chIds) : { data: [] as any[] };
  const chMap = new Map((chs ?? []).map((c: any) => [c.id, c.title]));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold inline-flex items-center gap-2 justify-center">
          <StickyNote size={26} className="text-accent" /> 筆記牆
        </h1>
        <p className="text-sm text-fg-muted">島上學習者公開分享的筆記 · 依分類瀏覽、互相偷師</p>
      </header>

      {/* 分類篩選 */}
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          <Link href="/notes/public" className={`text-xs px-3 py-1.5 rounded-full transition ${!cat ? "bg-accent text-black font-semibold" : "bg-bg-card border border-border text-fg-muted hover:border-accent"}`}>全部</Link>
          {cats.map((c) => (
            <Link key={c} href={`/notes/public?cat=${encodeURIComponent(c)}`} className={`text-xs px-3 py-1.5 rounded-full transition ${cat === c ? "bg-accent text-black font-semibold" : "bg-bg-card border border-border text-fg-muted hover:border-accent"}`}>📁 {c}</Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="surface p-12 text-center text-fg-muted">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm">{cat ? "這個分類還沒有公開筆記。" : "還沒有公開筆記。"}</p>
          <p className="text-xs mt-1">在 <Link href="/me/notes" className="text-accent hover:underline">我的筆記</Link> 把筆記發佈到這裡吧！</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((n: any) => {
            const p = pm.get(n.user_id);
            const author = p?.display_name || p?.username || "學習者";
            const chTitle = n.chapter_id ? chMap.get(n.chapter_id) : null;
            return (
              <Link key={n.id} href={`/me/notes/${n.id}`} className="surface hover-lift p-5 block group">
                {n.chapter_id && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full mb-2">
                    <BookOpen size={10} /> Ch{chapterDisplayNumberById(n.chapter_id)}{chTitle ? ` · ${chTitle}` : ""}
                  </span>
                )}
                <h2 className="font-bold group-hover:text-accent transition line-clamp-2">{n.title?.trim() || "（無標題筆記）"}</h2>
                <p className="text-sm text-fg-muted line-clamp-3 mt-1 leading-relaxed">{snippet(n.content)}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-fg-muted">
                  <span className="flex items-center gap-1.5">
                    {p?.avatar_url ? <Image src={p.avatar_url} alt="" width={18} height={18} unoptimized className="w-4.5 h-4.5 rounded-full object-cover" /> : <span className="w-4 h-4 rounded-full bg-accent/15" />}
                    {author}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {n.category && <span className="opacity-70">📁 {n.category}</span>}
                    {n.likes > 0 && <span>👍 {n.likes}</span>}
                    <ArrowRight size={12} className="group-hover:text-accent transition" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

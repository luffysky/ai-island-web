import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { JoinClient } from "./JoinClient";

export const dynamic = "force-dynamic";

async function lookup(code: string) {
  const admin = createSupabaseAdmin();
  const { data: invite } = await admin
    .from("note_invites")
    .select("note_id, revoked, expires_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!invite || invite.revoked) return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;
  const { data: note } = await admin.from("notes").select("title, user_id").eq("id", invite.note_id).maybeSingle();
  if (!note) return null;
  const { data: owner } = await admin.from("profiles").select("username, display_name").eq("id", note.user_id).maybeSingle();
  const plainTitle = String(note.title || "").replace(/<[^>]*>/g, "").trim() || "（無標題筆記）";
  const ownerName = owner?.display_name || owner?.username || "某位學員";
  return { title: plainTitle, ownerName };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const info = await lookup(code);
  const title = info ? `${info.ownerName} 邀請你共編筆記` : "共同筆記邀請";
  const description = info ? `一起編輯《${info.title}》— 在 AI 島用邀請碼加入共同筆記。` : "這個邀請可能已失效。";
  return {
    title,
    description,
    openGraph: { title, description, type: "article", images: ["/og.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
    robots: { index: false },
  };
}

export default async function JoinNotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await lookup(code);
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-border bg-bg-card p-6 text-center space-y-4">
        <div className="text-4xl">🤝</div>
        {!info ? (
          <>
            <h1 className="text-xl font-bold">邀請已失效</h1>
            <p className="text-sm text-fg-muted">這組邀請碼無效、已過期或已被取消。</p>
            <Link href="/me/notes" className="inline-block px-4 py-2 rounded-lg bg-accent text-black font-semibold">回我的筆記</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">{info.ownerName} 邀請你共編筆記</h1>
            <p className="text-sm text-fg-muted">《{info.title}》</p>
            {user ? (
              <JoinClient code={code.toUpperCase()} />
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/notes/join/${code}`)}`}
                className="inline-block px-4 py-2 rounded-lg bg-accent text-black font-semibold"
              >
                先登入再加入
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

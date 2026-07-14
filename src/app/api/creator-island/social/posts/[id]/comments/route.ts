import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listPostComments, addPostComment } from "@/lib/creator-engine/social";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyMention } from "@/lib/notify-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// @提及：抽 token user id + 通知被 tag 的人（排除自己）
function parseMentionIds(content: string): string[] {
  const ids = new Set<string>();
  const re = /\[\[user:([0-9a-fA-F-]{36})\|[^\]]*\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.add(m[1]);
  return [...ids];
}
async function notifyMentions(commenterId: string, postId: string, content: string) {
  const targets = parseMentionIds(content).filter((uid) => uid !== commenterId).slice(0, 10);
  if (!targets.length) return;
  let commenter = "有人";
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("profiles").select("display_name, username").eq("id", commenterId).single();
    commenter = (data as any)?.display_name || (data as any)?.username || "有人";
  } catch { /* ignore */ }
  const preview = content.replace(/\[\[user:[0-9a-fA-F-]{36}\|([^\]]*)\]\]/g, "@$1");
  for (const uid of targets) {
    notifyMention({ userId: uid, mentionerName: commenter, where: "社群留言", preview, link: `/creator-island/p/${postId}` }).catch(() => {});
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  return NextResponse.json({ comments: await listPostComments(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const body = String(b.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "validation" }, { status: 422 });
  const comment = await addPostComment(id, u.userId, body, b.parentId);
  notifyMentions(u.userId, id, body).catch(() => {});
  return NextResponse.json({ comment });
}

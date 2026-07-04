import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { grantZcoinOnce } from "@/lib/zcoin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LESSON_COIN = 5;    // 完成一小節（首次）
const CHAPTER_COIN = 80;  // 完成一整章
const CHAPTER_XP = 150;   // 完成一整章 XP bonus

/**
 * 完成小節/章節的伺服器端獎勵（server-authoritative、冪等，防偽造/重領）。
 * 由 completeLesson 在寫完 lesson_progress 後呼叫。
 * - 首次完成小節 → 5 Z 幣（grantZcoinOnce 依 lessonId 去重）
 * - 整章全部小節完成 → 發證書（certificates，UNIQUE(user,cert_key) 冪等）+ 80 Z 幣 + 150 XP
 * POST { chapterId:number, lessonId:string } → { lessonCoin, chapterCompleted, cert? }
 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const chapterId = Number(b.chapterId);
  const lessonId = String(b.lessonId ?? "");
  if (!Number.isFinite(chapterId) || !lessonId) return NextResponse.json({ error: "validation" }, { status: 422 });

  const admin = createSupabaseAdmin();

  // 驗證：這位使用者真的有完成這個小節（防偽造）
  const { data: lp } = await admin.from("lesson_progress")
    .select("id").eq("user_id", user.id).eq("lesson_id", lessonId).eq("completed", true).maybeSingle();
  if (!lp) return NextResponse.json({ error: "lesson_not_completed" }, { status: 409 });

  // 小節獎勵：首次完成才給（依 lessonId 冪等）
  const coinRes = await grantZcoinOnce(user.id, LESSON_COIN, "lesson_complete", `lesson:${lessonId}`, { lessonId, chapterId });
  const lessonCoin = coinRes.ok && !coinRes.duplicated ? LESSON_COIN : 0;

  // 章節完成偵測
  const [{ count: total }, { count: done }] = await Promise.all([
    admin.from("lessons").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId),
    admin.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("chapter_id", chapterId).eq("completed", true),
  ]);
  const totalN = total ?? 0, doneN = done ?? 0;
  if (totalN === 0 || doneN < totalN) {
    return NextResponse.json({ lessonCoin, chapterCompleted: false });
  }

  // 整章完成 → 發證書（冪等）
  const certKey = `ch${chapterId}`;
  const { data: existing } = await admin.from("certificates")
    .select("verification_code, title").eq("user_id", user.id).eq("cert_key", certKey).maybeSingle();
  if (existing) {
    return NextResponse.json({ lessonCoin, chapterCompleted: true, cert: { code: (existing as any).verification_code, title: (existing as any).title, alreadyIssued: true } });
  }

  const { data: ch } = await admin.from("chapters").select("title").eq("id", chapterId).maybeSingle();
  const chTitle = (ch as any)?.title || `第 ${chapterId} 章`;
  const title = `${chTitle} 完課證書`;
  const code = randomBytes(6).toString("hex"); // 12 碼驗證碼

  const { error: insErr } = await admin.from("certificates").insert({
    user_id: user.id, cert_type: "chapter", cert_key: certKey, title,
    verification_code: code, metadata: { chapterId, lessons: totalN },
  });
  // 可能因並發被 UNIQUE 擋下 → 撈回既有
  if (insErr) {
    const { data: again } = await admin.from("certificates").select("verification_code, title").eq("user_id", user.id).eq("cert_key", certKey).maybeSingle();
    return NextResponse.json({ lessonCoin, chapterCompleted: true, cert: again ? { code: (again as any).verification_code, title: (again as any).title, alreadyIssued: true } : null });
  }

  // 章節獎勵：Z 幣（冪等）+ XP bonus（依 chapter 去重）
  await grantZcoinOnce(user.id, CHAPTER_COIN, "chapter_complete", `chapter:${chapterId}`, { chapterId });
  const { data: xpDup } = await admin.from("xp_events").select("id").eq("user_id", user.id).eq("reason", "chapter_complete").contains("meta", { chapterId }).limit(1);
  if (!xpDup || xpDup.length === 0) {
    await admin.from("xp_events").insert({ user_id: user.id, amount: CHAPTER_XP, reason: "chapter_complete", meta: { chapterId } });
    const { data: prof } = await admin.from("profiles").select("xp").eq("id", user.id).single();
    await admin.from("profiles").update({ xp: ((prof as any)?.xp ?? 0) + CHAPTER_XP }).eq("id", user.id);
  }

  return NextResponse.json({
    lessonCoin,
    chapterCompleted: true,
    cert: { code, title, justIssued: true },
    reward: { zcoin: CHAPTER_COIN, xp: CHAPTER_XP },
  });
}

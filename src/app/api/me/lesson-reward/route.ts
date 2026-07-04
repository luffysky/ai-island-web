import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { grantZcoinOnce } from "@/lib/zcoin";
import { calcXp, isTaipeiWeekend } from "@/lib/dynamic-xp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LESSON_COIN = 5;    // 完成一小節（首次）
const CHAPTER_COIN = 80;  // 完成一整章
const CHAPTER_XP = 150;   // 完成一整章 XP bonus
const MAX_BASE_XP = 50;   // 防前端灌爆：base XP 上限（真實 lesson base ~10）

/** 冪等發一張證書；已發過回 null（不重發、不視為新里程碑）。 */
async function issueCert(admin: any, userId: string, certType: string, certKey: string, title: string, meta: Record<string, unknown>) {
  const { data: exist } = await admin.from("certificates").select("verification_code").eq("user_id", userId).eq("cert_key", certKey).maybeSingle();
  if (exist) return null;
  const code = randomBytes(6).toString("hex");
  const { error } = await admin.from("certificates").insert({ user_id: userId, cert_type: certType, cert_key: certKey, title, verification_code: code, metadata: meta });
  if (error) return null;
  return { code, title, justIssued: true };
}

/** #90 路徑(整個 stage 全章)/全站(所有已發布章) 完課 → 發里程碑證書（cert_type path|all）。 */
async function issueMilestoneCerts(admin: any, userId: string, chapterId: number): Promise<{ pathCert?: any; allCert?: any }> {
  const out: { pathCert?: any; allCert?: any } = {};
  // 使用者已拿章節證書的 chapterId 集合（cert_key = ch{N}）
  const { data: myCerts } = await admin.from("certificates").select("cert_key").eq("user_id", userId).eq("cert_type", "chapter");
  const owned = new Set<number>(((myCerts as any[]) ?? [])
    .map((c) => Number(String(c.cert_key).replace(/^ch/, "")))
    .filter((n) => Number.isFinite(n)));

  // path = 此章所屬 stage 的所有已發布章都拿到章節證書
  const { data: chRow } = await admin.from("chapters").select("stage").eq("id", chapterId).maybeSingle();
  const stage = (chRow as any)?.stage;
  if (stage != null) {
    const { data: stageChs } = await admin.from("chapters").select("id").eq("stage", stage).eq("status", "published");
    const ids = ((stageChs as any[]) ?? []).map((c) => c.id as number);
    if (ids.length > 0 && ids.every((id) => owned.has(id))) {
      const c = await issueCert(admin, userId, "path", `path_stage${stage}`, `Stage ${stage} 全章完課證書`, { stage, chapters: ids.length });
      if (c) out.pathCert = c;
    }
  }

  // all = 所有已發布章都拿到章節證書
  const { data: allChs } = await admin.from("chapters").select("id").eq("status", "published");
  const allIds = ((allChs as any[]) ?? []).map((c) => c.id as number);
  if (allIds.length > 0 && allIds.every((id) => owned.has(id))) {
    const c = await issueCert(admin, userId, "all", "all", "AI 島全站完課證書", { chapters: allIds.length });
    if (c) out.allCert = c;
  }
  return out;
}

/**
 * 完成小節（server-authoritative、冪等，防偽造/重領/灌 XP）。
 * XP 由伺服器算（clamp base + 動態倍率），寫進 lesson_progress → trigger 加 XP+streak+xp_event（AFTER INSERT，只第一次）。
 * 首次完成 → 5 Z幣；整章全完成 → 發證書 + 80 Z幣 + 150 XP。
 * POST { chapterId:number, lessonId:string, baseXp?:number } → { awardedXp, alreadyDone, level, leveledUp, lessonCoin, chapterCompleted, cert? }
 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const chapterId = Number(b.chapterId);
  const lessonId = String(b.lessonId ?? "");
  const baseXp = Math.max(1, Math.min(MAX_BASE_XP, Number(b.baseXp) || 10)); // 伺服器 clamp、不信前端數值
  if (!Number.isFinite(chapterId) || !lessonId) return NextResponse.json({ error: "validation" }, { status: 422 });

  const admin = createSupabaseAdmin();

  // 目前狀態
  const [{ data: before }, { data: existing }, { count: totalDone }] = await Promise.all([
    admin.from("profiles").select("level, streak_days, last_active_at").eq("id", user.id).maybeSingle(),
    admin.from("lesson_progress").select("id").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle(),
    admin.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
  ]);
  const oldLevel = (before as any)?.level ?? 1;

  let awardedXp = 0, multiplier = 1;
  const alreadyDone = !!existing;
  if (!alreadyDone) {
    // 伺服器算動態 XP（不信前端）
    const daysSinceLastActive = (before as any)?.last_active_at
      ? Math.max(0, Math.floor((Date.now() - new Date((before as any).last_active_at).getTime()) / 86400_000))
      : 0;
    const decision = calcXp({
      baseXp,
      streakDays: (before as any)?.streak_days ?? 0,
      daysSinceLastActive,
      totalLessonsDone: (totalDone as number) ?? 0,
      isWeekend: isTaipeiWeekend(),
      isBirthday: false,
      hasDoubleCoinBuff: false,
    });
    awardedXp = decision.finalXp;
    multiplier = decision.multiplier;
    // 寫進度（AFTER INSERT trigger 會加 XP + 更新 streak + 寫 xp_event，只第一次）
    const { error: insErr } = await admin.from("lesson_progress").insert({
      user_id: user.id, chapter_id: chapterId, lesson_id: lessonId,
      xp_awarded: awardedXp, completed: true, completed_at: new Date().toISOString(),
    });
    if (insErr) return NextResponse.json({ error: "progress_write_failed", message: insErr.message }, { status: 500 });
    admin.from("learning_events").insert({
      user_id: user.id, event_type: "lesson_complete", chapter_id: chapterId, lesson_id: lessonId,
      metadata: { xp_awarded: awardedXp, base_xp: baseXp, multiplier },
    }).then(() => {}, () => {});
  }

  // 小節獎勵：首次完成才給（依 lessonId 冪等）
  const coinRes = await grantZcoinOnce(user.id, LESSON_COIN, "lesson_complete", `lesson:${lessonId}`, { lessonId, chapterId });
  const lessonCoin = coinRes.ok && !coinRes.duplicated ? LESSON_COIN : 0;

  // 升等偵測
  const { data: after } = await admin.from("profiles").select("level, streak_days").eq("id", user.id).maybeSingle();
  const newLevel = (after as any)?.level ?? oldLevel;

  // 章節完成偵測
  const [{ count: total }, { count: done }] = await Promise.all([
    admin.from("lessons").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId),
    admin.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("chapter_id", chapterId).eq("completed", true),
  ]);
  const base = { awardedXp, alreadyDone, level: newLevel, leveledUp: newLevel > oldLevel, streak: (after as any)?.streak_days, lessonCoin, multiplier };
  const totalN = total ?? 0, doneN = done ?? 0;
  if (totalN === 0 || doneN < totalN) return NextResponse.json({ ...base, chapterCompleted: false });

  // 整章完成 → 發章節證書（冪等）
  const certKey = `ch${chapterId}`;
  let cert: any = null;
  let reward: any = undefined;
  const { data: existCert } = await admin.from("certificates").select("verification_code, title").eq("user_id", user.id).eq("cert_key", certKey).maybeSingle();
  if (existCert) {
    cert = { code: (existCert as any).verification_code, title: (existCert as any).title, alreadyIssued: true };
  } else {
    const { data: ch } = await admin.from("chapters").select("title").eq("id", chapterId).maybeSingle();
    const title = `${(ch as any)?.title || `第 ${chapterId} 章`} 完課證書`;
    const code = randomBytes(6).toString("hex");
    const { error: certErr } = await admin.from("certificates").insert({
      user_id: user.id, cert_type: "chapter", cert_key: certKey, title, verification_code: code, metadata: { chapterId, lessons: totalN },
    });
    if (certErr) {
      const { data: again } = await admin.from("certificates").select("verification_code, title").eq("user_id", user.id).eq("cert_key", certKey).maybeSingle();
      cert = again ? { code: (again as any).verification_code, title: (again as any).title, alreadyIssued: true } : null;
    } else {
      // 章節獎勵：Z幣（冪等）+ XP bonus（依 chapter 去重）
      await grantZcoinOnce(user.id, CHAPTER_COIN, "chapter_complete", `chapter:${chapterId}`, { chapterId });
      const { data: xpDup } = await admin.from("xp_events").select("id").eq("user_id", user.id).eq("reason", "chapter_complete").contains("meta", { chapterId }).limit(1);
      if (!xpDup || xpDup.length === 0) {
        await admin.from("xp_events").insert({ user_id: user.id, amount: CHAPTER_XP, reason: "chapter_complete", meta: { chapterId } });
        const { data: prof } = await admin.from("profiles").select("xp").eq("id", user.id).single();
        await admin.from("profiles").update({ xp: ((prof as any)?.xp ?? 0) + CHAPTER_XP }).eq("id", user.id);
      }
      cert = { code, title, justIssued: true };
    }
  }

  // #90 路徑/全站里程碑證書（章節證書已就緒後才判定）
  const milestone = await issueMilestoneCerts(admin, user.id, chapterId);

  return NextResponse.json({ ...base, chapterCompleted: true, cert, ...milestone, reward });
}

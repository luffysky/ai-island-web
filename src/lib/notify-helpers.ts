/**
 * In-app + LINE notify 整合
 * 插入 notifications 表（給 user 看的鈴鐺）+ 推林董 LINE
 */
import { createSupabaseAdmin } from "./supabase-admin";
import { notifyAdmin } from "./notify-admin";
import { buildSimpleCard } from "./line-flex";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

export type NotifKind =
  | "achievement" | "level_up" | "forum_reply" | "comment"
  | "follow" | "system" | "reward" | "lesson_complete";

/** 給單一 user 發 in-app 通知 */
export async function pushUserNotif(opts: {
  userId: string;
  kind: NotifKind;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("notifications").insert({
      user_id: opts.userId,
      kind: opts.kind,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
    });
  } catch (e) {
    console.warn("[notify-helpers] pushUserNotif failed:", (e as any)?.message);
  }
}

/** 拿 user 簡介（給通知文案用） */
async function brief(userId: string): Promise<string> {
  try {
    const admin = createSupabaseAdmin();
    const { data: p } = await admin.from("profiles").select("username, display_name, role").eq("id", userId).single();
    if (!p) return userId.slice(0, 8);
    const role = (p as any).role === "admin" ? " [admin]" : (p as any).role === "editor" ? " [editor]" : "";
    return `${(p as any).display_name || (p as any).username || userId.slice(0, 8)}${role}`;
  } catch { return userId.slice(0, 8); }
}

/** 用戶登入 → admin LINE 通知 */
export async function notifyLogin(userId: string, opts?: { device?: string; ip?: string }) {
  const name = await brief(userId);
  const isAdmin = name.includes("[admin]") || name.includes("[editor]");
  await notifyAdmin({
    kind: isAdmin ? "admin_login" : "login",
    dedupeKey: `login:${userId}:${new Date().toISOString().slice(0, 10)}`, // 一天一次同 user
    text: `${name} 登入${opts?.device ? `（${opts.device}）` : ""}`,
    subjectUserId: userId,
  });
}

/** 用戶看章節 → admin LINE 通知 */
export async function notifyChapterView(userId: string, chapterId: number, chapterTitle?: string) {
  const name = await brief(userId);
  await notifyAdmin({
    kind: "chapter_view",
    dedupeKey: `chapter:${userId}:${chapterId}:${new Date().toISOString().slice(0, 10)}`, // 一天一次
    text: `${name} 看了 Ch${String(chapterId).padStart(2, "0")}${chapterTitle ? ` ${chapterTitle}` : ""}`,
    subjectUserId: userId,
  });
}

import { notifyUserLine } from "./notify-user-line";

/** 用戶完成 lesson → admin LINE + 用戶 in-app + 用戶 LINE（若有綁） */
export async function notifyLessonComplete(opts: { userId: string; chapterId: number; lessonId: string; xp?: number }) {
  const name = await brief(opts.userId);
  const flex = buildSimpleCard({
    emoji: "✅",
    title: `${name} 完成 lesson`,
    accentColor: "#50fa7b",
    meta: [
      { label: "📚 Lesson", value: `Ch${opts.chapterId} · ${opts.lessonId}` },
      { label: "⚡ XP", value: `+${opts.xp ?? 10}` },
    ],
    buttons: [{ label: "看章節", uri: `${SITE_URL}/chapters/${opts.chapterId}`, primary: true }],
  });
  await notifyAdmin({
    kind: "lesson_complete",
    dedupeKey: `lesson:${opts.userId}:${opts.lessonId}`,
    text: `${name} 完成 Ch${opts.chapterId} · ${opts.lessonId}（+${opts.xp ?? 10} XP）`,
    flex,
    subjectUserId: opts.userId,
  });
  await pushUserNotif({
    userId: opts.userId,
    kind: "lesson_complete",
    title: `✅ 完成 Ch${opts.chapterId} · ${opts.lessonId}`,
    body: `+${opts.xp ?? 10} XP`,
    link: `/chapters/${opts.chapterId}`,
  });
  // 推 user 自己的 LINE（綁定了才會送、未綁靜默 skip）
  notifyUserLine({
    userId: opts.userId,
    text: `✅ 完成 Ch${opts.chapterId} · ${opts.lessonId}（+${opts.xp ?? 10} XP）`,
  }).catch(() => {});
}

/** 成就解鎖 → in-app + admin */
export async function notifyAchievement(opts: { userId: string; achievementId: string; title: string }) {
  const name = await brief(opts.userId);
  const flex = buildSimpleCard({
    emoji: "🏆",
    title: `${name} 解鎖成就`,
    accentColor: "#ffd700",
    body: `「${opts.title}」`,
    meta: [{ label: "🎖️ ID", value: opts.achievementId }],
    buttons: [{ label: "後台看用戶", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/users` }],
  });
  await notifyAdmin({
    kind: "achievement",
    dedupeKey: `ach:${opts.userId}:${opts.achievementId}`,
    text: `🏆 ${name} 解鎖「${opts.title}」`,
    flex,
    subjectUserId: opts.userId,
  });
  await pushUserNotif({
    userId: opts.userId,
    kind: "achievement",
    title: `🏆 解鎖成就：${opts.title}`,
    link: `/me/history`,
  });
  notifyUserLine({
    userId: opts.userId,
    text: `🏆 解鎖成就：${opts.title}`,
  }).catch(() => {});
}

/** 論壇回覆 → 通知主題作者 + admin */
export async function notifyForumReply(opts: { threadAuthorId: string; replierUsername: string; threadTitle: string; threadId: string }) {
  if (!opts.threadAuthorId) return;
  const flex = buildSimpleCard({
    emoji: "💭",
    title: `${opts.replierUsername} 回覆論壇`,
    accentColor: "#8be9fd",
    meta: [{ label: "📝 主題", value: opts.threadTitle.slice(0, 80) }],
    buttons: [{ label: "看討論串", uri: `${SITE_URL}/forum/thread/${opts.threadId}`, primary: true }],
  });
  await pushUserNotif({
    userId: opts.threadAuthorId,
    kind: "forum_reply",
    title: `${opts.replierUsername} 回覆了你的主題`,
    body: opts.threadTitle.slice(0, 80),
    link: `/forum/thread/${opts.threadId}`,
  });
  notifyUserLine({
    userId: opts.threadAuthorId,
    text: `💭 ${opts.replierUsername} 回覆「${opts.threadTitle.slice(0, 40)}」`,
  }).catch(() => {});
  // 注意：forum_reply 的 subject 是「回覆者」、不是主題作者（隱私 opt-out 看回覆者意願）
  await notifyAdmin({
    kind: "forum_reply",
    dedupeKey: `reply:${opts.threadId}:${opts.replierUsername}`,
    text: `💭 ${opts.replierUsername} 回覆「${opts.threadTitle.slice(0, 40)}」`,
    flex,
  });
}

/** 訂單成立 → admin */
export async function notifyOrderPaid(opts: { userId: string; amountTwd: number; planLabel?: string }) {
  const name = await brief(opts.userId);
  const flex = buildSimpleCard({
    emoji: "💰",
    title: `${name} 付款成功`,
    accentColor: "#ffd700",
    meta: [
      { label: "💵 金額", value: `NT$ ${opts.amountTwd.toLocaleString()}` },
      ...(opts.planLabel ? [{ label: "📦 方案", value: opts.planLabel }] : []),
    ],
    buttons: [{ label: "看訂單", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/orders`, primary: true }],
  });
  // 注意：訂單通知不接 opt-out（金流是運營剛需、user 不能關）
  await notifyAdmin({
    kind: "order",
    dedupeKey: `order:${opts.userId}:${Date.now()}`,
    text: `💰 ${name} 付款 NT$${opts.amountTwd}${opts.planLabel ? ` (${opts.planLabel})` : ""}`,
    flex,
  });
}

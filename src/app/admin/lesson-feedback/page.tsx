import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { requireOwner } from "@/lib/admin-guard";
import { Lock, MessageSquareHeart } from "lucide-react";

export const dynamic = "force-dynamic";

const REACTION_META: Record<string, { emoji: string; label: string }> = {
  got_it: { emoji: "💡", label: "懂了" },
  stuck: { emoji: "😵‍💫", label: "卡住" },
  amazing: { emoji: "🤯", label: "太神" },
  haha: { emoji: "😂", label: "哈哈" },
  fighting: { emoji: "💪", label: "加油" },
  like: { emoji: "👍", label: "讚" },
  love: { emoji: "❤️", label: "愛" },
  celebrate: { emoji: "🎉", label: "慶祝" },
};

const REACTION_ORDER = [
  "got_it",
  "stuck",
  "amazing",
  "haha",
  "fighting",
  "like",
  "love",
  "celebrate",
];

type ReactionRow = {
  id: string;
  lesson_id: string;
  chapter_id: number | null;
  reaction_key: string;
  user_id?: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function reactionMeta(key: string) {
  return REACTION_META[key] ?? { emoji: "❓", label: key };
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso?.slice(0, 16)?.replace("T", " ") ?? "";
  }
}

export default async function LessonFeedbackPage() {
  // 只有 owner 看得到
  const gate = await requireOwner();
  if (!gate.ok) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-10 text-center">
        <div className="mb-2 flex justify-center">
          <Lock className="w-8 h-8 text-fg-muted" />
        </div>
        <div className="font-bold">這頁只有 owner 看得到</div>
        <div className="text-sm text-fg-muted mt-1">學員情緒反饋屬機密、未開放給一般管理員。</div>
      </div>
    );
  }

  const admin = createSupabaseAdmin();

  // 1) 最近 200 筆反饋。user_id 欄位可能還沒建（migration 未跑）→ try/catch fallback。
  let rows: ReactionRow[] = [];
  let userIdColumnMissing = false;
  {
    const { data, error } = await admin
      .from("lesson_reactions")
      .select("id, lesson_id, chapter_id, reaction_key, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      // user_id 欄位不存在 → 退回不選 user_id
      userIdColumnMissing = true;
      const { data: data2 } = await admin
        .from("lesson_reactions")
        .select("id, lesson_id, chapter_id, reaction_key, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      rows = ((data2 as ReactionRow[]) ?? []).map((r) => ({ ...r, user_id: null }));
    } else {
      rows = (data as ReactionRow[]) ?? [];
    }
  }

  // 2) 撈 profiles（有 user_id 才需要）
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))
  );
  const profileMap = new Map<string, Profile>();
  if (userIds.length > 0) {
    try {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);
      for (const p of (profiles as Profile[]) ?? []) profileMap.set(p.id, p);
    } catch {
      /* 撈 profile 失敗就顯示匿名 */
    }
  }

  // 3) 撈 lesson 標題
  const lessonIds = Array.from(new Set(rows.map((r) => r.lesson_id).filter(Boolean)));
  const lessonMap = new Map<string, { title: string | null; chapter_id: number | null }>();
  if (lessonIds.length > 0) {
    try {
      const { data: lessons } = await admin
        .from("lessons")
        .select("id, title, chapter_id")
        .in("id", lessonIds);
      for (const l of (lessons as any[]) ?? [])
        lessonMap.set(String(l.id), { title: l.title ?? null, chapter_id: l.chapter_id ?? null });
    } catch {
      /* 撈 lesson 失敗就顯示 lesson_id 原文 */
    }
  }

  // 4) 全表各 reaction_key 統計（上限 10000 筆）
  const summary: Record<string, number> = {};
  let totalCount = 0;
  {
    const { data: allKeys } = await admin
      .from("lesson_reactions")
      .select("reaction_key")
      .limit(10000);
    for (const r of (allKeys as { reaction_key: string }[]) ?? []) {
      summary[r.reaction_key] = (summary[r.reaction_key] ?? 0) + 1;
      totalCount++;
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={MessageSquareHeart}
        title="💬 課程反饋（表情）"
        desc="學員每節課的情緒反饋——只有你看得到。"
        gradient="from-pink-500/10 via-rose-500/10 to-purple-500/10"
        borderColor="border-pink-500/30"
      />

      {userIdColumnMissing && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-fg-muted">
          偵測到 <code>lesson_reactions.user_id</code> 欄位尚未建立（migration 未跑），已退回不顯示登入者身分。跑完 migration 後就會顯示是誰給的反饋。
        </div>
      )}

      {/* 各反應統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REACTION_ORDER.map((key) => {
          const meta = reactionMeta(key);
          return (
            <div key={key} className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl">{meta.emoji}</div>
              <div className="text-xs text-fg-muted mt-1">{meta.label}</div>
              <div className="text-xl font-bold mt-1 text-fg tabular-nums">{summary[key] ?? 0}</div>
            </div>
          );
        })}
        <div className="bg-bg-elevated border border-border rounded-xl p-4 text-center col-span-2 sm:col-span-4 md:col-span-1">
          <div className="text-2xl">📊</div>
          <div className="text-xs text-fg-muted mt-1">總反饋數</div>
          <div className="text-xl font-bold mt-1 text-accent tabular-nums">{totalCount}</div>
        </div>
      </div>

      {/* 最近 200 筆 */}
      <div>
        <h2 className="font-bold mb-3">最近 200 筆</h2>
        {rows.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-10 text-center text-fg-muted">
            還沒有人給反饋。
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
                <tr>
                  <th className="px-4 py-3">誰</th>
                  <th className="px-4 py-3">反應</th>
                  <th className="px-4 py-3">課程</th>
                  <th className="px-4 py-3 whitespace-nowrap">時間</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = reactionMeta(r.reaction_key);
                  const profile = r.user_id ? profileMap.get(r.user_id) : undefined;
                  const who =
                    profile?.display_name || profile?.username || null;
                  const lesson = lessonMap.get(r.lesson_id);
                  const lessonLabel = lesson?.title || r.lesson_id;
                  const chapterId = lesson?.chapter_id ?? r.chapter_id;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {r.user_id ? (
                          <span className="inline-flex items-center gap-2">
                            {profile?.avatar_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                            )}
                            <span>{who ?? "（無名稱）"}</span>
                          </span>
                        ) : (
                          <span className="text-fg-muted">匿名（未登入）</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="mr-1">{meta.emoji}</span>
                        {meta.label}
                      </td>
                      <td className="px-4 py-3">
                        {chapterId != null && (
                          <span className="text-fg-muted mr-1">Ch{chapterId}</span>
                        )}
                        <span>{lessonLabel}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-fg-muted">
                        {fmtTime(r.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

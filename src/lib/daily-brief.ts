import { createSupabaseAdmin } from "./supabase-admin";
import { scoreOpportunity } from "./opportunity-fit";

// 「今天值得做的 3 件事」— 規則式（零 AI 成本、可靠），串機會島×分身島×學習。
// 給 LINE 指令「建議」與辦公室 widget 用；之後也可接每日主動推播（需 opt-in）。
function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline + "T23:59:59+08:00").getTime() - Date.now()) / 86400_000);
}

export async function buildDailyBrief(userId: string): Promise<string[]> {
  const admin = createSupabaseAdmin();
  const items: string[] = [];

  // 1. 收藏機會裡最近截止的 → 提醒準備
  try {
    const { data: routes } = await admin.from("opportunity_routes")
      .select("opportunity:opportunities(id, name, application_deadline, status)")
      .eq("user_id", userId).limit(30);
    const savedIds = new Set<string>();
    const urgent = ((routes as any[]) ?? [])
      .map((r) => r.opportunity)
      .filter((o) => { if (o?.id) savedIds.add(o.id); return o && o.status !== "closed" && o.application_deadline; })
      .map((o) => ({ o, dl: daysLeft(o.application_deadline) }))
      .filter((x) => x.dl != null && x.dl >= 0)
      .sort((a, b) => (a.dl as number) - (b.dl as number))[0];
    if (urgent) items.push(`⏰ 準備「${urgent.o.name}」— 剩 ${urgent.dl} 天截止`);

    // 2. 推薦一個「還沒收藏、適合度高」的機會
    const { data: opps } = await admin.from("opportunities")
      .select("id, name, category, tags, prize_amount, is_free, is_online, requires_pitch, requires_demo, requires_business_plan, requires_student, application_deadline, status")
      .in("status", ["open", "upcoming"]).limit(200);
    const now = Date.now();
    const rec = ((opps as any[]) ?? [])
      .filter((o) => !savedIds.has(o.id))
      .map((o) => ({ o, fit: scoreOpportunity(o, now) }))
      .filter((x) => x.fit.blockers.length === 0)
      .sort((a, b) => b.fit.score - a.fit.score)[0];
    if (rec) items.push(`🧭 看看新機會「${rec.o.name}」— 可能適合你`);
  } catch { /* ignore */ }

  // 3. 學習：找一個弱項章節、否則鼓勵繼續
  try {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: quizzes } = await admin.from("quiz_attempts")
      .select("chapter_id, correct, total_questions").eq("user_id", userId).gte("attempted_at", since);
    const byCh: Record<number, { sum: number; n: number }> = {};
    for (const q of (quizzes as any[]) ?? []) {
      if (!q.chapter_id || !q.total_questions) continue;
      byCh[q.chapter_id] ||= { sum: 0, n: 0 };
      byCh[q.chapter_id].sum += (q.correct / q.total_questions) * 100;
      byCh[q.chapter_id].n++;
    }
    const weak = Object.entries(byCh).map(([k, v]) => ({ ch: Number(k), avg: v.sum / v.n }))
      .filter((x) => x.avg < 60).sort((a, b) => a.avg - b.avg)[0];
    if (weak) items.push(`📚 複習 Ch${weak.ch}（quiz 平均 ${Math.round(weak.avg)} 分、偏弱）`);
  } catch { /* ignore */ }

  // 補滿 3 件（通用建議）
  const fallbacks = [
    "🤖 叫分身島幫你查一件事（LINE 打「/分身 …」）",
    "🧭 逛機會島、把想參加的加入航線",
    "📚 學一課、保持連續簽到",
  ];
  for (const f of fallbacks) { if (items.length >= 3) break; if (!items.includes(f)) items.push(f); }
  return items.slice(0, 3);
}

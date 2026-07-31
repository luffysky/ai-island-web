/**
 * Rule-filter（省 token 前置層）——在 Agent 進入 LLM 迴圈「之前」用**決定性規則**攔掉不需要燒錢的任務：
 *   1. 純招呼／測試字（「hi」「你好」「謝謝」「test」）→ 回罐頭語、完全不叫 LLM。
 *   2. 短時間內「一字不差的重複任務」→ 直接回上次的結果（防連點/重問，省一整輪）。
 * 設計原則：**寧可放行、不可誤攔**——只在「明確」符合時短路，任何疑慮或錯誤都回 null 讓正常流程跑。
 * 純函式（isPureGreeting / hasFreshnessIntent）另有單元測試。
 */

// 整句就是招呼/測試/確認的短字（正規化後「完全等於」才算，避免「你好，幫我查天氣」被誤攔）
const GREETING_SET = new Set([
  "hi", "hello", "hey", "yo", "哈囉", "哈嘍", "你好", "妳好", "您好", "嗨", "嗨嗨",
  "在嗎", "在吗", "有人嗎", "有人在嗎", "test", "測試", "测试", "ping",
  "謝謝", "谢谢", "感謝", "感谢", "thanks", "thank you", "thx", "ok", "okay", "好", "好的", "收到", "hi hi",
]);

export const GREETING_REPLY =
  "嗨～我是你的分身 🤖 我可以幫你查資料、整理重點、規劃行程、翻譯潤稿、盯截止日等等。\n直接把你想完成的「一件事」丟給我就好，例如：「幫我查這週台北下雨機率並建議帶不帶傘」。";

/** 正規化：去頭尾空白、轉小寫、去掉常見標點與表情符號、壓縮空白。 */
function normalizeGoal(goal: string): string {
  return String(goal ?? "")
    .trim()
    .toLowerCase()
    .replace(/[!！?？。.,，、~～\-—…\s]+/g, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .trim();
}

/** 整句是不是「純招呼/測試」——只有完全等於招呼詞才算（決定性、可測）。 */
export function isPureGreeting(goal: string): boolean {
  const n = normalizeGoal(goal);
  if (!n) return true;              // 空白也算（沒給實質任務）
  if (n.length > 12) return false;  // 太長一定夾帶實質內容、不攔
  return GREETING_SET.has(n) || GREETING_SET.has(n.replace(/\s+/g, ""));
}

/** 目標是否帶「時效性」意圖（今天/現在/最新/價格…）——有的話不做重複快取（怕回舊資料）。 */
export function hasFreshnessIntent(goal: string): boolean {
  return /今天|今日|現在|此刻|最新|即時|目前|這週|本週|這周|now|today|latest|current|價格|股價|匯率|天氣|氣溫|下雨|截止|報名|幾點|開盤|收盤/i.test(
    goal,
  );
}

export type PreFilterHit = { summary: string; reason: "greeting" | "duplicate" };

/**
 * 前置攔截。命中回 { summary, reason }（呼叫端直接把任務標成 succeeded、寫這個 summary、不叫 LLM）；
 * 沒命中回 null（照常跑）。admin = supabase admin client；hasSkill 時不做重複快取（技能有自訂框架）。
 */
export async function preFilterGoal(args: {
  admin: any;
  userId: string;
  goal: string;
  taskId: string;
  hasSkill?: boolean;
}): Promise<PreFilterHit | null> {
  const { admin, userId, goal, taskId, hasSkill } = args;

  // 規則 1：純招呼 → 罐頭語，零成本
  if (isPureGreeting(goal)) {
    return { summary: GREETING_REPLY, reason: "greeting" };
  }

  // 規則 2：短時間內一字不差的重複任務 → 回上次結果（防連點/重問）。時效性任務不快取（怕舊資料）。
  if (!hasSkill && !hasFreshnessIntent(goal)) {
    try {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 分鐘窗
      const { data } = await admin
        .from("agent_tasks")
        .select("id, result, created_at")
        .eq("user_id", userId)
        .eq("goal", goal.trim())
        .eq("status", "succeeded")
        .neq("id", taskId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const prevSummary = (data as any)?.result?.summary;
      if (typeof prevSummary === "string" && prevSummary.trim().length > 0) {
        return {
          summary: `（這題你 10 分鐘內剛問過，先把上次的結果給你——要重新查一次就換個說法或補充條件。）\n\n${prevSummary}`,
          reason: "duplicate",
        };
      }
    } catch {
      /* fail-open：查詢出錯 → 不攔、照常跑 */
    }
  }

  return null;
}

/**
 * AI 助教（assistant）— 跟 AI 導師（tutor）分流
 *
 * 導師：概念解釋、答疑、深度（綠寶 chat）
 * 助教：4 種角色
 *  1. 作業預批 grade_draft
 *  2. inline hint hint
 *  3. 練習推薦 recommend
 *  4. 學伴陪聊 companion
 */

export type AssistantMode = "grade_draft" | "hint" | "recommend" | "companion";

const SYSTEM: Record<AssistantMode, string> = {
  grade_draft: `你是 AI 助教、專門幫學生「預批作業」。
規則：
1. 用國中生能懂的語氣（雪鑰風格、簡單類比）
2. 先給 3 個讚（具體、不空泛）、再給 3 個改進建議（每個附範例）
3. 估個分（A/B+/B/C+/C/D）並說明依據
4. 結尾鼓勵句、不超過 200 字
不要直接給答案、要引導學生自己改。`,

  hint: `你是 AI 助教、學生卡在題目時給「提示」（不是答案）。
規則：
1. 三層次提示：先問「你卡在哪？」、再給「方向」、最後給「具體步驟」
2. 永遠不直接給最終答案
3. 用 1-2 句話、不超過 80 字
4. 結尾問「要不要試試？」鼓勵動手`,

  recommend: `你是 AI 助教、依學生的錯題 / 已學內容、推薦下 3-5 個練習題。
規則：
1. 推薦來源：leetcode 編號 + slug、或 lesson id
2. 依錯題類型推類似題（不重複）
3. 難度漸進（從簡單到中等）
4. 每題附 1 句「為什麼推這題」
5. 用 markdown list、簡潔`,

  companion: `你是 AI 學伴、跟學生輕鬆聊天 / 鼓勵 / 提醒。
規則：
1. 像同學、不像老師（口語、表情符號、不批評）
2. 不主動講課、聽到困難先共感再鼓勵
3. 偶爾提醒「該休息囉」「該喝水」這類關心
4. 不超過 100 字、結尾常帶問句邀對方繼續說`,
};

export type AssistantInput = {
  mode: AssistantMode;
  userMessage: string;
  context?: {
    chapterId?: number;
    lessonId?: string;
    assignmentTitle?: string;
    recentErrors?: Array<{ q: string; answer: string; correct: string }>;
  };
};

export function buildAssistantPrompt(input: AssistantInput): { system: string; user: string } {
  const ctx = input.context;
  let contextBlock = "";
  if (ctx) {
    const parts: string[] = [];
    if (ctx.chapterId) parts.push(`目前章節：Ch ${ctx.chapterId}`);
    if (ctx.lessonId) parts.push(`Lesson: ${ctx.lessonId}`);
    if (ctx.assignmentTitle) parts.push(`作業：${ctx.assignmentTitle}`);
    if (ctx.recentErrors && ctx.recentErrors.length) {
      parts.push(`最近錯題：\n${ctx.recentErrors.slice(0, 3).map((e, i) =>
        `${i + 1}. ${e.q}\n  你選：${e.answer}、正解：${e.correct}`).join("\n")}`);
    }
    if (parts.length) contextBlock = `\n\n[Context]\n${parts.join("\n")}`;
  }
  return {
    system: SYSTEM[input.mode],
    user: input.userMessage + contextBlock,
  };
}

export const ASSISTANT_LABEL: Record<AssistantMode, { emoji: string; name: string; desc: string }> = {
  grade_draft: { emoji: "📝", name: "AI 預批",   desc: "交作業前先給回饋、抓盲點" },
  hint:        { emoji: "💡", name: "AI 提示",   desc: "卡題給方向、不直接給答案" },
  recommend:   { emoji: "🎯", name: "AI 推薦",   desc: "依錯題推下一輪練習" },
  companion:   { emoji: "🤝", name: "AI 學伴",   desc: "輕鬆聊、鼓勵、提醒休息" },
};

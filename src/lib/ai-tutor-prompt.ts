// AI 學習導師系統提示
// 把 60 章內容壓縮成 system prompt、讓模型像「上過 AI 島完整課程」

import { chapters } from "@/data/chapters";

const TONE_STYLES: Record<string, string> = {
  friendly: "親切、耐心、像鄰家學長解釋。多用 emoji 偶爾。",
  concise: "極簡、直接給答案、最少廢話。",
  detailed: "深入、step by step、舉多個例子。",
  tutor: "蘇格拉底式、用反問引導學生想出來。",
  casual_tw: "Taiwanese 口語、用「啊」「欸」「喔」、像 LINE 朋友聊。不過度文藝。",
  pro: "專業、像 senior engineer code review、給 best practice。",
};

let cachedCourseSummary: string | null = null;

function buildCourseSummary(): string {
  if (cachedCourseSummary) return cachedCourseSummary;

  const lines: string[] = [];
  lines.push("=== AI 島 60 章完整課程結構 ===\n");

  for (const ch of chapters) {
    const stage = ch.stage;
    lines.push(`\n## Ch${String(ch.id).padStart(2, "0")}：${ch.title}（Stage ${stage}、${ch.difficulty}、${ch.estimatedHours}h）`);
    lines.push(`副標：${ch.subtitle}`);
    lines.push(`學習成果：${(ch.outcomes ?? []).slice(0, 3).join(" / ")}`);

    // 列前 5 個 lesson
    const lessons = ch.lessons.slice(0, 5);
    lessons.forEach((l) => {
      const summary = l.oneLineSummary || l.title;
      lines.push(`  • ${l.number} ${l.title}：${summary.slice(0, 60)}`);
    });
    if (ch.lessons.length > 5) {
      lines.push(`  ... 還有 ${ch.lessons.length - 5} 個 lesson`);
    }
  }

  cachedCourseSummary = lines.join("\n");
  return cachedCourseSummary;
}

import { getPersona } from "./ai-personas";

export function buildTutorSystemPrompt(options: {
  tone?: string;
  contextChapterId?: number;
  contextLessonId?: string;
  userName?: string;
  personaId?: string;
  userContext?: string;  // 從 formatLearningStateForPrompt() 來的整段學員背景
}): string {
  const tone = options.tone ?? "friendly";
  const toneInstruction = TONE_STYLES[tone] ?? TONE_STYLES.friendly;
  const persona = getPersona(options.personaId);

  // 如果有 lesson context、把該 lesson 內容塞進去
  let contextInfo = "";
  if (options.contextChapterId) {
    const ch = chapters.find((c) => c.id === options.contextChapterId);
    if (ch) {
      contextInfo += `\n\n## 用戶目前在學：Ch${ch.id} ${ch.title}\n`;
      if (options.contextLessonId) {
        const lesson = ch.lessons.find((l) => l.id === options.contextLessonId);
        if (lesson) {
          contextInfo += `\n### Lesson ${lesson.number}：${lesson.title}\n`;
          contextInfo += `${lesson.oneLineSummary}\n${lesson.analogy}\n`;
          if (lesson.content) {
            contextInfo += `\n完整內容：\n${lesson.content.slice(0, 3000)}\n`;
          }
        }
      } else {
        // 列章內所有 lesson
        contextInfo += "本章 lessons：\n";
        ch.lessons.forEach((l) => {
          contextInfo += `- ${l.number} ${l.title}\n`;
        });
      }
    }
  }

  const summary = buildCourseSummary();

  return `你是 AI 島（aiisland.tw）的 AI 學習導師。

# 你的角色
- 教 Indie 創業者、開發者、設計師、自學者
- 你「上過」AI 島完整 60 章課程、熟悉每個主題
- 用戶問問題時、你會引用 AI 島的章節（「這在 Ch08 React 完整有教」）
- 鼓勵實作、不只解釋
- 如果用戶問跟課程無關、也要友善回答（你是 general assistant + 課程專家雙重身份）

${options.userContext ?? ""}

${persona.promptBlock}

# 對話語氣
${toneInstruction}

# 我的規則
1. 用 Traditional Chinese 為主、code 範例保持英文
2. 程式碼用 markdown code block、註明語言
3. 不要瞎掰、不確定就說「我不確定、建議查 X」
4. 如果問題能用 AI 島某章節回答、優先引用章節（「Ch12 第 3 lesson 有完整講」）
5. 鼓勵動手、不是只看
6. 不要過度道歉
7. 避免「身為 AI、我」這種開頭、直接回答

# 講解風格：以國中生能理解的角度切入（重要）
即使是進階主題、你也要：
- **先用日常類比起頭**：廚房、便利商店、書包、遊戲、文具盒、樂高… 找個 12-15 歲生活中熟悉的東西比喻
- **不要直接丟英文 jargon**：先講中文意思（例如「狀態管理 (state)」），確定學生聽懂之後再用術語
- **公式 / 抽象概念先講故事**：給情境例子（「假設你開飲料店、客人來了你怎麼…」），最後才給定義
- **程式碼從最最簡單的一行開始**：先給能跑、能改的「玩具版」，再層層加東西
- **反問句、口語化**：「你有沒有遇過 X？」「想想看、如果是你會怎麼做？」用學長學姊聊天的感覺
- **進階補充放最後**：用「想再深一點…」「順帶一提…」引導，讓學生自己選要不要學更深
- **避免「顯然」「很簡單」「應該都知道」這種讓學生覺得自己笨的詞**
- 學生問深技術問題時、也是先用國中生能懂的方式講「這在做什麼」、再放正式名詞

# 我的知識來源（AI 島 60 章課程結構）

${summary}

${contextInfo}

# 開始
用戶會問問題、依以上規則回答。`;
}

export { TONE_STYLES };

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

export function buildTutorSystemPrompt(options: {
  tone?: string;
  contextChapterId?: number;
  contextLessonId?: string;
  userName?: string;
}): string {
  const tone = options.tone ?? "friendly";
  const toneInstruction = TONE_STYLES[tone] ?? TONE_STYLES.friendly;

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

# 我的知識來源（AI 島 60 章課程結構）

${summary}

${contextInfo}

# 開始
用戶會問問題、依以上規則回答。`;
}

export { TONE_STYLES };

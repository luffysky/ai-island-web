// AI 學習導師系統提示
// 從 Supabase chapters / lessons 表動態載入、章節改 JSON 跑 import 後 5 分鐘內 AI 看到新內容
// 之前是 build-time import @/data/chapters、JSON 改了 AI 永遠看舊的

import { unstable_cache } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase";
import { chapterDisplayNumber, chapterDisplayNumberById } from "./chapter-display";
import { getPersona } from "./ai-personas";
import { checkOwner } from "./is-owner";

const TONE_STYLES: Record<string, string> = {
  friendly: "親切、耐心、像鄰家學長解釋。多用 emoji 偶爾。",
  concise: "極簡、直接給答案、最少廢話。",
  detailed: "深入、step by step、舉多個例子。",
  tutor: "蘇格拉底式、用反問引導學生想出來。",
  casual_tw: "Taiwanese 口語、用「啊」「欸」「喔」、像 LINE 朋友聊。不過度文藝。",
  pro: "專業、像 senior engineer code review、給 best practice。",
};

type ChapterRow = {
  id: number;
  stage: string;
  title: string;
  subtitle: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  outcomes: string[] | null;
};

type LessonSummary = {
  id: string;
  chapter_id: number;
  number: string;
  title: string;
  one_line_summary: string | null;
  sort_order: number;
};

type LessonFull = {
  id: string;
  chapter_id: number;
  number: string;
  title: string;
  one_line_summary: string | null;
  analogy: string | null;
  content: string | null;
};

// 章節 + 前 5 個 lesson 摘要：5 分鐘 cache（章節結構變動少）
// 注意：unstable_cache 內部會 JSON 序列化、Map 會被打回 {}、回來呼叫 .get() 就炸。
// 所以 lessonsByChapter 用 Record<number, LessonSummary[]>、access 用 [chId] 不用 .get()。
const getChapterSummaries = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin();
    const { data: chapters, error: chErr } = await admin
      .from("chapters")
      .select("id, stage, title, subtitle, difficulty, estimated_hours, outcomes")
      .eq("status", "published")
      .order("id", { ascending: true });
    if (chErr || !chapters) {
      console.warn("[ai-tutor-prompt] chapters fetch failed:", chErr?.message);
      return { chapters: [] as ChapterRow[], lessonsByChapter: {} as Record<number, LessonSummary[]> };
    }

    const { data: lessons } = await admin
      .from("lessons")
      .select("id, chapter_id, number, title, one_line_summary, sort_order")
      .order("sort_order", { ascending: true });

    const lessonsByChapter: Record<number, LessonSummary[]> = {};
    for (const l of (lessons || []) as LessonSummary[]) {
      (lessonsByChapter[l.chapter_id] ??= []).push(l);
    }

    return { chapters: chapters as ChapterRow[], lessonsByChapter };
  },
  ["ai-tutor-chapter-summaries"],
  { revalidate: 300, tags: ["chapters"] }, // 5 分鐘
);

// 單一 lesson 完整內容：60 秒 cache（lesson 內容改後 60 秒內 AI 看到新版）
async function getLessonFull(lessonId: string): Promise<LessonFull | null> {
  const cached = unstable_cache(
    async () => {
      const admin = createSupabaseAdmin();
      const { data, error } = await admin
        .from("lessons")
        .select("id, chapter_id, number, title, one_line_summary, analogy, content")
        .eq("id", lessonId)
        .maybeSingle();
      if (error || !data) return null;
      return data as LessonFull;
    },
    ["ai-tutor-lesson", lessonId],
    { revalidate: 60, tags: ["chapters", `lesson:${lessonId}`] },
  );
  return cached();
}

async function buildCourseSummary(slim = false): Promise<{ summary: string; chapterCount: number; lastChapter: ChapterRow | undefined }> {
  const { chapters, lessonsByChapter } = await getChapterSummaries();
  const lines: string[] = [];

  if (slim) {
    // LINE / Telegram / Discord channel：只列章節標題、節省 ~85% prompt token
    // AI 想看具體 lesson 用 tool（search_lessons）動態查、不灌進 prompt
    lines.push(`=== AI 島 ${chapters.length} 章課程列表（只章節標題、要查 lesson 用 search_lessons tool）===\n`);
    for (const ch of chapters) {
      lines.push(
        `Ch${chapterDisplayNumberById(ch.id)} ${ch.title}${ch.subtitle ? `（${ch.subtitle}）` : ""} · Stage ${ch.stage}`,
      );
    }
  } else {
    lines.push(`=== AI 島 ${chapters.length} 章完整課程結構（全部 lesson 標題索引）===\n`);
    for (const ch of chapters) {
      lines.push(
        `\n## Ch${chapterDisplayNumberById(ch.id)}：${ch.title}（Stage ${ch.stage}、${ch.difficulty ?? "?"}、${ch.estimated_hours ?? 0}h）`,
      );
      if (ch.subtitle) lines.push(`副標：${ch.subtitle}`);
      const outcomes = (ch.outcomes ?? []).slice(0, 3).join(" / ");
      if (outcomes) lines.push(`學習成果：${outcomes}`);
      const allLessons = lessonsByChapter[ch.id] ?? [];
      allLessons.forEach((l, idx) => {
        if (idx < 3 && l.one_line_summary) {
          lines.push(`  • ${l.number} ${l.title} — ${l.one_line_summary.slice(0, 60)}`);
        } else {
          lines.push(`  • ${l.number} ${l.title}`);
        }
      });
      if (allLessons.length > 0) {
        lines.push(`  📖 完整章節：https://ai-island-web.snowrealm.pet/chapters/${ch.id}`);
      }
    }
  }

  return {
    summary: lines.join("\n"),
    chapterCount: chapters.length,
    lastChapter: chapters[chapters.length - 1],
  };
}

// 智慧記憶判斷：第一句一律帶記憶建立 context；之後只在訊息含「回憶訊號」時才載長期記憶（省 token）
const MEMORY_RECALL_SIGNALS = /記得|上次|之前|剛剛|前面|我叫|我的名字|我是誰|我們(聊|說|講)|繼續|還記得|我喜歡|我想學|我的目標|我說過|你知道我|幫我複習|我的進度|接續|上一題|剛才/;
export function needsMemoryRecall(message: string | undefined, isFirstTurn: boolean): boolean {
  if (message === undefined) return true;   // 舊呼叫端沒傳 → 維持原行為
  if (isFirstTurn) return true;
  return MEMORY_RECALL_SIGNALS.test(message);
}

export async function buildTutorSystemPrompt(options: {
  tone?: string;
  contextChapterId?: number;
  contextLessonId?: string;
  userName?: string;
  personaId?: string;
  userContext?: string;
  userRole?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  userUsername?: string | null;
  lineUserId?: string | null;       // LINE bot 認林董用（OWNER_LINE_USER_IDS env 配對）
  channel?: "web" | "line" | "telegram" | "discord";  // 非 web 一律 slim prompt
  modelProvider?: string | null;    // 顯式告訴 AI 自己是哪 provider（避免 hallucinate「我是 Claude Sonnet 3.5」）
  modelName?: string | null;
  currentMessage?: string;          // 這輪使用者訊息 — 用來判斷「要不要載長期記憶」（省 token）
  historyCount?: number;            // 目前對話已有幾則 — 0 = 第一句、必帶記憶建立 context
}): Promise<string> {
  const tone = options.tone ?? "friendly";
  const toneInstruction = TONE_STYLES[tone] ?? TONE_STYLES.friendly;
  const persona = getPersona(options.personaId);
  const ownerCheck = checkOwner({
    id: options.userId ?? null,
    username: options.userUsername ?? null,
    role: options.userRole ?? null,
    email: options.userEmail ?? null,
    lineUserId: options.lineUserId ?? null,
  });
  const isOwner = ownerCheck.isOwner;

  // LINE / Telegram / Discord 走 slim：只列章節標題、減 ~85% prompt token
  // 學員想知道具體 lesson、AI 走 search_lessons tool 動態查（Anthropic 才有 tool、其他 channel 依賴標題猜）
  const slim = options.channel !== undefined && options.channel !== "web";
  const { summary, chapterCount, lastChapter } = await buildCourseSummary(slim);

  // 智慧記憶：不是每次都灌長期記憶（傷 token）。只在「需要回憶」時才載：
  //   - 第一句（建立 context）、或訊息出現「記得 / 之前 / 我叫 / 我的目標…」這類回憶訊號
  //   - 舊呼叫端沒傳 currentMessage → 維持原行為（一律載）
  // 失敗不阻塞、回空字串
  let memoryBlock = "";
  const recallMemory = needsMemoryRecall(options.currentMessage, (options.historyCount ?? 0) === 0);
  if (options.userId && recallMemory) {
    try {
      const { loadUserMemory, formatMemoryForPrompt } = await import("./user-ai-memory");
      const mem = await loadUserMemory(options.userId);
      memoryBlock = formatMemoryForPrompt(mem);
    } catch (e: any) {
      console.warn("[ai-tutor-prompt] memory load failed:", e?.message);
    }
  }

  // contextChapter / contextLesson：用 DB 即時讀（60 秒 cache）
  let contextInfo = "";
  if (options.contextChapterId) {
    const { chapters, lessonsByChapter } = await getChapterSummaries();
    const ch = chapters.find((c) => c.id === options.contextChapterId);
    if (ch) {
      contextInfo += `\n\n## 用戶目前在學：Ch${chapterDisplayNumberById(ch.id)} ${ch.title}\n`;
      // 串「掌握度」：完成節數 + miniQuiz 答對數 → 讓綠寶調整深淺、建議複習
      if (options.userId) {
        try {
          const { createSupabaseAdmin } = await import("./supabase-admin");
          const admin = createSupabaseAdmin();
          const total = (lessonsByChapter[ch.id] ?? []).length;
          const [{ data: prog }, { data: eng }] = await Promise.all([
            admin.from("lesson_progress").select("lesson_id").eq("user_id", options.userId).eq("chapter_id", ch.id),
            admin.from("lesson_engagement").select("quiz_passed").eq("user_id", options.userId).eq("chapter_id", ch.id),
          ]);
          const done = (prog ?? []).length;
          const quizzed = (eng ?? []).filter((e: any) => e.quiz_passed).length;
          if (total > 0) {
            contextInfo += `（用戶在這章：完成 ${done}/${total} 節、miniQuiz 答對 ${quizzed} 題。回答深淺請據此調整，必要時建議他回頭複習還沒掌握的部分。）\n`;
          }
        } catch { /* 掌握度非必要、失敗不阻塞 */ }
      }
      if (options.contextLessonId) {
        const lesson = await getLessonFull(options.contextLessonId);
        if (lesson) {
          contextInfo += `\n### Lesson ${lesson.number}：${lesson.title}\n`;
          if (lesson.one_line_summary) contextInfo += `${lesson.one_line_summary}\n`;
          if (lesson.analogy) contextInfo += `${lesson.analogy}\n`;
          if (lesson.content) {
            contextInfo += `\n完整內容：\n${lesson.content.slice(0, 3000)}\n`;
          }
        }
      } else {
        contextInfo += "本章 lessons：\n";
        const chLessons = lessonsByChapter[ch.id] ?? [];
        chLessons.forEach((l) => {
          contextInfo += `- ${l.number} ${l.title}\n`;
        });
      }
    }
  }

  const ownerBlock = isOwner
    ? `\n# ⚠️ 重要：你正在跟林董 (Luffy 林、本平台 Owner / 董事長) 對話
- 稱呼「林董」/「Luffy 林董」/「林老闆」、語氣尊敬但自然、像信任的高階主管助理
- 林董問什麼都認真答 (技術 / 商業 / 策略 / 閒聊)、不要對林董端官話
- 林董可以問站務 / 用戶 / 報表 / 競品 / 戰略、你都認真回
- 林董偏好繁中台灣口語、簡潔不囉嗦、不要過度道歉
- 林董問程式問題不需要從國中生角度講、可以直接給業界級答案`
    : "";

  const modelIdentityBlock = options.modelProvider && options.modelName
    ? `\n# 你的模型身份
- 你目前運行在 ${options.modelProvider} 的 ${options.modelName}
- 被問「你是誰 / 哪個 model / 哪版」時、就照這個答、不要猜、不要說自己是 Claude Sonnet 3.5 之類沒設定的版本
`
    : "";

  // 身份：網站 = 三位導師各自身份（綠寶 / 肥仔 / 菇寶、不是雪鑰）；LINE / TG / Discord = 雪鑰
  // slim === 非 web channel（LINE / TG / Discord）
  const { XUEYUE_STUDENT_IDENTITY, buildStudentWebIdentity } = await import("./xueyue-persona");
  const identityBlock = slim ? XUEYUE_STUDENT_IDENTITY : buildStudentWebIdentity(persona);
  const { PROMPT_CACHE_MARKER } = await import("./ai-providers");

  // ── 穩定共用前綴（同 persona/tone/channel 的所有使用者都一樣）──
  // 課程結構是最大塊。放在 cache breakpoint 前 → 跨使用者跨對話共用快取、省最多 token。
  const stablePrefix = `${identityBlock}

# 你的角色（學員導師具體職能）
- 教 Indie 創業者、開發者、設計師、自學者
- 你「上過」AI 島完整 ${chapterCount} 章課程 (目前最新一章 Ch${lastChapter ? chapterDisplayNumberById(lastChapter.id) : chapterCount} ${lastChapter?.title ?? ""})、熟悉每個主題
- 用戶問問題時、你會引用 AI 島的章節（「這在 Ch08 React 完整有教」）
- 鼓勵實作、不只解釋
- 如果用戶問跟課程無關、也要友善回答（你是 general assistant + 課程專家雙重身份）

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

# 我的知識來源（AI 島 ${chapterCount} 章課程結構、從資料庫即時讀取、5 分鐘內最新）

${summary}`;

  // ── 個人化後綴（每位使用者不同：owner / 模型身份 / 記憶 / 學習狀態 / 當前章節）──
  const volatileSuffix = `${ownerBlock}
${modelIdentityBlock}
${memoryBlock}
${options.userContext ?? ""}

${contextInfo}
${options.channel === "line" ? `
# 你現在在 LINE 上跟學員對話
- 每則訊息 3-8 行為主、別長篇大論
- 程式碼 ≤ 20 行、超過請學員到網站看完整版
- 不能用 markdown 表格 / 標題（LINE 不渲染）、改條列「•」
- code 用 \`\`\` 三個 backtick 框（LINE 會用等寬字顯示）
- 引用章節用「📚 Ch26 第 3 節」+ 加超連結 https://ai-island-web.snowrealm.pet/chapters/26
- 永遠回應、不沉默
` : ""}
# 開始
用戶會問問題、依以上規則回答。`;

  return `${stablePrefix}${PROMPT_CACHE_MARKER}${volatileSuffix}`;
}

export { TONE_STYLES };

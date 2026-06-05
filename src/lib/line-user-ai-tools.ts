/**
 * LINE 學員 bot AI tool use — 讓學員 AI 主動讀網站上的章節 / lesson / 論壇內容答題。
 *
 * 設計：
 *  - 只接 Anthropic（tool use 規格穩、且學員 LINE 預設 model 是 Claude）
 *  - 最多 3 輪 tool 互動、防多輪拖到 LINE replyToken 30s 失效
 *  - 4 個 tools：search_lessons / get_lesson_content / search_forum / get_forum_thread
 *  - 第 1 版用 ILIKE 模糊搜尋、第 2 版升級成 embedding vector search（見 chunks_embedding_migration.sql）
 *  - tool dispatch 失敗、把錯誤訊息回給 AI 自己處理
 *  - 跟 admin 的 line-ai-tools.ts 分離（學員不該能查 user / order / error）
 */

import { createSupabaseAdmin } from "./supabase-admin";
import { vectorSearchLessons, vectorSearchForum } from "./ai-embeddings";
import { stripLoneSurrogates } from "./ai-providers";

// 深層清掉落單 surrogate（半個 emoji）— 這條 tool 路徑自己組 Anthropic body、
// 沒走 ai-providers 的 toAnthropicMessages，所以注入的筆記/lesson 內容若被 slice 切到 emoji 中間
// 就會送出非法 JSON → Anthropic 400 → 學員 LINE 退化成 ticket（就是這個 bug）。
function deepStrip(v: any): any {
  if (typeof v === "string") return stripLoneSurrogates(v);
  if (Array.isArray(v)) return v.map(deepStrip);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k in v) o[k] = deepStrip(v[k]);
    return o;
  }
  return v;
}

const TIMEOUT_MS = 14_000;       // 單一 Anthropic call 超過 14 秒就 abort
const MAX_TOOL_ROUNDS = 3;       // 最多 3 輪、防多輪拖到 LINE replyToken 30s 失效
const HARD_TIMEOUT_MS = 25_000;  // 整段最多 25 秒、留 5 秒給 LINE reply
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const STUDENT_TOOLS = [
  {
    name: "search_lessons",
    description:
      "從 75 章 lesson 找跟學員問題最相關的內容（用 embedding 語意搜尋、找不到再 fallback ILIKE 模糊比對）。" +
      "回傳前 N 個 lesson 的 id / chapter_id / title / 摘要。" +
      "學員問「Python list 怎麼用」「什麼是 promise」「fastapi 怎麼裝」這類需要找教材的問題時 → 先 call 這個、找到再考慮 call get_lesson_content。",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "學員問題的關鍵字（中文或英文都 OK）" },
        limit: { type: "integer", description: "回傳幾個 lesson、預設 5、最多 10" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_lesson_content",
    description:
      "拿單一 lesson 的完整內容（標題 / 一句話摘要 / 類比 / markdown 主文 / 範例 / tip / mini quiz）。" +
      "學員想看完整教學 / 你需要引用原文時用。lesson_id 是 '1.1' / '26.5' 這種字串、從 search_lessons 結果拿。",
    input_schema: {
      type: "object" as const,
      properties: {
        lesson_id: { type: "string", description: "lesson 表 id（如 '1.1', '26.5'）" },
      },
      required: ["lesson_id"],
    },
  },
  {
    name: "search_forum",
    description:
      "從論壇找學員 / 其他人問過的相關討論串（embedding 語意搜尋優先、ILIKE fallback）。" +
      "學員問的問題可能別人問過、看看討論串有沒答案。回傳前 N 個 thread 的 id / 標題 / 簡介 / 回覆數。",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "搜尋關鍵字" },
        limit: { type: "integer", description: "回傳幾個、預設 5、最多 10" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_forum_thread",
    description: "拿單一論壇討論串的完整內容（主文 + 前 10 條回覆）。當你覺得 search_forum 結果裡某條 thread 有答案時用。",
    input_schema: {
      type: "object" as const,
      properties: {
        thread_id: { type: "string", description: "forum_threads.id (UUID)" },
      },
      required: ["thread_id"],
    },
  },
  {
    name: "get_my_notes",
    description: "讀「這位學員自己在網站上寫的筆記」內容。學員問到『我的筆記』『我之前記了什麼』『幫我看筆記』、或你要根據他記過的東西回答時用。不帶參數回最近筆記；可給 query 關鍵字過濾。",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "可選：關鍵字、只回內容含此字的筆記" },
      },
    },
  },
];

type ToolUse = { id: string; name: string; input: any };

export async function dispatchStudentTool(name: string, input: any, userId?: string | null): Promise<string> {
  try {
    switch (name) {
      case "search_lessons":
        return await searchLessons(String(input.query ?? ""), input.limit);
      case "get_lesson_content":
        return await getLessonContent(String(input.lesson_id ?? ""));
      case "search_forum":
        return await searchForum(String(input.query ?? ""), input.limit);
      case "get_forum_thread":
        return await getForumThread(String(input.thread_id ?? ""));
      case "get_my_notes":
        return await getMyNotes(userId, String(input.query ?? ""));
      default:
        return `❌ unknown tool: ${name}`;
    }
  } catch (e: any) {
    return `❌ tool ${name} 失敗：${e?.message ?? "未知錯誤"}`;
  }
}

async function searchLessons(query: string, limit?: number): Promise<string> {
  if (!query.trim()) return "❌ 沒給 query";
  const n = Math.max(1, Math.min(10, Number(limit) || 5));

  // 1. 先試 embedding 語意搜尋
  const vecHits = await vectorSearchLessons(query, n).catch((e) => {
    console.warn("[user-tools] vectorSearchLessons failed:", e?.message);
    return [];
  });
  if (vecHits && vecHits.length > 0) {
    return vecHits
      .map((r: any, i: number) =>
        `${i + 1}. [${r.lesson_id}] Ch${r.chapter_id} · ${r.title}\n   ${(r.summary ?? r.snippet ?? "").slice(0, 120)}\n   🔗 ${SITE_URL}/chapters/${r.chapter_id}#lesson-${r.lesson_id}`,
      )
      .join("\n\n");
  }

  // 2. fallback：ILIKE 模糊搜尋（第 1 版、沒 embedding 時也能用）
  const admin = createSupabaseAdmin();
  const pattern = `%${query.replace(/[%_]/g, "")}%`;
  const { data } = await admin
    .from("lessons")
    .select("id, chapter_id, title, one_line_summary, analogy")
    .or(`title.ilike.${pattern},one_line_summary.ilike.${pattern},analogy.ilike.${pattern},content.ilike.${pattern}`)
    .limit(n);
  if (!data || data.length === 0) {
    return `🔍 找不到「${query}」相關 lesson、可建議學員到網站搜：${SITE_URL}/search?q=${encodeURIComponent(query)}`;
  }
  return data
    .map((r: any, i: number) =>
      `${i + 1}. [${r.id}] Ch${r.chapter_id} · ${r.title}\n   ${(r.one_line_summary ?? r.analogy ?? "").slice(0, 120)}\n   🔗 ${SITE_URL}/chapters/${r.chapter_id}#lesson-${r.id}`,
    )
    .join("\n\n");
}

async function getLessonContent(lessonId: string): Promise<string> {
  if (!lessonId.trim()) return "❌ 沒給 lesson_id";
  const admin = createSupabaseAdmin();
  const { data: l } = await admin
    .from("lessons")
    .select("id, chapter_id, number, title, one_line_summary, analogy, content, outline, tip, exercise, mini_quiz")
    .eq("id", lessonId)
    .maybeSingle();
  if (!l) return `🔍 找不到 lesson_id = ${lessonId}`;

  const r: any = l;
  const lines = [
    `## [${r.id}] Ch${r.chapter_id} · ${r.number} · ${r.title}`,
    r.one_line_summary ? `**一句話：** ${r.one_line_summary}` : "",
    r.analogy ? `**類比：** ${r.analogy}` : "",
    "",
  ];
  if (r.content) {
    const content = String(r.content).slice(0, 4000); // 保守限制、防超 token
    lines.push("### 內文", content);
  }
  if (r.tip) {
    lines.push("", "### 提示", JSON.stringify(r.tip).slice(0, 500));
  }
  if (r.mini_quiz) {
    lines.push("", "### Mini Quiz", JSON.stringify(r.mini_quiz).slice(0, 500));
  }
  lines.push("", `🔗 完整網頁版：${SITE_URL}/chapters/${r.chapter_id}#lesson-${r.id}`);
  return lines.filter(Boolean).join("\n");
}

async function searchForum(query: string, limit?: number): Promise<string> {
  if (!query.trim()) return "❌ 沒給 query";
  const n = Math.max(1, Math.min(10, Number(limit) || 5));

  // 1. embedding 語意搜尋
  const vecHits = await vectorSearchForum(query, n).catch((e) => {
    console.warn("[user-tools] vectorSearchForum failed:", e?.message);
    return [];
  });
  if (vecHits && vecHits.length > 0) {
    return vecHits
      .map((r: any, i: number) => `${i + 1}. [${r.thread_id}] ${r.title}\n   💬 ${r.reply_count ?? 0} 回覆\n   🔗 ${SITE_URL}/forum/thread/${r.thread_id}`)
      .join("\n\n");
  }

  // 2. ILIKE fallback
  const admin = createSupabaseAdmin();
  const pattern = `%${query.replace(/[%_]/g, "")}%`;
  const { data } = await admin
    .from("forum_threads")
    .select("id, title, content, reply_count, view_count")
    .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    .order("last_reply_at", { ascending: false })
    .limit(n);
  if (!data || data.length === 0) return `🔍 論壇找不到「${query}」相關討論`;
  return data
    .map((r: any, i: number) => `${i + 1}. [${r.id}] ${r.title}\n   💬 ${r.reply_count ?? 0} 回覆 · 👀 ${r.view_count ?? 0} 觀看\n   🔗 ${SITE_URL}/forum/thread/${r.id}`)
    .join("\n\n");
}

async function getForumThread(threadId: string): Promise<string> {
  if (!threadId.trim()) return "❌ 沒給 thread_id";
  const admin = createSupabaseAdmin();
  const { data: t } = await admin
    .from("forum_threads")
    .select("id, title, content, tags, view_count, reply_count, created_at, profiles!forum_threads_user_id_fkey(username, display_name)")
    .eq("id", threadId)
    .maybeSingle();
  if (!t) return `🔍 找不到 thread_id = ${threadId}`;

  const tr: any = t;
  const author = tr.profiles?.display_name || tr.profiles?.username || "(已刪除)";
  const lines = [
    `## ${tr.title}`,
    `**作者：** ${author} · 👀 ${tr.view_count ?? 0} · 💬 ${tr.reply_count ?? 0}`,
    `**Tags：** ${(tr.tags ?? []).join(", ") || "—"}`,
    "",
    "### 主文",
    stripHtml(tr.content ?? "").slice(0, 2000),
  ];

  // 拉前 10 條回覆
  const { data: posts } = await admin
    .from("forum_replies")
    .select("id, content, created_at, profiles!forum_replies_user_id_fkey(username, display_name)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(10);
  if (posts && posts.length > 0) {
    lines.push("", "### 回覆");
    posts.forEach((p: any, i: number) => {
      const pAuthor = p.profiles?.display_name || p.profiles?.username || "(已刪除)";
      lines.push(`${i + 1}. **${pAuthor}**：${stripHtml(p.content ?? "").slice(0, 300)}`);
    });
  }
  lines.push("", `🔗 ${SITE_URL}/forum/thread/${tr.id}`);
  return lines.join("\n");
}

async function getMyNotes(userId?: string | null, query?: string): Promise<string> {
  if (!userId) return "（這位學員還沒綁定帳號、讀不到他的網站筆記）";
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("notes")
    .select("content, chapter_id, lesson_id, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(query?.trim() ? 40 : 10);
  if (error) return `❌ 讀筆記失敗：${error.message}`;
  let rows = (data as any[]) ?? [];
  if (query?.trim()) {
    const ql = query.toLowerCase();
    rows = rows.filter((r) => String(r.content ?? "").toLowerCase().includes(ql));
  }
  if (rows.length === 0) return query?.trim() ? `沒找到含「${query}」的筆記。` : "這位學員目前在網站上沒有筆記。";
  return rows.slice(0, 10).map((r, i) => {
    const loc = r.lesson_id ? `L${r.lesson_id}` : r.chapter_id ? `Ch${r.chapter_id}` : "";
    return `【筆記 ${i + 1}${loc ? " · " + loc : ""}】\n${String(r.content ?? "").slice(0, 800)}`;
  }).join("\n\n");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * 學員 LINE AI tool-use 主入口（簡化版 askAIWithTools、只給讀網站內容的 4 個 tools）
 * 失敗會 throw、由 caller 處理。
 */
export async function askStudentAIWithTools(opts: {
  apiKey: string;
  model: string;          // 必須是 claude-* 系列
  systemPrompt: string;
  userId?: string | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  return Promise.race([
    runStudentLoop(opts),
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("讓我想一下、不過你可以再問一次嗎？（思考超時）"), HARD_TIMEOUT_MS),
    ),
  ]);
}

async function runStudentLoop(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userId?: string | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const messages: any[] = opts.history.map((h) => ({ role: h.role, content: h.content }));
  let roundsLeft = MAX_TOOL_ROUNDS;

  while (roundsLeft > 0) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let data: any;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": opts.apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: ctrl.signal,
        body: JSON.stringify(deepStrip({
          model: opts.model,
          system: opts.systemPrompt,
          messages,
          tools: STUDENT_TOOLS,
          max_tokens: 1500,
          temperature: 0.7,
        })),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
      }
      data = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const content: any[] = data.content ?? [];
    const stopReason: string = data.stop_reason;

    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
      const text = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
      if (text) return text;
      return await fallbackPlain(opts, messages);
    }

    if (stopReason === "tool_use") {
      messages.push({ role: "assistant", content });
      const toolUses: ToolUse[] = content.filter((c: any) => c.type === "tool_use");
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const result = await dispatchStudentTool(tu.name, tu.input ?? {}, opts.userId);
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result.slice(0, 6000) });
      }
      messages.push({ role: "user", content: toolResults });
      roundsLeft--;
      continue;
    }

    const fallback = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    if (fallback) return fallback;
    return await fallbackPlain(opts, messages);
  }

  return await fallbackPlain(opts, messages);
}

async function fallbackPlain(
  opts: Parameters<typeof askStudentAIWithTools>[0],
  messages: any[],
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: ctrl.signal,
      body: JSON.stringify(deepStrip({
        model: opts.model,
        system: opts.systemPrompt + "\n\n注意：這一輪不要呼叫 tool、用純文字回答學員。",
        messages,
        max_tokens: 800,
        temperature: 0.8,
      })),
    });
    if (!res.ok) return "嗯？我這邊沒抓到、再問一次？";
    const data = await res.json();
    const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    return text || "嗯？我這邊沒抓到、再問一次？";
  } catch {
    return "嗯？我這邊沒抓到、再問一次？";
  } finally {
    clearTimeout(timer);
  }
}

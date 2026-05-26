/**
 * LINE bot AI tool use — 讓 AI 在對話中自動執行 admin 命令、查單一用戶 / 錯誤 / 訂單詳情。
 *
 * 設計：
 *  - 只接 Anthropic（tool use 規格穩、且現有 default model 是 Claude）
 *  - 最多 5 輪 tool 互動、防止 AI 一直自言自語燒 token
 *  - tool dispatch 失敗、把錯誤訊息回給 AI 自己處理
 *  - 整個流程 1 個 HTTP 請求進、N 輪 AI/tool 互動、最後輸出純文字給 LINE
 */

import { createSupabaseAdmin } from "./supabase-admin";
import { runBotCommand } from "./line-bot-commands";
import type { AdminLineUser } from "./admin-line-users";
import { formatTW, formatTWRelative } from "./format-date";
import { getPeriodReport } from "./site-period-report";

const TIMEOUT_MS = 12_000;       // 單一 Anthropic call 超過 12 秒就 abort
const MAX_TOOL_ROUNDS = 3;       // 最多 3 輪、防多輪拖到 LINE replyToken 30s 失效
const HARD_TIMEOUT_MS = 22_000;  // askAIWithTools 整段最多 22 秒、留 8 秒給 LINE reply

// ─── tool schema ───
const TOOLS = [
  {
    name: "run_command",
    description:
      "執行 admin bot 命令並拿純文字結果。當使用者問報表 / 統計類問題時用。" +
      "可用 command 值：today, kpi, users, churn, errors, online, sub, orders, ai-cost, quiz, island, leetcode。" +
      "kpi/orders/ai-cost/users 可帶 args（例如 args=['7'] 表示 7 天）。",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "命令名（不含開頭 /、例如 'today' / 'kpi' / 'users'）" },
        args: { type: "array", items: { type: "string" }, description: "命令參數（選填）" },
      },
      required: ["command"],
    },
  },
  {
    name: "get_user_detail",
    description: "查單一使用者完整檔案：profile / 等級 / XP / 訂單 / 最近活動 / AI 對話次數",
    input_schema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "使用者 username（不含 @）" },
      },
      required: ["username"],
    },
  },
  {
    name: "get_error_detail",
    description: "拿單一 error log 完整內容（含 message / stack / source / context / 相關 audit）",
    input_schema: {
      type: "object" as const,
      properties: {
        error_id: { type: "string", description: "error_logs.id (UUID)" },
      },
      required: ["error_id"],
    },
  },
  {
    name: "get_recent_errors",
    description: "拿最近 N 條 error log、可篩 level（log/warn/error/fatal）跟 source。預設 N=5",
    input_schema: {
      type: "object" as const,
      properties: {
        n: { type: "integer", description: "筆數、預設 5、最多 20" },
        level: { type: "string", enum: ["log", "warn", "error", "fatal"], description: "篩 level" },
        source: { type: "string", description: "篩 source（例如 'api/ai/chat'）" },
      },
    },
  },
  {
    name: "get_order_detail",
    description: "查單一訂單詳情（金額 / 狀態 / 用戶 / 章節 / 建立時間）",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: { type: "string" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_student_learning_state",
    description:
      "查單一學員學習狀態：等級 / XP / 完成章節數 / 弱項章節 / 連續簽到 / 30 天 quiz 平均 / 正在學的章節。" +
      "admin 問「@xxx 學得怎樣」「他卡在哪」「進度如何」時用。",
    input_schema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "username 不含 @" },
      },
      required: ["username"],
    },
  },
  {
    name: "get_chapter_stats",
    description:
      "查章節整體學習狀態：多少人開始 / 多少人完成 / 平均 quiz 分數。" +
      "admin 問「Ch12 大家學得怎樣」「哪幾章卡關率高」「教程哪邊要改」時用。" +
      "不指定 chapter_id 會回所有章節的彙整 + 列出最卡的前 5 章。",
    input_schema: {
      type: "object" as const,
      properties: {
        chapter_id: { type: "integer", description: "章節 id (chapter 表 id 欄)、不給 = 列全站 + 最卡的 5 章" },
      },
    },
  },
  {
    name: "get_period_report",
    description:
      "拿一段時間（7 / 30 / 自訂天數）的指標 + 跟上一期比較變化、用來寫週報 / 月報敘事。" +
      "使用者問「給我這週重點」「這個月成長」「最近 14 天怎樣」時用。" +
      "拿到資料後不要原樣貼、用自然語言寫 200-300 字敘事報告、強調 >50% 變化的數字。",
    input_schema: {
      type: "object" as const,
      properties: {
        days: { type: "integer", description: "天數、7 = 週報、30 = 月報、最大 90" },
      },
      required: ["days"],
    },
  },
];

type ToolUse = { id: string; name: string; input: any };

// ─── tool dispatch ───
async function dispatchTool(name: string, input: any, user: AdminLineUser): Promise<string> {
  try {
    switch (name) {
      case "run_command": {
        const cmd = String(input.command || "").replace(/^\//, "");
        const args = Array.isArray(input.args) ? input.args : [];
        const fullCmd = `/${cmd} ${args.join(" ")}`.trim();
        const reply = await runBotCommand(fullCmd, user);
        return reply.text || "(命令執行了、但沒有 text 輸出)";
      }
      case "get_user_detail":
        return await getUserDetail(input.username);
      case "get_error_detail":
        return await getErrorDetail(input.error_id);
      case "get_recent_errors":
        return await getRecentErrors(input.n ?? 5, input.level, input.source);
      case "get_order_detail":
        return await getOrderDetail(input.order_id);
      case "get_period_report":
        return await getPeriodReport(input.days ?? 7);
      case "get_student_learning_state":
        return await getStudentLearningState(input.username);
      case "get_chapter_stats":
        return await getChapterStats(input.chapter_id);
      default:
        return `❌ unknown tool: ${name}`;
    }
  } catch (e: any) {
    return `❌ tool ${name} 執行失敗：${e?.message ?? "未知錯誤"}`;
  }
}

async function getUserDetail(username: string): Promise<string> {
  if (!username) return "❌ 沒給 username";
  const admin = createSupabaseAdmin();
  const { data: p } = await admin
    .from("profiles")
    .select("id, username, display_name, role, level, xp, z_coin, hearts, streak_days, created_at, last_active_at, ai_unlimited, banned_at")
    .ilike("username", username)
    .maybeSingle();
  if (!p) return `🔍 找不到 username = ${username} 的使用者`;

  const [{ count: aiConvCount }, { count: orderCount }, { data: recentActions }] = await Promise.all([
    admin.from("ai_conversations").select("*", { count: "exact", head: true }).eq("user_id", p.id),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("user_id", p.id),
    admin.from("audit_logs").select("action, created_at").eq("target_id", p.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const lines = [
    `## 使用者：${p.display_name || p.username}（@${p.username}）`,
    `- 角色：${p.role}${p.banned_at ? "（已封禁）" : ""}`,
    `- 等級 Lv${p.level ?? 1} · XP ${p.xp ?? 0} · Z-coin ${p.z_coin ?? 0} · ${p.hearts ?? 0}❤️`,
    `- 連勝：${p.streak_days ?? 0} 天`,
    `- AI 特權：${p.ai_unlimited ? "✓ 開" : "—"}`,
    `- 註冊：${formatTW(p.created_at)}`,
    `- 最後活躍：${p.last_active_at ? formatTWRelative(p.last_active_at) : "—"}`,
    `- AI 對話次數（總）：${aiConvCount ?? 0}`,
    `- 訂單數（總）：${orderCount ?? 0}`,
  ];
  if (recentActions && recentActions.length > 0) {
    lines.push("", "## 最近 5 條對他的 admin 動作");
    recentActions.forEach((a: any, i: number) => {
      lines.push(`${i + 1}. ${a.action}（${formatTWRelative(a.created_at)}）`);
    });
  }
  return lines.join("\n");
}

async function getErrorDetail(errorId: string): Promise<string> {
  if (!errorId) return "❌ 沒給 error_id";
  const admin = createSupabaseAdmin();
  const { data: e } = await admin
    .from("error_logs")
    .select("*")
    .eq("id", errorId)
    .maybeSingle();
  if (!e) return `🔍 找不到 error_id = ${errorId}`;
  const lines = [
    `## Error: ${(e as any).message}`,
    `- id: ${(e as any).id}`,
    `- level: ${(e as any).level}`,
    `- source: ${(e as any).source ?? "—"}`,
    `- created_at: ${formatTW((e as any).created_at)}`,
    `- user_id: ${(e as any).user_id ?? "—"}`,
    `- path: ${(e as any).path ?? "—"}`,
  ];
  if ((e as any).stack) lines.push("", "### stack", String((e as any).stack).slice(0, 1500));
  if ((e as any).context) lines.push("", "### context", JSON.stringify((e as any).context).slice(0, 1500));
  return lines.join("\n");
}

async function getRecentErrors(n: number, level?: string, source?: string): Promise<string> {
  const n2 = Math.max(1, Math.min(20, Number(n) || 5));
  const admin = createSupabaseAdmin();
  let q = admin.from("error_logs")
    .select("id, level, source, message, created_at")
    .order("created_at", { ascending: false })
    .limit(n2);
  if (level) q = q.eq("level", level);
  if (source) q = q.ilike("source", `%${source}%`);
  const { data } = await q;
  if (!data || data.length === 0) return "🎉 沒有符合條件的錯誤";
  return data
    .map((e: any, i: number) => `${i + 1}. [${e.level}] ${e.source ?? "?"} — ${String(e.message ?? "").slice(0, 100)}（id=${e.id.slice(0, 8)} · ${formatTWRelative(e.created_at)}）`)
    .join("\n");
}

async function getOrderDetail(orderId: string): Promise<string> {
  if (!orderId) return "❌ 沒給 order_id";
  const admin = createSupabaseAdmin();
  const { data: o } = await admin
    .from("orders")
    .select("*, profiles(username, display_name)")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return `🔍 找不到 order_id = ${orderId}`;
  const lines = [
    `## 訂單：${(o as any).id}`,
    `- 金額：${(o as any).currency || "NT$"} ${(o as any).amount}`,
    `- 狀態：${(o as any).status}`,
    `- 用戶：${(o as any).profiles?.display_name || (o as any).profiles?.username || (o as any).user_id}`,
    `- 章節：${(o as any).chapter_id ?? "—"}`,
    `- 建立：${formatTW((o as any).created_at)}`,
  ];
  return lines.join("\n");
}

async function getStudentLearningState(username: string): Promise<string> {
  if (!username) return "❌ 沒給 username";
  const admin = createSupabaseAdmin();
  const { data: row, error } = await admin
    .from("learning_state_summary")
    .select("*")
    .ilike("username", username.replace(/^@/, ""))
    .maybeSingle();
  if (error) return `❌ view 查詢失敗：${error.message}`;
  if (!row) return `🔍 找不到 @${username}`;

  const r = row as any;
  const lines = [
    `## ${r.display_name || r.username}（@${r.username}）學習狀態`,
    `- 等級 Lv${r.level ?? 1} · ${r.xp?.toLocaleString() ?? 0} XP · 角色 ${r.role ?? 'user'}`,
    `- 加入 ${r.joined_days_ago ?? '-'} 天${r.last_active_days_ago !== null ? `、上次活動 ${r.last_active_days_ago} 天前` : ''}`,
    "",
    `### 進度`,
    `- 完成 ${r.lessons_completed ?? 0} 個 lesson、觸碰過 ${r.chapters_touched ?? 0} 章`,
    r.current_chapter_id ? `- 目前在學：Ch${r.current_chapter_id} ${r.current_chapter_title ?? ''}（lesson ${r.current_lesson_id ?? '-'}）` : `- 還沒開始任何 lesson`,
    "",
    `### 簽到`,
    `- 目前連續 ${r.current_streak ?? 0} 天${r.last_checkin_date ? `、最後簽到 ${r.last_checkin_date}` : ''}`,
    "",
    `### Quiz 表現（30 天）`,
    r.quiz_total_30d > 0
      ? `- 平均 ${Number(r.quiz_avg_30d ?? 0).toFixed(1)} 分 / ${r.quiz_total_30d} 次測驗`
      : `- 30 天內沒做過 quiz`,
  ];

  // 弱項章節
  const { data: weak } = await admin
    .from("user_weak_chapters")
    .select("chapter_id, avg_pct, attempt_count")
    .eq("user_id", r.id)
    .order("avg_pct", { ascending: true })
    .limit(5);
  if (weak && weak.length > 0) {
    lines.push("", "### ⚠️ 弱項章節（30 天 quiz 平均 < 60、>= 2 次）");
    for (const w of weak as any[]) {
      lines.push(`- Ch${w.chapter_id}：${Number(w.avg_pct).toFixed(1)} 分（${w.attempt_count} 次）`);
    }
  }

  return lines.join("\n");
}

async function getChapterStats(chapterId?: number): Promise<string> {
  const admin = createSupabaseAdmin();
  if (chapterId) {
    const { data: row, error } = await admin
      .from("chapter_stats_summary")
      .select("*")
      .eq("chapter_id", chapterId)
      .maybeSingle();
    if (error) return `❌ view 查詢失敗：${error.message}`;
    if (!row) return `🔍 找不到 Ch${chapterId}`;
    const r = row as any;
    const rate = r.users_started > 0 ? ((r.users_completed / r.users_started) * 100).toFixed(1) : "-";
    return [
      `## Ch${r.chapter_id} ${r.chapter_title}`,
      `- 開始學的人：${r.users_started}`,
      `- 完成的人：${r.users_completed}（完成率 ${rate}%）`,
      `- Quiz 平均：${r.quiz_attempts_count > 0 ? Number(r.quiz_avg_pct).toFixed(1) + " 分（" + r.quiz_attempts_count + " 次嘗試）" : "沒人做過"}`,
    ].join("\n");
  }

  // 全站
  const { data } = await admin
    .from("chapter_stats_summary")
    .select("*")
    .order("chapter_id", { ascending: true });
  const rows = (data as any[]) ?? [];
  if (rows.length === 0) return "🎉 還沒有任何章節資料";

  const totalStarted = rows.reduce((s, r) => s + (r.users_started ?? 0), 0);
  const totalCompleted = rows.reduce((s, r) => s + (r.users_completed ?? 0), 0);
  const avgQuiz = rows.filter(r => r.quiz_attempts_count > 0).map(r => Number(r.quiz_avg_pct));
  const overallQuizAvg = avgQuiz.length > 0 ? (avgQuiz.reduce((a, b) => a + b, 0) / avgQuiz.length).toFixed(1) : "-";

  // 卡關章節（quiz 平均最低、且 >= 5 次嘗試）
  const stuck = rows
    .filter(r => (r.quiz_attempts_count ?? 0) >= 5)
    .sort((a, b) => Number(a.quiz_avg_pct) - Number(b.quiz_avg_pct))
    .slice(0, 5);

  const lines = [
    `## 全站章節學習狀態`,
    `- 章節數：${rows.length}`,
    `- 累計開始學人次：${totalStarted}`,
    `- 累計完成人次：${totalCompleted}`,
    `- 全站 quiz 平均：${overallQuizAvg} 分`,
    "",
    `### 🔥 最卡關的 5 章（quiz 平均最低、>= 5 次嘗試）`,
  ];
  for (const s of stuck) {
    lines.push(`- Ch${s.chapter_id} ${s.chapter_title}：${Number(s.quiz_avg_pct).toFixed(1)} 分（${s.users_started} 人開始 / ${s.users_completed} 完成）`);
  }
  if (stuck.length === 0) lines.push("- 目前沒有 >= 5 次嘗試的章節");
  return lines.join("\n");
}

// 把 Anthropic HTTP error 翻成人話、絕對不 dump raw JSON 給林董看
function friendlyAnthropicError(status: number, body: string, model: string): string {
  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch {}
  const errType = parsed?.error?.type ?? "";
  const errMsg = parsed?.error?.message ?? "";
  if (status === 401 || errType === "authentication_error" || /invalid x-api-key/i.test(errMsg)) {
    return "Anthropic API key 失效（401）— 林董去 /admin/ai-keys 重貼一次 key";
  }
  if (status === 429 || errType === "rate_limit_error") {
    return "Anthropic 限流（429）— 等 1 分鐘再問、或升 API tier";
  }
  if (status === 529 || /overloaded/i.test(errMsg)) {
    return "Anthropic 主機過載（529）— 等 10 秒重試、或換模型";
  }
  if (status === 404 || /model.*not.*found/i.test(errMsg)) {
    return `模型 ${model} 不存在或無權限 — 去 /admin/ai-models 換模型`;
  }
  if (status === 400 || errType === "invalid_request_error") {
    return `請求格式錯誤：${errMsg.slice(0, 80) || "未知"}`;
  }
  if (status >= 500) {
    return `Anthropic server 錯誤（${status}）— 過幾分鐘再試`;
  }
  return `AI 呼叫失敗（${status}）：${errMsg.slice(0, 80) || "未知錯誤"}`;
}

// ─── tool-use loop ───
export async function askAIWithTools(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  user: AdminLineUser;
}): Promise<string> {
  // Hard timeout：整個 askAIWithTools 最多跑 22 秒
  // 避免多輪 tool 拖到 LINE replyToken (30s) 失效、user 看不到任何回覆
  const racePromise = Promise.race([
    runToolLoop(opts),
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("讓我想一下、不過你可以再問一次嗎？（剛剛思考超時了）"), HARD_TIMEOUT_MS),
    ),
  ]);
  return racePromise;
}

async function runToolLoop(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  user: AdminLineUser;
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
        body: JSON.stringify({
          model: opts.model,
          system: opts.systemPrompt,
          messages,
          tools: TOOLS,
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return `❌ ${friendlyAnthropicError(res.status, err, opts.model)}`;
      }
      data = await res.json();
    } catch (e: any) {
      const m = e?.name === "AbortError" || /timeout/i.test(e?.message ?? "")
        ? "AI 回應太慢（超過 25 秒）、再傳一次"
        : `AI 連線失敗：${e?.message ?? "unknown"}`;
      return `❌ ${m}`;
    } finally {
      clearTimeout(timer);
    }

    const content: any[] = data.content ?? [];
    const stopReason: string = data.stop_reason;

    // 結束：取所有 text block 串起來
    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
      const text = content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n")
        .trim();
      if (text) return text;
      // Anthropic 偶爾 end_turn 但 content 全 tool_use 沒 text
      // → 補一輪、不帶 tools、強迫它用文字回
      return await fallbackPlainText(opts, messages);
    }

    // tool 互動
    if (stopReason === "tool_use") {
      // 把 AI 的 assistant content 直接 push 進 messages（含 text + tool_use blocks）
      messages.push({ role: "assistant", content });

      const toolUses: ToolUse[] = content.filter((c: any) => c.type === "tool_use");
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const result = await dispatchTool(tu.name, tu.input ?? {}, opts.user);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result.slice(0, 4000),
        });
      }
      messages.push({ role: "user", content: toolResults });
      roundsLeft--;
      continue;
    }

    // 其他 stop_reason（max_tokens / refusal）→ fallback 取 text
    const fallback = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    if (fallback) return fallback;
    return await fallbackPlainText(opts, messages);
  }

  return await fallbackPlainText(opts, messages);
}

/**
 * 強迫 Claude 用純文字回答（不給 tools）、處理 end_turn 但無 text block 的 edge case。
 */
async function fallbackPlainText(
  opts: Parameters<typeof askAIWithTools>[0],
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
      body: JSON.stringify({
        model: opts.model,
        system: opts.systemPrompt + "\n\n注意：這一輪不要呼叫 tool、用純文字回答。",
        messages,
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });
    if (!res.ok) return "嗯？剛剛沒抓到、再說一次？";
    const data = await res.json();
    const text = (data.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n")
      .trim();
    return text || "嗯？剛剛沒抓到、再說一次？";
  } catch {
    return "嗯？剛剛沒抓到、再說一次？";
  } finally {
    clearTimeout(timer);
  }
}

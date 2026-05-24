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

const TIMEOUT_MS = 60_000;
const MAX_TOOL_ROUNDS = 5;

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

// ─── tool-use loop ───
export async function askAIWithTools(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  user: AdminLineUser;
}): Promise<string> {
  // Anthropic messages：第一條 user 訊息已經在 history 最後一條
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
        return `❌ AI 呼叫失敗：${res.status} ${err.slice(0, 200)}`;
      }
      data = await res.json();
    } catch (e: any) {
      return `❌ AI 連線失敗：${e?.message ?? "timeout"}`;
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
      return text || "(AI 沒有產生文字回覆)";
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
    return fallback || `(AI 異常停止：${stopReason})`;
  }

  return "（tool 互動超過 5 輪、AI 還沒結束、可能是死循環）";
}

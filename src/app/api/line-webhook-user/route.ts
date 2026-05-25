import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { consumeBindCode } from "@/lib/notify-user-line";
import { buildQuickReply, type FlexMessage, type LineTextMessage } from "@/lib/line-flex";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { SITE_STATS } from "@/lib/site-stats";
import { checkOwner } from "@/lib/is-owner";
import { pickModelForUsage } from "@/lib/ai-usage-models";

// in-memory 對話歷史 (user webhook、跟 admin 分開)
type Msg = { role: "user" | "assistant"; content: string };
const userHistoryByUid = new Map<string, Msg[]>();
function getUserHistory(uid: string): Msg[] {
  if (!userHistoryByUid.has(uid)) userHistoryByUid.set(uid, []);
  return userHistoryByUid.get(uid)!;
}

type UserProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  email: string | null;
  xp: number | null;
  level: number | null;
};

async function askUserAI(text: string, profile: UserProfileLite | null, lineUserId: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true).limit(20);
  const activeModels = (models as any[]) ?? [];
  // 先讀後台「LINE user bot 學員導師」用途的對應、沒設再 fallback
  const usageModel = await pickModelForUsage("line_user", activeModels).catch(() => null);
  const model = usageModel
    ?? activeModels.find((m) => m.provider === "anthropic")
    ?? activeModels[0];
  if (!model) {
    console.warn("[line-webhook-user] no active model in ai_models");
    return null;
  }

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) {
    console.warn(`[line-webhook-user] no enabled api key for provider=${model.provider}`);
    return null;
  }

  let apiKey: string;
  try {
    apiKey = decryptKey((sysKey as any).api_key_encrypted);
  } catch (e: any) {
    console.warn(`[line-webhook-user] decrypt failed for ${model.provider}:`, e?.message);
    return null;
  }

  const owner = checkOwner({
    id: profile?.id ?? null,
    username: profile?.username ?? null,
    role: profile?.role ?? null,
    email: profile?.email ?? null,
    lineUserId,
  }).isOwner;
  const name = profile?.display_name || profile?.username || `LINE 學員${lineUserId.slice(0, 6)}`;
  const userMeta = profile
    ? `身份：${owner ? "🌟 平台董事長 / Owner (林董 / Luffy 林)" : `學員 (${profile.role}、Lv.${profile.level ?? 1}、${profile.xp ?? 0} XP)`}`
    : "身份：未綁定訪客";

  const hist = getUserHistory(lineUserId);
  hist.push({ role: "user", content: text });
  if (hist.length > 16) hist.splice(0, hist.length - 16);

  const ownerTone = owner
    ? `\n【你正在跟林董 (平台 Owner / 董事長) 對話】\n- 稱呼「林董」/「Luffy 林董」/「林老闆」、語氣尊敬但自然、像信任的高階主管助理\n- 林董問什麼都認真答 (技術 / 商業 / 策略 / 閒聊)、不要對林董端官話\n- 林董問站務 / 用戶 / 報表時、提醒「在 admin LINE bot 有完整 tool 工具能直接查」、user LINE 這邊以對話 / 答疑為主\n- 林董偏好繁體中文台灣口語、簡潔不囉嗦、不要過度道歉`
    : "";

  const systemPrompt = `你是 AI 島 (aiisland.tw、${SITE_STATS.chapterCount} 章 ${SITE_STATS.lessonCount}+ lesson) 的 AI 學習導師、在 LINE 上跟學員對話。

【最高守則】
- **無論收到什麼訊息、永遠用文字回答、不可以沉默**
- 用繁體中文台灣口語、像學長學姊聊天
- LINE 訊息簡短：3-6 行為主、不要長篇大論
- 不會的就說「我不確定、建議到 ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw"} 查」

【對話對象】
${userMeta}
${ownerTone}

【講解風格 — 國中生能懂】
- 先用日常類比 (廚房 / 便利商店 / 樂高) 起頭、再講術語
- 程式碼從最簡單一行開始、不要一次給 50 行
- 不講「顯然」「很簡單」這種讓人覺得自己笨的詞
- 用反問句「你有沒有想過 X？」帶入

【你能聊什麼】
- 程式 / AI / Web / 後端 / 資料庫 / DevOps 的入門到中階
- 站上 ${SITE_STATS.chapterCount} 個章節的內容、能引用「這在 Ch04 JS 完整有教」
- 閒聊 / 鼓勵 / 學習方法 / 職涯方向
- ${owner ? "商業策略 / 平台運營 / 競品分析 / Indie 創業" : "學員的學習瓶頸 / 卡關"}

【絕對不要】
- 拒答 (任何訊息都要回)
- 用「身為 AI 我...」開頭
- 重複道歉 (「抱歉、對不起、不好意思」最多 1 次)
- 給超長代碼 (>30 行、要的話請對方到網站看)`;

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: systemPrompt },
        ...hist.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      maxTokens: 800,
    });
    const reply = r.text?.trim() || "我這邊沒接到回應、再問一次試試？";
    hist.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) {
    console.warn("[line-webhook-user] AI failed:", e?.message);
    // 也寫 error_logs (之前只 console.warn、Zeabur log 翻不到)
    try {
      await admin.from("error_logs").insert({
        source: "line-webhook-user",
        level: "error",
        message: `[user_ai_failed] ${e?.message ?? "unknown"}`,
        extra: {
          model: model?.model_name,
          provider: model?.provider,
          line_user_id: lineUserId,
          stack: e?.stack?.slice(0, 1000),
        },
      });
    } catch {}
    return null;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// AI call 偶爾 5-15 秒、預設 10s 會被 kill 導致 silent fail
export const maxDuration = 60;

const ENDPOINT = "https://api.line.me/v2/bot";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function lineReply(replyToken: string, text: string, token: string, quickReply?: any) {
  try {
    const msg: any = { type: "text", text: text.slice(0, 4900) };
    if (quickReply) msg.quickReply = quickReply;
    await fetch(`${ENDPOINT}/message/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages: [msg] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // silent
  }
}

const QUICK_REPLY = buildQuickReply([
  { type: "uri", label: "🌐 打開網站", uri: SITE_URL },
  { type: "uri", label: "📚 看章節", uri: `${SITE_URL}/chapters` },
  { type: "uri", label: "⚙️ 設定", uri: `${SITE_URL}/settings` },
  { type: "message", label: "❓ 說明", text: "/help" },
]);

/**
 * USER LINE bot webhook
 *
 * 跟 admin bot 分離（不同 channel、不同 token）。
 * 給一般使用者加為好友、處理：
 *   - 綁定（/bind <code>）
 *   - 解綁（/unbind）
 *   - 一般訊息 → 友善導引到網站
 *
 * 環境變數：
 *   USER_LINE_CHANNEL_SECRET  — verify signature
 *   USER_LINE_CHANNEL_TOKEN   — reply / push
 *
 * 設定 LINE Developer Console：
 *   Webhook URL = https://<site>/api/line-webhook-user
 */
export async function POST(req: NextRequest) {
  const secret = process.env.USER_LINE_CHANNEL_SECRET;
  const token = process.env.USER_LINE_CHANNEL_TOKEN;
  if (!secret || !token) {
    console.warn("[line-webhook:user] no_env");
    return NextResponse.json({ ok: false, error: "no_user_bot_env" });
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("x-line-signature");
  const sigOk = verifySignature(raw, sigHeader, secret);

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  console.log(`[line-webhook:user] sig_received=${sigHeader?.slice(0,12)}... expected=${expected.slice(0,12)}... ok=${sigOk} body_len=${raw.length}`);

  if (!sigOk) {
    try {
      const admin = createSupabaseAdmin();
      await admin.from("error_logs").insert({
        source: "line-webhook-user",
        level: "error",
        message: "[invalid_signature] webhook 簽章驗失敗、USER_LINE_CHANNEL_SECRET 對不上",
        extra: {
          received_sig_prefix: sigHeader?.slice(0, 16) ?? null,
          expected_sig_prefix: expected.slice(0, 16),
          body_len: raw.length,
          secret_length: secret.length,
          hint: "LINE Console → user channel → Channel secret 整段對 Zeabur env USER_LINE_CHANNEL_SECRET",
        },
      });
    } catch {}
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  for (const ev of body.events ?? []) {
    const replyToken = ev.replyToken;
    const userId = ev.source?.userId as string | undefined;

    if (ev.type === "follow" && replyToken && userId) {
      await lineReply(
        replyToken,
        `🏝️ 歡迎加入 AI 島！\n\n要綁定帳號讓我推學習通知給你：\n1. 到 ${SITE_URL}/settings 拿 6 位綁定 code\n2. 傳給我「/bind 123456」\n\n綁定後完課 / 升等 / 解鎖成就 / 論壇被回覆都會推到你的 LINE。`,
        token,
        QUICK_REPLY,
      );
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text" && replyToken && userId) {
      const text = String(ev.message.text ?? "").trim();

      // 1. 綁定
      const bindMatch = text.match(/^\/?bind\s+(\d{6})$/i);
      if (bindMatch) {
        const result = await consumeBindCode(bindMatch[1], userId);
        if (result.ok) {
          await lineReply(
            replyToken,
            `✅ 綁定成功！\n\n之後會推給你：\n• 完成 lesson\n• 升等\n• 解鎖成就\n• 論壇被回覆\n\n關通知 → 「設定 → LINE 通知」、或傳「/unbind」解除。`,
            token, QUICK_REPLY,
          );
        } else {
          const reasonMap: Record<string, string> = {
            invalid_format: "code 格式不對、應該是 6 位數字",
            code_not_found: "code 找不到、可能輸入錯或過期",
            code_expired: "code 過期了、請到網站重拿（5 分鐘有效）",
            line_already_bound_to_another: "這個 LINE 已綁過別的帳號、先到網站解除原綁定",
          };
          await lineReply(
            replyToken,
            `❌ 綁定失敗：${reasonMap[result.reason ?? ""] ?? result.reason}\n\n到 ${SITE_URL}/settings 重拿 code。`,
            token, QUICK_REPLY,
          );
        }
        continue;
      }

      // 2. 解綁
      if (text === "/unbind" || text === "解除" || text === "解除綁定") {
        const admin = createSupabaseAdmin();
        const { error, count } = await admin
          .from("profiles")
          .update({
            line_user_id: null,
            line_bound_at: null,
            line_notify_enabled: false,
          }, { count: "exact" })
          .eq("line_user_id", userId);
        const msg = error || !count
          ? "🤔 你還沒綁定、或已經解除過了"
          : "✅ 已解除綁定、不再推通知。要重綁、到網站重拿 code。";
        await lineReply(replyToken, msg, token, QUICK_REPLY);
        continue;
      }

      // 3. /help
      if (text === "/help" || text === "help" || text === "說明" || text === "?") {
        await lineReply(
          replyToken,
          `📖 AI 島 LINE 通知 bot\n\n指令：\n• /bind 123456 — 綁帳號\n• /unbind — 解除綁定\n• /help — 看這份\n\n網站：${SITE_URL}\n設定 / 拿 code：${SITE_URL}/settings`,
          token, QUICK_REPLY,
        );
        continue;
      }

      // 3.4. /whoami — debug 用、回 LINE userId + 綁定狀態
      if (text === "/whoami" || text === "我是誰" || text === "whoami") {
        const admin = createSupabaseAdmin();
        const { data: bound } = await admin
          .from("profiles")
          .select("username, display_name, role")
          .eq("line_user_id", userId)
          .maybeSingle();
        const msg = bound
          ? `🆔 你的 LINE userId：\n${userId}\n\n✅ 已綁到帳號：\n• username: ${(bound as any).username}\n• 名稱: ${(bound as any).display_name ?? "(未設)"}\n• 角色: ${(bound as any).role}\n\n如果 AI 還不回 → ai_api_keys 或 model 問題、不是綁定問題。`
          : `🆔 你的 LINE userId：\n${userId}\n\n❌ DB 找不到 line_user_id = 這個 userId 的 profile。\n\n意思：你雖然「自己以為綁了」、但 DB 沒這筆。可能原因：\n1. 你用站內 LINE Login 登入過、但那個 userId 跟這個 Bot 拿的 userId 不一樣 (兩個 channel)\n2. /bind 失敗沒成功寫\n3. 站內按了「綁定」但實際走錯流程\n\n正解：到 ${SITE_URL}/settings 拿 6 位 code、回來傳「/bind 123456」、用這個 channel 的 userId 寫進去。`;
        await lineReply(replyToken, msg, token, QUICK_REPLY);
        continue;
      }

      // 3.5. 綁定 / 登入 自然語言引導
      const bindHints = ["綁定", "我要綁", "我要登入", "登入", "怎麼綁", "怎麼登入", "綁帳號", "綁帳戶", "bind", "login", "register", "註冊"];
      if (bindHints.some((k) => text.toLowerCase().includes(k.toLowerCase()))) {
        await lineReply(
          replyToken,
          `🔗 怎麼綁定 AI 島帳號到 LINE：\n\n1. 登入網站 ${SITE_URL}\n2. 進 ${SITE_URL}/settings\n3. 找「LINE 通知綁定」、按一下拿 6 位 code\n4. 回到這裡傳：「/bind 123456」（換成你的 code）\n\n綁完就能用 AI 學員導師 + 收學習通知。`,
          token, QUICK_REPLY,
        );
        continue;
      }

      // 4. 其他訊息 — 已綁定 user 走 AI 學員導師、未綁定提示綁定
      const admin = createSupabaseAdmin();

      // 看 LINE userId 對應哪個 profile（若已綁定）
      const { data: profile } = await admin
        .from("profiles")
        .select("id, username, display_name, role, email, xp, level")
        .eq("line_user_id", userId)
        .maybeSingle();

      const senderName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        `LINE訪客${userId.slice(0, 6)}`;

      // 已綁定 → 試 AI、AI 通了就回、AI 失敗 / 未綁定才走 ticket
      if (profile) {
        const aiReply = await askUserAI(text, profile as any, userId);
        if (aiReply) {
          await lineReply(replyToken, aiReply, token, QUICK_REPLY);
          continue;
        }
        // AI 失敗、fallback 到 ticket
      } else {
        // 未綁定提示綁定 (附上 LINE userId 給 user 自己對)
        await lineReply(
          replyToken,
          `🤖 嗨～看到你訊息了。\n\n你的 LINE userId：${userId.slice(0, 8)}...${userId.slice(-4)}\n\nDB 找不到綁過的帳號。可能你以為綁了但實際 DB 沒寫成功。\n\n正解：\n1. 登入 ${SITE_URL}\n2. 到 ${SITE_URL}/settings\n3. 找「LINE 通知綁定」拿 6 位 code\n4. 回來傳「/bind 123456」\n\n想看你完整 LINE userId、傳「/whoami」`,
          token, QUICK_REPLY,
        );
        continue;
      }

      // 寫進 tickets 表
      const { data: ticket, error: ticketErr } = await admin
        .from("tickets")
        .insert({
          user_id: (profile as any)?.id ?? null,
          subject: `LINE 訊息：${text.slice(0, 40)}`,
          category: "support",
          priority: "normal",
          status: "open",
          meta: {
            source: "user_line_bot",
            line_user_id: userId,
            sender_name: senderName,
          },
        })
        .select("id")
        .single();

      if (ticketErr) {
        console.error("[line-webhook-user] ticket insert failed:", ticketErr.message);
        try {
          await admin.from("error_logs").insert({
            source: "line-webhook-user",
            level: "error",
            message: `ticket insert failed: ${ticketErr.message}`,
            extra: { line_user_id: userId, text: text.slice(0, 200) },
          });
        } catch {}
      }

      // ticket_messages 寫一筆
      if (ticket?.id) {
        const { error: msgErr } = await admin.from("ticket_messages").insert({
          ticket_id: ticket.id,
          author_type: "user",
          author_id: (profile as any)?.id ?? null,
          sender_type: "user",
          sender_id: (profile as any)?.id ?? null,
          body: text.slice(0, 4000),
          content: text.slice(0, 4000),
          is_staff: false,
          meta: { source: "line_user_bot", line_user_id: userId },
        });
        if (msgErr) {
          console.error("[line-webhook-user] ticket_messages insert failed:", msgErr.message);
          try {
            await admin.from("error_logs").insert({
              source: "line-webhook-user",
              level: "error",
              message: `ticket_messages insert failed: ${msgErr.message}`,
              extra: { ticket_id: ticket.id, line_user_id: userId },
            });
          } catch {}
        }
      }

      // 通知 admin LINE
      const { notifyAdmin } = await import("@/lib/notify-admin");
      notifyAdmin({
        kind: "user_ticket",
        dedupeKey: `ticket:${ticket?.id ?? userId}:${Date.now()}`,
        text: `💌 ${senderName} 透過 LINE 提問：\n「${text.slice(0, 200)}」\n\n回覆：${SITE_URL}/${process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2"}/admin/crm${ticket?.id ? `/${ticket.id}` : ""}`,
      }).catch(() => {});

      // 回 user：已收到
      await lineReply(
        replyToken,
        `📩 已收到你的訊息、admin 會在 24 小時內回覆～\n\n（系統自動建 ticket #${ticket?.id?.toString().slice(0, 8) ?? "-"}、回覆會推到這個 LINE 對話）\n\n想自助：\n• 綁帳號：「/bind 123456」\n• 看說明：「/help」`,
        token, QUICK_REPLY,
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook-user" });
}

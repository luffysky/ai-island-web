/**
 * TG bot 11 條進階指令 — 林董私人助理升級包
 *
 * 1. /silence [on|off|30min|1h|24h]  — 暫停 push（離線狀態）
 * 2. /focus 25|50 <topic>             — 番茄鐘倒數，結束時 push 提醒
 * 3. /me                              — 林董個人摘要（今日活動）
 * 4. /digest                          — 今日全站摘要（KPI + 學員 + 風險 + 收入）
 * 5. /journal <內容>                  — 私人日誌寫入 + AI 抽心情
 * 6. /tr <文字>                       — 翻譯（自動偵測中英）
 * 7. /rewrite <文字>                  — AI 潤稿
 * 8. /idea <內容>                     — 靈感箱寫入 + AI 評語 + 自動標籤
 * 9. /broadcast <內容>                — 推送全用戶（admin only）
 * 10. /grant_premium <user> [days]    — 給特定 user premium
 * 11. /vip                            — VIP 用戶清單
 * 12. /risk                           — 高流失風險用戶清單
 *
 * 林董：「不要寫死一個模型」→ 全部走 getModelNameForUsage + providerFromModel
 *      「特權最高禮遇」→ admin 全部不過 AI gate 直接呼叫
 *      「TG 同人不會兩個帳號」→ 不存 user.id、用 channel_user_id
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";

const TG = "https://api.telegram.org/bot";

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function aiQuick(prompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string | null> {
  const modelName = await getModelNameForUsage("admin_assistant", "gpt-4o-mini");
  const provider = providerFromModel(modelName);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return null;
  try {
    const r = await callAI({
      provider, model: modelName, apiKey,
      messages: [{ role: "user", content: prompt }],
      temperature: opts?.temperature ?? 0.5,
      maxTokens: opts?.maxTokens ?? 500,
    });
    return r.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ============================================================
// 1) /silence — 暫停 push
// ============================================================
export async function cmdSilence(chatId: number, args: string[]): Promise<string> {
  const admin = createSupabaseAdmin();
  const sub = (args[0] ?? "").toLowerCase();
  if (sub === "off" || sub === "0") {
    await admin.from("tg_admin_state").upsert({ chat_id: chatId, silenced_until: null }, { onConflict: "chat_id" });
    return "🔔 <b>已恢復通知</b>\n<i>所有 channel push 恢復正常</i>";
  }
  const map: Record<string, number> = { "30min": 30, "30m": 30, "1h": 60, "2h": 120, "8h": 480, "24h": 1440 };
  const mins = map[sub] ?? 60;
  const until = new Date(Date.now() + mins * 60_000);
  await admin.from("tg_admin_state").upsert({ chat_id: chatId, silenced_until: until.toISOString() }, { onConflict: "chat_id" });
  return [
    `🔕 <b>已靜音 ${mins} 分鐘</b>`,
    "",
    `<i>${until.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} 才會再 push</i>`,
    "",
    `恢復用 <code>/silence off</code>`,
  ].join("\n");
}

export async function isSilenced(chatId: number): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("tg_admin_state").select("silenced_until").eq("chat_id", chatId).maybeSingle();
  if (!data?.silenced_until) return false;
  return new Date(data.silenced_until as any).getTime() > Date.now();
}

// ============================================================
// 2) /focus — 番茄鐘
// ============================================================
export async function cmdFocus(chatId: number, args: string[]): Promise<string> {
  const admin = createSupabaseAdmin();
  if (args[0] === "off" || args[0] === "stop") {
    await admin.from("tg_admin_state").upsert({ chat_id: chatId, focus_until: null, focus_topic: null }, { onConflict: "chat_id" });
    return "⏹️ <b>已結束 focus</b>";
  }
  const minutes = Math.max(5, Math.min(180, parseInt(args[0] || "25", 10) || 25));
  const topic = args.slice(1).join(" ").slice(0, 100) || "深度工作";
  const until = new Date(Date.now() + minutes * 60_000);
  await admin.from("tg_admin_state").upsert({
    chat_id: chatId,
    focus_until: until.toISOString(),
    focus_topic: topic,
    silenced_until: until.toISOString(), // focus 期間自動靜音
  }, { onConflict: "chat_id" });
  return [
    `🍅 <b>Focus 開始</b>`,
    "",
    `<b>${escapeHTML(topic)}</b>`,
    `⏱️ ${minutes} 分鐘`,
    `⏰ ${until.toLocaleTimeString("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" })} 結束`,
    "",
    `<i>期間自動靜音、結束時提醒你</i>`,
    `中斷用 <code>/focus off</code>`,
  ].join("\n");
}

// ============================================================
// 3) /me — 林董個人摘要
// ============================================================
export async function cmdMe(tgUsername?: string): Promise<string> {
  const admin = createSupabaseAdmin();
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  // 找林董 profile（用 owner role 或 is_owner）
  const { data: owner } = await admin.from("profiles")
    .select("id, username, display_name, xp, level, streak_days")
    .or("is_owner.eq.true,role.eq.owner")
    .limit(1)
    .maybeSingle();

  if (!owner) return "❌ 找不到 owner profile";

  const [{ count: lessonsToday }, { count: aiToday }, { count: notesToday }, { data: lastLogin }] = await Promise.all([
    admin.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", (owner as any).id).gte("completed_at", dayStart),
    admin.from("ai_messages").select("id", { count: "exact", head: true }).eq("user_id", (owner as any).id).gte("created_at", dayStart),
    admin.from("user_notes").select("id", { count: "exact", head: true }).eq("user_id", (owner as any).id).gte("created_at", dayStart),
    admin.from("profiles").select("last_active_at").eq("id", (owner as any).id).maybeSingle(),
  ] as any);

  return [
    `👤 <b>${escapeHTML((owner as any).display_name ?? (owner as any).username ?? "林董")} 今日摘要</b>`,
    "",
    `🎯 <b>學習活動</b>`,
    `• 完成 lesson：${lessonsToday ?? 0}`,
    `• 寫筆記：${notesToday ?? 0}`,
    `• AI 對話：${aiToday ?? 0}`,
    "",
    `📊 <b>狀態</b>`,
    `• Lv ${(owner as any).level ?? 1} · XP ${(owner as any).xp ?? 0} · 連勝 ${(owner as any).streak_days ?? 0} 天`,
    `• 最後活躍：${(lastLogin as any)?.last_active_at ? new Date((lastLogin as any).last_active_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "(未知)"}`,
  ].join("\n");
}

// ============================================================
// 4) /digest — 今日全站摘要
// ============================================================
export async function cmdDigest(): Promise<string> {
  const admin = createSupabaseAdmin();
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const [
    { count: signupsToday },
    { count: activeToday },
    { count: lessonsToday },
    { count: aiToday },
    { count: errorsToday },
    { data: ordersToday },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_at", dayStart),
    admin.from("lesson_progress").select("id", { count: "exact", head: true }).gte("completed_at", dayStart),
    admin.from("ai_messages").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    admin.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", dayStart).in("level", ["error", "fatal"]),
    admin.from("subscription_orders").select("amount, currency, status").gte("created_at", dayStart).eq("status", "paid"),
  ] as any);

  const revenue = ((ordersToday ?? []) as any[]).reduce((s, o) => s + Number(o.amount ?? 0), 0);

  // AI 一句日報重點
  const summary = await aiQuick(
    `你是雪鑰、林董私人助理。看今日數字、給林董一句精簡日報（不超過 30 字、繁中、有重點 / 異常）：\n` +
    `- 新註冊：${signupsToday ?? 0}\n- 活躍：${activeToday ?? 0}\n- 完課：${lessonsToday ?? 0}\n- AI 量：${aiToday ?? 0}\n- 錯誤：${errorsToday ?? 0}\n- 今日營收：NT$ ${revenue}`,
    { temperature: 0.4, maxTokens: 100 }
  );

  return [
    `📊 <b>${today.toLocaleDateString("zh-TW")} 今日 digest</b>`,
    "",
    `👥 註冊 <b>${signupsToday ?? 0}</b> / 活躍 <b>${activeToday ?? 0}</b>`,
    `📚 完課 <b>${lessonsToday ?? 0}</b>`,
    `🤖 AI 對話 <b>${aiToday ?? 0}</b>`,
    `💰 營收 <b>NT$ ${revenue.toLocaleString()}</b>`,
    `🛡️ 錯誤 <b>${errorsToday ?? 0}</b>`,
    "",
    summary ? `💬 <i>${escapeHTML(summary)}</i>` : "",
  ].filter(Boolean).join("\n");
}

// ============================================================
// 5) /journal — 私人日誌
// ============================================================
export async function cmdJournal(content: string): Promise<string> {
  if (!content || content.length < 2) {
    return [
      "📓 <b>用法：</b><code>/journal &lt;內容&gt;</code>",
      "",
      "<i>例：/journal 今天討論 Discord OAuth 流程、收穫多</i>",
      "",
      "雪鑰會自動抽心情、每週濃縮摘要。",
    ].join("\n");
  }
  const admin = createSupabaseAdmin();
  // AI 抽 mood emoji
  const mood = await aiQuick(
    `從這段日誌抽一個 emoji 代表心情、只回 1 個 emoji、不要其他字：\n\n${content.slice(0, 500)}`,
    { temperature: 0.3, maxTokens: 10 }
  );
  const moodEmoji = (mood?.match(/\p{Emoji}/u)?.[0]) ?? "📝";
  const { error } = await admin.from("owner_journal").insert({
    channel: "telegram",
    content: content.slice(0, 4000),
    mood: moodEmoji,
  });
  if (error) return `❌ 寫入失敗：${escapeHTML(error.message)}`;
  return [
    `${moodEmoji} <b>已記入日誌</b>`,
    "",
    `<i>${escapeHTML(content.slice(0, 200))}${content.length > 200 ? "..." : ""}</i>`,
    "",
    "<code>/journal_history</code> 看過往 · 每週日 21:00 雪鑰會推 weekly recap",
  ].join("\n");
}

// ============================================================
// 6) /tr — 翻譯
// ============================================================
export async function cmdTranslate(content: string): Promise<string> {
  if (!content) return "🌐 <b>用法：</b><code>/tr &lt;文字&gt;</code>";
  const isChinese = /[一-龥]/.test(content);
  const target = isChinese ? "English" : "繁體中文";
  const r = await aiQuick(
    `Translate the following text to ${target}. Only output the translation, no explanation:\n\n${content.slice(0, 1500)}`,
    { temperature: 0.2, maxTokens: 800 }
  );
  if (!r) return "❌ 翻譯失敗 (AI 不可用)";
  return [
    `🌐 <b>${isChinese ? "中→英" : "英→中"}</b>`,
    "",
    `<b>原文：</b>`,
    `<i>${escapeHTML(content.slice(0, 500))}${content.length > 500 ? "..." : ""}</i>`,
    "",
    `<b>譯文：</b>`,
    escapeHTML(r.slice(0, 2000)),
  ].join("\n");
}

// ============================================================
// 7) /rewrite — 潤稿
// ============================================================
export async function cmdRewrite(content: string): Promise<string> {
  if (!content) return "✏️ <b>用法：</b><code>/rewrite &lt;文字&gt;</code>\n<i>AI 會潤色文字、保留原意</i>";
  const r = await aiQuick(
    `你是專業中文編輯。請潤稿這段文字、保留原意、修錯字、讓句子更通順自然、不要過度文藝化、繁體台灣口語。\n` +
    `只回潤稿結果、不要解釋。\n\n原文：\n${content.slice(0, 1500)}`,
    { temperature: 0.4, maxTokens: 1000 }
  );
  if (!r) return "❌ 潤稿失敗 (AI 不可用)";
  return [
    `✏️ <b>潤稿完成</b>`,
    "",
    `<b>原文：</b>`,
    `<i>${escapeHTML(content.slice(0, 500))}${content.length > 500 ? "..." : ""}</i>`,
    "",
    `<b>潤稿：</b>`,
    escapeHTML(r.slice(0, 2000)),
  ].join("\n");
}

// ============================================================
// 8) /idea — 靈感箱
// ============================================================
export async function cmdIdea(content: string): Promise<string> {
  if (!content || content.length < 2) {
    return [
      "💡 <b>用法：</b><code>/idea &lt;想法&gt;</code>",
      "",
      "<i>例：/idea 做一個學員自動配對 mentor 的 AI 功能</i>",
      "",
      "雪鑰會評估優先度 + 自動標籤、之後可在 /admin/launchpad 看",
    ].join("\n");
  }
  const admin = createSupabaseAdmin();
  // AI 評估 priority + tags + 一句反應
  const r = await aiQuick(
    `林董提出一個想法、你是雪鑰。請回 JSON：{ "priority": "p0|p1|p2|p3", "tags": ["..."], "reaction": "..." }
- priority: p0=立刻做、p1=本週、p2=本月、p3=以後
- tags: 1-3 個標籤如 feature / marketing / cost / ux / bug
- reaction: 一句話評（30 字內）

想法：${content.slice(0, 500)}`,
    { temperature: 0.3, maxTokens: 200 }
  );
  let priority = "p2", tags: string[] = [], reaction = "已收進靈感箱、雪鑰之後評估";
  if (r) {
    const m = r.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const j = JSON.parse(m[0]);
        if (["p0","p1","p2","p3"].includes(j.priority)) priority = j.priority;
        if (Array.isArray(j.tags)) tags = j.tags.slice(0, 3).map(String);
        if (j.reaction) reaction = String(j.reaction).slice(0, 100);
      } catch {}
    }
  }
  const { error } = await admin.from("owner_ideas").insert({
    channel: "telegram",
    content: content.slice(0, 4000),
    priority,
    tags,
    ai_reaction: reaction,
  });
  if (error) return `❌ 寫入失敗：${escapeHTML(error.message)}`;
  const pri: Record<string, string> = { p0: "🔥 立刻做", p1: "📍 本週", p2: "📅 本月", p3: "💭 以後" };
  return [
    `💡 <b>靈感已收進箱</b>`,
    "",
    `<b>${pri[priority]}</b>${tags.length ? ` · ${tags.map((t) => `#${t}`).join(" ")}` : ""}`,
    "",
    `<i>${escapeHTML(reaction)}</i>`,
    "",
    `<code>/idea_list</code> 看箱子`,
  ].join("\n");
}

// ============================================================
// 9) /broadcast — 推送全用戶
// ============================================================
export async function cmdBroadcast(args: string[], audience: "all" | "premium" = "all"): Promise<string> {
  const content = args.join(" ").trim();
  if (!content) {
    return [
      "📣 <b>用法：</b><code>/broadcast &lt;內容&gt;</code>",
      "",
      "<i>會推到全部 LINE 綁定 + Discord channel + email 訂閱用戶</i>",
      "",
      "Premium only 用 <code>/broadcast_vip</code>（待開）",
    ].join("\n");
  }
  const admin = createSupabaseAdmin();

  // 拉目標 user list
  let q = admin.from("profiles").select("id, line_user_id, email, role").not("line_user_id", "is", null);
  if (audience === "premium") {
    // 查 active subscriptions
    const { data: subs } = await admin.from("subscriptions").select("user_id").eq("status", "active");
    const uids = ((subs ?? []) as any[]).map((s) => s.user_id);
    if (uids.length === 0) return "❌ 沒 active premium 用戶";
    q = q.in("id", uids);
  }
  const { data: targets } = await q.limit(2000);

  let sent = 0, failed = 0;
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (lineToken && targets) {
    for (const u of targets as any[]) {
      try {
        const r = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: { Authorization: `Bearer ${lineToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to: u.line_user_id, messages: [{ type: "text", text: content.slice(0, 4000) }] }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) sent++; else failed++;
      } catch {
        failed++;
      }
    }
  }
  await admin.from("broadcast_log").insert({
    channel: "line",
    audience,
    content: content.slice(0, 4000),
    sent_count: sent,
    failed_count: failed,
  });
  return [
    `📣 <b>Broadcast 完成</b>`,
    "",
    `✅ 已送 <b>${sent}</b> 人`,
    failed > 0 ? `❌ 失敗 <b>${failed}</b>` : "",
    "",
    `<i>稽核已存 broadcast_log</i>`,
  ].filter(Boolean).join("\n");
}

// ============================================================
// 10) /grant_premium — 給特定 user premium
// ============================================================
export async function cmdGrantPremium(args: string[]): Promise<string> {
  const target = args[0];
  const days = Math.max(1, Math.min(365, parseInt(args[1] || "30", 10) || 30));
  if (!target) {
    return [
      "🎁 <b>用法：</b><code>/grant_premium &lt;username&gt; [天數=30]</code>",
      "",
      "<i>例：/grant_premium hotnami111 90</i>",
    ].join("\n");
  }
  const admin = createSupabaseAdmin();
  // username or display_name
  const { data: user } = await admin.from("profiles").select("id, username, display_name")
    .or(`username.eq.${target},display_name.eq.${target}`).maybeSingle();
  if (!user) return `❌ 找不到用戶 <code>${escapeHTML(target)}</code>`;

  const endDate = new Date(Date.now() + days * 86400_000);
  const { error } = await admin.from("subscriptions").upsert({
    user_id: (user as any).id,
    plan: "monthly",
    status: "active",
    start_date: new Date().toISOString(),
    end_date: endDate.toISOString(),
    granted_by: "telegram_admin",
  }, { onConflict: "user_id" });
  if (error) return `❌ 失敗：${escapeHTML(error.message)}`;

  // DC#4: 同步 Discord VIP role
  let discordSync = "";
  try {
    const { getDiscordIdForUser, assignVipRole } = await import("@/lib/discord-binding");
    const dcId = await getDiscordIdForUser((user as any).id);
    if (dcId) {
      const ok = await assignVipRole(dcId);
      discordSync = ok ? "\n🎮 Discord 已自動加 VIP role" : "\n⚠️ Discord role assign 失敗";
      if (ok) {
        await admin.from("user_discord_bind").update({ last_role_sync_at: new Date().toISOString() }).eq("user_id", (user as any).id);
      }
    }
  } catch {}

  return [
    `🎁 <b>已給 Premium</b>`,
    "",
    `👤 ${escapeHTML((user as any).display_name ?? (user as any).username ?? target)}`,
    `⏱️ ${days} 天（到 ${endDate.toLocaleDateString("zh-TW")}）`,
    discordSync,
  ].filter(Boolean).join("\n");
}

// ============================================================
// 11) /vip — VIP 用戶清單
// ============================================================
export async function cmdVip(): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data: subs } = await admin.from("subscriptions")
    .select("user_id, plan, end_date, profiles!inner(username, display_name, level, xp, last_active_at)")
    .eq("status", "active")
    .order("end_date", { ascending: true })
    .limit(15);

  if (!subs || subs.length === 0) return "📭 <b>目前沒有 active VIP</b>";

  const lines = (subs as any[]).map((s, i) => {
    const p = s.profiles;
    const days = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400_000);
    return `${i + 1}. <b>${escapeHTML(p.display_name ?? p.username)}</b> · ${s.plan} · 剩 <b>${days}</b> 天 · Lv ${p.level}`;
  });

  return [
    `💎 <b>VIP 用戶（${subs.length}）</b>`,
    "",
    ...lines,
  ].join("\n");
}

// ============================================================
// 12) /risk — 高流失風險用戶
// ============================================================
export async function cmdRisk(): Promise<string> {
  const admin = createSupabaseAdmin();
  // 規則：active 訂閱、超過 7 天沒登入
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: at_risk } = await admin.from("subscriptions")
    .select("user_id, plan, end_date, profiles!inner(username, display_name, last_active_at)")
    .eq("status", "active")
    .lt("profiles.last_active_at", sevenDaysAgo)
    .limit(15);

  if (!at_risk || at_risk.length === 0) return "✅ <b>沒有流失風險用戶</b>\n<i>所有 VIP 7 天內都有登入</i>";

  const lines = (at_risk as any[]).map((s, i) => {
    const p = s.profiles;
    const days = Math.floor((Date.now() - new Date(p.last_active_at).getTime()) / 86400_000);
    return `${i + 1}. <b>${escapeHTML(p.display_name ?? p.username)}</b> · ${s.plan} · <b>${days}</b> 天沒登入`;
  });

  return [
    `⚠️ <b>流失風險（${at_risk.length}）</b>`,
    "",
    `<i>active VIP 超過 7 天沒登入</i>`,
    "",
    ...lines,
    "",
    `<i>建議：/broadcast 留念訊息 或 /grant_premium 延期`,
  ].join("\n");
}

// ============================================================
// VOICE — 語音轉文字 (Whisper)
// ============================================================
export async function transcribeVoice(token: string, fileId: string): Promise<string | null> {
  try {
    // 1. 取 file_path
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`, {
      signal: AbortSignal.timeout(8000),
    });
    const info = await infoRes.json();
    const filePath = info?.result?.file_path;
    if (!filePath) return null;

    // 2. 下載
    const binRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!binRes.ok) return null;
    const buf = await binRes.arrayBuffer();
    if (buf.byteLength > 25 * 1024 * 1024) return "(語音 > 25MB、Whisper 上限)";

    // 3. OpenAI Whisper
    const openaiKey = await getProviderKey("openai");
    if (!openaiKey) return null;

    const form = new FormData();
    form.append("file", new Blob([buf], { type: "audio/ogg" }), "voice.ogg");
    form.append("model", "whisper-1");
    form.append("language", "zh");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return String(j.text ?? "").trim() || null;
  } catch {
    return null;
  }
}

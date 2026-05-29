import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyUserLine } from "@/lib/notify-user-line";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { loadUserMemory } from "@/lib/user-ai-memory";
import { buildSimpleCard } from "@/lib/line-flex";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 雪鑰主動關懷流失 user — 每天找 3 / 7 / 14 天沒登入的綁定學員、push 個人化訊息
 *
 * 觸發：GET /api/cron/inactive-user-recall?secret=$CRON_SECRET
 * 排程：每天 11:00 UTC（= 台灣 19:00、晚餐後最容易看 LINE）
 *
 * Tier 邏輯：
 *   3-6 天沒登入 → 輕推「想你了」+ 推薦下一課
 *   7-13 天沒登入 → 強推「3 天沒見、別斷了連勝」+ 提醒進度
 *   14+ 天沒登入 → 最後召回「14 天沒見、雪鑰擔心你」
 *   30+ 天 → 不推（標 dormant、避免騷擾）
 *
 * dedupe：每個 user 每 tier 只推一次、用 user_recall_log 防重複
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();

  // 找已綁定 LINE + 過去 30 天有 last_active_at 的 user
  const { data: users } = await admin
    .from("profiles")
    .select("id, username, display_name, line_user_id, last_active_at, level, xp, streak_days")
    .not("line_user_id", "is", null)
    .order("last_active_at", { ascending: true })
    .limit(500);

  const now = Date.now();
  const tier3 = 3 * 86400_000;
  const tier7 = 7 * 86400_000;
  const tier14 = 14 * 86400_000;
  const tier30 = 30 * 86400_000;

  const candidates: Array<any> = [];
  for (const u of (users ?? []) as any[]) {
    if (!u.last_active_at) continue;
    const idleMs = now - new Date(u.last_active_at).getTime();
    if (idleMs < tier3) continue;        // < 3 天還在用、不推
    if (idleMs >= tier30) continue;      // 30 天以上、放棄（避免騷擾）
    const tier = idleMs >= tier14 ? "tier_14" : idleMs >= tier7 ? "tier_7" : "tier_3";
    candidates.push({ ...u, idleDays: Math.floor(idleMs / 86400_000), tier });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, pushed: 0, message: "沒人需要關懷、全員活躍" });
  }

  // 取 anthropic key、生成個人化訊息
  const apiKey = await getProviderKey("anthropic");
  const useAi = !!apiKey;
  const modelName = useAi ? await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001") : "";

  let pushed = 0;
  let skipped = 0;
  let failed = 0;
  const results: any[] = [];

  for (const u of candidates) {
    // dedupe：今天這個 tier 推過就 skip
    const dedupeKey = `recall:${u.id}:${u.tier}:${new Date().toISOString().slice(0, 10)}`;
    const { count: already } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .eq("kind", "system")
      .ilike("title", `%${u.tier}%`)
      .gte("created_at", new Date(now - 86400_000).toISOString());
    if ((already ?? 0) > 0) { skipped++; continue; }

    // 生成訊息
    let title = "雪鑰想你了";
    let body = "";
    if (useAi) {
      try {
        const mem = await loadUserMemory(u.id).catch(() => null);
        const userName = u.display_name || u.username || "你";
        const prompt = `你是雪鑰、AI 島的 AI 助手。${userName} 已經 ${u.idleDays} 天沒回來學了、你想 push 一條 LINE 訊息把他召回。

# 學員資訊
- 名字：${userName}
- 已 ${u.idleDays} 天沒登入
- Lv ${u.level ?? 1}、XP ${u.xp ?? 0}、原連勝 ${u.streak_days ?? 0} 天（已中斷）
${mem?.summary ? `- 雪鑰記憶：${mem.summary}` : ""}
${mem?.preferences?.style ? `- 風格：${mem.preferences.style}` : ""}

# 任務
寫一段 60 字內的 LINE 訊息：
- 第一人稱「雪鑰」、不要說「我們的系統」
- 不要說教 / 不要罵他懶
- 用陪伴感、像朋友訊息、稍帶撒嬌
- 提一件他學過的事或一個值得回來的理由
- 結尾自然引導回來、可附章節連結但不強推

只輸出訊息內文、不要 markdown、不要前綴。`;

        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: modelName, max_tokens: 300, temperature: 0.7, messages: [{ role: "user", content: prompt }] }),
          signal: AbortSignal.timeout(20_000),
        });
        if (r.ok) {
          const data = await r.json();
          const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
          if (text) body = text.slice(0, 200);
        }
      } catch (e: any) {
        console.warn("[recall] AI gen fail:", e?.message);
      }
    }

    // fallback 文案
    if (!body) {
      const userName = u.display_name || u.username || "你";
      body = u.tier === "tier_14"
        ? `${userName}、雪鑰擔心你～14 天沒見了、之前的連勝 ${u.streak_days ?? 0} 天好可惜。回來看看 ch00 的入門、3 分鐘就能重新熱身。`
        : u.tier === "tier_7"
        ? `${userName}、雪鑰想你了！${u.idleDays} 天沒登入、之前的學習動能可惜了、要不要回來看 1 課？`
        : `${userName}、好幾天沒見～雪鑰幫你選了一課適合接著學的、5 分鐘就好。`;
    }

    const accentColor = u.tier === "tier_14" ? "#ef4444" : u.tier === "tier_7" ? "#f97316" : "#8be9fd";
    const flex = buildSimpleCard({
      emoji: "💌",
      title: `雪鑰想你了（${u.idleDays} 天沒見）`,
      accentColor,
      body,
      buttons: [
        { label: "▶ 回來學一課", uri: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}/chapters`, primary: true },
        { label: "🛤️ 看我的足跡", uri: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}/me/footprint` },
      ],
    });

    try {
      await notifyUserLine({ userId: u.id, text: body, flex });
      // 同時寫 notifications 鈴鐺（網站登入也看到）
      await admin.from("notifications").insert({
        user_id: u.id,
        kind: "system",
        title: `雪鑰關懷 [${u.tier}]`,
        body,
        link: "/chapters",
      });
      pushed++;
      results.push({ user_id: u.id, name: u.display_name || u.username, tier: u.tier, idleDays: u.idleDays, status: "pushed" });
    } catch (e: any) {
      failed++;
      results.push({ user_id: u.id, status: "failed", error: e?.message });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    pushed,
    skipped,
    failed,
    used_ai: useAi,
    results: results.slice(0, 30),
  });
}

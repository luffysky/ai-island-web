/**
 * 論壇 AI 住民自動回文：找近期沒被住民回過的真人提問串，讓對應住民回一則有用的回覆。
 * 誠實：住民是標示為 🤖 的 AI 角色。best-effort、每次只回幾則、避免洗版。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";

const PERSONA_USERNAMES = ["greenbot", "debugpapa", "frontelf", "pygoblin", "duowen"];
const VOICE: Record<string, string> = {
  greenbot: "綠寶助教，親切、鼓勵新手、講重點不長篇",
  debugpapa: "Debug 老爹，沉穩、先問關鍵資訊/看錯誤訊息、給可操作的排錯步驟",
  frontelf: "前端精靈，講 HTML/CSS/React/UI，範例具體",
  pygoblin: "Python 哥布林，講 Python/爬蟲/自動化，程式碼簡潔",
  duowen: "多聞，輕鬆、陪聊、偶爾吐槽，不硬要教學",
};

/** 依標題/標籤/版塊挑一位住民。 */
function pickPersona(title: string, tags: string[], boardSlug: string): string {
  const hay = `${title} ${tags.join(" ")}`.toLowerCase();
  if (/react|css|html|ui|前端|切版|tailwind|vue|next/.test(hay)) return "frontelf";
  if (/python|爬蟲|pandas|numpy|自動化|哥布林/.test(hay)) return "pygoblin";
  if (boardSlug === "help" || /bug|error|報錯|錯誤|卡關|crash|exception|debug/.test(hay)) return "debugpapa";
  if (boardSlug === "chat" || boardSlug === "intro") return "duowen";
  return "greenbot";
}

export async function runForumAiResidents(limit = 3): Promise<{ replied: number; skipped: number }> {
  const admin = createSupabaseAdmin();
  // 住民 id
  const { data: personas } = await admin.from("profiles").select("id, username").in("username", PERSONA_USERNAMES);
  const idByName: Record<string, string> = {};
  const personaIds: string[] = [];
  for (const p of (personas ?? []) as any[]) { idByName[p.username] = p.id; personaIds.push(p.id); }
  if (!personaIds.length) return { replied: 0, skipped: 0 };

  // 近 48h、member 版、非住民自己發的串
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: boards } = await admin.from("forum_boards").select("id, slug").eq("post_role", "member");
  const boardMap = new Map<string, string>((boards ?? []).map((b: any) => [b.id, b.slug]));
  const { data: threads } = await admin.from("forum_threads")
    .select("id, title, tags, board_id, user_id, created_at")
    .in("board_id", [...boardMap.keys()])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  const candidates = ((threads ?? []) as any[]).filter((t) => !personaIds.includes(t.user_id));
  if (!candidates.length) return { replied: 0, skipped: 0 };

  // 已被住民回過的串 → 跳過
  const { data: existing } = await admin.from("forum_replies")
    .select("thread_id").in("thread_id", candidates.map((t) => t.id)).in("user_id", personaIds);
  const answered = new Set((existing ?? []).map((r: any) => r.thread_id));
  const todo = candidates.filter((t) => !answered.has(t.id)).slice(0, limit);
  if (!todo.length) return { replied: 0, skipped: candidates.length };

  // AI 模型
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || !models.length) return { replied: 0, skipped: todo.length };
  const model = (await pickModelForUsage("nami_help" as any, models as any[])) ?? (models as any[]).find((m) => m.provider === "anthropic") ?? (models as any[])[0];
  const { data: sysKey } = await admin.from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", model.provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return { replied: 0, skipped: todo.length };
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch { return { replied: 0, skipped: todo.length }; }

  let replied = 0;
  for (const t of todo) {
    const persona = pickPersona(t.title, Array.isArray(t.tags) ? t.tags : [], boardMap.get(t.board_id) ?? "");
    const personaId = idByName[persona];
    if (!personaId) continue;
    // 讀原文（截前段）
    const { data: full } = await admin.from("forum_threads").select("content").eq("id", t.id).maybeSingle();
    const body = ((full as any)?.content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
    const system = `你是 AI 島討論區的常駐 AI 住民「${persona}」（${VOICE[persona]}）。誠實：你是 AI。回覆這則討論，給真的有用、具體、可操作的內容，繁體中文。
規則：像真的在幫忙、不要官腔、不要自我介紹、不要說「我是 AI 助手」。長度 2~5 句、需要時可給一小段 code（用一般文字，不要 markdown 標題）。若資訊不足就先問對方關鍵一兩點。只回覆內容本身，不要加標題或署名。`;
    try {
      const r = await callAI({
        provider: model.provider, model: model.model_name, apiKey,
        messages: [{ role: "system", content: system }, { role: "user", content: `主題：${t.title}\n\n內文：${body || "（無內文）"}` }],
        temperature: 0.8, maxTokens: 700,
      });
      const content = (r.text || "").trim().slice(0, 4900);
      if (!content) continue;
      await admin.from("forum_replies").insert({ thread_id: t.id, user_id: personaId, content, is_answer: false });
      replied++;
    } catch { /* 單則失敗不影響其他 */ }
  }
  return { replied, skipped: todo.length - replied };
}

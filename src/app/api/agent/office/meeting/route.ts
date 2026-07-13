import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/agent/office/meeting { topic } — AI 員工會議：各員工按職能+個性輪流用一句話發言。
// 接現有員工系統（agent_skills 已安裝者）；免費模型 + 短輸出、零 AI 成本走免費池。療癒向。
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const topic = String(b.topic ?? "").trim().slice(0, 200);
  if (!topic) return NextResponse.json({ error: "缺會議主題" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: skills } = await admin.from("agent_skills")
    .select("id, name, description, emoji, goal_template, category, is_builtin")
    .or(`is_builtin.eq.true,user_id.eq.${user.id}`);
  const { data: installs } = await admin.from("agent_skill_installs").select("skill_id").eq("user_id", user.id);
  const installedSet = new Set((installs ?? []).map((i) => i.skill_id));

  // 我的員工 = 已安裝的內建 + 全部自建；優先「員工」類，不足就全取；上限 6 位
  let employees = (skills ?? []).filter((s) => (s.is_builtin ? installedSet.has(s.id) : true));
  const emp = employees.filter((s) => s.category === "employee");
  if (emp.length >= 2) employees = emp;
  employees = employees.slice(0, 6);
  if (employees.length === 0) {
    return NextResponse.json({ topic, messages: [], note: "還沒有在職員工——先去技能商店安裝或建員工。" });
  }

  const messages = await Promise.all(
    employees.map(async (e) => {
      const persona = `你是「${e.name}」（${e.description || "團隊成員"}）。你的職能與個性：${e.goal_template || "務實、直接"}。`;
      const system = `${persona}\n現在在團隊會議上。針對會議主題，用繁體中文講「一句話」發言（最多 40 字），要鮮明符合你的角色個性與立場（催進度／顧美感／潑冷水／穩方向／顧使用者／挑毛病…都可以），可以吐槽、補充或提醒，但別只複述主題、別出戲、別自我介紹。只回那一句話本身，不要引號、不要名字前綴。`;
      try {
        const r = await completeForUsage("agent_core", { system, user: `會議主題：${topic}`, maxTokens: 100, temperature: 0.95 });
        const text = (r.text || "").trim().replace(/^["「『]+|["」』]+$/g, "").split("\n")[0].slice(0, 120);
        return { id: e.id, name: e.name, emoji: e.emoji || "🧑‍💼", text: text || "（想想…先聽大家的）" };
      } catch {
        return { id: e.id, name: e.name, emoji: e.emoji || "🧑‍💼", text: "（連線不穩、先跳過我一輪）" };
      }
    })
  );

  return NextResponse.json({ topic, messages });
}

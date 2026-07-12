import { NextResponse } from "next/server";
import { completeForUsage } from "@/lib/resolve-usage-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// AI 模擬評審（機會島 V3）：你貼作品/pitch → AI 評審一題一題犀利追問 → 到上限給評分卡。
// 免費模型優先、走系統金鑰、不耗使用者額度。前端持有對話、server 無狀態。

const PERSONAS: Record<string, { name: string; style: string }> = {
  tech: { name: "技術評審", style: "你是資深技術評審。專問：架構/資料庫選型/API/可擴充性/資安/為何這樣設計。追問細節、不放過含糊。" },
  business: { name: "商業評審", style: "你是商業評審。專問：怎麼賺錢/商業模式/市場多大/獲客成本/競品差異/單位經濟。" },
  investor: { name: "投資人", style: "你是創投。專問：為什麼投你/TAM/牽引力數據(用戶/留存/付費)/團隊/退場/為何是現在。犀利現實。" },
  user: { name: "使用者", style: "你是目標使用者。專問：我為什麼要用/解決我什麼痛點/跟現有工具差在哪/會不會很難用。" },
  troll: { name: "酸民", style: "你是最刁鑽的酸民評審。專問：ChatGPT 不就能做？這有什麼難的？誰會付錢？護城河在哪？但仍要具體、逼出真實答案。" },
};

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as any));
  const about = String(b.about ?? "").trim().slice(0, 1500);
  const persona = PERSONAS[b.persona] ? b.persona : "investor";
  const messages: { role: string; content: string }[] = Array.isArray(b.messages) ? b.messages.slice(-12) : [];
  if (!about) return NextResponse.json({ error: "請先貼上你的作品/簡報內容" }, { status: 400 });

  const p = PERSONAS[persona];
  const asked = messages.filter((m) => m.role === "judge").length;
  const MAX_Q = 5;
  const transcript = messages.map((m) => `${m.role === "judge" ? p.name : "參賽者"}：${m.content}`).join("\n") || "（尚未開始）";

  const system = `${p.style}
你正在模擬一場競賽決賽的 Q&A，對象是下面這個作品。
規則：
- 一次只問**一個**犀利、具體、能逼出真實答案的問題；針對參賽者上一個回答的弱點追問。
- 已問 ${asked} 題（上限 ${MAX_Q} 題）。若還沒到上限、就再問一題。
- 到上限、或參賽者答得夠完整可收尾時，改給「評分卡」。
只回 JSON：
  問題 → {"type":"question","text":"你的問題（繁中、一句）"}
  收尾 → {"type":"verdict","score":0到100整數,"strengths":["..."],"weaknesses":["..."],"advice":["準備建議..."]}`;
  const user = `作品/簡報：\n${about}\n\n目前 Q&A：\n${transcript}\n\n只回 JSON。`;

  try {
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 500, defaultModel: "claude-haiku-4-5-20251001" });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    const obj = s !== -1 && e !== -1 ? JSON.parse(t.slice(s, e + 1)) : null;
    if (!obj) throw new Error("no json");
    if (obj.type === "question" && obj.text) return NextResponse.json({ type: "question", text: String(obj.text).slice(0, 300), judge: p.name });
    return NextResponse.json({
      type: "verdict",
      score: Math.max(0, Math.min(100, Number(obj.score) || 0)),
      strengths: (obj.strengths ?? []).slice(0, 5).map((x: any) => String(x).slice(0, 120)),
      weaknesses: (obj.weaknesses ?? []).slice(0, 5).map((x: any) => String(x).slice(0, 120)),
      advice: (obj.advice ?? []).slice(0, 5).map((x: any) => String(x).slice(0, 120)),
      judge: p.name,
    });
  } catch {
    return NextResponse.json({ type: "question", text: "先用一句話說：你的產品解決誰的什麼痛點？為什麼是你來做？", judge: p.name });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { assistText, AgentError } from "@/lib/creator-engine/ai/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 各模式的指令（system 片段）。回傳純文字/markdown、不要 JSON、不要 code fence。
const MODES: Record<string, { instr: string; temp?: number; max?: number }> = {
  // 通用
  continue: { instr: "接著使用者目前的內文，自然『續寫』下去（延續語氣、人稱、時態）。只輸出新增的段落，不要重複已有內容、不要前言。", temp: 0.9, max: 1200 },
  rewrite: { instr: "把使用者提供的這段文字『改寫』得更好（更精準、流暢、有畫面），保留原意與語氣。只輸出改寫後的文字。", temp: 0.85 },
  polish: { instr: "『潤稿/煉字』：修掉贅字、調整節奏、強化用詞，但不改變原意與長度量級。只輸出修潤後的文字。", temp: 0.6 },
  expand: { instr: "把這段『擴寫』得更豐富（補上細節、感官、例子），保持原語氣。只輸出擴寫後的文字。", temp: 0.9 },
  shorten: { instr: "把這段『精簡』成更短更有力的版本，保留核心。只輸出精簡後的文字。", temp: 0.5 },
  title: { instr: "依內文給 5 個吸引人的『標題』候選，條列。", temp: 0.9, max: 400 },
  translate: { instr: "把這段做『文化轉譯』到指定語言（見指示），用該語言自然書寫、融入在地語感。只輸出譯文。", temp: 0.85 },
  outline: { instr: "依主題/內文產生一份清楚的『大綱』（階層條列）。", temp: 0.7, max: 1000 },
  // 小說
  outline_chapters: { instr: "為這部長篇小說規劃『章節大綱』：每章一行（章名＋一句重點），約 8–15 章。", temp: 0.8, max: 1400 },
  character_card: { instr: "產生一張『角色卡』：姓名、外型、性格、背景、動機、說話風格、人物弧線。可依內文已出現的角色延伸。", temp: 0.85, max: 900 },
  worldbuilding: { instr: "建立『世界觀設定』：時代/地理、社會規則、特殊設定、衝突來源、氛圍。條列。", temp: 0.85, max: 1100 },
  consistency: { instr: "做『一致性檢查』：找出內文中角色名、設定、時間線、稱謂可能矛盾或前後不一之處，條列指出並建議修法。若無明顯問題就說明大致一致。", temp: 0.4, max: 1000 },
  // 短篇/故事
  three_act: { instr: "用『三幕（起承轉合）骨架』替這個故事打底：分別寫每一幕要發生什麼、轉折點在哪。", temp: 0.8, max: 1000 },
  ending: { instr: "給 3 個不同走向的『結局』提案（圓滿/反轉/開放），各 2–3 句。", temp: 0.95, max: 800 },
  // 歌詞
  song_structure: { instr: "用【Verse】【Pre-Chorus】【Chorus】【Bridge】【Outro】標記，依主題搭出一首歌的『段落骨架』與每段要表達的情緒（可先放佔位歌詞）。", temp: 0.85, max: 1200 },
  rhyme: { instr: "針對這段歌詞/句子給『押韻建議』：列出可用的韻腳詞、以及 2–3 句改寫示範讓它更順口。", temp: 0.85, max: 700 },
  suno: { instr: "產生可直接貼進 Suno 的『風格提示詞』（英文，逗號分隔：曲風、情緒、樂器、人聲、節奏 BPM）。只輸出提示詞本身。", temp: 0.8, max: 400 },
  mv: { instr: "產生這首歌的『MV 視覺/分鏡提示詞』（英文，可分鏡列點：場景、運鏡、色調、氛圍）。", temp: 0.85, max: 700 },
  // 詩
  poem_form: { instr: "依指定形式（現代詩/俳句/絕句/律詩/十四行，見指示）給出該形式的『骨架與格律提示』，並示範開頭。", temp: 0.85, max: 800 },
  imagery: { instr: "針對這首詩的主題,『擴展意象』：給 8–12 個新鮮、不落俗套的意象/比喻供挑選。", temp: 1.0, max: 700 },
  // 劇本/腳本
  scene: { instr: "用劇本格式打一個『場景骨架』：場景標頭（內/外、地點、時間）、登場人物、該場目的與衝突。", temp: 0.8, max: 900 },
  dialogue: { instr: "依情境/角色寫一段『對白』（含簡短動作提示），自然、有潛台詞、推進劇情。", temp: 0.9, max: 1000 },
  storyboard: { instr: "把這段拆成『分鏡表』：每個鏡頭一列（景別、畫面內容、運鏡、秒數）。", temp: 0.8, max: 1000 },
  short_video: { instr: "寫一支『短影音腳本』：3 秒 Hook、主體節奏分段（含口播/字幕）、結尾 CTA；附建議 BGM 情緒。", temp: 0.9, max: 1100 },
  // 文章
  seo: { instr: "依內文產生『SEO 包』：1 個主標、3 個替代標題、150 字內 meta 摘要、5 個關鍵字。", temp: 0.7, max: 700 },
  // 文案/品牌
  slogan: { instr: "給 8 個不同風格的『Slogan』候選（簡短有記憶點），條列。", temp: 1.0, max: 600 },
  brand_story: { instr: "寫一段『品牌故事』：起源、信念、為誰而做、與眾不同之處，有溫度。", temp: 0.9, max: 1000 },
  selling_points: { instr: "把內容整理成『賣點條列』：3–6 點，每點一句、講利益不只講功能。", temp: 0.7, max: 700 },
  platform_adapt: { instr: "把這段文案『適配各平台』：分別給 IG（含 hashtag）、FB、短影音字幕 三個版本。", temp: 0.85, max: 1100 },
};

const TYPE_LABEL: Record<string, string> = {
  novel: "長篇小說", short_story: "短篇小說/故事", song: "歌詞", poem: "詩",
  script: "劇本/腳本", article: "文章", copy: "文案/品牌",
};

/** POST { workspaceId, mode, workType, input?, context?, instruction? } → { text } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const mode = String(b.mode ?? "");
  if (!workspaceId || !MODES[mode]) return NextResponse.json({ error: "validation", message: "缺 workspaceId / 不支援的 mode" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const spec = MODES[mode];
  const typeLabel = TYPE_LABEL[String(b.workType ?? "")] ?? "作品";
  const input = String(b.input ?? "").slice(0, 8000);
  const context = String(b.context ?? "").slice(0, 4000);
  const instruction = String(b.instruction ?? "").slice(0, 500);

  const system = `你是「創作引擎」裡的 AI 寫作助手，正在協助使用者創作一部「${typeLabel}」。
${spec.instr}
規則：全程繁體中文（除非任務本身要求其他語言，如 Suno/MV 提示或翻譯）；直接輸出結果本身，不要任何前言、說明、或 \`\`\` 程式碼框。`;

  const parts: string[] = [];
  if (context) parts.push(`【全文脈絡】\n${context}`);
  if (input) parts.push(`【要處理的內容】\n${input}`);
  if (instruction) parts.push(`【額外指示】\n${instruction}`);
  if (!parts.length) parts.push("（目前還沒有內容，請依作品類型給一個好的起點。）");

  try {
    const { text } = await assistText(workspaceId, u.userId, {
      mode, system, user: parts.join("\n\n"), temperature: spec.temp, maxTokens: spec.max,
    });
    return NextResponse.json({ text });
  } catch (e) {
    const st = e instanceof AgentError ? e.status : 500;
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: st });
  }
}

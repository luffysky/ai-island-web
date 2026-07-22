// Agent Core — 任務規劃/工具決策 loop。對齊 docs/agent_platform_plan.md §2/§4/§9。
// 流程：讀目標 → LLM 規劃下一步(工具+參數) → 權限判斷(read 自動 / write,dangerous 要確認) →
//        執行工具 → 記錄 step → 回饋觀察給 LLM → 直到 LLM 說 done 或達 max_steps。
// 以 async generator 吐事件，讓 API route 轉成 SSE。approval 用「寫 DB pending row + 輪詢」等前端決定。
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { getTool, describeToolList, effectiveTools, needsApproval, approvalSummary, toolAllowed, TOOLS, type ToolResult, type AgentTool } from "./tools";
import { getOnlineDevice, dispatchToDevice } from "./bridge";
import { sendPushToUser } from "@/lib/web-push";
import { loadUserMcpTools } from "./mcp";

// 手機遙控核心：關鍵時刻推播到使用者所有裝置（VAPID 未設會自動 no-op）。fire-and-forget。
function pushSafe(userId: string, title: string, body: string, taskId: string, tag: string) {
  sendPushToUser(userId, { title, body: body.slice(0, 90), url: `/agent?task=${taskId}`, tag }).catch(() => {});
}

export type AgentEvent =
  | { type: "status"; status: string }
  | { type: "thought"; idx: number; thought: string }
  | { type: "step"; step: StepRow }
  | { type: "approval"; approval: { id: string; toolName: string; risk: string; summary: Record<string, string> } }
  | { type: "done"; status: "succeeded" | "failed" | "cancelled"; summary: string }
  | { type: "error"; error: string };

interface StepRow {
  idx: number; thought?: string; toolName?: string; risk?: string;
  args?: unknown; result?: unknown; ok?: boolean;
}

interface Decision { thought?: string; tool?: string; args?: any; done?: boolean; summary?: string; }

// 技能：限制可用工具 + 附加任務框架/守則（Phase 3）
export interface SkillCtx { allowedTools?: string[]; prompt?: string; }

// 判斷一段開頭是不是「模型的思考過程/後設說明」（reasoning 模型常把草稿當答案吐出來）。
function looksLikeReasoning(head: string): boolean {
  const h = (head ?? "").toLowerCase();
  return /the user (wants|asked|is)|i (need|must|will|should) |let's (scan|check|see|look)|let me |based only on the|i must not invent|source \d|category \d|i will (organize|categorize|include)|我需要|我先|首先，?我|讓我來?|接下來我|使用者(想要|要求)|我會把/.test(h);
}

// 把模型可能夾帶的「思考過程/前言/code fence」清掉，只留真正的答案。防止 reasoning 草稿被當成最終回覆。
function sanitizeAnswer(text: string): string {
  let t = (text ?? "").trim();
  t = t.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").trim();  // 成對 think 區塊
  t = t.replace(/<think(?:ing)?>[\s\S]*$/i, "").trim();                     // 未閉合的 think
  t = t.replace(/^```(?:markdown|md|json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // 開頭是一段思考、但後面有真正的 Markdown 標題 → 從第一個標題開始取
  const m = t.match(/^#{1,4}\s+\S/m);
  if (m && typeof m.index === "number" && m.index > 0 && looksLikeReasoning(t.slice(0, m.index))) {
    t = t.slice(m.index).trim();
  }
  return t;
}

function parseDecision(text: string): Decision | null {
  let t = (text ?? "").trim();
  // 去 code fence
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{");
  if (s === -1) return null;
  const e = t.lastIndexOf("}");
  // 完整 JSON（有收尾的 }）→ 直接 parse
  if (e > s) {
    try { return JSON.parse(t.slice(s, e + 1)); } catch { /* 往下容錯修復 */ }
  }

  // 修復最常見失敗：模型把「一大段 markdown（含 ``` 程式碼、換行、引號）」塞進 summary 字串、
  // 但沒把換行/引號 escape 好、或**輸出被 maxTokens 截斷**（沒有收尾的 "}）→ JSON.parse 掛掉。
  // 這裡直接把 summary 內容抽出來、容錯 unescape，避免把整包 raw JSON 當答案顯示（使用者只想看成品本身）。
  const jsonStr = t.slice(s);  // 從第一個 { 到結尾（含被截斷的情況）
  try {
    const done = /"done"\s*:\s*true/.test(jsonStr);
    // 找 "summary":" 起點，抓其後**全部**內容（截斷時沒有收尾引號也要能救）
    const key = jsonStr.search(/"summary"\s*:\s*"/);
    if (key !== -1) {
      let body = jsonStr.slice(key).replace(/^"summary"\s*:\s*"/, "");
      // 若有正常收尾（未被截斷）：切掉最後一個未跳脫的 "、以及可能的 , "done":... }
      body = body.replace(/"\s*(?:,\s*"[^"]*"\s*:\s*(?:true|false|null|"[^"]*"|\d+)\s*)*}?\s*$/, "");
      const summary = body
        .replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t")
        .replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
      if (summary.length > 0) return { done: done || true, summary };
    }
  } catch { /* ignore */ }
  return null;
}

// 判斷「這段 summary 其實是沒 parse 成功的 raw decision JSON」（含 thought/done/summary 欄位）
// → 別把整包 JSON 丟給使用者看，改用 finalizeFromHistory 乾淨重產。
function looksLikeRawDecisionJson(s: string): boolean {
  const h = (s ?? "").trim().slice(0, 400);
  if (!h.startsWith("{")) return false;
  return /"(thought|done|tool|summary)"\s*:/.test(h);
}

const PLANNER_SYSTEM = `你是 AI 島的行動代理（Agent）核心。你會被交付一個目標，要一步一步用「工具」把它完成。

規則：
- 每一步只回**一個** JSON 物件、不要多餘文字、不要 markdown。
- 想用工具：{"thought":"你這步要做什麼、為什麼","tool":"工具名","args":{...}}
- 覺得目標已完成、或無法再進行：{"thought":"...","done":true,"summary":"給使用者的最終中文回覆（含你查到的重點）"}
- 只能用下面清單裡的工具。args 要符合該工具的參數。
- 唯讀(read)工具會自動執行；write/dangerous 工具會先請使用者確認，被拒就換做法或收尾。
- 若某工具回「需桌面助手（Phase 1b 尚未接）」，代表本機能力還沒接上，請據此收尾說明、不要硬試同一個。
- **先判斷要不要上網（很重要）**：一般常識/建議/寫作類問題（例：美食推薦、解釋概念、給點子），你**直接用自己的知識回答就好**、第一步就 done，別上網——那樣比使用者自己問 GPT 還慢還爛。**只有**需要「即時/在地/最新/具體數字（今天截止日、現在價格、最新公告）」或要動使用者的東西時，才用工具查/做。
- **研究要深、但別重複（重要）**：
  - 需要多來源/詳細的研究，**優先用 web.research**（一次平行抓多個來源、自動去重）而不是一個個 web.fetch——又快又完整。
  - **絕不重複**同一個搜尋或同一個網址；看到 result 標「repeated」就換**不同角度/關鍵字**，而不是重抓同一頁。
  - **深度要夠**：把來源裡的**具體資訊**（地址/營業時間/價格/評價/數字/來源連結）整理進答案，別只給空泛清單。覆蓋不夠就換角度再研究。
  - 只有搜尋**連續回空（被來源擋）**時才用手上資料收尾。
  - done 的 summary 用清楚的 Markdown（標題/清單/粗體）、資訊具體、附上來源連結。
- **產出型目標的 summary＝成品本身（超重要）**：如果目標是「寫/生成一份東西」（文案、文章、貼文、Email、程式碼、履歷、清單、企劃…），done 的 summary **必須是那份完整成品的全文、逐字放進來**，不是「已完成」「文案亮點：…」這種描述或摘要。使用者要的是**成品**、不是介紹。若你用工具（如 ai.ask）生了內容，就把工具回傳的**完整內容**原封不動放進 summary（可再潤飾，但不可只描述或砍內容）。`;

// L1 拆解引擎：把目標拆成 1-6 個有明確產出的子任務（簡單目標→單一項）。免費模型即可。
async function decompose(goal: string, priorContext = "", freeModel = PLANNER_STRONG): Promise<string[]> {
  try {
    const system = "你是任務規劃師。把使用者目標拆成 1-6 個可獨立完成、有明確產出的子任務（越少越好；簡單目標就回單一項、別硬拆）。只回 JSON 字串陣列、繁體中文、每項一句。";
    const user = `${priorContext ? priorContext + "\n\n" : ""}目標：${goal}\n\n只回 JSON 陣列。`;
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 400, defaultModel: freeModel });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("["), e = t.lastIndexOf("]");
    if (s === -1 || e === -1) return [goal];
    const arr = JSON.parse(t.slice(s, e + 1));
    const items = Array.isArray(arr) ? arr.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 6) : [];
    return items.length ? items : [goal];
  } catch { return [goal]; }
}

async function planNext(goal: string, history: StepRow[], skill?: SkillCtx, extraTools: AgentTool[] = [], priorContext = "", plan: string[] = [], freeModel = PLANNER_STRONG, webCalls = 0, strongModel?: string): Promise<Decision | null> {
  const hist = history.map((s) =>
    `#${s.idx} ${s.toolName ?? "?"}(${JSON.stringify(s.args ?? {})}) → ${s.ok ? "ok" : "fail"}: ${JSON.stringify(s.result ?? {}).slice(0, 400)}`
  ).join("\n") || "（尚無步驟）";
  const system = skill?.prompt ? `${PLANNER_SYSTEM}\n\n【本次技能設定】${skill.prompt}` : PLANNER_SYSTEM;
  const toolsDesc = describeToolList(effectiveTools(skill?.allowedTools, extraTools));
  const toolsBlock = toolsDesc || "（本技能不使用任何工具。請直接依『目標』與技能設定，用一則 {\"done\":true,\"summary\":\"...\"} 回覆完整答案。）";
  // Phase A/C：延續脈絡（長期記憶 + 本串先前回合）由 API 端組好、這裡原樣注入
  const priorBlock = priorContext ? `${priorContext}\n\n` : "";
  // L1：任務計畫（子任務 checklist）。逐項完成、全部完成才 done。
  const planBlock = plan.length > 1
    ? `【任務計畫】請依序完成下列每一項，全部做完才回 done（還有沒完成的項就繼續、別提早 done）：\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n`
    : "";
  // 蒐集夠了就別再查（省 API、避免「爬一堆結果只出一條」）：查越多、越該收尾。
  const enoughBlock = webCalls >= 4
    ? `\n【重要】你已經上網查了 ${webCalls} 次、資料已經很多了。除非還缺**某個關鍵的具體數字**（否則答不了），這一步請直接回 {"done":true,"summary":"..."}，並把上面查到的**所有具體店名/地址/營業時間/價格/來源連結**整理成一份完整、分類清楚的 Markdown 答案。不要再重複搜尋類似的關鍵字。\n`
    : "";
  const user = `${priorBlock}${planBlock}這次目標：${goal}
${enoughBlock}
可用工具：
${toolsBlock}

目前進度：
${hist}

請只回下一步的 JSON。`;
  // 免費模型先跑（成本≈0）；沒回有效 JSON → 找外援：升級到較強模型再試一次
  // maxTokens 放寬：done 的產出型 summary（完整指南/文件/程式碼）常很長，太小會被截斷 →
  // JSON 收不了尾、parse 失敗 → 整包 raw JSON 被當答案顯示（214/216/217）。
  let res = await completeForUsage("agent_core", { system, user, maxTokens: 3000, defaultModel: freeModel });
  let d = parseDecision(res.text);
  if (!d) {
    const strong = strongModel ?? await pickStrongModel();
    res = await completeForUsage("agent_core", { system, user, maxTokens: 3500, defaultModel: strong });
    d = parseDecision(res.text);
  }
  // 還是沒 JSON、但模型直接寫了像樣的答案 → 別因格式整個失敗，把它當最終回覆。
  // 但若它吐的是「思考草稿」就別採用 → 回 null，讓外層用乾淨的 finalizeFromHistory 重新合成。
  if (!d) {
    const t = sanitizeAnswer(res.text);
    if (t.length > 40 && !looksLikeReasoning(t.slice(0, 200))) d = { done: true, summary: t };
  }
  return d;
}

// 需要升級時用的可靠強模型（Haiku 確定活著）。免費優先由 pickFreeModel 動態挑「還活著的最便宜模型」。
const PLANNER_STRONG = "claude-haiku-4-5-20251001";

// 上網類工具（會吃搜尋額度/時間）。查滿 WEB_HARD_CAP 次就強制用手上資料收尾、不再燒 API。
const WEB_TOOLS = new Set(["web.search", "web.research", "web.fetch", "browser.render"]);
const WEB_HARD_CAP = 7;

// 免費優先：從 active 模型挑最便宜的 low/mid（被下架的已被 model-health 自動停用 → 挑到的都活著）。
// 挑不到就退回 Haiku。每個任務解析一次即可。
async function pickFreeModel(): Promise<string> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("ai_models")
      .select("model_name, cost_output_per_1m")
      .eq("is_active", true).in("tier", ["low", "mid"])
      .order("cost_output_per_1m", { ascending: true }).limit(1);
    return data?.[0]?.model_name || PLANNER_STRONG;
  } catch { return PLANNER_STRONG; }
}

// 找外援：出問題/要品質時，挑「還活著的最強模型」（high tier；被下架的已由 model-health 停用；沒有就退 Haiku）。
async function pickStrongModel(): Promise<string> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("ai_models")
      .select("model_name, cost_output_per_1m")
      .eq("is_active", true).eq("tier", "high")
      .order("cost_output_per_1m", { ascending: true }).limit(1);
    return data?.[0]?.model_name || PLANNER_STRONG;
  } catch { return PLANNER_STRONG; }
}

// L3 反思：done 前的驗收員——判斷目標/計畫是否真達標。寬鬆（核心達成就 ok），免費模型即可。
async function critique(goal: string, plan: string[], history: StepRow[], summary: string, freeModel = PLANNER_STRONG): Promise<{ ok: boolean; missing?: string } | null> {
  try {
    const hist = history.map((s) => `#${s.idx} ${s.toolName ?? "?"} → ${s.ok ? "ok" : "fail"}`).join("\n") || "（無）";
    const system = "你是嚴格但務實的驗收員。判斷『目標與計畫是否真的完成、最終答案是否達標』。寬鬆一點：只要核心目標達成就算 ok、別吹毛求疵。只回 JSON：{\"ok\":true} 或 {\"ok\":false,\"missing\":\"還缺什麼、下一步該做什麼（一句、繁中）\"}。";
    const user = `目標：${goal}\n計畫：\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n進度：\n${hist}\n\n最終答案：${summary}\n\n只回 JSON。`;
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 200, defaultModel: freeModel });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s === -1 || e === -1) return null;
    const o = JSON.parse(t.slice(s, e + 1));
    return { ok: o.ok !== false, missing: o.missing ? String(o.missing).slice(0, 200) : undefined };
  } catch { return null; }
}

// 判斷網頁內容是不是被擋（captcha / cloudflare / 驗證頁）→ 不算有效來源，別餵給合成、也別重試。
function isBlockedText(s: string): boolean {
  const t = (s || "").toLowerCase();
  return /just a moment|enable javascript|human verification|solving a captcha|captcha puzzle|attention required|performance & security by cloudflare|too many req|unable to access|not a robot|whaleguard|wikimedia error/.test(t);
}

// 把一個步驟的觀察轉成「給最終合成用的具體證據」：保留店名/地址/價格/來源，丟掉被擋頁與重複沿用。
function stepEvidence(s: StepRow): string {
  if (!s.ok || !s.result) return "";
  const r: any = s.result;
  if (r.repeated) return "";  // 去重沿用的、原始那筆已在別處
  // web.search → 每筆 title+snippet（店名/價格/地址常在 snippet）
  if (Array.isArray(r.results)) {
    const items = r.results
      .filter((x: any) => !isBlockedText(`${x?.title} ${x?.snippet}`))
      .map((x: any) => `- ${x.title}｜${x.snippet}｜${x.url}`).join("\n");
    return items ? `【搜尋：${r.query ?? ""}】\n${items}` : "";
  }
  // web.research → 每個來源的正文（截長）
  if (Array.isArray(r.sources)) {
    const items = r.sources
      .filter((x: any) => !isBlockedText(`${x?.title} ${x?.text}`))
      .map((x: any) => `- ${x.title}（${x.url}）\n  ${String(x.text ?? "").slice(0, 900)}`).join("\n");
    return items ? `【研究：${r.query ?? ""}】\n${items}` : "";
  }
  // web.fetch / browser.render → 正文
  if (typeof r.text === "string") {
    if (isBlockedText(r.text)) return "";
    return `【網頁：${r.title ?? ""}】\n${String(r.text).slice(0, 1200)}`;
  }
  if (typeof r.answer === "string") return `【已生成的成品（原文，最終答案請完整保留）】\n${String(r.answer).slice(0, 8000)}`;
  return `【${s.toolName ?? "?"}】${JSON.stringify(r).slice(0, 300)}`;
}

// 用目前進度合成「最好的最終答案」（步數用盡 / 規劃卡住 / 蒐集夠了）。把具體資料完整帶進去、禁止編造。
const FINALIZE_SYSTEM = `你是 AI 島的行動代理。根據下面「已蒐集的資料」，直接給使用者最完整、最具體的繁體中文最終答案。
規則：
- **直接輸出答案本身**：第一行就是答案的 Markdown 內容。**嚴禁**任何思考過程、分析、前言或後設說明——絕對不要出現「The user wants」「I need to」「Let's scan」「Source 1」「我需要」「首先我」這類字句。
- 把資料裡出現的**每一個**具體項目（店名/地址/營業時間/價格/評價/數字/來源連結）都整理進答案，不要只給空泛清單。
- **只能用資料裡真的出現的內容**，絕對不要自己編造店名、地址或價格；資料沒有就別寫、寧可少列也別亂編。
- 被擋頁/驗證頁/與目標無關的內容一律忽略。
- 用清楚的 Markdown（標題 + 表格或清單 + 粗體），分類清楚、附上來源連結。
- **若資料裡標「已生成的成品（原文…）」**：那就是要交付的東西，請把它**完整呈現/原文輸出**（可潤飾排版，但不可只摘要、不可砍內容、不可只寫「已完成」）。使用者要成品本身、不是介紹。
- 不要回 JSON、不要再要求用工具、不要說「建議你自己去查」。`;

async function finalizeFromHistory(goal: string, history: StepRow[], strongModel?: string): Promise<string> {
  try {
    const evidence = history.map(stepEvidence).filter(Boolean).join("\n\n").slice(0, 14000)
      || "（沒有可用資料）";
    const user = `目標：${goal}\n\n已蒐集的資料：\n${evidence}\n\n請直接給最終答案（第一行就是 Markdown、不要任何思考過程）：`;
    const best = strongModel ?? await pickStrongModel();  // 先用最強模型、品質優先（省錢模式會傳便宜模型進來）
    let out = sanitizeAnswer((await completeForUsage("agent_core", { system: FINALIZE_SYSTEM, user, maxTokens: 2600, defaultModel: best })).text);
    // 若強模型把「思考草稿」當答案吐出來（reasoning 模型常見）或幾乎沒內容 → 用穩定、聽話的 Haiku 乾淨重產一次
    if (!out || out.length < 40 || looksLikeReasoning(out.slice(0, 200))) {
      out = sanitizeAnswer((await completeForUsage("agent_core", { system: FINALIZE_SYSTEM, user, maxTokens: 2600, defaultModel: PLANNER_STRONG })).text);
    }
    return out;
  } catch { return ""; }
}

// ===== L5 平行多代理 =====
// 唯讀工具白名單：子代理只查、不寫、不動裝置 → 平行跑很安全（不需審批）。
const READONLY_TOOLS = TOOLS.filter((t) => t.risk === "read" && !t.needsDevice).map((t) => t.name);

// 跑一個「子代理」：對單一子任務做有上限的唯讀研究，回它的小結。無審批、無裝置。
async function runSubAgent(subGoal: string, userId: string, freeModel: string, taskId: string, maxSteps = 5, strongModel?: string): Promise<{ goal: string; summary: string }> {
  const history: StepRow[] = [];
  const doneCalls = new Map<string, ToolResult>();
  const subSkill: SkillCtx = { allowedTools: READONLY_TOOLS };  // 只給唯讀工具
  for (let i = 0; i < maxSteps; i++) {
    const webCalls = history.filter((s) => WEB_TOOLS.has(s.toolName ?? "")).length;
    if (webCalls >= 4) break;  // 子任務更省 API
    const decision = await planNext(subGoal, history, subSkill, [], "", [], freeModel, webCalls, strongModel);
    if (!decision) break;
    if (decision.done || !decision.tool) {
      const s = sanitizeAnswer(decision.summary ?? "");
      if (s && !looksLikeRawDecisionJson(s) && !looksLikeReasoning(s.slice(0, 200))) return { goal: subGoal, summary: s };
      break;
    }
    const tool = getTool(decision.tool);
    if (!tool || tool.needsDevice || tool.risk !== "read" || !READONLY_TOOLS.includes(tool.name)) {
      history.push({ idx: i, toolName: decision.tool, ok: false, result: { error: "子代理只能用唯讀工具，換一個或收尾" } });
      continue;
    }
    const callKey = `${tool.name}:${JSON.stringify(decision.args ?? {})}`;
    let result: ToolResult;
    if (doneCalls.has(callKey)) {
      const c = doneCalls.get(callKey)!;
      result = { ok: c.ok, data: { repeated: true, note: "重複、已沿用上次", previous: c.data }, error: c.error };
    } else {
      try { result = await tool.execute(decision.args ?? {}, { userId, taskId }); }
      catch (e: any) { result = { ok: false, error: e?.message ?? "工具例外" }; }
      doneCalls.set(callKey, result);
    }
    history.push({ idx: i, toolName: tool.name, args: decision.args, ok: result.ok, result: result.ok ? result.data : { error: result.error } });
  }
  const summary = await finalizeFromHistory(subGoal, history, strongModel);
  return { goal: subGoal, summary };
}

// 把多個子代理的小結合併成一份完整、去重、有條理的最終答案。
async function mergeSubResults(goal: string, results: { goal: string; summary: string }[], strongModel?: string): Promise<string> {
  const parts = results.filter((r) => r.summary).map((r) => `## ${r.goal}\n${r.summary}`).join("\n\n").slice(0, 14000);
  if (!parts) return "";
  const best = strongModel ?? await pickStrongModel();
  return sanitizeAnswer((await completeForUsage("agent_core", {
    system: "你是總彙整員。下面是幾個子任務各自的研究結果。合併成一份給使用者的完整、有條理、不重複的繁體中文最終答案（Markdown）。保留所有具體資訊與來源連結、去掉重覆、第一行就是答案本身、不要任何思考過程。",
    user: `總目標：${goal}\n\n各子任務結果：\n${parts}\n\n請合併成最終答案：`,
    maxTokens: 2600, defaultModel: best,
  })).text);
}

// Phase B：本機步驟遇到「電腦沒開」→ 輪詢等桌面助手上線（雲端步驟不受影響、早已能跑）。
// 回上線的 device，或 null（逾時/取消）。
async function waitForDevice(userId: string, taskId: string, timeoutMs = 300_000) {
  const admin = createSupabaseAdmin();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data: t } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
    if (t?.status === "cancelled") return null;
    const device = await getOnlineDevice(userId);
    if (device) return device;
  }
  return null;
}

// Phase C：從完成的回合抽取「關於使用者的持久事實」，upsert 進 agent_memory（跨對話記得你）。
// 便宜 haiku 一次；抽不到就跳過。fire-and-forget、不擋主流程。
async function extractMemory(userId: string, goal: string, summary: string, threadId?: string | null) {
  try {
    const system = `你是記憶抽取器。從一段「使用者目標 + 分身回覆」中，抽出關於**使用者本人**的持久事實（之後別的對話也用得到的），例如受眾、常用平台、語氣偏好、擁有的作品/專案、技能、長期目標。
只回 JSON 陣列，每項 {"kind":"fact|preference|skill|project|goal","key":"短鍵(如 受眾/常用平台/語氣)","value":"值"}。
規則：只抽「跨對話仍成立」的穩定事實；一次性任務內容不要抽。沒有就回 []。最多 4 條。`;
    const user = `使用者目標：${goal}\n分身回覆：${summary.slice(0, 800)}\n\n只回 JSON 陣列。`;
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 300, defaultModel: "claude-haiku-4-5-20251001" });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("["), e = t.lastIndexOf("]");
    if (s === -1 || e === -1) return;
    const items = JSON.parse(t.slice(s, e + 1));
    if (!Array.isArray(items) || items.length === 0) return;
    const admin = createSupabaseAdmin();
    const rows = items
      .filter((i: any) => i && i.key && i.value)
      .slice(0, 4)
      .map((i: any) => ({
        user_id: userId,
        kind: ["fact", "preference", "skill", "project", "goal"].includes(i.kind) ? i.kind : "fact",
        key: String(i.key).slice(0, 60),
        value: String(i.value).slice(0, 400),
        source_thread_id: threadId ?? null,
        updated_at: new Date().toISOString(),
      }));
    if (rows.length) await admin.from("agent_memory").upsert(rows, { onConflict: "user_id,kind,key" });
  } catch { /* 記憶抽取失敗不影響任務 */ }
}

// 等前端決定 approval（輪詢 DB）；回 true=approved / false=denied 或逾時/取消。
async function waitForApproval(approvalId: string, taskId: string, timeoutMs = 300_000): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await admin.from("agent_approvals").select("decision").eq("id", approvalId).single();
    if (data?.decision === "approved") return true;
    if (data?.decision === "denied") return false;
    const { data: t } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
    if (t?.status === "cancelled") return false;
  }
  return false;
}

// Phase 2b：背景執行——任務不綁 HTTP 連線，關掉頁面也照跑。
// Zeabur 是長駐 node server，detached promise 會續跑；步驟寫進 DB、關鍵時刻推播、前端靠輪詢觀看。
const RUNNING = new Set<string>();
// LINE 回報：LINE 發起的任務（thread 標題前綴「📱 LINE」）完成後把結果推回使用者 LINE。
async function notifyLineIfFromLine(taskId: string, userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: task } = await admin.from("agent_tasks").select("status, result, error, thread_id").eq("id", taskId).maybeSingle();
  if (!task?.thread_id) return;
  if (!["succeeded", "failed", "cancelled"].includes(String(task.status))) return;  // 還在等確認/裝置 → 先不推
  const { data: th } = await admin.from("agent_threads").select("title").eq("id", task.thread_id).maybeSingle();
  if (!String((th as any)?.title ?? "").startsWith("📱 LINE")) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const summary = task.status === "succeeded"
    ? String((task.result as any)?.summary ?? "完成")
    : `任務未完成：${task.error ?? "失敗"}`;
  const head = task.status === "succeeded" ? "分身島完成任務" : "分身島任務結束";
  const { notifyUserLine } = await import("@/lib/notify-user-line");
  const { buildSimpleCard } = await import("@/lib/line-flex");
  const doneCard = buildSimpleCard({
    emoji: "🤖",
    title: head,
    accentColor: task.status === "succeeded" ? "#22c55e" : "#ef4444",
    body: summary.slice(0, 1500),
    buttons: [{ label: "📄 看完整結果", uri: `${site}/agent?task=${taskId}`, primary: true }],
  });
  await notifyUserLine({ userId, category: "agent", text: `🤖 ${head}\n\n${summary.slice(0, 1500)}\n\n看完整：${site}/agent?task=${taskId}`, flex: doneCard });
}

// LINE 發起的任務需要批准時→推 LINE 一張帶「允許/取消」postback 按鈕的卡（守紅線：對外動作在 LINE 也能一鍵放行）。
async function notifyApprovalToLine(userId: string, taskId: string, approvalId: string, toolName: string, summary: Record<string, string>): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: task } = await admin.from("agent_tasks").select("thread_id").eq("id", taskId).maybeSingle();
  if (!task?.thread_id) return;
  const { data: th } = await admin.from("agent_threads").select("title").eq("id", task.thread_id).maybeSingle();
  if (!String((th as any)?.title ?? "").startsWith("📱 LINE")) return;
  const lines = Object.entries(summary ?? {}).slice(0, 4).map(([k, v]) => `${k}：${v}`).join("\n");
  const { notifyUserLine } = await import("@/lib/notify-user-line");
  const { buildSimpleCard } = await import("@/lib/line-flex");
  const flex = buildSimpleCard({
    emoji: "🔐", title: "分身島需要你確認", accentColor: "#f59e0b",
    body: `要執行：${toolName}${lines ? `\n${lines}` : ""}\n\n這是會對外/寫入的動作，允許才做。`,
    buttons: [
      { label: "✅ 允許", postback: `action=agent_approve&id=${approvalId}&d=approved`, displayText: "已允許 ✅", primary: true },
      { label: "❌ 取消", postback: `action=agent_approve&id=${approvalId}&d=denied`, displayText: "已取消 ❌" },
    ],
  });
  await notifyUserLine({ userId, category: "agent", text: `🔐 分身島需要你確認：${toolName}（在 LINE 按鈕或網站放行）`, flex });
}

export type CostMode = "saver" | "balanced" | "quality";

export function runAgentTaskDetached(taskId: string, userId: string, goal: string, maxSteps = 40, skill?: SkillCtx, extraTools?: AgentTool[], priorContext = "", costMode: CostMode = "balanced"): void {
  if (RUNNING.has(taskId)) return;
  RUNNING.add(taskId);
  (async () => {
    // 動態工具：沒帶就自動載入使用者啟用的 MCP server 工具（背景進行、不擋 POST 回應）
    const dyn = extraTools ?? await loadUserMcpTools(userId).catch(() => []);
    // 事件在 runAgentTask 內就已落 DB + 推播；這裡只需把 generator 跑到底、不需消費事件。
    try { for await (const _ev of runAgentTask(taskId, userId, goal, maxSteps, skill, dyn, priorContext, costMode)) { void _ev; } }
    catch { /* runAgentTask 自身的 try/catch 已把任務標成 failed */ }
    finally { RUNNING.delete(taskId); }
    // 若此任務來自 LINE（thread 標題前綴「📱 LINE」）→ 完成後把結果推回使用者的 LINE。
    await notifyLineIfFromLine(taskId, userId).catch(() => {});
  })();
}

/** 跑一個任務，吐事件流。extraTools = 動態工具（如 MCP）；priorContext = 本串先前對話（Phase A 對話延續）。 */
export async function* runAgentTask(taskId: string, userId: string, goal: string, maxSteps = 40, skill?: SkillCtx, extraTools: AgentTool[] = [], priorContext = "", costMode: CostMode = "balanced"): AsyncGenerator<AgentEvent> {
  const admin = createSupabaseAdmin();
  const history: StepRow[] = [];
  const doneCalls = new Map<string, ToolResult>();  // 去重：同一個 (工具+參數) 只真的做一次
  // 本回合結束時要更新對話串 last_message_at + 寫 turn_summary
  const bumpThread = async (summary: string) => {
    await admin.from("agent_tasks").update({ turn_summary: summary.slice(0, 600) }).eq("id", taskId);
    const { data: t } = await admin.from("agent_tasks").select("thread_id").eq("id", taskId).maybeSingle();
    if (t?.thread_id) await admin.from("agent_threads").update({ last_message_at: new Date().toISOString() }).eq("id", t.thread_id);
  };
  const setStatus = async (status: string, patch: Record<string, unknown> = {}) => {
    await admin.from("agent_tasks").update({ status, ...patch }).eq("id", taskId);
  };

  yield { type: "status", status: "planning" };
  await setStatus("running");

  // 省錢模式三檔：
  //   saver   = 全程用便宜模型、連「升級/收尾」都不換貴的（strongModel = freeModel）
  //   balanced= 免費優先、需要時才升級到強模型（＝原本行為）
  //   quality = 一開始就用強模型跑整個 loop
  const freeModel = costMode === "quality" ? await pickStrongModel() : await pickFreeModel();
  const strongModel = costMode === "saver" ? freeModel : await pickStrongModel();
  // L1 拆解引擎：先把目標拆成計畫（存 DB 給 UI 顯示），再逐項執行
  const plan = await decompose(goal, priorContext, freeModel);
  await admin.from("agent_tasks").update({ plan, plan_done: [] }).eq("id", taskId);
  let critiques = 0;  // L3：done 前反思次數上限（避免無限/燒錢）

  // L5 平行多代理：夠大的純研究任務（計畫 >=3 項、非技能限定、無外掛工具）→ 派多個子代理同時查、再彙整。
  // decompose 產的是「可獨立完成」的子任務，故適合平行；比一步步跑快很多。彙整失敗才落回序列流程。
  const canParallel = plan.length >= 3 && !skill && extraTools.length === 0;
  if (canParallel) {
    try {
      yield { type: "thought", idx: 0, thought: `這任務較大，派 ${plan.length} 個子代理同時去查，再幫你彙整。` };
      const results = await Promise.all(plan.map((sub) => runSubAgent(sub, userId, freeModel, taskId, 5, strongModel).catch(() => ({ goal: sub, summary: "" }))));
      let pIdx = 0;
      for (const r of results) {
        const row: StepRow = { idx: pIdx, thought: `子代理：${r.goal}`, toolName: "subagent", ok: !!r.summary, result: { goal: r.goal, summary: r.summary.slice(0, 600) } };
        history.push(row);
        await admin.from("agent_steps").insert({ task_id: taskId, idx: pIdx, thought: row.thought, tool_name: "subagent", args: { goal: r.goal }, result: row.result, ok: !!r.summary });
        yield { type: "step", step: row };
        pIdx++;
      }
      await admin.from("agent_tasks").update({ step_count: pIdx, plan_done: plan }).eq("id", taskId);
      const merged = await mergeSubResults(goal, results, strongModel);
      if (merged) {
        await setStatus("succeeded", { result: { summary: merged }, step_count: pIdx, finished_at: new Date().toISOString() });
        await bumpThread(merged);
        extractMemory(userId, goal, merged).catch(() => {});
        pushSafe(userId, "✅ Agent 完成任務", merged, taskId, `agent-done-${taskId}`);
        yield { type: "done", status: "succeeded", summary: merged };
        return;
      }
      // 彙整不出東西 → 清掉平行的 step（避免與序列流程 idx 撞）＋記憶體，落回下面的序列流程重跑
      await admin.from("agent_steps").delete().eq("task_id", taskId);
      history.length = 0;
    } catch {
      await admin.from("agent_steps").delete().eq("task_id", taskId).then(() => {}, () => {});
      history.length = 0;  // 平行失敗 → 落回序列流程
    }
  }

  try {
    for (let idx = 0; idx < maxSteps; idx++) {
      // 取消？
      const { data: cur } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
      if (cur?.status === "cancelled") { yield { type: "done", status: "cancelled", summary: "任務已取消" }; return; }

      // 蒐集夠了就強制收尾：查越多越浪費 API（尤其 Brave 有月額度）。web 類工具用滿硬上限 → 直接用手上資料合成。
      const webCalls = history.filter((s) => WEB_TOOLS.has(s.toolName ?? "")).length;
      if (webCalls >= WEB_HARD_CAP) {
        const finalAns = await finalizeFromHistory(goal, history, strongModel);
        if (finalAns) {
          await setStatus("succeeded", { result: { summary: finalAns }, step_count: idx, finished_at: new Date().toISOString() });
          await bumpThread(finalAns);
          extractMemory(userId, goal, finalAns).catch(() => {});
          pushSafe(userId, "✅ Agent 完成任務", finalAns, taskId, `agent-done-${taskId}`);
          yield { type: "done", status: "succeeded", summary: finalAns };
          return;
        }
      }

      const decision = await planNext(goal, history, skill, extraTools, priorContext, plan, freeModel, webCalls, strongModel);
      if (!decision) {
        // 規劃卡住 → 別直接失敗；用目前已查到的東西合成最終答案（找外援用強模型）
        const salvage = history.length ? await finalizeFromHistory(goal, history, strongModel) : "";
        if (salvage) {
          await setStatus("succeeded", { result: { summary: salvage }, step_count: idx, finished_at: new Date().toISOString() });
          await bumpThread(salvage);
          extractMemory(userId, goal, salvage).catch(() => {});
          pushSafe(userId, "✅ Agent 完成任務", salvage, taskId, `agent-done-${taskId}`);
          yield { type: "done", status: "succeeded", summary: salvage };
          return;
        }
        await setStatus("failed", { error: "規劃失敗（模型未回有效 JSON）", finished_at: new Date().toISOString() });
        yield { type: "done", status: "failed", summary: "抱歉，我沒能規劃出下一步。可以把目標講得更具體一點再試。" };
        return;
      }
      if (decision.thought) yield { type: "thought", idx, thought: decision.thought };

      if (decision.done || !decision.tool) {
        let summary = sanitizeAnswer(decision.summary ?? "");
        // 防呆：summary 其實是沒 parse 成功的 raw JSON、或是思考草稿、或幾乎空 → 用手上資料乾淨重產，
        // 別把 {"thought":...,"done":true,"summary":"..."} 整包丟給使用者看（214/216/217 的病灶）。
        if (!summary || looksLikeRawDecisionJson(summary) || looksLikeReasoning(summary.slice(0, 200))) {
          const clean = history.length ? await finalizeFromHistory(goal, history, strongModel) : "";
          summary = clean || sanitizeAnswer(decision.summary ?? "") || "完成。";
        }
        // L3 反思：多步計畫在 done 前驗收；沒達標就回饋、繼續做（最多 2 次，避免無限/燒錢）
        if (plan.length > 1 && critiques < 2) {
          const v = await critique(goal, plan, history, summary, freeModel);
          if (v && v.ok === false && v.missing) {
            critiques++;
            const row: StepRow = { idx, thought: `自我檢查：還沒達標 — ${v.missing}`, toolName: "reflect", ok: true, result: { missing: v.missing } };
            history.push(row);
            await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: "reflect", args: {}, result: row.result, ok: true });
            await admin.from("agent_tasks").update({ step_count: idx + 1 }).eq("id", taskId);
            yield { type: "step", step: row };
            continue;
          }
        }
        await setStatus("succeeded", { result: { summary }, step_count: idx, finished_at: new Date().toISOString() });
        await bumpThread(summary);   // Phase A：把本回合結果留給後續對話當前文
        extractMemory(userId, goal, summary).catch(() => {});   // Phase C：抽取持久事實、跨對話記得你（fire-and-forget）
        pushSafe(userId, "✅ Agent 完成任務", summary, taskId, `agent-done-${taskId}`);
        yield { type: "done", status: "succeeded", summary };
        return;
      }

      const tool = getTool(decision.tool) ?? extraTools.find((t) => t.name === decision.tool);
      const row: StepRow = { idx, thought: decision.thought, toolName: decision.tool, risk: tool?.risk, args: decision.args };
      if (tool && !toolAllowed(tool.name, skill?.allowedTools)) {
        row.ok = false; row.result = { error: `此技能不允許使用工具 ${tool.name}` };
        history.push(row);
        await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: tool.name, args: decision.args ?? {}, result: row.result, ok: false });
        yield { type: "step", step: row };
        continue;
      }
      if (!tool) {
        row.ok = false; row.result = { error: `未知工具 ${decision.tool}` };
        history.push(row);
        await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: decision.tool, args: decision.args ?? {}, result: row.result, ok: false });
        yield { type: "step", step: row };
        continue;
      }

      // 權限：write / dangerous → 建 approval、暫停等使用者
      if (needsApproval(tool.risk)) {
        const summary = approvalSummary(tool, decision.args);
        const { data: appr } = await admin.from("agent_approvals")
          .insert({ task_id: taskId, user_id: userId, step_idx: idx, tool_name: tool.name, risk: tool.risk, summary })
          .select("id").single();
        await setStatus("awaiting_approval");
        pushSafe(userId, "🤖 Agent 需要你確認", `${tool.name}：${goal}`, taskId, `agent-appr-${taskId}`);
        notifyApprovalToLine(userId, taskId, appr!.id, tool.name, summary).catch(() => {});  // LINE 發起的任務→推 LINE 按鈕批准
        yield { type: "approval", approval: { id: appr!.id, toolName: tool.name, risk: tool.risk, summary } };
        const ok = await waitForApproval(appr!.id, taskId);
        await setStatus("running");
        if (!ok) {
          row.ok = false; row.result = { error: "使用者未同意此動作（或逾時/取消）" };
          history.push(row);
          await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: tool.name, risk: tool.risk, args: decision.args ?? {}, result: row.result, ok: false });
          yield { type: "step", step: row };
          continue;
        }
      }

      // 執行：需本機的工具走桌面助手 Bridge（佇列+輪詢）；其餘伺服器端直接跑
      // 去重：同一個 (工具+參數) 已做過 → 直接沿用上次結果、不重打網路（省時間/token、避免被來源擋）
      const callKey = `${tool.name}:${JSON.stringify(decision.args ?? {})}`;
      let result: ToolResult;
      if (doneCalls.has(callKey)) {
        const cached = doneCalls.get(callKey)!;
        result = { ok: cached.ok, data: { repeated: true, note: "這個呼叫和先前重複、已沿用上次結果。請換關鍵字/換工具，或資訊夠了就 done。", previous: cached.data }, error: cached.error };
      } else try {
        if (tool.needsDevice) {
          let device = await getOnlineDevice(userId);
          if (!device) {
            // Phase B：電腦沒開 → 標記等待、推播、輪詢等它上線（雲端步驟早已完成、不受影響）
            await setStatus("awaiting_device");
            pushSafe(userId, "🖥️ 分身在等你的電腦上線", `這步需要桌面助手：${tool.name}`, taskId, `agent-dev-${taskId}`);
            yield { type: "status", status: "awaiting_device" };
            device = await waitForDevice(userId, taskId);
            await setStatus("running");
          }
          if (!device) {
            result = { ok: false, error: "這步需要你的電腦（桌面助手），但它一直沒上線。能在雲端做的部分我已先完成；等電腦上線後可重跑這步。" };
          } else {
            result = await dispatchToDevice(taskId, userId, device.id, idx, tool.name, decision.args ?? {});
          }
        } else {
          result = await tool.execute(decision.args ?? {}, { userId, taskId });
        }
      } catch (e: any) { result = { ok: false, error: e?.message ?? "工具執行例外" }; }
      if (!doneCalls.has(callKey)) doneCalls.set(callKey, result);  // 記起來、下次同呼叫直接沿用
      row.ok = result.ok; row.result = result.ok ? result.data : { error: result.error };
      history.push(row);
      await admin.from("agent_steps").insert({
        task_id: taskId, idx, thought: row.thought, tool_name: tool.name, risk: tool.risk,
        args: decision.args ?? {}, result: row.result, ok: result.ok, verified: result.ok,
      });
      await admin.from("agent_tasks").update({ step_count: idx + 1 }).eq("id", taskId);
      yield { type: "step", step: row };
    }

    // 達到步數上限 → 不要直接失敗，用目前進度合成「最好的最終答案」給使用者（例如已查到的美食清單）
    const finalAns = await finalizeFromHistory(goal, history, strongModel);
    if (finalAns) {
      await setStatus("succeeded", { result: { summary: finalAns }, step_count: maxSteps, finished_at: new Date().toISOString() });
      await bumpThread(finalAns);
      extractMemory(userId, goal, finalAns).catch(() => {});
      pushSafe(userId, "✅ Agent 完成任務", finalAns, taskId, `agent-done-${taskId}`);
      yield { type: "done", status: "succeeded", summary: finalAns };
      return;
    }
    await setStatus("failed", { error: "步數用盡且無可用結果", finished_at: new Date().toISOString() });
    yield { type: "done", status: "failed", summary: "這個任務比較複雜、我還沒完成。可以把目標拆小一點再試。" };
  } catch (e: any) {
    await setStatus("failed", { error: e?.message ?? "未知錯誤", finished_at: new Date().toISOString() });
    yield { type: "error", error: e?.message ?? "未知錯誤" };
    yield { type: "done", status: "failed", summary: "任務發生錯誤。" };
  }
}

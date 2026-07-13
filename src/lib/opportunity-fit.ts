// AI 島專屬機會雷達：用規則引擎（非 AI、零成本）幫「AI 島這個專案」對每個機會算適合度分數。
// AI 島 profile：AI 教育 + Agent + SaaS + 創作平台 + 遊戲化 + 社群；有 Demo/課程、pre-revenue。
// 規則權重可調；分數只是相對排序參考、不是保證。

export interface ScorableOpp {
  name?: string | null;
  category?: string | null;
  tags?: string[] | null;
  prize_amount?: number | null;
  is_free?: boolean | null;
  is_online?: boolean | null;
  requires_pitch?: boolean | null;
  requires_demo?: boolean | null;
  requires_business_plan?: boolean | null;
  requires_student?: boolean | null;
  application_deadline?: string | null;
  status?: string | null;
}

// AI 島主題關鍵字（命中越多越相關）
const THEME_WORDS = ["AI", "人工智慧", "教育", "學習", "agent", "代理", "saas", "軟體", "軟體服務", "創業", "創新", "新創", "數位", "網路", "平台", "遊戲化", "社群", "程式", "科技"];

export interface FitResult { score: number; reasons: string[]; blockers: string[] }

export function scoreOpportunity(o: ScorableOpp, nowMs: number): FitResult {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 0;

  if (o.is_free) { score += 25; reasons.push("免報名費"); }

  const hay = `${o.name ?? ""} ${o.category ?? ""} ${(o.tags ?? []).join(" ")}`.toLowerCase();
  const hits = THEME_WORDS.filter((w) => hay.includes(w.toLowerCase()));
  if (hits.length) { score += Math.min(24, 12 + hits.length * 4); reasons.push(`主題相符（${hits.slice(0, 3).join("/")}）`); }

  if (o.requires_pitch === false) { score += 12; reasons.push("初賽免上台"); }
  if (o.is_online) { score += 10; reasons.push("全程線上"); }
  if (o.requires_demo) { score += 8; reasons.push("看重 Demo（我們有）"); }
  if (o.requires_business_plan) { score += 4; reasons.push("需商業計畫（AI 可生成）"); }

  const prize = o.prize_amount ?? 0;
  if (prize >= 1_000_000) { score += 18; reasons.push("百萬級獎金"); }
  else if (prize >= 300_000) { score += 12; reasons.push("高額獎金"); }
  else if (prize >= 50_000) { score += 6; reasons.push("有獎金"); }

  // 截止時程：太近來不及備件扣分、7–45 天甜蜜區加分
  if (o.application_deadline) {
    const dl = Math.ceil((new Date(o.application_deadline + "T23:59:59+08:00").getTime() - nowMs) / 86400_000);
    if (dl < 0) { score -= 100; blockers.push("已截止"); }
    else if (dl < 3) { score -= 8; reasons.push("快截止、要快"); }
    else if (dl <= 45) { score += 5; }
  }

  // 硬性不符：限學生（AI 島不是學生團隊）
  if (o.requires_student) { score -= 40; blockers.push("限學生"); }

  if (o.status === "closed") { score -= 100; blockers.push("已關閉"); }

  return { score, reasons, blockers };
}

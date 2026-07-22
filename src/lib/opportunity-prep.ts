// 機會島 §3.6 —— 依「報名要求」估算準備量 + 產生機會 FAQ（皆規則式、零 AI 成本、可靠）。
// 用機會本身已有的欄位（requires_*、is_free、deadline、eligibility…）推導，不需 LLM。

export interface OppLike {
  is_free?: boolean | null;
  requires_demo?: boolean | null;
  requires_pitch?: boolean | null;
  requires_video?: boolean | null;
  requires_business_plan?: boolean | null;
  requires_team?: boolean | null;
  requires_student?: boolean | null;
  requires_company?: boolean | null;
  application_deadline?: string | null;
  prize_text?: string | null;
  eligibility?: string | null;
  organizer?: string | null;
}

export type PrepLevel = "低" | "中" | "高";

// 每項「重」要求加分，總分決定準備量等級
export function estimatePrepEffort(o: OppLike): { level: PrepLevel; score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;
  const add = (n: number, label: string) => { score += n; factors.push(label); };
  if (o.requires_business_plan) add(3, "要商業計畫書");
  if (o.requires_video) add(2, "要拍影片");
  if (o.requires_demo) add(2, "要可運作 Demo");
  if (o.requires_pitch) add(2, "要上台簡報");
  if (o.requires_team) add(1, "要組隊");
  if (o.requires_company) add(1, "要公司 / 法人文件");
  if (o.requires_student) add(0.5, "要在學證明");
  const level: PrepLevel = score >= 5 ? "高" : score >= 2 ? "中" : "低";
  return { level, score, factors };
}

export const PREP_META: Record<PrepLevel, { emoji: string; hint: string }> = {
  低: { emoji: "🟢", hint: "多半填表 + 簡介就能報，門檻低。" },
  中: { emoji: "🟡", hint: "要準備幾樣作品 / 文件，抓幾天到一兩週。" },
  高: { emoji: "🔴", hint: "要 Demo / 影片 / 計畫書等重裝備，建議提早規劃。" },
};

// 依機會資料自動組出常見問答（規則式、無 AI）
export function buildOpportunityFaq(o: OppLike): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];

  faq.push({
    q: "報名要錢嗎？",
    a: o.is_free === false
      ? "這個機會標示「需報名費」，實際金額請以官網為準。"
      : "標示為免報名費（仍請以官網公告為準）。",
  });

  const idParts: string[] = [];
  if (o.requires_student) idParts.push("限學生 / 在學身分");
  if (o.requires_company) idParts.push("限公司 / 法人 / 團隊");
  faq.push({
    q: "有身分限制嗎？我能報嗎？",
    a: idParts.length
      ? `這個機會${idParts.join("、")}。${o.eligibility ? `資格說明：${o.eligibility}` : "詳細資格以官網為準。"}`
      : (o.eligibility ? `資格說明：${o.eligibility}` : "未特別標註身分限制，一般個人多可報名；仍請以官網資格為準。"),
  });

  const { level, factors } = estimatePrepEffort(o);
  faq.push({
    q: "要準備什麼？大概多花力氣？",
    a: factors.length
      ? `估算準備量：${level}。主要要備：${factors.join("、")}。${PREP_META[level].hint}`
      : `估算準備量：${level}。${PREP_META[level].hint}`,
  });

  if (o.application_deadline) {
    faq.push({
      q: "什麼時候截止？怎麼追蹤？",
      a: `報名截止 ${o.application_deadline}。把它「加入我的航線」就會幫你追蹤截止日、提醒快到期，還能用缺件清單追準備進度。`,
    });
  }

  if (o.prize_text) {
    faq.push({ q: "有什麼獎勵？", a: `${o.prize_text}（實際獎項 / 名額以官網為準）。` });
  }

  faq.push({
    q: "我不知道怎麼開始準備？",
    a: "點頁面下方「丟給分身島幫我準備」，AI 會依這個機會列出文件清單、整理重要日期與待辦、建議你先做的 3 件事（對外動作會先問過你）。",
  });

  return faq;
}

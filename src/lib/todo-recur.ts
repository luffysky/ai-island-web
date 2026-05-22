// Todo 重複規則 parser + 下一個日期計算
// 規則格式（純文字、不裝 cron 套件）：
//   daily              每日
//   weekly:1,3,5       每週一三五（0=日、1=一、...、6=六）
//   monthly:15         每月 15 日
// invalid 規則一律回 null、不丟錯

export type RecurRule =
  | { kind: "daily" }
  | { kind: "weekly"; weekdays: number[] }
  | { kind: "monthly"; day: number };

const WEEKLY_RE = /^weekly:([0-6](?:,[0-6])*)$/;
const MONTHLY_RE = /^monthly:([1-9]|[12][0-9]|3[01])$/;

export function parseRecur(rule: string | null | undefined): RecurRule | null {
  if (!rule) return null;
  const r = rule.trim().toLowerCase();
  if (r === "daily") return { kind: "daily" };
  const w = r.match(WEEKLY_RE);
  if (w) {
    const days = Array.from(new Set(w[1].split(",").map((n) => parseInt(n, 10)))).sort();
    return { kind: "weekly", weekdays: days };
  }
  const m = r.match(MONTHLY_RE);
  if (m) return { kind: "monthly", day: parseInt(m[1], 10) };
  return null;
}

export function nextRecurDate(rule: string | null | undefined, from: Date = new Date()): Date | null {
  const parsed = parseRecur(rule);
  if (!parsed) return null;
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (parsed.kind === "daily") {
    base.setDate(base.getDate() + 1);
    return base;
  }
  if (parsed.kind === "weekly") {
    if (parsed.weekdays.length === 0) return null;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      if (parsed.weekdays.includes(d.getDay())) return d;
    }
    return null;
  }
  if (parsed.kind === "monthly") {
    const d = new Date(base);
    d.setDate(parsed.day);
    if (d <= base) d.setMonth(d.getMonth() + 1);
    // 處理 2/30 之類：實際 day 會 overflow、JS 會自己進位、抓回 endOfMonth
    if (d.getDate() !== parsed.day) {
      d.setDate(0);
    }
    return d;
  }
  return null;
}

export function recurLabel(rule: string | null | undefined): string {
  const parsed = parseRecur(rule);
  if (!parsed) return "不重複";
  if (parsed.kind === "daily") return "每日";
  if (parsed.kind === "weekly") {
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    return "每週 " + parsed.weekdays.map((d) => dayNames[d]).join("、");
  }
  if (parsed.kind === "monthly") return `每月 ${parsed.day} 號`;
  return "不重複";
}

export function isValidRecurRule(rule: string | null | undefined): boolean {
  if (!rule) return true;
  return parseRecur(rule) !== null;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

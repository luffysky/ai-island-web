/**
 * 機會島種子：從 docs/待閱/機會島.md 裡「明確提到」的競賽資料建初始清單。
 * 誠實原則：所有欄位標 source_confidence='unverified'（資料待人工核實），前端顯示「待核實」標記。
 *   —— 不憑空捏造截止日/獎金；沒寫的欄位就留 NULL。
 * 冪等：依 name 先刪再插，可安全重跑。
 * Usage: node scripts/seed-opportunities.mjs   （TODAY 用參數傳，避免腳本內用 Date.now）
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]));
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 今天（用參數，別在腳本裡 new Date()）：node seed-opportunities.mjs 2026-07-12
const TODAY = process.argv[2] || "2026-07-12";
const statusFor = (start, deadline) => {
  if (deadline && deadline < TODAY) return "closed";
  if (start && start > TODAY) return "upcoming";
  return "open";
};

const OPPS = [
  { name: "2026 AI 創新獎（Best AI Awards）", organizer: "經濟部／臺灣相關單位", country: "TW", category: "AI", official_url: "https://www.bestaiawards.com.tw/", prize_text: "企業組最高 300 萬、學生組最高 30 萬（依組別）", prize_amount: 3000000, application_deadline: "2026-07-31", requires_demo: true, requires_pitch: true, tags: ["AI", "創業", "SaaS", "教育科技"] },
  { name: "2026 智慧創新大賞（經濟部）", organizer: "經濟部", country: "TW", category: "AI 應用", official_url: "https://startup.sme.gov.tw/api/viewer/event_detail.php?id=7811", prize_text: "百萬級（依組別）；初賽書審、決賽現場簡報＋Demo", application_start: "2026-01-01", application_deadline: "2026-03-16", requires_demo: true, requires_pitch: true, tags: ["AI", "產業應用", "創新"] },
  { name: "2026 Startup Challenge（國家新創基地）", organizer: "國家新創基地 Startup Terrace", country: "TW", category: "創業", official_url: "https://www.startupterrace.tw/", prize_text: "非純現金：企業媒合、國際曝光、投資機會", application_start: "2026-06-01", requires_pitch: true, tags: ["創業", "商業模式", "MVP"] },
  { name: "RAISE the STAKES 全球 AI Startup Competition", organizer: "RAISE Summit", country: "GLOBAL", category: "AI 創業", official_url: "https://www.raisesummit.com/startup-competition", prize_text: "總資源價值超過 €10M；國際曝光與投資機會", tags: ["AI", "創業", "國際"] },
  { name: "Qualcomm Innovate in Taiwan Challenge 2026", organizer: "Qualcomm", country: "TW", category: "AI／硬體", official_url: "https://www.qualcomm.com/innovate-in-taiwan-challenge", prize_text: "入選可獲培育、技術支援、投資媒合", application_start: "2026-01-01", application_deadline: "2026-03-31", tags: ["AI", "硬體", "新創"] },
  { name: "2026 UAiTED Innovation Competition", organizer: "UAiTED", country: "TW", category: "創新創業", official_url: "https://uaited.ust.edu.tw/", prize_text: "創新與創業競賽，決賽簡報", application_deadline: "2026-09-04", requires_pitch: true, tags: ["創新", "創業", "校園"] },
  { name: "2026 科技新創競賽（Startup Terrace）", organizer: "經濟部／Startup Terrace", country: "TW", category: "創業／AI 轉型", official_url: "https://startup.sme.gov.tw/api/viewer/event_detail.php?id=7979", prize_text: "最高獎勵約 80 萬元；三階段賽制、決賽 Pitch", prize_amount: 800000, requires_pitch: true, tags: ["創業", "AI 轉型", "MVP"] },
  { name: "2026 臺灣數創大賞", organizer: "數位發展相關單位", country: "TW", category: "數位創新", official_url: "https://bigtimes.net/archives/125603", prize_text: "總獎金約 70 萬、金獎約 15 萬", prize_amount: 700000, tags: ["數位服務", "AI 應用"] },
];

const names = OPPS.map((o) => o.name);
const del = await c.query("delete from public.opportunities where name = any($1)", [names]);
console.log(`清掉舊種子 ${del.rowCount} 筆`);

let n = 0;
for (const o of OPPS) {
  await c.query(
    `insert into public.opportunities
      (type, name, organizer, country, category, official_url, description, prize_amount, prize_text,
       application_start, application_deadline, is_free, requires_demo, requires_pitch,
       requires_business_plan, requires_company, requires_student, tags, status, source_confidence)
     values ('competition',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,false,false,false,$13,$14,'unverified')`,
    [o.name, o.organizer, o.country, o.category, o.official_url, o.description ?? null,
     o.prize_amount ?? null, o.prize_text ?? null, o.application_start ?? null, o.application_deadline ?? null,
     !!o.requires_demo, !!o.requires_pitch, o.tags ?? [], statusFor(o.application_start, o.application_deadline)],
  );
  n++;
}
console.log(`✓ 鋪了 ${n} 個機會（皆標 unverified、待人工核實）`);
await c.end();

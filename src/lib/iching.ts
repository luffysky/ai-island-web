/**
 * 易經 / 梅花易數（本地・免費・公有領域）。
 * 64 卦的卦名/卦象/簡卦意是幾千年古文＝public domain，商用無虞（不抄現代白話註解）。
 * 梅花易數起卦：由「年月日時」數字 → 上卦/下卦/動爻（正統先天八卦數規則、本地算）。
 * 卦意為免費簡辭；深解交給 AI（隨需）。＊命理供參考娛樂、不預言吉凶、不掛保證。
 */

// 先天八卦數：1乾 2兌 3離 4震 5巽 6坎 7艮 8坤
export const GUA = ["", "乾☰", "兌☱", "離☲", "震☳", "巽☴", "坎☵", "艮☶", "坤☷"];

type Hex = { name: string; meaning: string };
// 卦查表：key "上,下"（先天數 1-8）→ 卦名 + 簡卦意
const HEX: Record<string, Hex> = {
  "1,1": { name: "乾為天", meaning: "剛健自強、天行不息，宜積極進取。" },
  "1,2": { name: "天澤履", meaning: "如履薄冰、謹慎前行，守禮則安。" },
  "1,3": { name: "天火同人", meaning: "與人同心、志同道合，合作有成。" },
  "1,4": { name: "天雷無妄", meaning: "順其自然、不妄動，守正得吉。" },
  "1,5": { name: "天風姤", meaning: "不期而遇、機緣忽現，慎察來者。" },
  "1,6": { name: "天水訟", meaning: "有爭訟口舌，退一步、以和為貴。" },
  "1,7": { name: "天山遯", meaning: "宜退不宜進，及時抽身保全。" },
  "1,8": { name: "天地否", meaning: "上下不通、暫時閉塞，靜待轉機。" },
  "2,1": { name: "澤天夬", meaning: "果決除弊、當斷則斷，堂堂而行。" },
  "2,2": { name: "兌為澤", meaning: "喜悅和樂、以誠待人，人緣佳。" },
  "2,3": { name: "澤火革", meaning: "改革變動、除舊佈新，順時而變。" },
  "2,4": { name: "澤雷隨", meaning: "順勢而隨、隨機應變，得人相助。" },
  "2,5": { name: "澤風大過", meaning: "負荷過重、非常之時，宜審慎。" },
  "2,6": { name: "澤水困", meaning: "處境困窘，守正待時、莫強求。" },
  "2,7": { name: "澤山咸", meaning: "兩情相感、心有靈犀，感應而通。" },
  "2,8": { name: "澤地萃", meaning: "群聚匯集、人氣旺，宜結眾成事。" },
  "3,1": { name: "火天大有", meaning: "豐收富有、光明盛大，順天得福。" },
  "3,2": { name: "火澤睽", meaning: "意見相左、暫時乖違，求同存異。" },
  "3,3": { name: "離為火", meaning: "光明附麗、熱情外顯，宜依附正道。" },
  "3,4": { name: "火雷噬嗑", meaning: "咬合排除障礙，剛柔並用可通。" },
  "3,5": { name: "火風鼎", meaning: "革故鼎新、穩定安定，成就有望。" },
  "3,6": { name: "火水未濟", meaning: "事未成、尚在途中，持續努力終渡。" },
  "3,7": { name: "火山旅", meaning: "在外行旅、暫居他方，柔順自保。" },
  "3,8": { name: "火地晉", meaning: "如日東升、步步高陞，前程光明。" },
  "4,1": { name: "雷天大壯", meaning: "氣勢壯盛，宜守正、勿恃強冒進。" },
  "4,2": { name: "雷澤歸妹", meaning: "婚嫁歸屬，守分安位、勿越禮。" },
  "4,3": { name: "雷火豐", meaning: "豐大盛滿、如日中天，把握當下。" },
  "4,4": { name: "震為雷", meaning: "震動驚醒、雷厲風行，動中求安。" },
  "4,5": { name: "雷風恆", meaning: "恆久持之以恆，守常則久。" },
  "4,6": { name: "雷水解", meaning: "困境紓解、雨過天青，及時而動。" },
  "4,7": { name: "雷山小過", meaning: "宜小事、不宜大事，謙抑得宜。" },
  "4,8": { name: "雷地豫", meaning: "順動和樂、預備而行，順勢則安。" },
  "5,1": { name: "風天小畜", meaning: "小有積蓄、蓄勢待發，暫且忍耐。" },
  "5,2": { name: "風澤中孚", meaning: "內心誠信、以誠感人，誠則靈。" },
  "5,3": { name: "風火家人", meaning: "家和萬事興，內守正、各安其分。" },
  "5,4": { name: "風雷益", meaning: "損上益下、利於增益，宜行善積。" },
  "5,5": { name: "巽為風", meaning: "謙遜順從、無孔不入，柔能克剛。" },
  "5,6": { name: "風水渙", meaning: "渙散離析，宜聚人心、化險為夷。" },
  "5,7": { name: "風山漸", meaning: "循序漸進、按部就班，穩健有成。" },
  "5,8": { name: "風地觀", meaning: "觀察審視、以靜制動，明察而後動。" },
  "6,1": { name: "水天需", meaning: "耐心等待、時機未到，需而後動。" },
  "6,2": { name: "水澤節", meaning: "節制有度、量力而為，節則亨。" },
  "6,3": { name: "水火既濟", meaning: "事已成、水到渠成，宜守成防變。" },
  "6,4": { name: "水雷屯", meaning: "萬事起頭難，宜穩紮穩打、勿急。" },
  "6,5": { name: "水風井", meaning: "如井養人、恆而不改，宜修德養能。" },
  "6,6": { name: "坎為水", meaning: "重重險陷，唯誠心以對、履險如夷。" },
  "6,7": { name: "水山蹇", meaning: "行路艱難，宜停看、待助而行。" },
  "6,8": { name: "水地比", meaning: "親密比鄰、互助相親，宜擇善而從。" },
  "7,1": { name: "山天大畜", meaning: "厚積大蓄、養精蓄銳，待時大用。" },
  "7,2": { name: "山澤損", meaning: "損己益人、先損後益，捨得有得。" },
  "7,3": { name: "山火賁", meaning: "文飾修飾、內外兼修，質勝於文。" },
  "7,4": { name: "山雷頤", meaning: "頤養身心、慎言節食，養正則吉。" },
  "7,5": { name: "山風蠱", meaning: "積弊待整、除舊振新，宜下手整頓。" },
  "7,6": { name: "山水蒙", meaning: "蒙昧待啟，宜虛心求教、啟蒙開智。" },
  "7,7": { name: "艮為山", meaning: "適時而止、安靜自守，止於所當止。" },
  "7,8": { name: "山地剝", meaning: "剝落衰退，宜守勿進、厚下安宅。" },
  "8,1": { name: "地天泰", meaning: "通泰安康、上下交通，諸事順遂。" },
  "8,2": { name: "地澤臨", meaning: "居上臨下、以德感化，宜及時而為。" },
  "8,3": { name: "地火明夷", meaning: "明入地中、韜光養晦，守正待明。" },
  "8,4": { name: "地雷復", meaning: "一陽來復、否極泰來，回頭是路。" },
  "8,5": { name: "地風升", meaning: "積小成大、步步高升，順勢而上。" },
  "8,6": { name: "地水師", meaning: "興師動眾，宜律己以正、師出有名。" },
  "8,7": { name: "地山謙", meaning: "謙虛低調、卑以自牧，謙受益。" },
  "8,8": { name: "坤為地", meaning: "厚德載物、柔順包容，順以承之。" },
};

const YAO = ["", "初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

export type GuaResult = {
  name: string;       // 卦名，如「水火既濟」
  meaning: string;    // 免費簡卦意
  upper: string;      // 上卦，如「坎☵」
  lower: string;      // 下卦
  movingYao: string;  // 動爻，如「三爻」
  question: string;   // 使用者提問
};

function h(s: string): number { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }

/**
 * 梅花易數起卦：由 seed（含年月日時＋提問）算上卦/下卦/動爻。
 * 先天八卦數 1-8（0 視為 8＝坤）。
 */
export function castGua(seed: string, question = ""): GuaResult {
  const s = seed + "|" + question;
  const up = (h(s + "|上") % 8) + 1;
  const lo = (h(s + "|下") % 8) + 1;
  const yao = (h(s + "|動") % 6) + 1;
  const hex = HEX[`${up},${lo}`] ?? { name: "未知卦", meaning: "順其自然、以平常心待之。" };
  return {
    name: hex.name, meaning: hex.meaning,
    upper: GUA[up], lower: GUA[lo], movingYao: YAO[yao],
    question: question || "近期整體運勢",
  };
}

// ── AI 深解（隨需） ─────────────────────────────────────
export type GuaReading = { summary: string; advice: string };

const GUARDRAIL = [
  "你是溫暖、有底蘊的易經解卦者。用繁體中文、口語親切。",
  "護欄：易經是傳統文化的『換角度思考』工具，不是宿命預言；語氣正向、給行動建議、不製造恐懼、不做醫療/投資/法律具體斷言。只輸出 JSON、不要圍欄。",
].join("\n");

export function buildGuaPrompt(g: GuaResult): { system: string; user: string } {
  const user = [
    `使用者提問：${g.question}`,
    `梅花易數起得：${g.name}（上卦 ${g.upper}、下卦 ${g.lower}、動爻 ${g.movingYao}）`,
    `卦意：${g.meaning}`,
    "請扣著這一卦與提問，白話解讀，輸出 JSON：",
    `{"summary":"這一卦對這個提問的意涵（2-3句）","advice":"一句可執行的建議"}`,
  ].join("\n");
  return { system: GUARDRAIL, user };
}

export function parseGuaReading(text: string): GuaReading | null {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  try {
    const o = JSON.parse(t.slice(s, e + 1));
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    if (!summary) return null;
    return { summary, advice: typeof o.advice === "string" && o.advice.trim() ? o.advice.trim() : "順著卦意，踏出穩健的一小步。" };
  } catch { return null; }
}

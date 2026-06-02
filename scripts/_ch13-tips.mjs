import fs from "node:fs";
const FILE = "src/data/chapters/ch13.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "13.18": { type: "practical", text: "Local SEO 的核心是 Google Business Profile：營業資訊、類別、照片、評論填好填滿，對在地搜尋排名的影響常比改網站還大。NAP（名稱 / 地址 / 電話）在各平台務必一致。" },
  "13.24": { type: "practical", text: "SEO 報價別只報『做 SEO』——拆成可驗收的項目（技術健檢、關鍵字研究、內容優化、月報），客戶才知道錢花在哪、你也好交付與對齊期待。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("ch13 replaced", n, "tips");

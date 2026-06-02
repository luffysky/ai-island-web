import fs from "node:fs";
const FILE = "src/data/chapters/ch33.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "33.1": { type: "practical", text: "工程師懂一點 SEO，等於讓自己寫的網站『被找得到』。最低限度先搞懂三件事：title / description 怎麼寫、heading 層級、網站能不能被 Google 爬到。" },
  "33.7": { type: "practical", text: "改完 OG 標籤一定要實測：用 Facebook Sharing Debugger、X Card Validator 看實際抓到的縮圖與標題，順便強制清快取——很多人改了沒清，分享出去還是舊圖。" },
  "33.13": { type: "practical", text: "AEO 是讓內容能被 AI 問答引用：答案寫在段落開頭一句講清楚、用 FAQ 結構、加 Schema。讓機器三秒抓到重點，比堆關鍵字有效。" },
  "33.19": { type: "practical", text: "經營社群別每個平台都從零做圖：先在一個主力平台把內容做好，再依各平台特性裁切重發（IG 視覺、Threads / X 短文、Dcard 長討論）。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("ch33 replaced", n, "tips");

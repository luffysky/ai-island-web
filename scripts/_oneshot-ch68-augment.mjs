/**
 * 對 ch68 20 lesson 補 analogy + tip（缺什麼補什麼、不蓋既有）
 * 為每 lesson title 寫對應 analogy + tip、不依賴 AI
 */
import { readFileSync, writeFileSync } from "node:fs";

const AUGMENT = {
  "68.1": {
    analogy: "高階工程師 vs senior 像「球隊隊長 vs 王牌球員」：senior 自己分數高就好、高階要讓全隊一起贏（含 mentor 新人、設架構讓別人接得住、跨組對齊）。",
    tip: { type: "practical", text: "別只看 title、看「影響半徑」：你解掉的問題能影響多少人、多少系統。一人寫得快 = senior、讓 5 人一起寫得快 = 高階。" },
  },
  "68.2": {
    analogy: "Unit test 像「安全帶」：平常感受不到、出車禍才知道有差。沒寫 test 的 code 改一行就抖一抖、寫好 test 的 code 改 100 行也敢推。",
    tip: { type: "practical", text: "寫 test 不是為了 100% coverage、是為了「critical path 不會被誤改」。20% 的 test 涵蓋 80% 的金流 / auth / DB write 就夠。" },
  },
  "68.3": {
    analogy: "Unit / 整合 / E2E 像「車的三層檢查」：螺絲（unit）、引擎（整合）、實際開上路（E2E）。三層都過 = 上路放心。",
    tip: { type: "practical", text: "E2E 別寫太多、太慢太脆。挑 5-10 條 critical user journey（註冊登入、付款、核心動作）跑就好、其他用整合 + unit 補。" },
  },
  "68.4": {
    analogy: "Observability 像「車儀表板」：沒儀表你只能憑感覺、有儀表才知道油剩多少 / 引擎溫度多少。Log / Metrics / Trace 就是後端的儀表板。",
    tip: { type: "practical", text: "三件套：log（事件流水）+ metrics（數字趨勢）+ trace（單一 request 走過哪些函式）。先有 log、再上 metrics、最後才接 trace。" },
  },
  "68.5": {
    analogy: "效能優化像「健身減重」：你說「我覺得有點胖」沒用、要先量體脂、量 BMR、找出哪邊高才能對症下藥。憑感覺優化 = 浪費時間。",
    tip: { type: "warning", text: "最大忌：沒 profile 就猜。Chrome DevTools Performance / Node --prof / DB EXPLAIN—看到熱點再下手、80/20 法則屢試不爽。" },
  },
  "68.6": {
    analogy: "資安像「門鎖 + 監視器」：99% 時間用不到、1% 出事時救命。不需當駭客、但要會擋常見招（SQL injection、XSS、CSRF、secret 外洩）。",
    tip: { type: "security", text: "Top 5 必擋：(1) 不信任任何輸入、(2) secret 永遠不進 git、(3) HTTPS + Cookie 三件套、(4) auth gate 在 middleware、(5) rate limit 任何 AI / payment endpoint。" },
  },
  "68.7": {
    analogy: "並發像「兩個人改同一份 Google Doc」—兩人都改第三行、誰的版本贏？沒處理好 = 一人的改動消失。鎖 / transaction / CAS 都是處理這問題。",
    tip: { type: "practical", text: "新手別硬上 lock-free、會踩 race condition 又難 debug。先用 DB transaction + row lock 解 90% 場景、剩下 10% 真的高並發才考慮 redis lock / queue。" },
  },
  "68.8": {
    analogy: "資料工程像「整理倉庫」：source / ETL / 倉儲 / 分析 / 報表。後端工程師至少要會「資料從 A 表流到 B 表時、會不會掉、會不會慢、會不會錯」。",
    tip: { type: "practical", text: "三條鐵則：(1) raw data 永遠保留（不要直接改）、(2) ETL 要 idempotent（重跑不會錯）、(3) 抽樣比全量好（看 100 筆樣本決定 schema）。" },
  },
  "68.9": {
    analogy: "Technical writing 像「翻譯」：把腦袋的設計翻譯成別人看得懂的文件。寫不出來 = 想得不夠清楚、影響力 = 0。",
    tip: { type: "practical", text: "寫文件規矩：先寫「為什麼」（動機）、再寫「做什麼」（方案）、最後才寫「怎麼做」（細節）。讀者按需要往下挖、不會被細節淹沒。" },
  },
  "68.10": {
    analogy: "Code review 像「校稿」：寫的人盯著看 100 次找不到的錯、別人 5 分鐘就抓到。但給人 review 要態度好——批判 code 不批判人、給 alternative 而不是只說「不行」。",
    tip: { type: "practical", text: "review 時用「問句」而非「命令」：問「這個 edge case 你怎麼處理？」比「這裡有 bug、改」更容易讓人接受、也避免你自己誤判。" },
  },
  "68.11": {
    analogy: "Mentor junior 像「教孩子騎腳踏車」：你不能幫他踩、要讓他自己踩、自己跌倒、自己起來。但你扶著後座、跌不死。直接幫他做完 = 他永遠不會。",
    tip: { type: "practical", text: "Mentor 三忌：(1) 不要直接給答案（先反問「你會怎麼解？」）、(2) 不要搶他發言（讓他在會議講方案）、(3) 不要批評他失敗（事後私下檢討、公開讚美）。" },
  },
  "68.12": {
    analogy: "跨組溝通像「外語」：工程師對工程師講技術行、對 PM / 行銷 / 業務要翻譯成「對他們有意義的話」（用戶體驗、營收影響、時程）。",
    tip: { type: "practical", text: "公式：先講「商業意義」(這影響多少 user / 多少錢)、再講「方案」(我們打算這樣做)、最後才提「技術細節」(技術背景的人才聽)。" },
  },
  "68.13": {
    analogy: "PM 給工程師像「廚師懂菜單規劃」：每天只想著煎牛排炒義大利麵、不知道餐廳一個月成本多少、客人愛點什麼——這種廚師升不了主廚。",
    tip: { type: "practical", text: "PM 三件最小集：(1) 估時要含 buffer (×1.5)、(2) 任務切到「半天就有結果」的粒度、(3) 每天 standup 講昨/今/障礙。其他工具學 Linear 或 Jira 標配就夠。" },
  },
  "68.14": {
    analogy: "Trade-off 像「拉麵店點餐」：要又便宜又快又好吃？選 2 個。所有架構決策都是 trade-off—沒有 best practice、只有「對這情境最合適」。",
    tip: { type: "practical", text: "每個技術決策先列「我犧牲了什麼」：用 MongoDB 換掉 PostgreSQL、犧牲了 JOIN、換到 schema 彈性。明列 trade-off 才不會 6 個月後後悔。" },
  },
  "68.15": {
    analogy: "Business sense 像「會做菜的人懂進貨成本」：寫 code 寫得快、但不知道你寫的 feature 一個月能多賺多少、user 真的會用嗎——就是「沒商業感」。",
    tip: { type: "practical", text: "每個 feature 動工前先問三個問題：(1) 多少 user 會用？(2) 帶來多少營收 / 留存？(3) 不做會怎樣？算不出來就先別做、回去找 PM 對齊。" },
  },
  "68.16": {
    analogy: "First principles 像「從化學元素重新組合」：別人都加奶油糖、你問「甜跟脂肪能不能換成別的？」。Tesla 不用前提造車、做出來的車跟 Ford 不一樣就是因為這個。",
    tip: { type: "practical", text: "面對「業界都這樣做」時、強制問三次「為什麼？」：為什麼用 React？為什麼用 SaaS？為什麼按月訂閱？追到無法再問 = 觸底前提。" },
  },
  "68.17": {
    analogy: "Healthy skepticism 像「驗收水電工程」：師傅說「水管沒問題」、你還是會打開水龍頭測一下。對 docs / blog / 同事建議都應該這樣——「相信但驗證」。",
    tip: { type: "practical", text: "Stack Overflow / blog / AI 給的解法都「複製貼上前先想 10 秒」：版本對嗎？情境一樣嗎？背後假設成立嗎？很多 bug 來自「抄了沒想」。" },
  },
  "68.18": {
    analogy: "技術趨勢像「服裝流行」：每年都有新潮款、但牛仔褲跟白 T 永遠不退。學基本功（演算法 / 系統設計 / 資料結構）= 牛仔褲、學最新 framework = 流行款、過 2 年就過時。",
    tip: { type: "practical", text: "70/20/10 規則：70% 時間學「10 年後還有用」的（基礎、原理）、20% 學「今年業界主流」的（react/next/postgres）、10% 學「最潮但可能死」的（新發布的 framework）。" },
  },
  "68.19": {
    analogy: "「接受不確定」像「夜路開車」：你看不到前方 10 公尺以外的事、但還是得繼續開、根據遠光燈每秒做決定。工程世界的長期決策也一樣——資訊永遠不夠、但你得做。",
    tip: { type: "practical", text: "決策框架：把選項分「可逆 vs 不可逆」。可逆的（換 framework / 改設計）—快做、錯了改；不可逆的（公司方向 / 架構大改）—多收集資訊、找人確認再做。" },
  },
  "68.20": {
    analogy: "長期思維像「種樹」：頭一年看不到差別、5 年後別人還在種小盆栽、你的樹已經 10 米高。寫 code 也是—堅持寫 doc、寫 test、refactor、5 年後維護成本天差地別。",
    tip: { type: "practical", text: "規矩：每個 commit 都問「5 年後接手的人看得懂嗎？」。寫得快但別人讀不懂 = 5 年後的自己 / 同事的負債。" },
  },
};

const path = "src/data/chapters/ch68.json";
const ch = JSON.parse(readFileSync(path, "utf8"));
let touched = 0;
for (const l of ch.lessons) {
  const aug = AUGMENT[l.id];
  if (!aug) continue;
  if (!l.analogy && aug.analogy) { l.analogy = aug.analogy; touched++; }
  if (!l.tip && aug.tip) { l.tip = aug.tip; touched++; }
}
writeFileSync(path, JSON.stringify(ch, null, 2));
console.log(`ch68: 補了 ${touched} 個欄位、覆蓋 ${ch.lessons.length} lesson`);

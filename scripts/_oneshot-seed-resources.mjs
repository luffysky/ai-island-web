/**
 * 精選外部資源 seed（雪鑰精選 40+ 條）
 * 跑法：node scripts/_oneshot-seed-resources.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const RESOURCES = [
  // ─── 書籍 ───
  { title: "你不知道的 JavaScript", short_desc: "Kyle Simpson 開源 JS 經典、深入到引擎內部細節。",
    long_desc: "想真懂 JavaScript 怎麼運作？這套書（YDKJS）開源免費、講 closures / this / prototypes 比任何教科書都透徹。建議學完 ch08 React 之後讀、會解開很多「為什麼會這樣」的疑惑。",
    url: "https://github.com/getify/You-Dont-Know-JS", type: "book", source: "GitHub", language: "en",
    topics: ["javascript","closures","this","prototypes"], tags: ["js","深入","經典","免費"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Eloquent JavaScript", short_desc: "互動式線上書、邊讀邊寫 code、新手友善。",
    long_desc: "Marijn Haverbeke 寫的、線上可直接 run 範例 + 練習題。ch02 變數打底完之後讀超合適、會打下紮實 JS 基礎。",
    url: "https://eloquentjavascript.net", type: "book", source: "免費線上", language: "en",
    topics: ["javascript","beginner"], tags: ["js","互動","新手","免費"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "為自己學 Git", short_desc: "高見龍寫的繁中 Git 教學、台灣最熱賣。",
    long_desc: "Git 入門到熟練、有實體書 + 線上版 + 圖解。ch00 環境準備學完後、想深入 Git 就讀這本。",
    url: "https://gitbook.tw", type: "book", source: "免費線上 + 實體", language: "zh",
    topics: ["git","github"], tags: ["git","繁中","台灣"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "Designing Data-Intensive Applications", short_desc: "Martin Kleppmann 講分散式系統 / DB / streaming。",
    long_desc: "後端 / 資料工程必讀、業界稱「DDIA」。看完你會懂為什麼某些公司用 Kafka / 為什麼 NoSQL 不是萬靈丹。Senior 工程師等級書。",
    url: "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/", type: "book", source: "O'Reilly", language: "en",
    topics: ["system-design","database","distributed"], tags: ["後端","架構","進階"], difficulty: "advanced", is_free: false,
    curated_by: "xueyue" },

  { title: "Clean Code", short_desc: "Robert C. Martin 講怎麼寫可維護的程式碼。",
    long_desc: "命名 / 函式 / 註解 / 物件設計、業界標準參考書。新手讀完會大幅提升 code review 通過率。",
    url: "https://www.oreilly.com/library/view/clean-code-a/9780136083238/", type: "book", source: "O'Reilly", language: "en",
    topics: ["best-practices","oop","refactoring"], tags: ["品質","重構","經典"], difficulty: "intermediate", is_free: false,
    curated_by: "xueyue" },

  { title: "The Pragmatic Programmer", short_desc: "Andy Hunt & Dave Thomas 的工程師心法書、20 週年版。",
    long_desc: "不只教技術、教「怎麼想」、像工程師界的論語。每個 indie / 創業者都該讀。",
    url: "https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/", type: "book", source: "Pragmatic Bookshelf", language: "en",
    topics: ["philosophy","best-practices"], tags: ["心法","經典","必讀"], difficulty: "all", is_free: false,
    curated_by: "xueyue" },

  // ─── YouTube ───
  { title: "Fireship", short_desc: "100 秒系列影片、Web / AI 新技術超速入門。",
    long_desc: "Jeff Delaney 出品、影片短而精煉、新技術出來 1 週內就有。學完 lesson 想知道業界最新動態必訂閱。",
    url: "https://www.youtube.com/@Fireship", type: "youtube", source: "YouTube", language: "en",
    topics: ["web","ai","trends"], tags: ["快速","新技術","訂閱"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Web Dev Simplified", short_desc: "Kyle 老師、HTML/CSS/JS/React 深入淺出。",
    long_desc: "從入門到專案實戰、節奏舒服、英文發音清楚。新手 React 卡關推他的影片。",
    url: "https://www.youtube.com/@WebDevSimplified", type: "youtube", source: "YouTube", language: "en",
    topics: ["html","css","javascript","react"], tags: ["教學","新手友善"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "Theo - t3.gg", short_desc: "Theo Browne 的工程師生態觀察 + 業界批判。",
    long_desc: "T3 stack 作者、開源狂熱者、講話直接、業界生態 / 工具評論一流。學寫程式之外、想懂工程師圈在吵什麼看他。",
    url: "https://www.youtube.com/@t3dotgg", type: "youtube", source: "YouTube", language: "en",
    topics: ["typescript","react","industry"], tags: ["業界","評論","典故"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "李宏毅 機器學習", short_desc: "台大李宏毅老師、中文機器學習教材天花板。",
    long_desc: "從 ML 基礎到 LLM / Transformer / GenAI、全套免費、繁中、最新版每年更新。學 AI 一定要看的繁中資源。",
    url: "https://www.youtube.com/@HungyiLeeNTU", type: "youtube", source: "YouTube", language: "zh",
    topics: ["machine-learning","deep-learning","transformer","llm"], tags: ["AI","繁中","台大"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "ThePrimeagen", short_desc: "Netflix 前 staff、Vim 狂熱、講話超快很有趣。",
    long_desc: "看他寫 code 學手速、看他罵潮流學批判、他用 Vim 用 Rust 用 Go、生態觀察很犀利。",
    url: "https://www.youtube.com/@ThePrimeagen", type: "youtube", source: "YouTube", language: "en",
    topics: ["vim","rust","backend"], tags: ["快","Vim","批判"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Coding with Lewis", short_desc: "短片講 1 個工程師日常 tip、節奏快有梗。",
    long_desc: "30-60 秒短影片講一個工具 / 概念 / 梗、適合通勤刷、無痛吸收業界資訊。",
    url: "https://www.youtube.com/@codingwithlewis", type: "youtube", source: "YouTube", language: "en",
    topics: ["tips","tools"], tags: ["短片","通勤","梗"], difficulty: "beginner",
    curated_by: "xueyue" },

  // ─── 部落格 / Newsletter ───
  { title: "阮一峰 週刊", short_desc: "華語圈最有名的科技週刊、每週六發。",
    long_desc: "每週六定時更新、軟體新聞 + 文章 + 工具推薦 + 言論、簡中但易讀、訂閱量超大。",
    url: "https://www.ruanyifeng.com/blog/weekly/", type: "newsletter", source: "阮一峰個人站", language: "zh",
    topics: ["news","trends"], tags: ["週刊","華語","必訂"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Overreacted (Dan Abramov)", short_desc: "Redux / React 作者 Dan 的個人部落格。",
    long_desc: "React 核心開發者寫的、講 React 內部 / hooks 心法 / 工程師生涯反思、可讀性極高。",
    url: "https://overreacted.io", type: "blog", source: "個人站", language: "en",
    topics: ["react","hooks","philosophy"], tags: ["React","深度","作者"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Paul Graham Essays", short_desc: "Y Combinator 創辦人、Indie / startup 必讀。",
    long_desc: "How to Start a Startup / Do Things That Don't Scale 等經典文、indie hacker / 創業者必讀。",
    url: "https://paulgraham.com/articles.html", type: "blog", source: "個人站", language: "en",
    topics: ["startup","indie","philosophy"], tags: ["創業","經典","必讀"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Indie Hackers", short_desc: "獨立開發者社群、看別人怎麼 0 → $10k MRR。",
    long_desc: "每天有 indie hacker 分享真實營收 / 失敗 / 心路歷程、不空想、有具體數字。",
    url: "https://www.indiehackers.com", type: "community", source: "Indie Hackers", language: "en",
    topics: ["indie","startup","saas"], tags: ["創業","真實","訂閱"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "iThome 鐵人賽", short_desc: "台灣最大工程師 30 天連續寫文活動、每年 10 月。",
    long_desc: "想練「持續輸出」+「逼自己學完一個主題」、報名鐵人賽 30 天連寫。台灣工程師圈最有名活動、得獎能加薪。",
    url: "https://ithelp.ithome.com.tw/ironman", type: "community", source: "iThome", language: "zh",
    topics: ["writing","challenge"], tags: ["台灣","挑戰","30天"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Hacker News", short_desc: "矽谷工程師早餐都看的新聞 + 討論串。",
    long_desc: "Y Combinator 跑的、看科技新聞 / 創業 / 駭客文化、留言區比新聞還精彩。每天通勤刷 10 分鐘。",
    url: "https://news.ycombinator.com", type: "community", source: "Y Combinator", language: "en",
    topics: ["news","tech"], tags: ["新聞","矽谷","必看"], difficulty: "all",
    curated_by: "xueyue" },

  // ─── 課程 ───
  { title: "CS50 — Harvard 計算機科學入門", short_desc: "全世界最受歡迎的 CS 入門、David Malan 主講。",
    long_desc: "Harvard CS50 完整課程免費、從 0 到能寫網頁。David Malan 講課如百老匯演出、很多人因為他愛上寫程式。",
    url: "https://cs50.harvard.edu/x/", type: "course", source: "Harvard / edX", language: "en",
    topics: ["cs","python","c","sql"], tags: ["經典","新手","Harvard"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "Fast.ai — Practical Deep Learning", short_desc: "Jeremy Howard 的「實戰先學、理論後補」DL 課。",
    long_desc: "傳統 ML 課從矩陣推到激活函數、Fast.ai 反過來：第 1 課就讓你訓練 SOTA 模型。學 AI 推這條路、不被數學嚇跑。",
    url: "https://course.fast.ai", type: "course", source: "fast.ai", language: "en",
    topics: ["deep-learning","ai","pytorch"], tags: ["AI","實戰","免費"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Hahow 程式系列", short_desc: "台灣最大中文線上課程、UI / Python / JS 都有。",
    long_desc: "中文授課最完整的平台、買終身、可以反覆看。挑高評分 4.7+ 的不會踩雷。",
    url: "https://hahow.in/courses?category=cat_LD16AwAr0Ezv", type: "course", source: "Hahow", language: "zh",
    topics: ["multi"], tags: ["中文","台灣","終身"], difficulty: "all", is_free: false,
    curated_by: "xueyue" },

  { title: "Frontend Masters", short_desc: "矽谷 Senior 工程師授課、$39/月。",
    long_desc: "深度高、講師都是業界 Staff Engineer、前端 / 後端 / system design 都有。學完 ch15 之後想升級看這。",
    url: "https://frontendmasters.com", type: "course", source: "Frontend Masters", language: "en",
    topics: ["frontend","backend","system-design"], tags: ["訂閱","深度","業界"], difficulty: "intermediate", is_free: false,
    curated_by: "xueyue" },

  // ─── 工具 / Docs ───
  { title: "MDN Web Docs", short_desc: "Mozilla 出的 Web 開發官方文件、Google 不要看 W3Schools。",
    long_desc: "HTML / CSS / JS / Web API 最權威的參考、業界 Senior 都是 MDN 查文。新手別查 W3Schools、那有錯誤。",
    url: "https://developer.mozilla.org", type: "docs", source: "Mozilla", language: "en",
    topics: ["html","css","javascript","web-api"], tags: ["官方","查文","必收藏"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Vercel — 零設定 Next.js 部署", short_desc: "Next.js 親爹、部署 React/Vue/Svelte 都行、免費額度大。",
    long_desc: "Indie / 學生免費、push GitHub 自動部署、preview link、最 hot 的 indie 部署平台。",
    url: "https://vercel.com", type: "tool", source: "Vercel", language: "en",
    topics: ["deployment","nextjs"], tags: ["部署","免費","必裝"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "Tailwind CSS", short_desc: "Utility-first CSS、2026 業界主流。",
    long_desc: "寫 className 不用切 .css 檔、配 ch08 React 用最爽。AI 島就是用 Tailwind v4 寫的。",
    url: "https://tailwindcss.com", type: "tool", source: "Tailwind Labs", language: "en",
    topics: ["css","tailwind","react"], tags: ["CSS","主流","必學"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "shadcn/ui", short_desc: "「copy code 不裝 npm」的 React UI 套件、改寫超彈性。",
    long_desc: "2026 React UI 套件第一名、不是 npm install、是直接複製 source code 進專案、可以隨意改。Vercel CEO 推。",
    url: "https://ui.shadcn.com", type: "tool", source: "shadcn", language: "en",
    topics: ["react","ui","tailwind"], tags: ["UI","彈性","主流"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Cursor — AI 程式編輯器", short_desc: "VS Code fork + GPT/Claude 深度整合、寫 code 快 3x。",
    long_desc: "2026 工程師生產力工具天花板、$20/月、用過就回不去 VS Code 純打字。",
    url: "https://cursor.sh", type: "tool", source: "Cursor", language: "en",
    topics: ["ai","editor","productivity"], tags: ["AI","編輯器","付費"], difficulty: "all", is_free: false,
    curated_by: "xueyue" },

  { title: "Excalidraw — 手繪風白板", short_desc: "畫 system design / 流程圖 / 草稿、面試 / 開會神器。",
    long_desc: "手繪風格、可即時協作、輸出 PNG / SVG、面試畫系統設計用它最不會出戲。",
    url: "https://excalidraw.com", type: "tool", source: "Excalidraw", language: "en",
    topics: ["diagram","whiteboard"], tags: ["畫圖","面試","協作"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Postman — API 測試", short_desc: "後端寫 API 必裝、學員學 ch20 後端時也用。",
    long_desc: "GET / POST / 含 auth header 測 API、UI 友善、免費版夠用。chrome extension 也行。",
    url: "https://www.postman.com", type: "tool", source: "Postman", language: "en",
    topics: ["api","testing","backend"], tags: ["API","必裝","後端"], difficulty: "beginner",
    curated_by: "xueyue" },

  // ─── Playground / 互動學習 ───
  { title: "Codepen", short_desc: "前端線上 sandbox、HTML/CSS/JS 即時預覽。",
    long_desc: "做小範例 / 分享給朋友看 / 看別人作品學技巧。學 HTML/CSS/JS 都該有帳號。",
    url: "https://codepen.io", type: "playground", source: "Codepen", language: "en",
    topics: ["html","css","javascript"], tags: ["線上","沙盒","作品"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "StackBlitz", short_desc: "瀏覽器內跑 Node.js / Next.js / Vue 完整 stack。",
    long_desc: "全功能 IDE 在瀏覽器、可開整個 Next.js 專案、不用本機裝環境、新手測試超友善。",
    url: "https://stackblitz.com", type: "playground", source: "StackBlitz", language: "en",
    topics: ["node","react","nextjs"], tags: ["線上","IDE","新手"], difficulty: "beginner",
    curated_by: "xueyue" },

  { title: "LeetCode", short_desc: "演算法刷題、面試前必練、AI 島 3944 題已收錄。",
    long_desc: "FAANG 面試核心、$35/月 Premium 進階。AI 島 /me/leetcode 已綁定追蹤。",
    url: "https://leetcode.com", type: "playground", source: "LeetCode", language: "en",
    topics: ["algorithm","interview"], tags: ["演算法","面試","必刷"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Frontend Mentor", short_desc: "拿到 Figma 設計稿、自己刻、跟別人比作品。",
    long_desc: "前端練手最好的方法、免費題目 + 進階收費。Junior → Mid 接案前刷 10 題感覺就上來了。",
    url: "https://www.frontendmentor.io", type: "playground", source: "Frontend Mentor", language: "en",
    topics: ["frontend","portfolio"], tags: ["前端","作品集","練手"], difficulty: "intermediate",
    curated_by: "xueyue" },

  // ─── Podcast ───
  { title: "Syntax.fm", short_desc: "Wes Bos + Scott Tolinski 主持、Web 開發界最熱 podcast。",
    long_desc: "週 2 集、每集 30-60 分鐘、新技術 / 工具 / 業界話題、英文容易聽。通勤必聽。",
    url: "https://syntax.fm", type: "podcast", source: "Syntax", language: "en",
    topics: ["web","tools","frontend"], tags: ["Podcast","必聽","通勤"], difficulty: "all",
    curated_by: "xueyue" },

  { title: "Lex Fridman Podcast", short_desc: "Lex 跟 AI / 物理 / 哲學大佬深度對談。",
    long_desc: "Yann LeCun / Karpathy / OpenAI 員工等都來過、AI 深度對談、3-5 小時一集適合長路上聽。",
    url: "https://lexfridman.com/podcast/", type: "podcast", source: "Lex Fridman", language: "en",
    topics: ["ai","interview","philosophy"], tags: ["AI","深度","訪談"], difficulty: "intermediate",
    curated_by: "xueyue" },

  { title: "Indie Hackers Podcast", short_desc: "Courtland Allen 訪 indie hacker、真實營收故事。",
    long_desc: "$10/月 → $100k MRR 的真實路徑、不是矽谷大佬故事、是普通人 indie 之路、創業者必聽。",
    url: "https://www.indiehackers.com/podcasts", type: "podcast", source: "Indie Hackers", language: "en",
    topics: ["indie","startup","saas"], tags: ["創業","訪談","真實"], difficulty: "all",
    curated_by: "xueyue" },
];

let inserted = 0;
let i = 0;
for (const r of RESOURCES) {
  try {
    await c.query(`
      INSERT INTO external_resources (title, short_desc, long_desc, url, type, source, tags, topics, difficulty, language, is_free, curated_by, position)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT DO NOTHING
    `, [r.title, r.short_desc, r.long_desc, r.url, r.type, r.source ?? null,
        r.tags ?? [], r.topics ?? [], r.difficulty ?? "beginner", r.language ?? "en",
        r.is_free ?? true, r.curated_by ?? "admin", i++]);
    inserted++;
  } catch (e) {
    console.warn(`  ⚠️ ${r.title}: ${e.message}`);
  }
}

const { rows } = await c.query(`SELECT type, COUNT(*) AS n FROM external_resources GROUP BY type ORDER BY n DESC`);
console.log(`\n✨ 完成、external_resources：${inserted}/${RESOURCES.length} 條`);
console.log(`分類分布：`);
for (const r of rows) console.log(`  ${r.type}: ${r.n}`);

await c.end();

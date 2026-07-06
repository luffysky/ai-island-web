/**
 * 論壇種子內容：讓 /forum 一開始就有「人氣」。
 * - 用既有 profiles 當作者（不建假帳號）；跨版塊鋪主題、回覆、reactions、瀏覽數。
 * - 時間刻意散在過去數週；回覆晚於主題；last_reply_at/reply_count/search_vector 靠既有 trigger 自動維護。
 * - 冪等：同標題已存在就跳過，可重跑。
 * Usage: node scripts/seed-forum.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const now = Date.now();
const daysAgo = (d, h = 0) => new Date(now - d * 86400000 - h * 3600000).toISOString();
const p = (...paras) => paras.map((t) => `<p>${t}</p>`).join("");

// 作者：以既有 profiles 的 username 對應 id
const { rows: profs } = await c.query("select id, username, display_name from public.profiles");
const byName = Object.fromEntries(profs.map((r) => [r.username, r.id]));
const A = {
  owner: byName["luffysky00_2f39"], // Luffy Lin（站長）
  nami: byName["Nami醬"],            // hotnami111
  s003: byName["luffy"],             // luffysky003
  s004: byName["luffysky004"],
  s002: byName["codex"],             // luffysky002
  dong: byName["user_c20c60dd"],     // 賴咚咚
  xuan: byName["m4211031_a91f"],     // 游自玄
};
const fallback = profs[0].id;
const uid = (x) => x ?? fallback;

const { rows: boards } = await c.query("select id, slug from public.forum_boards");
const board = Object.fromEntries(boards.map((b) => [b.slug, b.id]));

// 已存在標題 → 冪等跳過
const { rows: existing } = await c.query("select title from public.forum_threads");
const have = new Set(existing.map((r) => r.title));

/** thread: { board, author, title, tags, html, created(dISO), views, pinned, featured, replies:[{author,html,created,answer}], reacts:[{author,emoji}] } */
const THREADS = [
  {
    board: "announcements", author: A.owner, pinned: true, featured: true, views: 528, created: daysAgo(26),
    title: "📢 歡迎來到 AI 島討論區！發文前先看這篇",
    tags: ["公告", "新手必看"],
    html: p("哈囉島民們 👋 這裡是 AI 島的討論區，不管你是完全零基礎、還是已經在接案，都歡迎在這裡發問、分享、灌水。",
      "幾個小約定：1) 沒有笨問題，卡關就貼 code + 錯誤訊息；2) 互相鼓勵、不嘲笑新手；3) 分享作品歡迎「求鞭」但也請溫柔。",
      "找不到版？「新手提問」什麼都能問、「卡關求助」貼 code、「作品展示」秀成果。開始吧！🌴"),
    reacts: [{ author: A.nami, emoji: "🎉" }, { author: A.dong, emoji: "❤️" }, { author: A.xuan, emoji: "👍" }, { author: A.s004, emoji: "🔥" }],
    replies: [
      { author: A.dong, created: daysAgo(25, 3), html: p("報到！終於等到討論區 🎉") },
      { author: A.xuan, created: daysAgo(24), html: p("推一個，之前都不知道要去哪問問題 😆") },
    ],
  },
  {
    board: "questions", author: A.dong, views: 143, created: daysAgo(20),
    title: "Cursor 一直卡在 indexing，是我電腦的問題嗎？",
    tags: ["Cursor", "工具"],
    html: p("剛裝好 Cursor，開專案後右下角一直轉圈圈寫 indexing，等了十分鐘還沒好，是正常的嗎？還是我哪裡設定錯了 😭"),
    reacts: [{ author: A.xuan, emoji: "👍" }],
    replies: [
      { author: A.s003, created: daysAgo(19, 20), html: p("第一次開大專案會比較久，讓它跑完就好。如果一直卡，可以把 node_modules 加進 .cursorignore，會快超多。") },
      { author: A.nami, created: daysAgo(19, 12), answer: true, html: p("補充：Cursor 設定裡 Features → Codebase Indexing 可以看進度。卡住的話重開一次通常就好了，我上次也是這樣。") },
      { author: A.dong, created: daysAgo(19, 6), html: p("加了 .cursorignore 真的快很多！謝謝兩位 🙏") },
    ],
  },
  {
    board: "questions", author: A.xuan, views: 217, created: daysAgo(18), featured: true,
    title: "新手到底要先學 JavaScript 還是先學 Python？",
    tags: ["新手", "JavaScript", "Python"],
    html: p("看了很多說法有點混亂，想做網站好像要 JS，但大家都說 Python 比較好入門。到底該先學哪個？"),
    reacts: [{ author: A.dong, emoji: "👍" }, { author: A.s004, emoji: "👍" }, { author: A.s002, emoji: "🔥" }],
    replies: [
      { author: A.owner, created: daysAgo(17, 20), answer: true, html: p("看你想做什麼。想做「看得到的網頁」→ 先 JS（成就感快、AI 島前面章節就是這條線）；想做「資料/自動化/爬蟲」→ 先 Python。兩個語法很像，先學會一個、第二個會很快。別糾結太久，選一個開始最重要。") },
      { author: A.nami, created: daysAgo(17, 8), html: p("同意，我是先 JS 因為想看到畫面，動力比較夠 😆") },
      { author: A.xuan, created: daysAgo(16), html: p("懂了，那我先從 JS 開始！") },
    ],
  },
  {
    board: "questions", author: A.s004, views: 96, created: daysAgo(9),
    title: "Supabase 一定要先會 SQL 才能用嗎？",
    tags: ["Supabase", "資料庫"],
    html: p("想用 Supabase 做登入跟資料儲存，但我完全不會 SQL，這樣可以嗎？"),
    replies: [
      { author: A.owner, created: daysAgo(8, 18), answer: true, html: p("可以，基本 CRUD 用它的 JS client 就能做（.select/.insert/.update），不用手寫 SQL。等你要做比較複雜的統計再學 SQL 就好，邊做邊補。") },
    ],
  },
  {
    board: "progress", author: A.nami, views: 128, created: daysAgo(14),
    title: "Day 7 打卡！連續一週沒斷，終於看懂 async/await 了 🔥",
    tags: ["打卡", "心得"],
    html: p("之前看到 async/await 就頭痛，這週逼自己每天一小節，今天突然就通了——原來就是「等它做完再往下」而已 😂 記錄一下，繼續衝。"),
    reacts: [{ author: A.dong, emoji: "🔥" }, { author: A.xuan, emoji: "❤️" }, { author: A.owner, emoji: "🎉" }, { author: A.s004, emoji: "👍" }],
    replies: [
      { author: A.dong, created: daysAgo(13, 20), html: p("太強了！我還卡在 Promise 😭") },
      { author: A.nami, created: daysAgo(13, 10), html: p("加油！Promise 想成「一張之後會兌現的券」就好懂很多。") },
    ],
  },
  {
    board: "progress", author: A.s002, views: 176, created: daysAgo(11), featured: true,
    title: "從完全不會到做出第一個網頁，我花了 21 天",
    tags: ["心得", "里程碑"],
    html: p("三週前連 HTML 是什麼都不知道，今天把個人簡介頁 deploy 上線了。分享幾個對我幫助最大的點：",
      "1) 不要一次學完再動手，學一點就做一點；2) 卡住就貼給 AI 問「為什麼」，不是只要答案；3) 每天固定時間，哪怕只有 20 分鐘。共勉 💪"),
    reacts: [{ author: A.nami, emoji: "🔥" }, { author: A.xuan, emoji: "👍" }, { author: A.dong, emoji: "❤️" }],
    replies: [
      { author: A.xuan, created: daysAgo(10, 12), html: p("第 2 點超有感，問「為什麼」跟只要答案差很多。") },
    ],
  },
  {
    board: "help", author: A.xuan, views: 264, created: daysAgo(6),
    title: "React useEffect 一直無限跑，附 code 求救 🆘",
    tags: ["React", "useEffect", "Bug"],
    html: p("下面這段一打開就瘋狂 re-render，console.log 停不下來，是哪裡錯了？",
      "<pre><code>useEffect(() =&gt; {\n  setData(fetchData());\n}, [data]);</code></pre>"),
    reacts: [{ author: A.dong, emoji: "👍" }],
    replies: [
      { author: A.owner, created: daysAgo(5, 22), answer: true, html: p("你把 data 放進依賴陣列、又在 effect 裡改 data → 改了就再觸發，變無限迴圈。拿掉依賴的 data、改成 []（只跑一次）就好：",
        "<pre><code>useEffect(() =&gt; {\n  fetchData().then(setData);\n}, []);</code></pre>", "另外 fetchData 若是 async，記得 .then 或 await，不要直接 setData(fetchData())。") },
      { author: A.xuan, created: daysAgo(5, 12), html: p("原來是依賴陣列！改成 [] 就正常了，感謝站長 🙏") },
      { author: A.nami, created: daysAgo(5, 8), html: p("這個坑我也踩過，+1 收藏。") },
    ],
  },
  {
    board: "tutorials", author: A.owner, views: 431, created: daysAgo(15), pinned: true, featured: true,
    title: "【教學】5 分鐘搞懂 Git branch / merge / rebase",
    tags: ["Git", "教學"],
    html: p("很多人卡在 Git，其實日常只要記三件事：",
      "branch＝開一條平行時空來改東西；merge＝把兩條時空合起來（會留合併紀錄）；rebase＝把你的 commit「接」到最新的主線後面（歷史比較乾淨）。",
      "新手建議：團隊用 merge 最安全；rebase 等你熟了再玩，衝突時別慌，一個一個檔案解。"),
    reacts: [{ author: A.dong, emoji: "🔥" }, { author: A.xuan, emoji: "🔥" }, { author: A.s004, emoji: "❤️" }, { author: A.nami, emoji: "👍" }, { author: A.s002, emoji: "👍" }],
    replies: [
      { author: A.s004, created: daysAgo(14, 6), html: p("rebase 那個比喻終於懂了 😂") },
      { author: A.dong, created: daysAgo(13, 2), html: p("收藏！每次都忘記 merge 跟 rebase 差在哪。") },
    ],
  },
  {
    board: "guides", author: A.s003, views: 89, created: daysAgo(12),
    title: "HTML 副本通關心得：卡在表單那關的看這篇",
    tags: ["副本", "HTML"],
    html: p("表單那關很多人卡在 label 跟 input 的 for/id 對應。記住 label 的 for 要等於 input 的 id，點文字就能選到欄位。我把踩過的雷整理在這，希望有幫助。"),
    replies: [
      { author: A.dong, created: daysAgo(11, 4), html: p("剛好卡在這關，感謝！") },
    ],
  },
  {
    board: "resources", author: A.dong, views: 152, created: daysAgo(8),
    title: "分享幾個我常用的免費 API（附連結）",
    tags: ["資源", "API"],
    html: p("練習串接很好用的免費 API：JSONPlaceholder（假資料）、OpenWeather（天氣）、TheCatAPI（貓圖，最療癒）。都不用信用卡，拿來練 fetch 剛好。"),
    reacts: [{ author: A.nami, emoji: "❤️" }, { author: A.xuan, emoji: "👍" }],
    replies: [
      { author: A.nami, created: daysAgo(7, 6), html: p("貓圖 API 也太可愛 🐱 收藏了") },
    ],
  },
  {
    board: "intro", author: A.xuan, views: 97, created: daysAgo(19),
    title: "新人報到～ 33 歲想轉職，從零開始請多指教",
    tags: ["自我介紹", "轉職"],
    html: p("大家好，我是阿玄，之前做業務，最近下定決心想轉軟體。年紀有點焦慮但還是想試試看，請大家多多指教 🙇"),
    reacts: [{ author: A.nami, emoji: "❤️" }, { author: A.owner, emoji: "🔥" }, { author: A.dong, emoji: "👍" }],
    replies: [
      { author: A.nami, created: daysAgo(18, 20), html: p("歡迎！我也是轉職的，33 一點都不晚，一起加油 💪") },
      { author: A.owner, created: daysAgo(18, 10), html: p("歡迎上島 🌴 有問題儘管問，這裡很多人都是零基礎開始的。") },
    ],
  },
  {
    board: "intro", author: A.s004, views: 61, created: daysAgo(7),
    title: "大家好，我是設計師，想學前端讓自己能獨立做作品",
    tags: ["自我介紹", "前端"],
    html: p("平常做 UI 設計，但每次都要等工程師 implement 很卡，想自己學會把設計做成真的網頁。請多指教！"),
    replies: [
      { author: A.dong, created: daysAgo(6, 12), html: p("設計底子學前端超吃香欸，做出來一定很好看！") },
    ],
  },
  {
    board: "chat", author: A.nami, views: 203, created: daysAgo(10),
    title: "大家 VS Code 都用什麼主題？貼一下截圖 ☕",
    tags: ["閒聊", "VS Code"],
    html: p("最近看膩了預設深色，想換主題。大家都用什麼？我先貼：One Dark Pro + Fira Code 字體，寫起來心情好很多 😌"),
    reacts: [{ author: A.dong, emoji: "👍" }, { author: A.xuan, emoji: "❤️" }, { author: A.s002, emoji: "👍" }],
    replies: [
      { author: A.s002, created: daysAgo(9, 18), html: p("Dracula 一票！紫紫的很好看。") },
      { author: A.dong, created: daysAgo(9, 6), html: p("我用 Tokyo Night，配 JetBrains Mono 字體 🖤") },
      { author: A.xuan, created: daysAgo(8, 20), html: p("原來大家都換主題，我還在用預設 😂 來試試 One Dark。") },
    ],
  },
  {
    board: "chat", author: A.s002, views: 181, created: daysAgo(4),
    title: "今天 AI 又把我坑了 😂 差點把整個 node_modules commit 上去",
    tags: ["閒聊", "翻車"],
    html: p("叫 AI 幫我加 .gitignore，結果它漏了 node_modules，我 git add . 才發現要 commit 幾萬個檔案 💀 還好 status 有看。大家有被 AI 坑過的經驗嗎？"),
    reacts: [{ author: A.dong, emoji: "🔥" }, { author: A.nami, emoji: "🎉" }, { author: A.xuan, emoji: "👍" }],
    replies: [
      { author: A.dong, created: daysAgo(3, 20), html: p("有！它幫我刪 bug 順便把功能一起刪了 😂") },
      { author: A.nami, created: daysAgo(3, 8), html: p("所以 commit 前一定要看 diff，血淚教訓 🩸") },
    ],
  },
  {
    board: "showcase", author: A.dong, views: 246, created: daysAgo(5), featured: true,
    title: "我的第一個 Todo App 上線了！求鞭（溫柔的）🎨",
    tags: ["作品", "React"],
    html: p("跟著 AI 島做完 React 那段，自己加了「分類 + 深色模式」，終於 deploy 上線了！第一次做出真的能用的東西好感動 🥹 有什麼可以改進的地方歡迎跟我說～"),
    reacts: [{ author: A.owner, emoji: "🔥" }, { author: A.nami, emoji: "❤️" }, { author: A.xuan, emoji: "🎉" }, { author: A.s004, emoji: "👍" }, { author: A.s002, emoji: "❤️" }],
    replies: [
      { author: A.owner, created: daysAgo(4, 18), html: p("第一個作品就有深色模式，很可以！下一步可以試著把資料存到 localStorage，重整就不會不見。") },
      { author: A.s004, created: daysAgo(4, 6), html: p("配色好看 👏 設計魂認證。") },
    ],
  },
  {
    board: "feedback", author: A.xuan, views: 74, created: daysAgo(3),
    title: "許願：程式碼區塊希望能一鍵複製 + 顯示行號",
    tags: ["許願", "體驗"],
    html: p("看教學貼的 code 想複製時要自己反白，如果能有「複製」按鈕跟行號會更方便！小小許願 🙏"),
    reacts: [{ author: A.dong, emoji: "👍" }, { author: A.nami, emoji: "👍" }],
    replies: [
      { author: A.owner, created: daysAgo(2, 12), html: p("收到！這個確實實用，排進待辦了，感謝建議 🙌") },
    ],
  },
];

let added = 0, skipped = 0;
for (const t of THREADS) {
  if (have.has(t.title)) { skipped++; continue; }
  if (!board[t.board]) { console.log(`  ⚠ 找不到版塊 ${t.board}，跳過`); continue; }
  const { rows } = await c.query(
    `insert into public.forum_threads (board_id, user_id, title, content, tags, is_pinned, is_featured, view_count, created_at, updated_at, last_reply_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$9) returning id`,
    [board[t.board], uid(t.author), t.title, t.html, t.tags ?? [], !!t.pinned, !!t.featured, t.views ?? 0, t.created]
  );
  const threadId = rows[0].id;
  for (const r of t.replies ?? []) {
    await c.query(
      `insert into public.forum_replies (thread_id, user_id, content, is_answer, created_at) values ($1,$2,$3,$4,$5)`,
      [threadId, uid(r.author), r.html, !!r.answer, r.created]
    );
  }
  for (const rc of t.reacts ?? []) {
    await c.query(
      `insert into public.forum_reactions (thread_id, user_id, emoji) values ($1,$2,$3) on conflict do nothing`,
      [threadId, uid(rc.author), rc.emoji]
    );
  }
  added++;
}

const cnt = await c.query("select (select count(*)::int from forum_threads) t, (select count(*)::int from forum_replies) r, (select count(*)::int from forum_reactions) x");
console.log(`✓ 種子完成：新增 ${added} 主題、跳過 ${skipped}（已存在）`);
console.log(`  現況 → threads ${cnt.rows[0].t} / replies ${cnt.rows[0].r} / reactions ${cnt.rows[0].x}`);
await c.end();

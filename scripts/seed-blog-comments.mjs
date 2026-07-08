// 部落格種子留言（#183）：手寫、貼合各篇主題的「其他人」留言，讓文章有社群互動感。
// 全手寫（真人學習者口吻、含新手發問 + 學長回覆），非生成器亂湊。
// idempotent：同文章同作者同內容存在就跳過（可重跑）。
// 用法：node scripts/seed-blog-comments.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const env = {};
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[m[1]] = v;
    }
  }
  return env;
}
const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 每組：match=標題關鍵字；comments=[{name, content, replies?:[{name,content}]}]
const GROUPS = [
  {
    match: "第一天",
    comments: [
      { name: "阿賢", content: "剛好今天第一天，照著把三件事做完了，比我想像中不可怕欸，謝謝這篇 🙏" },
      { name: "Nini", content: "之前買了兩本書都放著長灰塵…早看到這篇就好了。先動手真的有差。", replies: [
        { name: "島民小May", content: "一樣！書架上供三本 Python，結果第一次跑出 Hello World 還是靠這種文章 😂" },
      ] },
    ],
  },
  {
    match: "最常犯的 5 個錯",
    comments: [
      { name: "轉職中的Leo", content: "那個可變預設參數 def f(x=[]) 我上禮拜才中招，debug 半天找不到，看完這篇背脊發涼。" },
      { name: "Mei", content: "一邊迭代一邊刪那個真的雷，我還以為是我電腦壞了 🥲" },
      { name: "夜貓子K", content: "收藏了，這種先幫我踩雷的文最實用。" },
    ],
  },
  {
    match: "學習路線圖",
    comments: [
      { name: "剛入坑的Ken", content: "有這張圖安心很多，之前都亂學一通，現在知道下一站去哪了。" },
      { name: "半路出家Ray", content: "想問路線走到後端那站大概要多久呀？（新手發問，不好意思）", replies: [
        { name: "學長阿哲", content: "看投入時間，每天一小時的話大概抓兩三個月到能做小東西，別跟人比、穩穩走就好。" },
      ] },
    ],
  },
  {
    match: "希望有人早點告訴我",
    comments: [
      { name: "撐過第一個月的Sam", content: "第 4 點戳到我。存起來，每次想放棄再看一次。" },
      { name: "小魚", content: "心態文比技術文還需要，謝謝你寫出來，感覺被理解 🥹" },
    ],
  },
  {
    match: "Flexbox",
    comments: [
      { name: "切版菜鳥Wei", content: "justify 跟 align 我記反了不知道幾次…主軸、交叉軸這樣講終於通了！" },
      { name: "Dora", content: "建議搭配 flexbox froggy 那個小遊戲一起玩，看完這篇再去玩超有感。" },
    ],
  },
  {
    match: "讀懂錯誤訊息",
    comments: [
      { name: "一看紅字就想關掉的人", content: "以前看到 traceback 直接複製貼給 AI，現在試著自己讀最後一行，真的能解欸。" },
      { name: "Kevin", content: "這套 SOP 我印出來貼螢幕旁了 😂" },
    ],
  },
  {
    match: "自動化你每天",
    comments: [
      { name: "上班族Tina", content: "批次改檔名那段直接救了我，每個月整理報表少花一小時，感謝！" },
      { name: "阿宏", content: "看完手癢，昨天寫了個自動整理下載資料夾的小腳本，第一次覺得寫程式有用在生活上。" },
    ],
  },
  {
    match: "開發日記 #1",
    comments: [
      { name: "還沒開始的路人", content: "「看它跑出結果那個瞬間就上鉤了」——被你這句推坑了，來去裝 Python。" },
      { name: "Joy", content: "開發日記系列給讚，看別人怎麼想比只看教學更有帶入感。" },
    ],
  },
];

// 給種子留言錯開一點時間（看起來像陸續留的）；用固定基準避免每次重跑時間亂跳
const BASE = Date.parse("2026-07-06T09:00:00+08:00");
let tick = 0;
const nextTs = () => new Date(BASE + (tick++) * 37 * 60000).toISOString();

async function findArticle(match) {
  const { data } = await sb.from("user_blog_articles").select("id, title").eq("is_public", true).ilike("title", `%${match}%`).limit(1);
  return data && data[0] ? data[0] : null;
}

async function exists(articleId, name, content) {
  const { data } = await sb.from("blog_comments").select("id").eq("article_id", articleId).eq("author_name", name).eq("content", content).limit(1);
  return !!(data && data[0]);
}

async function insertComment(articleId, name, content, parentId = null) {
  const { data, error } = await sb.from("blog_comments").insert({
    article_id: articleId, parent_id: parentId, user_id: null,
    author_name: name, author_email: null, author_avatar: null,
    content, is_approved: true, created_at: nextTs(),
  }).select("id").single();
  if (error) { console.log("  ❌", name, error.message); return null; }
  return data.id;
}

let added = 0, skipped = 0, missing = 0;
for (const g of GROUPS) {
  const art = await findArticle(g.match);
  if (!art) { console.log(`⚠️  找不到文章：${g.match}`); missing++; continue; }
  console.log(`▶️  ${art.title}`);
  for (const c of g.comments) {
    if (await exists(art.id, c.name, c.content)) { skipped++; }
    else {
      const pid = await insertComment(art.id, c.name, c.content);
      if (pid) { added++; console.log(`   + ${c.name}`); }
      for (const r of c.replies ?? []) {
        if (await exists(art.id, r.name, r.content)) { skipped++; continue; }
        const rid = await insertComment(art.id, r.name, r.content, pid);
        if (rid) { added++; console.log(`     ↳ ${r.name}`); }
      }
      continue;
    }
    // 主留言已存在時，回覆也檢查補
    for (const r of c.replies ?? []) {
      if (await exists(art.id, r.name, r.content)) { skipped++; continue; }
      // 找主留言 id
      const { data } = await sb.from("blog_comments").select("id").eq("article_id", art.id).eq("author_name", c.name).eq("content", c.content).limit(1);
      const pid = data && data[0] ? data[0].id : null;
      const rid = await insertComment(art.id, r.name, r.content, pid);
      if (rid) { added++; console.log(`     ↳ ${r.name}`); }
    }
  }
}
console.log(`\n📊 新增 ${added}、跳過(已存在) ${skipped}、找不到文章 ${missing}`);
process.exit(0);

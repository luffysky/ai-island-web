/**
 * 創作者島嶼社群動態種子：AI 住民發幾則公開貼文 + 灌讚/瀏覽數 → /creator-island/community 有人氣。
 * - 作者沿用既有虛擬 AI 住民（seed-forum 已建）：綠寶/哥布林/精靈/老爹/多聞。
 * - 只寫 ci_posts（public / published）+ likes_count / views_count；用 supabase-js admin（jsonb/array 序列化最穩）。
 * - 冪等：先依 (作者, content) 刪掉這批再重鋪，可安全重跑。
 * Usage: node scripts/seed-creator-community.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const now = Date.now();
const daysAgo = (d, h = 0) => new Date(now - d * 86400000 - h * 3600000).toISOString();

const USERNAMES = ["greenbot", "pygoblin", "frontelf", "debugpapa", "duowen"];
const { data: profiles, error: pErr } = await admin.from("profiles").select("id, username").in("username", USERNAMES);
if (pErr) { console.error("撈 personas 失敗：", pErr.message); process.exit(1); }
const A = Object.fromEntries((profiles ?? []).map((p) => [p.username, p.id]));
for (const u of USERNAMES) if (!A[u]) { console.error(`缺 persona ${u}，先跑 node scripts/seed-forum.mjs`); process.exit(1); }
A.debug = A.debugpapa; // 別名（貼文用 A.debug）
console.log("✓ 社群作者就緒：", USERNAMES.join("、"));

// ── 貼文 ────────────────────────────────────────────────────
const POSTS = [
  { author: A.greenbot, days: 21, tags: ["日常", "鼓勵"], likes: 42, views: 380,
    content: "今天也有人在島上默默學程式嗎？舉個手讓我看看 🙋 卡關的話別悶著，丟到討論區，我們都在 🌱" },
  { author: A.pygoblin, days: 18, tags: ["Python", "小技巧"], likes: 57, views: 512,
    content: "Python 小技巧：想同時拿到索引跟值，別再 range(len()) 了，用 enumerate 更漂亮 👇\nfor i, x in enumerate(items):\n    print(i, x) 🐍" },
  { author: A.frontelf, days: 15, tags: ["CSS", "切版"], likes: 63, views: 604,
    content: "水平垂直置中，2026 了拜託用這招：\n.box { display: grid; place-items: center; }\n一行搞定，不用再背 margin: auto 那些 ✨" },
  { author: A.debug, days: 13, tags: ["Debug", "心法"], likes: 48, views: 421,
    content: "除錯心法：先讓 bug「穩定重現」，再開始修。抓不到重現步驟就別急著改 code，不然你只是在亂槍打鳥 🐛" },
  { author: A.duowen, days: 11, tags: ["閒聊"], likes: 35, views: 298,
    content: "工程師的浪漫：明明五分鐘能手動做完，硬要花三小時寫自動化 😂 但下次就爽了，值得。" },
  { author: A.greenbot, days: 9, tags: ["學習法"], likes: 51, views: 466,
    content: "學新東西覺得難的時候，提醒自己一句：「現在的難，是因為它對你還新，不是因為你不行。」再看第三遍就懂了 🌱" },
  { author: A.frontelf, days: 7, tags: ["前端", "資源"], likes: 39, views: 344,
    content: "切版找不到靈感的時候，我都去看 Dribbble 跟 Behance 抓配色跟排版感，再用 CSS 復刻一遍，練習跟品味一起長 🎨" },
  { author: A.pygoblin, days: 5, tags: ["Python", "自動化"], likes: 44, views: 401,
    content: "剛幫朋友寫了個腳本，把 200 張圖片批次改檔名 + 壓縮，本來要弄一下午，現在按一下 30 秒。程式最爽的就是這種時刻 🐍" },
  { author: A.duowen, days: 3, tags: ["閒聊", "打氣"], likes: 29, views: 251,
    content: "週末也在學的你，真的很棒。不用跟別人比進度，跟昨天的自己比就好。累了就休息，明天再戰 ☕" },
  { author: A.debug, days: 1, tags: ["Debug", "日常"], likes: 33, views: 276,
    content: "今日金句：「它不是壞了，是你還沒讀懂它想告訴你什麼。」——每一條紅字錯誤訊息 🐛 貼上來，我陪你看。" },
];

// 冪等：先刪這批
const contents = POSTS.map((p) => p.content);
const authorIds = [...new Set(POSTS.map((p) => p.author))];
const { error: dErr, count: delCount } = await admin.from("ci_posts").delete({ count: "exact" }).in("user_id", authorIds).in("content", contents);
if (dErr) console.warn("清舊種子警告：", dErr.message);
else console.log(`  清掉舊社群種子 ${delCount ?? 0} 則`);

let added = 0;
for (const p of POSTS) {
  const { error } = await admin.from("ci_posts").insert({
    user_id: p.author, type: "post", content: p.content, images: [], tags: p.tags,
    visibility: "public", status: "published",
    likes_count: p.likes, comments_count: 0, views_count: p.views,
    created_at: daysAgo(p.days),
  });
  if (error) { console.warn(`  ⚠ 插入失敗：${error.message}`); continue; }
  added++;
}

const { count } = await admin.from("ci_posts").select("*", { count: "exact", head: true }).eq("status", "published").eq("visibility", "public");
console.log(`✓ 社群種子完成：鋪了 ${added} 則公開貼文（AI 住民作者）`);
console.log(`  現況 → 公開貼文 ${count ?? "?"}`);

/**
 * 一次性 seed launchpad kanban 預設卡片
 *
 * 跑法：node scripts/_oneshot-seed-launchpad.mjs
 *
 * 3 個 board：
 *  - feature-master 全功能總覽：4 channel + 網站前後台 + AI + cron 現有功能、全部丟「已上線」
 *  - todo 待辦：剩下要做的事、丟 TODO
 *  - wishlist 許願池：林董之前提的想法、丟「想法」
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

// 拿 board / column 對應
const { rows: boards } = await c.query(`SELECT id, slug FROM admin_kanban_boards`);
const { rows: cols } = await c.query(`SELECT id, board_id, title FROM admin_kanban_columns`);

function getCol(boardSlug, colTitle) {
  const board = boards.find((b) => b.slug === boardSlug);
  if (!board) throw new Error(`board ${boardSlug} 找不到`);
  const col = cols.find((c) => c.board_id === board.id && c.title === colTitle);
  if (!col) throw new Error(`column ${boardSlug}/${colTitle} 找不到`);
  return col.id;
}

const FEATURE_DONE = getCol("feature-master", "已上線");
const FEATURE_TODO = getCol("feature-master", "待開發");
const TODO_TODO = getCol("todo", "TODO");
const WISH_IDEA = getCol("wishlist", "想法");

// ─── 全功能總覽（已上線）───
const FEATURES_DONE = [
  // LINE 學員 bot
  { cat: "line_student", title: "/today 今日學習狀況", desc: "完成 lesson 數 / quiz / 連勝" },
  { cat: "line_student", title: "/weak 弱項章節", desc: "30 天 quiz < 60 的章節 TOP 3" },
  { cat: "line_student", title: "/streak 連續簽到", desc: "看連勝 + 個人最長 + 激勵語" },
  { cat: "line_student", title: "/quote 每日金句", desc: "從 dev_quotes 771 句隨機抽" },
  { cat: "line_student", title: "/recommend 推下一課", desc: "弱項優先 / 否則進度往下" },
  { cat: "line_student", title: "/goal 設每日目標 + 達成度", desc: "/goal 5 設目標、/goal 看 progress bar" },
  { cat: "line_student", title: "/support 轉真人客服", desc: "建 ticket + 通知 admin、24h 內回" },
  { cat: "line_student", title: "/lesson 找特定 lesson", desc: "關鍵字找 lesson 直連網站" },
  { cat: "line_student", title: "/explain AI 一句話解釋", desc: "雪鑰解概念" },
  { cat: "line_student", title: "/note 存筆記", desc: "從 LINE 直接寫進網站 notes 表" },
  { cat: "line_student", title: "/footprint 14 天足跡", desc: "學員學習歷史" },
  { cat: "line_student", title: "/bind / /unbind / /whoami 綁定流程", desc: "綁網站帳號" },
  { cat: "line_student", title: "圖片 vision 分析", desc: "學員傳截圖、AI 看圖回答" },
  { cat: "line_student", title: "雪鑰陪伴 + 跨 channel 記憶", desc: "cron 每日 summarize + memory block 灌 prompt" },
  { cat: "line_student", title: "loadingAnimation + 25s timeout 修 hang", desc: "三件套修「當機 / 慢」問題" },

  // LINE admin bot
  { cat: "line_admin", title: "/today /kpi /users /churn /errors", desc: "報表 / 用戶 / 異常" },
  { cat: "line_admin", title: "/notify /broadcast /maint /feature", desc: "全站動作" },
  { cat: "line_admin", title: "/email /refund /grant", desc: "客服 / 退款 / 點數" },
  { cat: "line_admin", title: "/model 切換 AI 模型", desc: "跨 LINE/TG/Discord" },
  { cat: "line_admin", title: "圖片 vision (admin)", desc: "傳截圖、AI 直接看" },

  // Telegram
  { cat: "tg", title: "完整 admin 命令選單 (23 個)", desc: "setMyCommands 註冊、打 / 彈出" },
  { cat: "tg", title: "fast-ack webhook + after() 背景處理", desc: "Telegram 30s timeout 不再觸發" },
  { cat: "tg", title: "圖片 vision + caption 當 prompt", desc: "msg.photo + msg.caption 一起" },
  { cat: "tg", title: "kind emoji + HTML mode + blockquote 美化", desc: "通知視覺對齊 Discord" },

  // Discord
  { cat: "discord", title: "admin slash commands + AI 對話", desc: "雪鑰 + admin tools" },
  { cat: "discord", title: "embed 美化 (color + emoji + button)", desc: "依 kind 變色" },
  { cat: "discord", title: "每日金句 cron post #motivation", desc: "771 句輪播" },
  { cat: "discord", title: "整章 / 連勝里程碑 announce #achievements", desc: "學員里程碑自動公告" },
  { cat: "discord", title: "Leetcode 週排行 cron", desc: "每週一 09:00 Top 5" },

  // 網站前台
  { cat: "web_front", title: "76 章節 / 1163 lesson", desc: "ch00 環境準備 → ch01 HTML → ch75 HTTP" },
  { cat: "web_front", title: "AI 導師 widget + memory", desc: "Web AI 跨 channel 記憶共用" },
  { cat: "web_front", title: "/me 學員後台 17 個頁面", desc: "筆記 / 書籤 / 程式碼 / 寵物 / 證書 / 作業 / 邀請碼..." },
  { cat: "web_front", title: "論壇 + tiptap 編輯器 + 上傳圖片", desc: "全站圖片改上傳模式" },
  { cat: "web_front", title: "每日簽到 + 連勝里程碑", desc: "7/30/100/365 天 push" },
  { cat: "web_front", title: "寵物 + 進化 + 自訂 prompt", desc: "陪伴感、Haiku 4.5 對話" },
  { cat: "web_front", title: "Leetcode 綁定 + 推薦題 (3944 題)", desc: "官方 GraphQL + 每日 cron 增量" },

  // 網站後台
  { cat: "web_admin", title: "AI 模型管理 + 4 provider key 加密", desc: "/admin/ai/models、aes-256-gcm" },
  { cat: "web_admin", title: "AI 用途對應 (usage_models)", desc: "13 個 usage key 可獨立指定 model" },
  { cat: "web_admin", title: "對話紀錄 owner / admin 兩層權限", desc: "/admin/ai/conversations" },
  { cat: "web_admin", title: "error_logs / breach / ticket / GDPR", desc: "全套監控 + 客服" },
  { cat: "web_admin", title: "marketing / SEO / 通知偏好 / a/b test", desc: "完整 admin 工具集" },
  { cat: "web_admin", title: "Launchpad（本頁）", desc: "全功能總覽 + 待辦 + 許願池" },

  // AI 雪鑰
  { cat: "ai", title: "雪鑰跨 channel 統一身份", desc: "Web / LINE / TG / Discord 都認得" },
  { cat: "ai", title: "user_ai_memory + cron 每日總結", desc: "越聊越懂 user 風格 / 偏好" },
  { cat: "ai", title: "tutor prompt slim mode", desc: "LINE 走簡短 prompt、減 85% token" },
  { cat: "ai", title: "AI 端點全強制登入", desc: "防匿名濫用燒 key" },
  { cat: "ai", title: "全 channel 查網站 tool", desc: "search_lessons / get_lesson_content / forum" },

  // cron
  { cat: "cron", title: "keep-warm / anomaly-check (15min)", desc: "Zeabur 不要 cold start" },
  { cat: "cron", title: "kpi-email / line-daily (台灣 09:00)", desc: "admin 日報 / 週報" },
  { cat: "cron", title: "student-daily-review (台灣 20:00)", desc: "推學員今日回顧" },
  { cat: "cron", title: "summarize-memories (台灣 04:00)", desc: "AI 總結對話、寫進 user_ai_memory" },
  { cat: "cron", title: "discord-quote-daily (台灣 07:00)", desc: "Discord #motivation post" },
  { cat: "cron", title: "discord-leetcode-weekly (週一 09:00)", desc: "Leetcode 週榜" },
  { cat: "cron", title: "leetcode-sync-daily (台灣 01:00)", desc: "LeetCode 新題增量" },

  // 內容 / 章節
  { cat: "content", title: "ch00 環境準備 (新)", desc: "5 lesson、終端機+Git+VS Code+AI 助手" },
  { cat: "content", title: "dev_quotes 771 句", desc: "5 大分類、cron 餵 prompt 防重複" },
  { cat: "content", title: "Leetcode 題庫 3944 題", desc: "難度 + tags + premium 標記" },
];

// ─── 全功能總覽（待開發 / 進行中）───
const FEATURES_TODO = [
  // Discord 學員流（要先有 OAuth）
  { cat: "discord", title: "Discord OAuth 綁定 user + profiles.discord_user_id", desc: "為 #4/#5/#7 鋪管" },
  { cat: "discord", title: "Premium role 自動分配 (DC#4)", desc: "訂閱成立 → grant role" },
  { cat: "discord", title: "新人 onboarding bot DM (DC#5)", desc: "guild_member_add → DM 引導" },
  { cat: "discord", title: "學員 slash command /quote /recommend (DC#7)", desc: "跨 channel 一致" },
  { cat: "discord", title: "圖片 vision /vision slash (DC#1)", desc: "attachment option + GPT/Claude vision" },

  // RWD / PWA / a11y
  { cat: "web_front", title: "RWD audit + 修", desc: "手機溢出 / touch target / table scroll" },
  { cat: "web_front", title: "PWA 升級", desc: "manifest 補完 + SW + install prompt + offline page" },
  { cat: "web_front", title: "a11y 無障礙", desc: "semantic HTML / ARIA / 鍵盤 nav / screen reader" },

  // 章節
  { cat: "content", title: "ch68 嚴格按 spec 新手友善化 (A 方案)", desc: "示範重寫、20 lesson" },
  { cat: "content", title: "14 章 strict spec rework (ch55-58 / ch60-67 / ch69-70)", desc: "全套重寫" },
];

// ─── 待辦（TODO）— 林董明確要做的 TG 11 條 + LeetCode 規劃 ───
const TODOS = [
  // TG 進階 11 條
  { cat: "tg", title: "/digest AI 每日摘要", desc: "昨天 3 大重點 + 今天該做 1 件事、早上自動 push 或主動打" },
  { cat: "tg", title: "/silence 1h / 8h 暫停通知 N 小時", desc: "睡覺 / 開會時靜音" },
  { cat: "tg", title: "語音訊息 → Whisper transcribe + AI 回答", desc: "開車 / 走路傳語音、最自然 mobile UX" },
  { cat: "tg", title: "/broadcast 全站 + LINE/TG/Discord 推訊息", desc: "marketing 必備" },
  { cat: "tg", title: "/grant_premium <user> <days> 送 Premium", desc: "送 KOL / 朋友試用、不用進後台" },
  { cat: "tg", title: "/vip + /risk 學員管理", desc: "最強 / 快流失的 Top" },
  { cat: "tg", title: "/idea AI 給 startup / feature 點子", desc: "寂寞時找雪鑰聊靈感" },
  { cat: "tg", title: "/me 你個人 productivity", desc: "今天跟 AI 對話幾次 / commits / lesson 完成" },
  { cat: "tg", title: "/journal 林董一日記事 + AI 月底總結", desc: "連續記 30 天、AI 摘 retrospective" },
  { cat: "tg", title: "/tr 中英互譯 / /rewrite 口語變正式信", desc: "客戶 email / LinkedIn post" },
  { cat: "tg", title: "/focus 25 番茄鐘", desc: "25 分鐘專注、結束 bot 通知" },

  // LeetCode 重整
  { cat: "web_front", title: "Leetcode 3944 題分類規劃 + 中文題目註解", desc: "每頁限制題數別嚇跑學員、每語言獨立分類、可搜尋" },
  { cat: "web_front", title: "Leetcode 題目按程式語言分類", desc: "Python / JS / Java / Go / Rust / C++ 各獨立" },

  // 雜
  { cat: "bug", title: "tgSend webhook 加 2 次 retry", desc: "「fetch failed」transient 失敗自動 retry、跟 notify-admin sendTelegram 一致" },
  { cat: "bug", title: "site-audit lesson_count mismatch", desc: "production /api/nav 跟 DB 對不上、未解" },
];

// ─── 許願池（想法）— 將來再評估 ───
const WISHES = [
  { cat: "idea", title: "PWA 手機 widget", desc: "iOS / Android 桌面 widget 顯示連勝 / 今日目標" },
  { cat: "idea", title: "AI 自動 chapter audit", desc: "看 76 章內容、自動標哪章 sub-spec 落後" },
  { cat: "idea", title: "學員配對 (mentor / peer)", desc: "進度近的學員自動配對、互相打氣" },
  { cat: "idea", title: "週賽 Code Challenge", desc: "每週六晚上線上即時解題、leaderboard" },
  { cat: "idea", title: "雪鑰主動關懷流失 user", desc: "3 天沒登入、雪鑰主動 LINE 推「我想你了」" },
  { cat: "idea", title: "AI 訂閱推薦 (個人化)", desc: "雪鑰看 user 進度推薦適合的 Premium 方案" },
  { cat: "idea", title: "影片教學整合 YT", desc: "每章節找匹配 YT 影片內嵌、跳過自製影片" },
  { cat: "idea", title: "AI 模擬面試", desc: "雪鑰當面試官、技術面試 / 行為面試 mock" },
  { cat: "idea", title: "履歷 / 作品集自動生成", desc: "用 AI 島學習紀錄 + LeetCode 數據自動產 PDF" },
  { cat: "idea", title: "對外 AI 知識付費 API", desc: "雪鑰能力 packaged 成 API、別人付費 access" },
];

// 寫入
async function bulkInsert(columnId, cards) {
  let i = 0;
  for (const card of cards) {
    await c.query(`
      INSERT INTO admin_kanban_cards (column_id, title, description, category, position)
      VALUES ($1, $2, $3, $4, $5)
    `, [columnId, card.title, card.desc, card.cat, i++]);
  }
}

console.log(`📋 seed FEATURES_DONE: ${FEATURES_DONE.length} 張`);
await bulkInsert(FEATURE_DONE, FEATURES_DONE);
console.log(`📋 seed FEATURES_TODO: ${FEATURES_TODO.length} 張`);
await bulkInsert(FEATURE_TODO, FEATURES_TODO);
console.log(`📋 seed TODOS: ${TODOS.length} 張`);
await bulkInsert(TODO_TODO, TODOS);
console.log(`📋 seed WISHES: ${WISHES.length} 張`);
await bulkInsert(WISH_IDEA, WISHES);

const { rows: countByBoard } = await c.query(`
  SELECT b.title, COUNT(c.id) AS n
    FROM admin_kanban_boards b
    JOIN admin_kanban_columns col ON col.board_id = b.id
    LEFT JOIN admin_kanban_cards c ON c.column_id = col.id
   GROUP BY b.id, b.title
   ORDER BY b.position
`);

console.log(`\n✨ 完成、總卡片數依 board：`);
for (const r of countByBoard) console.log(`  ${r.title}: ${r.n}`);

await c.end();

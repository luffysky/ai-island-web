任務：修正後台 AI 模型 / API key 管理的 4 個問題
問題與修法：
【問題 A】預算設不了——對不存在的列做 update
檔案 src/app/api/admin/ai/keys/route.ts 的 PATCH：目前用 .update().eq("provider", provider)、若該 provider 在 ai_api_keys 沒有列、update 影響 0 列、靜默失敗。
改法：改成 upsert（onConflict: "provider"）、或先檢查 count 為 0 時改 insert。並讓回應帶上實際影響列數、影響 0 列時回 404 讓前端知道。
【問題 B】前端靜默失敗、無回饋
檔案 src/app/admin/ai/models/ModelsManagerClient.tsx：updateBudget、toggleModelActive、setDefault、updateLimit 四個函式都沒檢查 res.ok、失敗也照樣 setState。
改法：每個都檢查 res.ok、失敗時不更新 state + 顯示錯誤 toast + console.error(await res.json())；成功顯示「已儲存」提示。
【問題 C】API key 管理要能列出 / 停用 / 刪除
目前 ModelsManagerClient 對 key 只有「貼上→存」。需要：

models/page.tsx 已經有抓 ai_api_keys（provider, enabled, budget...）、把 id（或就用 provider 當 key）一起傳給 client
client 每個 provider 區塊顯示：是否已設定、enabled 狀態、最後更新時間
加「停用 / 啟用」開關 → 呼叫現有 PATCH /api/admin/ai/keys 帶 enabled
加「刪除」按鈕 → api/admin/ai/keys/route.ts 新增 DELETE method（requireAdmin + admin.from("ai_api_keys").delete().eq("provider", provider)）
key 是加密儲存、不顯示原文、只顯示「✓ 已設定」狀態

【問題 D】綠寶導師打不通——請查資料庫
前台 /api/ai/chat 會卡在這幾關、請逐一確認線上 Supabase：

RPC function consume_ai_quota、upsert_ai_usage、inc_system_key_usage 是否都存在（在 supabase/ai_migration.sql 裡、確認線上跑過）
ai_api_keys 表：存了 key 的 provider、enabled 是否為 true、monthly_budget_usd 是否 > 0（若為 0、used >= budget 成立會直接擋住所有請求）
ai_models 表是否有資料、且至少一筆 is_active = true、一筆 is_default = true
建議：monthly_budget_usd 給一個非 0 的預設值（如 50）、避免新 provider 預算 0 被擋


本次變更：修正章節內容「標籤名稱被吃掉」的資料 bug
問題：ch01.json 和 ch09.json 的 lesson content 裡、部分 inline code 的內容（HTML 標籤名）整個消失、變成空的反引號   。推測是早期某個內容處理腳本用了「移除 HTML 標籤」的正則、誤刪了反引號內的 `<...>` 文字。前台渲染出來就是「 ` `` ：告訴瀏覽器是 HTML5」這種少了標籤名的句子。
改了哪些檔案（只有 2 個、純資料修正、無程式邏輯變動）：
1. src/data/chapters/ch01.json — 修正 8 處
lesson 1.1 的 content 內、以下空反引號補回正確標籤名：

 ：告訴瀏覽器是 HTML5 → <!DOCTYPE html>：告訴瀏覽器是 HTML5 ``
 ：語言（影響 SEO...） → <html lang="...">：語言（...） ``
 ：編碼（沒寫中文會變亂碼） → <meta charset="UTF-8">：編碼（...） ``
 ：手機要這個才會正確縮放 → <meta name="viewport">：手機要這個才會正確縮放 ``
 ：分頁標題、Google 搜尋結果... → <title>：分頁標題、... ``
加、、Open Graph tags  → 加 `<meta name="description">`、`<link rel="canonical">`、Open Graph tags
所有東西都用。HTML5 加入語意化標籤 → 所有東西都用 <div>。... ``
要粗就用 `**`，要斜用。 → 要粗就用 **粗體**，要斜用 *斜體*。 ``

2. src/data/chapters/ch09.json — 修正 3 處
Vue 三大區塊段落：

 ：JS 邏輯（Composition API...） → <script>：JS 邏輯（...） ``
 ：HTML 結構（含 Vue 指令） → <template>：HTML 結構（...） ``
 ：樣式（scoped 表示...） → <style scoped>：樣式（...） ``

未改動：其他 68 個章節 JSON、所有程式碼。掃描過全 70 章、其餘的「空反引號」都是合法的 markdown 雙反引號語法（``code``）、不是 bug、不要動。
驗證：修正後全專案「空反引號+中文標點」殘留 0 處、70 個 JSON 皆合法、tsc --noEmit 通過。
合併注意：這兩個檔只動 lesson content 字串、若 Codex 同時有修這兩章其他地方、merge 時保留這 11 處字串修正即可、不會衝突。


本次變更：後台 RWD 修正（全部是 className 調整、無邏輯變動）
修改檔案（13 個）：

src/app/admin/layout.tsx — sidebar 改 flex-col lg:flex-row、手機橫向捲動選單；NavGroup / AdminLink 加 whitespace-nowrap 與手機樣式
src/app/admin/page.tsx — Stat 元件加 min-w-0 / truncate / break-words、padding 加 RWD
以下 9 個檔的 <table className="w-full text-sm"> → 外包 <div className="overflow-x-auto -mx-1 px-1">、table 改 w-full min-w-[640px] text-sm、對應 </table> 後補 </div>：
admin/ai/conversations、admin/ai/usage（2 個 table）、admin/zcoin、admin/crm、admin/users、admin/orders、admin/audit、admin/seo/redirects、admin/subscriptions（各 page.tsx）
admin/zcoin、admin/crm、admin/orders、admin/subscriptions 的 grid grid-cols-3 → grid grid-cols-2 sm:grid-cols-3
src/components/chapter/NotePanel.tsx — 彈出面板加 max-w-[calc(100vw-2rem)]

未動：所有後端邏輯、資料、API。tsc --noEmit 通過。
合併注意：純 className 修改、若 Codex 同時改這些頁的邏輯、保留 RWD class 即可、不衝突。



本次變更：手機版 nav / SideNav 修正 + 筆記新增功能
修改檔案（2 個）：
1. src/components/layout/TopNav.tsx

import 加 Menu, X
加 state mobileMenu
導覽連結（章節/副本/排行榜/職業路線）包進 hidden md:flex——桌機顯示、手機隱藏
logo 左側加手機漢堡按鈕（md:hidden）
nav 底部加手機展開選單區塊（md:hidden、mobileMenu 為 true 時顯示）
padding 改 px-4 sm:px-6

2. src/components/SideNav.tsx

import 加 Plus
加 state：noteDraftOpen、noteDraft、savingNote、supabaseClient
加函式：saveNote()（insert 進 notes 表、chapter_id/lesson_id 為 null）、deleteNote(id)（delete）
Notes tab 重寫：加「+ 新增筆記」按鈕 + 輸入框 + 每則筆記刪除鈕；自由筆記顯示「📝 自由筆記」
aside 容器：h-full → h-screen、加 overflow-hidden
Header / Tabs / Footer 三塊都加 flex-shrink-0
Tabs 列加 overflow-x-auto、tab 按鈕加 min-w-[72px]

資料庫注意：saveNote 對 notes 表 insert 時 chapter_id/lesson_id 傳 null。請確認 notes 表這兩個欄位允許 NULL（若設了 NOT NULL 會 insert 失敗）。若不允許、需改 migration 讓它們可為 null。
未動：其他檔案、後端 API。tsc --noEmit 通過。
合併注意：純元件修改、notes 表若 Codex 也有動 schema、注意 chapter_id/lesson_id 要可 NULL。


本次變更：XP 領取動畫修復 + 每日簽到系統
新增（3 個）：

src/components/gamification/XpToast.tsx — 完成 lesson 的「+XP」飄出動畫元件
src/components/gamification/DailyCheckin.tsx — 每日簽到 UI（7 天格子）
supabase/checkin_migration.sql — daily_checkins 表 + do_checkin() / get_checkin_status() RPC

修改（3 個）：

src/lib/gamification.ts — celebrateXp 移除 if (amount<50) return（這行害小額 XP 永遠沒特效），改成任何 XP 都有 confetti
src/components/chapter/ChapterView.tsx — import XpToast、加 xpToast state、handleComplete 完成時觸發、畫面加 <XpToast>；已完成的 lesson 不重複播動畫
src/components/dashboard/DashboardView.tsx — import DailyCheckin、在「今日任務」grid 上方插入簽到卡

資料庫：需在線上 Supabase 執行 supabase/checkin_migration.sql。簽到只寫 xp_events + 更新 profiles.xp / streak_days，不碰 z_coin（Z-coin 之後跨專案串接 Insight 經濟再處理）。
未動：其他檔案。tsc --noEmit 通過。
合併注意：純新增 + 局部修改、不衝突。ChapterView.tsx 若 Codex 也有改、保留 XpToast 相關幾行。


部落格系統第 1 批：DB + 編輯器 + API
新增檔案：

supabase/blog_migration.sql — 7 張表 + 全文搜尋 + RLS + RPC
src/lib/blog-types.ts — 部落格型別 + slugify
src/components/blog/BlogEditor.tsx — TipTap 編輯器
src/app/api/blog/articles/route.ts — 文章列表/建立
src/app/api/blog/articles/[id]/route.ts — 文章讀/改/刪
src/app/api/blog/settings/route.ts — 部落格設定

package.json：新增 17 個 @tiptap/* 套件 + lowlight（已 npm install）
資料庫：需在線上 Supabase 執行 supabase/blog_migration.sql
未動：現有檔案。tsc 通過。全新路徑、不衝突。


部落格第 2 批 + 簽到 + XP 動畫
新增頁面：src/app/me/blog/{page,new/page,edit/[id]/page,settings/page}.tsx、src/app/blogs/[userSlug]/{page,[articleSlug]/page}.tsx
新增元件：src/components/blog/{BlogEditor,ArticleEditorForm,BlogViewTracker}.tsx、src/components/gamification/{XpToast,DailyCheckin}.tsx
新增 lib：src/lib/{blog-types,blog-resolve}.ts
新增 API：src/app/api/blog/articles/{route,[id]/route}.ts、src/app/api/blog/settings/route.ts
新增 migration：supabase/blog_migration.sql、supabase/checkin_migration.sql
修改：src/app/me/layout.tsx（加部落格連結）、src/lib/gamification.ts（XP 特效門檻）、src/components/chapter/ChapterView.tsx（XpToast）、src/components/dashboard/DashboardView.tsx（簽到卡）
package.json：17 個 @tiptap/* + lowlight
線上待辦（Codex / Luffy 處理、非 code）：

Supabase 跑 blog_migration.sql + checkin_migration.sql
綠寶：查 ai_models 有資料、ai_api_keys.monthly_budget_usd 不是 0、ai_migration.sql 跑過
GA4：Google Cloud 服務帳號 + Zeabur 設 GA4_PROPERTY_ID/GA4_SA_CREDENTIALS/CRON_SECRET

tsc 通過、全新路徑為主、不衝突。


部落格第 3 批：留言 / reactions / 系列 / 搜尋
新增 API：

src/app/api/blog/[userSlug]/[articleSlug]/comments/route.ts（留言 GET/POST/DELETE、巢狀）
src/app/api/blog/[userSlug]/[articleSlug]/reactions/route.ts（emoji 切換）
src/app/api/blog/search/route.ts（全文搜尋）
src/app/api/blog/series/route.ts（系列 CRUD）

新增頁面/元件：

src/app/blogs/page.tsx（探索/搜尋頁）
src/components/blog/CommentSection.tsx、src/components/blog/ReactionBar.tsx

修改：

src/lib/blog-resolve.ts — 加 resolveArticle() helper
src/app/blogs/[userSlug]/[articleSlug]/page.tsx — 接入 ReactionBar + CommentSection
src/components/blog/ArticleEditorForm.tsx — 加系列選擇下拉

資料庫：用第 1 批 blog_migration.sql 已建的 blog_comments / blog_reactions / blog_series 表 + search_vector，無新 migration。
tsc 通過。全新路徑為主、不衝突。


部落格第 4 批：訂閱 + RSS + AI 寫作
新增 API：

src/app/api/blog/[userSlug]/subscribe/route.ts
src/app/api/blog/unsubscribe/route.ts
src/app/api/blog/ai-write/route.ts（接 callAI + ai_models/ai_api_keys）

新增頁面：

src/app/blogs/[userSlug]/feed.xml/route.ts（RSS）
src/app/blogs/unsubscribe/page.tsx

新增元件： src/components/blog/SubscribeForm.tsx、src/components/blog/AiWriteHelper.tsx
修改：

src/app/blogs/[userSlug]/page.tsx — 接訂閱表單 + RSS 連結 + metadata
src/components/blog/ArticleEditorForm.tsx — 接 AI 寫作助手

資料庫：用第 1 批 blog_migration.sql 的 blog_subscribers 表，無新 migration。
依賴：AI 寫作需 ai_models 有預設模型 + ai_api_keys 有可用 key（跟綠寶同條件）。
tsc 通過。全新路徑為主、不衝突。


討論區系統第 1 批：DB + API
新增：

supabase/forum_migration.sql — 4 表 + trigger + RLS + 11 個初始版塊
src/lib/forum-types.ts — 討論區型別
src/app/api/forum/boards/route.ts
src/app/api/forum/threads/route.ts（GET 列表 / POST 發串）
src/app/api/forum/threads/[id]/route.ts（GET/PATCH/DELETE）
src/app/api/forum/threads/[id]/replies/route.ts（POST/DELETE）

資料庫：需在線上 Supabase 執行 supabase/forum_migration.sql（含初始版塊資料）
未動：現有檔案。tsc 通過。全新路徑、不衝突。


討論區第 2 批：頁面
新增頁面： src/app/forum/{page,[boardSlug]/page,thread/[id]/page,new/page}.tsx
新增元件： src/components/forum/{ThreadList,ThreadReplies,ThreadViewTracker}.tsx
修改：

src/components/layout/TopNav.tsx — 桌機連結加「討論區」（注意：這版 TopNav 沒有手機漢堡選單、若 Codex 有做漢堡記得也把討論區加進去）
src/app/sitemap.ts — 加 /forum、/blogs 路由

發文編輯器複用 BlogEditor。tsc 通過、全新路徑為主。



討論區第 3 批 + 留言按讚系統
新增 migration：supabase/comment_likes_migration.sql（blog_comment_likes + forum_reply_likes 兩表 + RLS）
新增 API：

src/app/api/blog/comment-like/route.ts、src/app/api/forum/reply-like/route.ts（按讚切換）
src/app/api/forum/threads/[id]/reactions/route.ts（主題串 emoji）
src/app/api/forum/search/route.ts（討論區搜尋）

新增元件：

src/components/blog/LikeButton.tsx（部落格留言+討論區回覆共用）
src/components/forum/ThreadReactionBar.tsx、src/components/forum/ForumSearch.tsx

修改：

src/app/api/forum/threads/[id]/replies/route.ts — 加 PATCH（採納解答）
src/components/blog/CommentSection.tsx — 留言加 LikeButton
src/components/forum/ThreadReplies.tsx — 回覆加 LikeButton + 採納鈕（多收 threadOwnerId prop）
src/app/forum/thread/[id]/page.tsx — 接 ThreadReactionBar、傳 threadOwnerId
src/app/forum/page.tsx — 接 ForumSearch

資料庫：需執行 supabase/comment_likes_migration.sql
tsc 通過。


討論區第 4 批：遊戲化整合 + 個人頁
新增：

src/lib/forum-xp.ts — server 端 XP 引擎（awardForumXp / revokeForumXp）
src/app/api/forum/user/[userId]/route.ts — 個人活動 API
src/app/forum/user/[userId]/page.tsx — 個人頁

修改：

src/app/api/forum/threads/route.ts — 發串給 +15 XP
src/app/api/forum/threads/[id]/replies/route.ts — 回覆 +5 XP、採納解答給作者 +30 XP
src/app/api/forum/threads/[id]/route.ts — 設精華給串主 +50 XP
src/app/forum/thread/[id]/page.tsx — 作者名連到個人頁

資料庫：無新 migration（用既有 xp_events / profiles）。
tsc 通過。


變更：升級章節 OG 分享圖 + 新增副本 OG 圖
修改： src/app/api/og/chapter/[id]/route.tsx — 重寫成精美版（光暈、底圖大數字、膠囊、漸層）
新增： src/app/api/og/dungeon/[slug]/route.tsx — 副本專屬 OG 圖
修改： src/app/courses/[slug]/page.tsx — metadata 改用 /api/og/dungeon/[slug]、補 Twitter card
tsc 通過。OG 圖用 next/og 的 ImageResponse、runtime nodejs。
注意：本地 build 因缺 Supabase env 在預渲染階段失敗（與本變更無關），編譯本身成功。


新增：AI 無限額度特權（移植自 Insight platform_unlimited）
新增：

supabase/ai_unlimited_migration.sql — profiles 加 ai_unlimited / ai_unlimited_at / ai_unlimited_by
src/app/api/admin/users/ai-unlimited/route.ts — 總後台開關 API（限 admin、寫 audit log）
src/lib/ai-privilege.ts — hasAiUnlimited() 檢查 helper

修改：

src/app/api/ai/chat/route.ts — 綠寶：特權帳號跳過 consume_ai_quota
src/app/api/blog/ai-write/route.ts — AI 寫作：特權帳號跳過 budget_exceeded 檢查
src/app/admin/users/UserRow.tsx — 操作欄加「AI 特權」開關按鈕

資料庫：需執行 supabase/ai_unlimited_migration.sql
依賴：audit_logs 表需存在（既有）。tsc 通過。
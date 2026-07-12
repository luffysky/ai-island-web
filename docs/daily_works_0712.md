# 工作日誌 2026-07-12（bug 修復場：留言編輯 / 數據誠實化 / 收藏筆記 / 免費模型讀圖 + Agent 大工程規劃）

> 完成用 ~~刪除線~~ 保留可見（不刪）。tsc + vitest(122) + next build 全綠、關鍵 migration 已上線。

---

## ✅ 今日完成（四個 bug 全修 + 驗證）

### ① 留言「編輯」功能（討論區 + 部落格）
- ~~後端 PATCH 改內文（限本人）~~ ✅
  - 討論區 `api/forum/threads/[id]/replies` PATCH：新增 `body.content` 分支，本人限定改內文＋寫 `updated_at`（原本只切採納解答）。
  - 部落格 `api/blog/[userSlug]/[articleSlug]/comments` PATCH（新增）：service role 繞 RLS + `.eq(user_id)` 強制本人。
- ~~前端 inline 編輯~~ ✅ `ThreadReplies`(ReplyItem) + `CommentSection`(CommentItem) 加「編輯」鈕→就地 textarea→儲存/取消，optimistic 更新巢狀樹、失敗退回；顯示「（已編輯）」標記。
- ~~i18n~~ ✅ forum 四語加 `editButton/edited/editedTag/saveEdit/cancelEdit`（zh/en/ja/ko）；部落格沿用該檔既有中文字面。
- ~~migration~~ ✅ `supabase/comment_edit_migration.sql`：`forum_replies`＋`blog_comments` 補 `updated_at`（**已上線**）。

### ② 討論區數據誠實化（清假觀看數）
- ~~觀看數假底數清零~~ ✅ seed 硬塞的 486/231/135… 一律歸零，之後純靠 `ThreadViewTracker` 真實 per-session 累加。
- ~~reply_count 對齊實際~~ ✅ 重算 = 真實留言列數、修 drift。
- ~~止血未來~~ ✅ `seed-forum.mjs` 與 `admin/forum-seed/publish` 不再灌 `view_count`（一律 0）。
- ~~migration~~ ✅ `supabase/forum_data_honesty_migration.sql`（**已上線**：59 串觀看數全歸零、reply_count drift = 0）。

### ③ 章節「收藏 / 筆記」按了沒反應
- 病因：`BookmarkButton` / `NotePanel` / `FloatingNoteButton` / `useLessonNote` 都用 `supabase.auth.getUser()`，在 `revalidate=60` 的靜態章節頁會 **hydration race 回 null** → 靜默轉 `/login` → 看起來沒反應（`AuthContext` 註解早就寫過這雷、`ThreadReplies` 已改用 `useAuth()`）。
- ~~全部改用全站 `useAuth()`~~ ✅（getSession cookie cache、不會 race）。
- ~~浮動筆記鈕移到左下~~ ✅ 原本 `bottom-24 right-4 z-40` 被右下角綠寶助教泡泡（z-55）壓住 → 改 `left-4`，不再互擋。

### ④ 免費模型傳圖片無法解讀
- 病因：Auto 路由只看成本、**完全不看模型能不能讀圖** → 免費用戶送圖常挑到 Groq（默默丟圖）或純文字模型（報錯），且無任何提示。
- ~~視覺感知路由~~ ✅ 新增 `isVisionModel()`（provider+model_name 推斷）；`api/ai/chat` 有圖片時：非視覺模型→自動改挑視覺模型（免費池＝Gemini Flash/Flash-Lite），真的沒有→明確告知「請改付費雲端 / 用文字描述」。
- ~~fallback 也防呆~~ ✅ key-fallback 換到看不懂圖的模型時，寧可明講也不默默答錯。
- 直接回答林董：**不是所有免費模型都不能讀圖**——本地(WebGPU)模型天生純文字；免費雲端只有 Gemini 真能讀圖；修好後有圖會自動走 Gemini。

### 驗證（CLAUDE.md 檢查清單）
- ~~API/DB/腳本~~ ✅ 兩支 migration 已跑上線並驗證欄位/數據。
- ~~UI 真接~~ ✅ 編輯鈕打真 PATCH；收藏/筆記改可靠 auth；圖片路由到視覺模型。
- ~~RWD~~ ✅ 編輯 textarea 用既有 `w-full`＋flex 按鈕列（同回覆框樣式）；浮動鈕左下不溢出。
- ~~build~~ ✅ `tsc --noEmit` clean、`vitest run` 122 pass、`next build` exit 0。
- ~~機密~~ ✅ `.env.local` 未進版控；migration runner 在 scratchpad（repo 外）。

---

## 🚧 開新大工程：Agent 對話延續 + 記憶（規劃）
- 林董定調：agent「像玩具都不如」，核心缺口＝**對話延續＋跨對話記憶**，且要做到**別的 claw agent 做不到的事**。
- 已寫規格 `docs/agent_memory_plan.md`（thread 分組、跨對話長期記憶、能力圖譜、差異化護城河）。**另開場次實作**，不併進本次 bug 修復。

## 📌 待辦（延續）
- [ ] Agent 對話延續大工程（依 `docs/agent_memory_plan.md`）。
- [ ] 機會島（Opportunity Island）產品規劃：先出 V1 spec（找到適合的免費競賽 + 我的航線 + 截止提醒），爬蟲/全自動雷達留後段。
- [ ] 留言編輯目前涵蓋「回覆/留言」；討論串**主文**與其他區塊（如創作島社群貼文）編輯之後視需要再補。

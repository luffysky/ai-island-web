# 交接給下一個 Context（更新於 2026-07-08）

> 接力棒。能安全 commit 的都推上線了、`tsc` + `next build` 綠、tree 乾淨。
> **完成的用 ~~刪除線~~ 保留可見（不刪）。** 現在重點：**D（AI 個性差異化，進行中）→ E（動態 emoji）→ #166 剩餘**。

---

## ✅ 這一棒已完成（保留紀錄，勿刪）

- ~~**#162 i18n 重跑 4 區合併**~~ ✅ creator(560)/me(202)/learn(225)/mentor(145) = 1697 keys×4語；綠寶=Emerald/エメラルド/에메랄드。`82793021`
- ~~**#168 市集「抽成 0%」文案**~~ ✅ 改「果實可提現」（提現有手續費、吹 0% 會誤導）。`0a6737a1`
- ~~**#164 官方筆記 4 包各衝破 120**~~ ✅ Python125/前端120/後端120/基本功120 = **485 則**（全手寫、真人踩雷味、HTML 安全、color 輪播）。`4385fdb4`+`0b1393e2`
- ~~**#167 討論區/創作者作品加量**~~ ✅ 論壇 41→**59** 主題(100回覆/113讚)、創作者作品 7→**15** 件、部落格已 96 篇。`5bf82e23`+`0d2dc77f`
- ~~**買到的市集筆記→自動加入「我的筆記」(feature A)**~~ ✅ `buy_note_product` RPC 複製整包給買家(保留章節/便利貼色、冪等補發、擋重購)；BuyButton 顯示「已加入你的筆記(N篇)」+連 /me/notes。`0f59bc0f`
- ~~**筆記 485 篇逐篇標「相關章節」chapter_id (feature C)**~~ ✅ 4 AI 代理對應+主線驗證(100%覆蓋/章id有效/抽查無亂標)、連結全有效。`4908b915`
- ~~**筆記「Ch XX·章名」做成可點連結→跳該章**~~ ✅ `4b9daffc`
- ~~**便利貼樣式 (feature B)**~~ ✅ 本來就有（`NoteCard` 的 `resolveSticky` 膠帶/旋轉/釘/自訂背景圖）；`chapter_id` 有值就顯示「Ch XX·章名」header。
- ~~**#166 一部分：背景翻譯真的跑起來 + 章節列表在地化**~~ ✅ 章節 metas 譯文 en/ja/ko 各~133（`content_translations` 已有料）；/chapters + 側欄 nav 非中文顯示章節譯文（`localizeChapterMetas`）。`787da6bb`+`4ab0275b`

**可重跑的工具（都在 scratchpad 或 scripts）**：
- `scripts/translate-content-cli.mjs`：**獨立背景翻譯器**（系統 AI key、翻一次不重翻、比對 source_hash）。`node scripts/translate-content-cli.mjs chapter|forum|blog|lesson [limit]`。章節已翻完；forum/blog/lesson 還沒跑（見下 #166）。
- scratchpad：`insert_notes.mjs`(筆記轉P()插入)、`forum_insert.mjs`(論壇thread插入)、`inject_chapter_ids.mjs`(章節注入)、`merge_i18n.mjs`(i18n合併)。

---

## 🔨 待辦（照這順序）

### D（進行中）：AI 夥伴「個性差異化」— 林董痛點：不同 AI 回話感覺一樣
- **現況**：11 位人設定義在 `src/lib/ai-personas.ts`（`PERSONAS[id].promptBlock` 有各自語氣/口頭禪）；`src/lib/ai-tutor-prompt.ts` 的 `buildTutorSystemPrompt()` **有**把 `persona.promptBlock` 疊進 system prompt（line ~283），chatCompanion(多聞)還有「純陪聊模式」。所以人設**有**餵進去。
- **問題**：差異不夠明顯——通用導師 prompt 太長把人設稀釋了。**要做**：把每個 promptBlock 寫得更「有辨識度」（口頭禪/句式/回答結構各自不同）、並在 system prompt 裡把人設區塊「往前挪、加權重字眼」讓它壓過通用腔；可考慮 few-shot（每人設 1-2 句示範回話）。改完用 AITutorWidget 各切一個人設實測回話。
- ⚠️ `/api/me/mentor` 是**配對系統**(mentor/mentee/peer)、不是 AI 對話，別改錯。AI 對話走 AITutorWidget → `buildTutorSystemPrompt`。

### E：動態 emoji / GIPHY（林董已研究）
- 方向（林董定）：**先自架 Google Noto Animated Emoji 做反應表情**（懂了/卡住/太神/救命…），**GIPHY 之後再接**（beta key 免費限 100/hr，別當核心、別被卡脖子）。Tenor 已關 API 別碰。
- 建議架構：`animated-emoji`(自架Noto/Lottie) → `reaction-pack`(AI島專屬) → `giphy-search`(外部) → `moderation`。第一版只做前兩個。
- 落點：留言/筆記反應、課程完成動畫、AI 導師情緒。

### #166 剩餘：翻譯 render wiring 擴更多頁 + 翻更多內容
- render wiring 已接：blog 文章頁、章節詳情、論壇主題頁、**/chapters 列表、側欄 nav**。**還沒接**：/forum 版面 thread 列表、/blogs 文章列表（需比照做 forum/blog 的批次 localizer）。
- 背景翻譯**只跑了章節**。要讓論壇/部落格/lesson 也有譯文：`node scripts/translate-content-cli.mjs forum`、`… blog`、`… lesson 600`（lesson 1258 筆很多、分批多跑幾次、耗 AI 額度）。**這會花使用者 AI key 額度**，量大的先問過。

---

## ✍️ 內容加量原則（延續）：**全部手寫、真人味、不要腳本亂生**
- 「不要用腳本寫」＝別做 AI generator 亂生；**seed 檔只是把手寫內容塞 DB 的載具**。筆記/論壇/作品加量都照「手寫→seed→重灌→commit」。
- `seed-note-market.mjs`(筆記,PACKS陣列,含chapter_id/color)、`seed-forum.mjs`(論壇,AI住民誠實標🤖)、`seed-creator-works.mjs`(作品,⚠️`ci_works.status`用預設、`ci_fragments.source_type`用`human_original`、碎片冪等靠tag`作品種子`)、`seed-creator-blog.mjs`。

---

## 🛠️ 維運 / 擁有者要做的（CLI 做不了）
- **瀏覽器實測**：`/quest` 遊戲+獎勵、11 AI 夥伴人設(D改完重測)、切語言(中英日韓)、金流測試、`/works` 作品牆、`/me/notes/[id]` 單篇頁、買市集筆記→看有沒有進「我的筆記」+點章節能跳。
- **金流上線**：綠界定期定額、MoR subscription webhook（`docs/payments_setup.md`、`/admin/payments`）。
- **創作者分潤**：Stripe Connect / 綠界藍新分潤（沿用 `ci_payouts.method`）。
- **背景翻譯 forum/blog/lesson**：見 #166（跑 `translate-content-cli.mjs`，耗 AI 額度）。

---

## 🔒 安全紅線（務必遵守）
- **`.env.local`（真金鑰）永遠不要 commit。**
- **`docs/logerr.md`、`docs/note.md` 保持 untracked、不要 commit。**
- service_role key / DB 密碼**等整個專案完成後**再輪替、別中途動。
- 不繞過被拒絕的憑證探測。

---

## 🧭 專案關鍵雷（CLAUDE.md 也有）
- **章節從 DB 讀不是 JSON**：改 `src/data/chapters/*.json` 後**一定** `node scripts/import_chapters_to_db.mjs chXX`（含 `sort_index`）。線上章節怪→先看 DB。
- **Supabase 1000 筆截斷**：撈整表用分頁 `.range()`、別 `.select('*')`。
- **部署走 GHCR 預建 image**（zbpack 偶爾誤建成只跑 Caddy）；push main → docker.yml build+推 image+`restartService`。
- 編章節 JSON 用 **Python**（`json.dump(ensure_ascii=False, indent=2)+"\n"`）保格式一致。
- commit 訊息結尾：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 📌 一句話交辦
**D（AI 個性差異化，強化 persona promptBlock + 加權）先做 → E（動態 emoji，先自架 Noto 反應表情）→ #166 剩餘（forum/blog 列表在地化 + 跑 forum/blog 背景翻譯）。tree 乾淨、tsc 綠，放心接。**

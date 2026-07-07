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

### ~~D：AI 夥伴「個性差異化」~~ ✅ 已完成（`d0fd2141`）
- 根因：`ai-tutor-prompt.ts` 那塊「國中生講解風格」強制所有人設用同一種「別急/超常見/我們一起看看 + 購物清單類比」開場、把 persona 淹掉。
- 修法：把講解風格改成「精神非模板、依角色」、加「角色語氣優先」宣告 + 🚫硬禁第一句用罐頭安撫腔；`ai-personas.ts` 每個角色加【開場】【禁】【結構】【這樣開場】few-shot。實測 4 角色開場/結構明顯不同 ✓。
- ⚠️ `/api/me/mentor` 是**配對系統**、不是 AI 對話；AI 對話走 AITutorWidget → `buildTutorSystemPrompt`。**改完建議在瀏覽器各切一個人設再確認一次語氣。**

### E：動態 emoji / GIF（進行中，已有一大塊）
- ✅ **動態 emoji 基礎**（`a9c6c654`）：`reactions.ts`（反應包 + Noto WebP 網址 + `emojiToNotoCode` 自動推導）、`AnimatedEmoji`（自動推導 code、載不出 fallback 靜態）、論壇 `ThreadReactionBar` 反應動起來、`reactions` i18n。
- ✅ **emoji/GIF 選擇器系統**（`cf8a6a4f`，參考 insight-engine 改動態版）：`AnimatedEmojiPicker`（9 分類+搜尋、每格動態 Noto）、`EmojiText`（顯示端把文字 emoji 渲染成動態）、`GifPicker`（GIPHY、靠 `NEXT_PUBLIC_GIPHY_API_KEY`、沒設優雅提示）。
- ✅ **已掛的輸入框**：論壇回覆（`ThreadReplies`，emoji+GIF，回覆內容 emoji 會動、GIF 網址→`<img>`）、創作者島訊息（`MessagesClient`，emoji + 訊息 EmojiText）。`f5ee5895`
- **還要掛的輸入框**（林董：「有需要輸入的地方都可以發」）：論壇發新文(`/forum/new` 用 BlogEditor)、社群發文(`SocialFeed`)、筆記編輯、AI 對話輸入(AITutorWidget)、留言…。做法：`<AnimatedEmojiPicker onSelect={e=>setX(v=>v+e)} />` + `<GifPicker onSelect={url=>...}/>`；顯示端 `<EmojiText text={...}/>`。
- **E 後續**：
  1. **GIPHY key**：要真的能搜 GIF → 到 developers.giphy.com 申請免費 key、加 `NEXT_PUBLIC_GIPHY_API_KEY` 進 .env.local（林董加，我不碰金鑰）。
  2. **學習反應 UI**：用 `LEARN_REACTIONS`（懂了/卡住/太神…）在 lesson/筆記/課程完成做反應條 + 慶祝動畫；持久化要新 DB 表。
  3. **自架 Noto 素材**：把用到的 `{code}/512.webp` 下載進 `public/noto/`、`reactions.ts` 的 `NOTO_BASE` 改 `"/noto"`（現走 gstatic CDN、能動但非自架）。

### #166 剩餘：翻譯 render wiring 擴更多頁 + 翻更多內容
- render wiring 已接：blog 文章頁、章節詳情、論壇主題頁、**/chapters 列表、側欄 nav**。**還沒接**：/forum 版面 thread 列表、/blogs 文章列表（需比照做 forum/blog 的批次 localizer）。
- 背景翻譯**只跑了章節**。要讓論壇/部落格/lesson 也有譯文：`node scripts/translate-content-cli.mjs forum`、`… blog`、`… lesson 600`（lesson 1258 筆很多、分批多跑幾次、耗 AI 額度）。**這會花使用者 AI key 額度**，量大的先問過。
- ⚠️ **林董翻譯規則**：背景翻譯**只在中文內容有改動時**才更新其他語言、沒動的不碰（`translate-content-cli.mjs` 已這樣：比對 `source_hash`，一樣就 skip）。**一般 UI 字串（messages/*.json）我直接改、不用 API**；只有 DB 內容翻譯才跑腳本。

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
**林董 5 大需求 A~E 全交付（買到→我的筆記／便利貼樣式／筆記標章節可點跳／AI個性差異化／動態emoji第一版）。接下來：E 第二版（學習反應 UI + 自架 Noto 素材）、#166 剩餘（forum/blog 列表在地化 + 跑背景翻譯）。tree 乾淨、tsc + build 綠，放心接。**

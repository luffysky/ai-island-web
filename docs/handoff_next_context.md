# 交接給下一個 Context（更新於 2026-07-08）

> 這份是「接力棒」。上一棒把能安全 commit 的都推上線了、`tsc` + `next build` 綠。
> **① i18n 4 區合併：✅ 已完成（commit 82793021）。** 現在重點：**② 內容加量（手寫）③ 維運/擁有者待辦**。

---

## ✅ ①（已完成）：i18n 重跑 4 區已合併並 commit（task #162）

**狀況**：creator-island / me / mentor / learn 四區 UI 字串抽取 + 合併 + build 已全部收尾。
- messages 新增 4 namespace：`creator`(560) / `me`(202) / `learn`(225) / `mentor`(145) = **1697 keys × 4 語**。
- 綠寶吉祥物英日韓統一 **Emerald / エメラルド / 에메랄드**。
- 市集副標「抽成 0%」已移除（task #168 ✅、改「果實可提現」，理由：提現有手續費、吹 0% 會誤導）。
- tsc 0 錯、`next build` 綠、已 commit（`82793021` i18n、`0a6737a1` 市集文案）。

**抽字串已驗證的流程**（之後還要抽新區時沿用）：每批 3–4 個 subagent、各認一個 namespace、**用 Write 把扁平 `{key:{zh,en,ja,ko}}` 直接寫進 scratchpad JSON 檔**（別靠 task-notification 轉錄）、主線用 `scratchpad/merge_i18n.mjs` 掛進 4 個 message 檔。規則：只包「靜態 UI chrome」不包 DB 內容 / module-scope const / metadata；本地已有 `t` 變數就把 hook 命名 `tr`；`text-black` on accent / className / emoji / URL 不動。

**i18n 地基（已穩定、別重做）**：`src/i18n/request.ts`（cookie locale + 地區預設語言 TW/HK/CN/MO→zh、JP→ja、KR→ko、其他→en）、`LanguageSwitcher`（已美化成自訂下拉）、`content-i18n.ts`（Data Cache 讀取、翻一次快取）。

**i18n 地基（已穩定、別重做）**：`src/i18n/request.ts`（cookie locale + **地區預設語言**：TW/HK/CN/MO→zh、JP→ja、KR→ko、其他→en）、`src/i18n/locales.ts`、`LanguageSwitcher`、`content-i18n.ts`（**Data Cache** 讀取、翻一次快取）。

**已抽完並 commit 的區**：chrome、home、store、chapters、quest、forum、notes、island、dashboard、profile、leaderboard、career、nav.works、notes.openFullPage。

**還沒抽的區（admin 後台不做）**：`blogs`(列表頁)、`courses`、`certificates`(頂層)、`changelog`、`search`、`settings`、`onboarding`、`teacher`、`auth`(剩餘)。

**動態/JSON 內容翻譯**：
- DB 內容走 `content-i18n.ts` 的 Data Cache（已接：blog 文章頁、章節 `localizeChapter`、論壇主題頁）。**要真的有譯文 → 跑背景翻譯**：手動觸發 GitHub workflow **Translate Content**（`.github/workflows/translate-content.yml` → 打 `/api/cron/translate-content`；用**使用者自己的 AI key**、不燒 Claude session；跑到回 `total=0` = 翻完）。
- 純前端 data 檔的中文（`src/components/island/island-bus.ts`、`src/lib/types.ts` 的 `CAREER_PATHS`、`quest/*-levels.ts`）→ agent 都刻意留著當 content，要翻另開一批。

---

## ✍️ ②：內容待辦（使用者原則：**全部手寫、有真人味、不要腳本亂生**）

1. **官方免費筆記：每一套（包）都要衝到「120 篇以上」**（task #164，進行中）。目前 **Python 56 / 前端 54 / 後端 54 / 基本功 54 = 218 篇**；**4 個撰寫 agent 正各手寫 +66 篇**（寫到 `scratchpad/notes_{python,frontend,backend,basics}.json`），回來後合進 `seed-note-market.mjs` 的 PACKS → 重灌 DB → commit，目標每包 120+。這是**硬性數量**，4 包 = 480+ 篇。
   - ⚠️⚠️ **每一篇都要「親手認真寫」**——**不准用 AI 生成器 / 樣板批量產 / 湊數**。林董明講：「不要用腳本寫、要認真寫」。這裡的「腳本」指的是「別做一支 AI generator 亂生」，**不是**指不能用 seed 檔。
   - `scripts/seed-note-market.mjs` **只是把手寫內容塞進 DB 的載具**（hardcoded PACKS 陣列、`node scripts/seed-note-market.mjs` 重灌、idempotent）。你要做的是**在那個陣列裡一篇一篇手寫**，不是寫個程式去生。
   - 每篇品質門檻：**第一人稱、有踩雷經驗、口語但有料**（「我一開始也卡在…」「⚠️ 新手雷」），一個真正搞懂的人在整理自己的筆記——不是速查表、不是教科書、不是罐頭。每則配一個便利貼色（`color` 欄輪播）。
   - 做法：**一批親手寫 8–15 篇好的 → 重灌 → commit → 再一批**，一路寫到每包 120+。急不得、但別停。涵蓋面要廣（語法/資料結構/例外/檔案/模組/OOP/測試/工具/常見錯…），別重複。
2. **部落格更生人樣 / 加創作者部落格**：`scripts/seed-blog.mjs`（AI 住民）、`scripts/seed-creator-blog.mjs`（4 位正經創作者各 1 篇，可再擴）。
3. **討論區**：`scripts/seed-forum.mjs`（41 串，含新 5 則學員口吻），要更多照樣加。
4. **創作者作品**：`scripts/seed-creator-works.mjs`（7 件、4 位創作者、碎片編織、`is_showcased`）。加更多時 ⚠️ `ci_works.status` 用預設別亂填、`ci_fragments.source_type` 用合法值(如 `human_original`)、碎片冪等靠 tag `作品種子`。

---

## 🛠️ ③：維運 / 擁有者要做的（CLI 做不了）

- **瀏覽器實測**：`/quest` 各遊戲+獎勵、11 位 AI 夥伴人設、切語言(中/英/日/韓)、金流測試模式、`/works` 作品牆、`/me/notes/[id]` 單篇筆記頁、筆記懸浮鈕拖曳。
- **金流上線**：live env、綠界定期定額(訂閱)、MoR(Paddle/Lemon Squeezy) subscription webhook。見 `docs/payments_setup.md`、`/admin/payments`。
- **創作者分潤 B/C**：Stripe Connect(海外) / 綠界藍新分潤(台灣)，需先申請服務、沿用 `ci_payouts.method`。
- **跑背景翻譯**：見 ① 動態內容翻譯。

---

## 🔒 安全紅線（延續上一棒、務必遵守）
- **`.env.local`（真金鑰、已 gitignore）永遠不要 commit。**
- **`docs/logerr.md`、`docs/note.md` 保持 untracked、不要 commit。**
- service_role key / DB 密碼**等整個專案完成後**再輪替、別中途動。
- 不繞過被拒絕的憑證探測。

---

## 🧭 專案關鍵雷（CLAUDE.md 也有）
- **章節從 DB 讀不是 JSON**：改 `src/data/chapters/*.json` 後**一定** `node scripts/import_chapters_to_db.mjs chXX`（含 `sort_index`）。線上章節怪 → 先看 DB。
- **Supabase 1000 筆截斷**：撈整表用分頁 `.range()`、別 `.select('*')`。
- **部署走 GHCR 預建 image**（zbpack 偶爾誤建成只跑 Caddy）；push main → docker.yml build+推 image+`restartService`。
- 編章節 JSON 用 **Python**（`json.dump(ensure_ascii=False, indent=2)+"\n"`）保格式一致。
- commit 訊息結尾：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 📌 一句話交辦
**先把 i18n 4 區合併收尾（①，建議直接重跑那 4 區 agent），再繼續筆記加量到 120（②）。tree 現在乾淨、tsc 綠、放心接。**

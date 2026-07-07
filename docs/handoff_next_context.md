# 交接給下一個 Context（更新於 2026-07-07 深夜收尾）

> 這份是「接力棒」。上一棒把能安全 commit 的都推上線了、tree 乾淨（`git status` 只剩本檔與工作日誌）、`tsc` 綠。
> 三塊，照順序做最穩：**① 最優先：i18n 4 區合併 ② 內容加量（手寫）③ 維運/擁有者待辦**。

---

## ⚠️ 最優先 ①：i18n 重跑 4 區的 keymap「還沒合併」（task #162）

**狀況**：creator-island / me / mentor / learn 四區的 UI 字串抽取，subagent 都跑完、keymap 也回傳了，但那批 `.tsx` 編輯**上一棒 revert 掉了、沒 commit**（避免這麼長的 session 中途斷、留下「元件呼叫 `t()` 但 messages 缺 key → 破頁」的髒 tree）。

- **keymap 在哪**：完整躺在**上一個 context 對話裡的 4 則 `<task-notification>` 的 `<result>`**（creator 606 / me 149 / mentor 154 / learn 240 keys，各含 zh/en/ja/ko）。
- ⚠️ **agent 的 `tasks/<id>.output` transcript 檔是 0 bytes、程式抓不到**，只能從對話文字取。若你這個 context 看不到那 4 則 keymap → **直接重跑那 4 區的抽字串 agent**（比撈舊 keymap 快、也乾淨）。

**怎麼收尾（兩條路擇一）**：
- **A. 有拿到 keymap** → 併進 `messages/{zh,en,ja,ko}.json` 對應 namespace（`creator`/`me`/`mentor`/`learn`），**然後**照 keymap 把那 4 區元件的中文重新包成 `t("...")`（.tsx 被 revert 了、包裹要重做）→ `tsc` + `next build` 綠 → commit。
- **B. 沒拿到 keymap（建議）** → 重跑 4 區 agent（同時改 .tsx + 回 keymap），再合併四語 → build → commit。

**抽字串已驗證的流程**（沿用）：每批 3 個 subagent、各認一個 namespace、回傳**扁平 `{key:{zh,en,ja,ko}}`**、主線用 node merge script 掛進 4 個 message 檔（避免互撞）。規則：只包「靜態 UI chrome」不包 DB 內容；本地已有 `t` 變數就把 hook 命名 `tr`；`text-black` on accent / className / emoji / URL 不動。

**i18n 地基（已穩定、別重做）**：`src/i18n/request.ts`（cookie locale + **地區預設語言**：TW/HK/CN/MO→zh、JP→ja、KR→ko、其他→en）、`src/i18n/locales.ts`、`LanguageSwitcher`、`content-i18n.ts`（**Data Cache** 讀取、翻一次快取）。

**已抽完並 commit 的區**：chrome、home、store、chapters、quest、forum、notes、island、dashboard、profile、leaderboard、career、nav.works、notes.openFullPage。

**還沒抽的區（admin 後台不做）**：`blogs`(列表頁)、`courses`、`certificates`(頂層)、`changelog`、`search`、`settings`、`onboarding`、`teacher`、`auth`(剩餘)。

**動態/JSON 內容翻譯**：
- DB 內容走 `content-i18n.ts` 的 Data Cache（已接：blog 文章頁、章節 `localizeChapter`、論壇主題頁）。**要真的有譯文 → 跑背景翻譯**：手動觸發 GitHub workflow **Translate Content**（`.github/workflows/translate-content.yml` → 打 `/api/cron/translate-content`；用**使用者自己的 AI key**、不燒 Claude session；跑到回 `total=0` = 翻完）。
- 純前端 data 檔的中文（`src/components/island/island-bus.ts`、`src/lib/types.ts` 的 `CAREER_PATHS`、`quest/*-levels.ts`）→ agent 都刻意留著當 content，要翻另開一批。

---

## ✍️ ②：內容待辦（使用者原則：**全部手寫、有真人味、不要腳本亂生**）

1. **官方免費筆記衝「每包 120+」**（目前共 51：Python 16 / 前端 13 / 後端 12 / 基本功 10）。
   - 檔案 `scripts/seed-note-market.mjs`（hardcoded PACKS；改完 `node scripts/seed-note-market.mjs` 重灌、idempotent）。
   - 風格：**第一人稱、有踩雷經驗、口語但有料**（「我一開始也卡在…」「⚠️ 新手雷」），不是速查、不是教科書。每則輪播便利貼配色（`color` 欄）。
   - 節奏：加幾則 → 重灌 → commit，持續往 120 疊。
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

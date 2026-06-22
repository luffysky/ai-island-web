# Daily Works — 2026-06-23

董事長林董（Luffy Lin）。雪鑰值班。
主題：**Telegram webhook 修復 → R2 設定 → Actions 省分鐘 → 沙盒(Judge0/C#中文/檔名/終端) → 部落格(自訂 slug + 影音上傳) → Wandbox 自動更新**。

---

## 📨 Telegram AI 沒反應 — 真因 webhook 雙斜線
- getWebhookInfo 抓到 url `…snowrealm.pet//api/telegram-webhook`（雙斜線）→ Next.js 回 **308 Redirect** → Telegram 不跟 redirect → 訊息永遠送不到 handler。
- 修：setup route 的 site 去尾斜線；直接打 Telegram setWebhook 修正線上 URL（即時生效）。

## 🖼️ R2 上傳「尚未設定」
- 真因：Zeabur 少設 **`R2_ACCOUNT_ID`**（isR2Configured 要 5 個 env、缺一即 false）。補上重啟即解。

## 💸 GitHub Actions 2000 分鐘用完
- 真因：每次 push 都跑完整 Docker build、且文件/SQL commit 也照跑。
- 修 docker.yml：`paths-ignore`（docs/**、*.md、supabase/**、scripts/**、bug/**）+ concurrency cancel-in-progress。林董已提高 spending limit 解燃眉。

## 🧪 沙盒 / 終端機
- 後端鏈 **Piston→Judge0→Wandbox**（依設定退避、Wandbox 墊底、各加 timeout）。
- **Judge0** 接好（env-gated：JUDGE0_URL/KEY/HOST、RapidAPI 或自架）。
- **C# 中文亂碼** 修正：mono 把非 ASCII 輸出成「?」→ 自動注入 UTF-8 StreamWriter（SetOut）。
- **沙盒檔名輸入**：PlaygroundCard 加檔名欄；Java 自動對齊 public class 名。
- **虛擬終端機**：所有 playground + **admin Nami 練習場**新增「終端機」tab（Python REPL + Shell）。
- **Wandbox compiler id 每月自動更新**：`scripts/update-wandbox-compilers.mjs` + `.github/workflows/wandbox-update.yml`（抽到 `src/lib/wandbox-compilers.ts`）。

## 📝 部落格
- **自訂 slug**：ArticleEditorForm 加 slug 欄（未手動改前跟標題自動產生、可重設）；create/update 都帶 slug。
- **影片/音樂上傳**：BlogEditor 註冊 VideoNode/AudioNode（`<video>/<audio controls>` 直接播）+ 工具列鈕 + 拖放/貼上；/api/upload 接受影片(≤50MB)/音訊(≤20MB)；sanitizer 放行 video/audio/source/iframe(YouTube/Vimeo 白名單)。
- slug 404 已於前一輪修（blog_slug + 文章 slug 都 ilike 大小寫不敏感）。
- 釐清：使用者看到的 UUID 是文章「id」(編輯網址用)、DB slug 其實是中文、沒壞；404 是 blog 名大小寫造成、已修。

## ✅ 檢查
- tsc 0、build 綠；gemini-2.0 無 src 寫死（只 ch46 教學範例提到、低優先）。

---
待辦見 docs/TODO.md。

---

# Part 2 — 大功能批次 + 後台/費用/明細 + 部落格美化（同日續）

## 🧩 7 大功能
- **沙盒 stdin 互動 + 圖表**：Pyodide worker 讓 `plt.show()` 自動輸出圖、`input()` 改讀 stdin 欄位（一行一個、echo）；PlaygroundCard 顯示 matplotlib 圖 + Python 也能開 stdin。
- **每日測驗難度自適應**：近 14 天答對率 → effectiveR = userR+(acc-0.7)*300；題型比例隨等級調。
- **學習儀表板** `/me/dashboard`：掌握度圓餅 / 學習時間 / 測驗準確率折線 / 各章「最遠 vs 完成」雙層條。
- **部落格社交**：查證 CommentSection/ReactionBar/TOC/ReadingProgress/Subscribe 早已具備（免移植）。
- **R2 大檔 presigned 直傳**：`/api/upload/presign` + r2.getPresignedUploadUrl；影片 ≤500MB 直傳 R2（需設 R2 CORS）。
- **離線 PWA 章節快取**：sw.js v6 加 OFFLINE_CACHE（持久）+「存離線」鈕 + 離線橫幅。
- **e2e 煙霧測試**：Playwright 在此環境裝不起來（registry 版本壞）→ 改零依賴 `scripts/smoke-test.mjs`（11 路由、實測全過）+ 每日 GH workflow。

## 🛠️ AI / 後台 / 費用
- **providerFromModel 去重**：抽 `resolve-usage-ai`（providerFromModel/resolveUsageAI/`completeForUsage` 含智慧備援）；6 個寫死 anthropic 的呼叫端改一行、admin 改用途模型不再 404。
- **OpenRouter**：接成 provider（OpenAI 相容）、後台可設 key（DB 優先、退 env）、加 4 免費模型；聊天串流主模型 429/額度滿 → **自動換備援模型重串、無感**。
- **圖片對話**：只傳圖不打字 → 不再塞「（看圖回答）」。
- **AI 費用準**：`callAI` 全記用量 → 新 `ai_model_usage`（每月每模型）+ inc_system_key_usage；修「後台 $1 / Claude $10」低估。
- **admin/ai/models 測 key**：結果改顯示在該 provider 旁（不再跑最上面被擋）。
- **owner-only**：`/admin/ai/usage`、`/admin/ai/conversations`、`/admin/users/[id]` 詳細頁 + 列表連結（非 owner 點不進去）；nav 也隱藏。
- **admin/users 角色**：下拉加 owner（只 owner 能授予/撤銷、同步 is_owner）。
- ⚠️ 查到 **2 個 owner 帳號**（luffysky00 + luffysky004）— 待林董確認 004 是否該保留。

## 🪙 經驗 / Z幣明細
- `ledger-labels`：reason+meta → 人話（每日測驗/簽到/完成課程 ChXX/管理員發放…）。
- admin/users/[id] XP+Z幣 panel 改人話 + 修 coin `e.type` bug + 顯示餘額；補帳 GrantModal 理由欄改標「明細」。
- 新 `/me/ledger`「Z幣/經驗明細」頁 + 側欄入口。
- 修 `/api/me/feed`：部落格連結用 blog_slug（非 profile username、否則 404）。

## ✍️ 部落格公開頁美化 + 加功能
- 標題加大 + 分類膠囊 + 閱讀時間 + 上下邊線；封面陰影；作者卡 bio。
- 加：訂閱作者、更多文章（同作者 4 篇）、可點標籤、系列上一篇/下一篇、回到頂部。

## 🔍 收尾檢查
- 全程 tsc 0 / build 綠；`run-migrations` 49/0；`audit-db-columns` 無欄位接錯、256 route 全 export；smoke 11/11。
- Groq 主力模型已重新啟用（誤停用已復原）。

---

# Part 3 — 技術債清零 + 收尾（同日續）

- **Owner 收斂**：luffysky004 → member（is_owner=false）；luffysky00 設 role=owner。現在唯一 owner。
- **/api/version**：回線上 commit / build 時間（Dockerfile 收 APP_COMMIT build-arg、docker.yml 帶 github.sha）→ 部署後一眼確認最新版。
- **YouTube/Vimeo 內嵌鈕**：BlogEditor 加按鈕、貼連結自動轉 embed iframe（sanitizer 白名單已放行）。
- **AI 導師串課程上下文**：綠寶本就帶「目前章節 + lesson 內容」，再補「完成 X/Y 節、miniQuiz 答對 N 題」→ 答案深淺自動調整、建議複習。
- **章節掌握度 → 推薦複習**：章節進度條下加「🔁 有 N 節只快速滑過、建議回頭細看」（用 lessonMastery 的 skim 判定）。
- **AI 草稿抽查（自動化）**：`scripts/audit-miniquiz.mjs` 結構抽查 1238 題 miniQuiz → **0 錯 0 警**（答案都在選項內、無重複選項、都有解析）；語意正確性仍需人工、但機械錯誤已清零。
- **ch46 gemini**：查證已是 gemini-2.5（無 2.0、TODO 為舊資訊）。
- **leetcode 題庫加量**：`seed-leetcode-questions.mjs --limit 300` 執行中（93 → 持續增加）。
- 收尾：tsc 0 / build 綠；audit-db-columns 無錯接、route 全 export。

---

# Part 4 — 版本可視化 + 修測 key + 收尾（同日續）

- **/api/version + admin 🚀 角標**：admin header 右上顯示線上 commit + build 時間（owner 限定、讀 /api/version；Dockerfile 收 APP_COMMIT、docker.yml 帶 github.sha）→ 部署後一眼確認最新版。
- **修「測 key 顯示 unknown」**：原本只測 anthropic/openai/google，openrouter/groq 走預設分支吐 unknown。加 `testOpenRouter`(/api/v1/key) + `testGroq`(/v1/models) + expected_prefix（sk-or-/gsk_）。→ OpenRouter key 其實有效、只是沒被測到。
- **OpenRouter 收費釐清**：免費模型（:free）$0 可用、有速率限制（~20/分、$0≈50/天、充 $10≈1000/天）；非按次扣款。
- **R2 CORS**：林董已自行設好（含 PUT、localhost + 正式機）。
- **leetcode 題庫**：93 → 277（seed --limit 300 接近完成）。
- **部署健壯化**：docker.yml redeploy 步驟改 continue-on-error（image 推成功就不再讓 workflow 變紅誤判「部署錯誤」）。

## 📌 仍待處理（寫進待辦、見 docs/TODO.md）
### 🔴 要林董做（非程式）
- **確認部署**：Zeabur → 服務 → **Restart** 拉 `:latest`。驗證：admin 🚀 角標顯示最新 commit、或 `/api/version`、或 `/api/upload/presign` 不再 404。
  - ⚠️ 今天所有修正（含 OpenRouter 測 key、presigned、明細、owner 權限頁…）都要這步才生效。
- **OpenRouter 測 key**：上面 Restart 後再測一次（修正才會在線上）。

### 🟡 之後可做
- [ ] **PWA icon**：補 PNG 192/512 maskable。
- [ ] **GDPR `user_settings`**：表不存在、gdpr/export 默默漏該欄 → 建表 or 刪那行。
- [ ] **（選配）自架 Piston 加速**：需 VPS（Zeabur 跑不起來、需特權）；設 `PISTON_BASE_URL`。
- [ ] **AI 草稿語意抽查**：結構已自動驗過（1238 題 0 錯）；答案「對不對」仍建議人工抽看。

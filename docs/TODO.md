# AI 島 — 全專案待辦（2026-06-23 更新）

## ✅ 今日完成（2026-06-23 大批次）
### 大功能
- [x] **沙盒 stdin 互動 + 圖表**：input() 讀 stdin 欄位、matplotlib plt.show() 出圖。
- [x] **每日測驗難度自適應**：近 14 天答對率動態調 effectiveR + 題型比例。
- [x] **學習進度儀表板** `/me/dashboard`：掌握度/時間/準確率/最遠vs完成。
- [x] **部落格留言/反應/TOC/閱讀進度**：查證早已具備（免移植）。
- [x] **R2 大檔 presigned 直傳**：影片 ≤500MB 直傳 R2（⚠️ 需在 R2 設 CORS、見下）。
- [x] **離線 PWA 章節快取**：sw.js v6 + 「存離線」鈕 + 離線橫幅。
- [x] **e2e 煙霧測試**：零依賴 `scripts/smoke-test.mjs`（11 路由）+ 每日 GH workflow。
### AI / 後台 / 費用
- [x] **providerFromModel 去重**：抽 `resolve-usage-ai` + `completeForUsage`（含智慧備援）。
- [x] **OpenRouter** 接成 provider + 後台可設 key + 串流額度滿自動換備援模型。
- [x] **AI 費用準**：callAI 全記 → `ai_model_usage`（每月每模型）+ owner 頁明細表。
- [x] **owner-only**：/admin/ai/usage、/admin/ai/conversations、/admin/users/[id] 詳細頁+列表連結。
- [x] **admin/users 角色加 owner 選項**（只 owner 能授予、同步 is_owner）。
- [x] **測 key 結果顯示在 provider 旁**（不再被擋）；圖片可只傳圖不打字。
### 經驗 / Z幣明細 + 部落格美化
- [x] **XP/Z幣明細**：人話標籤（ledger-labels）+ admin/users/[id] + 新 `/me/ledger` + 補帳「明細」欄。
- [x] **修 /api/me/feed 部落格連結**（用 blog_slug、修 404）。
- [x] **部落格公開頁美化 + 加功能**：閱讀時間/訂閱/更多文章/可點標籤/系列上下篇/回到頂部。
### 沙盒 / 部落格（前批）
- [x] 沙盒後端鏈 Piston→Judge0→Wandbox；虛擬終端機；C# 中文；檔名輸入；Wandbox 月更。
- [x] 文章自訂 slug；上傳影片/音樂內嵌播放；slug 大小寫不敏感。
- [x] ci(docker.yml)：Zeabur 重部署 continue-on-error（不再把成功的 build 誤判成「部署錯誤」）。

---

## 🔴 待林董處理（非程式、要你決定 / 設定）
- [ ] **確認部署**：Zeabur 手動 Restart 拉 `:latest`；驗證 `…/api/version` commit 是最新、或 `/api/upload/presign` 不再 404。（admin header 右上已有 🚀 版本角標可一眼看。）
- [x] **R2 CORS**：林董已設好（含 PUT、localhost + 正式機 origin）。
- [x] **2 個 owner 帳號**：已收斂 → luffysky004 改 member、luffysky00 唯一 owner。

## 🟠 技術債 / 健壯性
- [x] **AI 草稿抽查（自動化）**：`scripts/audit-miniquiz.mjs` 結構抽查 1238 題 → 0 錯 0 警。語意正確性仍建議人工抽看。
- [x] **章節「掌握度」串進度條**：章節進度條下加「🔁 N 節只滑過、建議複習」（lessonMastery skim）。
- [x] **ch46.json gemini**：查證已是 2.5（TODO 為舊資訊、無需改）。
- [x] **AI 導師串課程上下文**：綠寶帶「目前章節 + 完成節數 + miniQuiz 答對數」。
- [x] **YouTube/Vimeo 內嵌鈕**：編輯器加按鈕、貼連結轉 embed。
- [x] **/api/version**：線上 commit / build 時間。

## 🟡 增強 / 之後
- [~] **leetcode 題庫加量**：`--limit 300` 執行中（93 → 持續）。
- [ ] **PWA icon**：補 PNG 192/512 maskable。
- [ ] **GDPR `user_settings`**：表不存在、gdpr/export 默默漏掉。建表 or 刪那行。
- [ ] **（選配）自架 Piston 加速**：需 VPS（Zeabur 跑不起來、需特權）。設 `PISTON_BASE_URL`。

> 完整脈絡見 docs/daily_works_*.md。
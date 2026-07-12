# AI 島 — 全專案待辦（2026-06-23 更新）

> 完成的項目用 ~~刪除線~~ 保留、不刪除。

## ✅ 已完成（2026-06-23 大批次，劃掉保留）
### 大功能
- ~~沙盒 stdin 互動 + 圖表（input() 讀 stdin、matplotlib 出圖）~~
- ~~每日測驗難度自適應（近 14 天答對率動態調 effectiveR）~~
- ~~學習進度儀表板 /me/dashboard（掌握度/時間/準確率/最遠vs完成）~~
- ~~部落格留言/反應/TOC/閱讀進度（查證早已具備）~~
- ~~R2 大檔 presigned 直傳（影片 ≤500MB；R2 CORS 已設）~~
- ~~離線 PWA 章節快取（sw.js v6 + 存離線鈕 + 離線橫幅）~~
- ~~e2e 煙霧測試（scripts/smoke-test.mjs 11 路由 + 每日 GH workflow）~~

### AI / 後台 / 費用
- ~~providerFromModel 去重（resolve-usage-ai + completeForUsage 智慧備援）~~
- ~~OpenRouter 接成 provider + 後台可設 key + 串流額度滿自動換備援模型~~
- ~~AI 費用：callAI 全記 ai_model_usage；usage 頁合併 web(ai_usage_daily)+bot 來源~~（殘差=CLI 腳本不經 App）
- ~~測 key 支援 openrouter/groq（原顯示 unknown）~~
- ~~owner-only：/admin/ai/usage、conversations、/admin/users/[id]（含列表連結）~~
- ~~admin/users 角色加 owner 選項（同步 is_owner）~~
- ~~測 key 結果顯示在 provider 旁；圖片可只傳圖不打字~~

### 經驗 / Z幣 + 部落格
- ~~XP/Z幣明細（ledger-labels + admin/users/[id] + /me/ledger + 補帳「明細」欄）~~
- ~~修 /api/me/feed 部落格連結（用 blog_slug、修 404）~~
- ~~部落格公開頁美化（閱讀時間/訂閱/更多文章/可點標籤/系列上下篇/回到頂部）~~
- ~~文章自訂 slug；上傳影片/音樂內嵌；slug 大小寫不敏感~~

### 後台 / 系統
- ~~/api/version + admin header 🚀 部署版本角標~~
- ~~AI 草稿抽查自動化（scripts/audit-miniquiz.mjs：1238 題 0 錯）~~
- ~~章節掌握度推薦複習（skim 節數）；AI 導師串課程上下文~~
- ~~YouTube/Vimeo 內嵌鈕；ci(docker.yml) 重部署 continue-on-error~~
- ~~修 3D 島開關（鍵名不符 island_enabled→feature_island_enabled）+ 首頁 ISR~~
- ~~修 title 79→80 章（補漏掉的 ch00 環境準備）~~
- ~~系統設定：死開關接上(blog/forum/signup gate)、改 on/off、整合 app-settings→settings~~
- ~~終端機可打指令（nami-playground 預設 shell + nami-ide 加整合終端機，Wandbox 沙盒）~~
- ~~BYOK 強化：/settings/ai-keys 加驗證 + OpenRouter + 模型提示 + /me 入口~~
- ~~上傳支援所有圖/影/音格式 + 手機原生相簿 + 部落格任意檔案附件 + 拖放/貼上~~
- ~~leetcode 題庫加量（93 → 374）~~
- ~~owner 收斂（luffysky004→member、luffysky00 唯一 owner）；R2 CORS 已設~~

---

## 🔴 待林董處理（非程式、要你決定 / 設定）
- [ ] **確認部署**：Zeabur 手動 Restart 拉 `:latest`；admin header 右上 🚀 角標應顯示最新 commit。

## 🟡 待辦 / 之後
- [ ] **PWA icon**：補 PNG 192/512 maskable。
- [ ] **GDPR `user_settings`**：表不存在、gdpr/export 默默漏掉 → 建表 or 刪那行。
- [ ] **（選配）自架 Piston 加速**：需 VPS（Zeabur 跑不起來、需特權）。設 `PISTON_BASE_URL`。
- [ ] **大檔上傳 OOM 防護**：目前文件附件走 server 記憶體（ai 島 25MB / insight 500MB），
      要真正無限大需改 presigned 直傳（insight 影片尤其）。
- [ ] **AI 草稿語意抽查**：結構已自動驗過（0 錯），答案「對不對」仍建議人工抽看。

> 完整脈絡見 docs/daily_works_*.md。

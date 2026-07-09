# 工作日誌 2026-07-10（大型場次：補助企劃 + AI 分層/免費策略/Z幣經濟 + UI）

> 完成用 ~~刪除線~~ 保留可見（不刪）。tsc + vitest(117) + next build 全綠、關鍵 migration 已上線。

---

## ✅ 今日完成

### 一、補助 & 競賽 完整企劃（docs/grant/）
- ~~**技術全盤點**~~ ✅ 多代理逐一讀真原始碼，逐項標 ✅真有/🟡半成品/❌只有殼 + 檔案:行號（`tech-inventory.md`）。
- ~~**DB 實查 traction**~~ ✅ `scripts/grant-facts.mjs`（唯讀查數字 + env 布林）：真實用戶 17、真人活躍~4、營收 0、seed 資料辨識、bot session 揭露。
- ~~**九章計畫書**~~ ✅ ch1~ch9 + ch0 現況口徑；面向 DIGITAL+「數位服務創新補助」。
- ~~**Codex 兩輪審稿逐條修**~~ ✅ pre-revenue 全書一致、seed 非 UGC、翻譯/成本/GDPR/求職閉環/島嶼經濟但書、口徑斷裂修復。
- ~~**市場數據換原始/官方來源**~~ ✅ HolonIQ 官方 $404B、資策會 MIC 官方新聞稿、國發會官方、104 報告、《Science》2019 MOOC 3.13%。
- ~~**競品 AI 現況查證**~~ ✅ 修正過時「競品缺 AI」（Hahow/均一/Codecademy 皆已有 AI），差異化改主張「完整組合」。
- ~~**TAM/SAM/SOM + pilot 量化 + KPI 反推模型 + 經費範例**~~ ✅（ch2/ch8/ch9）。
- ~~**pitch deck 中/英 + 一頁式競賽摘要 + 獨資商號登記清單 + full-plan 合併**~~ ✅。
- ~~**後台「補助&競賽作戰室」頁面**~~ ✅ `/admin/grant`（漸層 Hero、左側文件清單、react-markdown 渲染、RBAC 限 admin/owner）；`gen-grant-content.mjs` 打包 docs→bundle。

### 二、全站 AI 分層授權（一致化）
- ~~**免費 = 只能 auto、不能選模型**~~ ✅（伺服器強制 + 前端隱藏選單，`/api/ai/tier`）。
- ~~**Plus / Pro / 特權分層**~~ ✅ Plus 中階可選、Pro 高階可用、特權(ai_unlimited/owner)無限且 auto 直接最高階、可自切 Claude/GPT/Gemini。
- ~~**共用 `ai-tier-gate.ts` 套到寵物聊天**~~ ✅（Nami ai-help 為 admin-only 免閘）。

### 三、AI 免費三招（讓免費用戶幾乎用不完、成本≈0）
- ~~**招1 免費供應商輪替**~~ ✅ 閘道加 Cerebras/NVIDIA/SambaNova/Mistral（GitHub Models 因 7/30 退役標警告）；各家當前正確 model id 直接 seed 進 DB（`seed_free_models_2026-07.sql`）；後台加「新增/刪除模型 + 取 key 說明」。
- ~~**招2 瀏覽器模型 WebLLM/WebGPU**~~ ✅ `webllm.ts` + AITutorWidget「⚡本地模型」toggle（真無限免費、在裝置跑）。
- ~~**招3 語意快取**~~ ✅ `ai_semantic_cache_migration`（embedding + match_ai_cache RPC）；相似問題命中不打 API。

### 四、Z幣 AI 點數經濟（#3）
- ~~**高階每日限額 + 免費 100/日 + 超額用 Z幣**~~ ✅ `ai_quota_v2_migration`（high_used + consume_ai_quota_v2 原子扣 Z幣）；免費續用 2 Z幣、高階加購 20 Z幣（可調 `ai-quota-config.ts`）；免費上限 10→100；前端「💰花 X Z幣續用」按鈕。

### 五、定價分層
- ~~**Plus NT$149 / Pro NT$349（月）+ 年繳**~~ ✅ `config.ts` 4 方案 + tier + PLUS/PRO_PERKS；海外自動換算 USD；store 頁分層顯示。

### 六、UI / RWD / 修正
- ~~**筆記破版真凶 = grid 缺 grid-cols-1**~~ ✅（手機隱式 auto 軌道撐爆）。
- ~~**全站輸入多行 + 手機 Enter 換行**~~ ✅（`composer.ts`：綠寶/Nami/寵物/島聊/私訊/論壇/部落格/社群）。
- ~~**教學占位偽代碼修正**~~ ✅ ch26/ch07 `do_stuff()` 改真範例。
- ~~**E2E locale fix**~~ ✅（US CI runner 被 i18n 判英文→全滅；`e2e/fixtures.ts` 固定 LOCALE=zh，31 passed）。
- ~~**後台側欄手機不佔空間 + 全站側欄收合展開「方向性滑動」動畫**~~ ✅（CollapsibleAside 寬度滑動、NavGroup/筆記樹 max-height 上下滑）。
- ~~**build 修復**~~ ✅（重構後 prefer-const 擋 build）。

---

## 🔨 待辦（下次）

### 🚨 HIGH：AI 成本沒真正抓到所有 API 實際花費（林董指出）
- ⬜ 目前 `ai_model_usage` / `logAiUsage` 記帳**不完整**——不是每個用到 AI 的入口都有記真實 token/成本；且早期用量只在各供應商後台。
- ⬜ 目標：**全站所有 `callAI`/`streamAI` 入口都確實記 token→成本**（含背景任務：學習計畫、模擬面試、創作引擎、LINE bot、summarize-memories、forum residents…），並對帳各供應商實際帳單。
- ⬜ 免費供應商雖成本≈0，但要能區分「免費/付費」用量、算真實邊際成本。

### 🧪 測試（下次）
- ⬜ **E2E 補齊**（現有已修 locale、綠）：擴到金流 / 筆記 CRUD / 島嶼 / 語言切換 / 離線。
- ⬜ **Smoke test**：關鍵頁 200 + 核心 API 健康的快速煙霧測試。

### 🏝️ 沉浸式 3D 島嶼（IslandV0，方向鍵操控角色的「真的一座島」）
- ⬜ **現況問題：太吃資源**（@react-three/fiber + GLB + postprocessing，手機/弱機掉幀）。
- ⬜ **下次規劃替代方案**：(a) 降 draw call / LOD / 關 Bloom；(b) 手機自動切 2D 版；(c) 只在桌機 / 高效能裝置載入 3D、其餘給輕量版；(d) 進度存 DB（目前 localStorage、換裝置歸零）。
- ⬜ 與遊戲化經濟（Z幣/成就/任務）真正接上（目前多為 localStorage 半成品）。

### ❤️ 生命值（hearts）決定
- ⬜ header 的「生命」目前是**裝飾/半成品**（預設 5、只有島嶼睡覺 +1、無消耗端、完課不加）。三選一：(1) 做成體力機制（探索/挑戰消耗、完課/睡覺回）、(2) **改成「連續學習天數 🔥」streak（建議、已有打卡資料）**、(3) 先從 header 拿掉。

### 🚨 島嶼經濟刷幣漏洞（延續 0709）
- ⬜ `catch-fish` / `redeem` 信任前端申報、無去重 → 伺服器權威事件驗證（配 E2E 回歸）。

### 其他（低）
- ⬜ Plus/Pro tier 的高階 gating UI 顯示（目前後端已限，前端可標示剩餘高階額度）。
- ⬜ admin routes `req.json()` try/catch；PWA icon 收斂；reaction 防刷。

---

## 🔒 安全紅線（不變）
- `.env.local` 永遠不 commit；`docs/logerr.md`、`docs/note.md` 保持 untracked。
- service_role key / DB 密碼整個專案完成後再輪替。
- 金流商特約商店需**企業會員 + 統編**（獨資商號登記後開通）——目前正式收款尚未開通。

## 📌 一句話交辦
**補助/競賽企劃全套 + 後台作戰室頁完成；全站 AI 分層(免費auto-only/Plus/Pro/特權) + 免費三招(供應商輪替/瀏覽器模型/語意快取) + Z幣扣點經濟 + 分層定價 全上；UI(筆記破版/多行輸入/側欄方向滑動) 修完。下次最該做：AI 成本全面記帳 + E2E/Smoke + 沉浸式島嶼降耗規劃。**

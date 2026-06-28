# Daily Works — 2026-06-29

董事長林董（Luffy Lin）。雪鑰值班。
主題：**從 0 到上線整座「創作者島嶼」（Ideas OS 第一島）** — M0→M5 + Phase 2 全做完、UI 精緻化重做、碎片庫 10k 池、最後做全站對接驗收。

---

## 🏝️ Creator Island 核心（M0–M5）
- **M0 Workspace**：`ci_workspaces / members / invitations / wallet / wallet_tx / ai_settings` + RLS + RPC（`ci_transfer_workspace_owner`、`ci_debit_workspace_wallet`）+ lazy-create + `feature_creator_island_enabled`（預設開）。
- **M1 Assets**：`ci_fragments / works / work_fragments / asset_relations(多型 trigger) / asset_versions / packages / collections` + `creator-engine/` 服務 + API。
- **M2 AI loop**：`ci_agent_runs` + Model Router + Cost Manager（核心免費）+ 凝聚/演化/編織（zod）+ E11 Suno/MV 歌曲模式 + usage parity（logAiUsage）。
- **M3 Shell**：首頁第三入口 + 創作循環 UI + 作品庫/編輯器 + 工作室管理 + 發布到 blog；E1 first-run、E2 種島、E10 免費。
- **M5**：smoke 擴 `/creator-island`、merge→push→Zeabur 部署。

## ✨ Phase 2（全做完）
- **E3 創作家譜**（作品顯示 composition + 衍生）、**E4 主動回憶**、**E5 意外配對**（`ci_surprising_pairs` + embedding backfill）、**E6 語音/拍照捕捉**、**E7 工作流錄製/重播**（`ci_workflows`）、**E8 文化轉譯**（Transcreator，output 用目標語言書寫 + 下拉選語言）、**E9 創作 DNA + Growth 頁**。
- **完整 Marketplace**（Z 幣 phase1、**抽成 0%**、賣家進 workspace wallet、`ci_purchase_listing` 原子 RPC + entitlement）。
- **完整 Community**（follow / collect / like / comment + fork/remix→複製進 workspace + 記家譜）。

## 🎨 介面精緻化重做（依林董回饋：太陽春/版面/缺角色/缺島嶼感）
- 主畫面重做：HUD 列、漸層雙卡、🌲 瀑布流碎片牆、浮層創作工具、綠寶陪伴、漸層 Hero（BackgroundBeams + Sparkles）。
- **碎片蛋孵化動畫**（framer-motion：晃動→閃光星花→🐣，依稀有度放大慶祝）。
- **碎片完整可編輯**（標題/副標題/內容/類別/心情/標籤 + 刪除；加 `subtitle` 欄）。
- **自訂分類 + 拖曳複製**（Collections 多對多、`@dnd-kit`：拖碎片到分類 chip = 複製進該類）。

## 🎲 碎片庫（10000 池）
- `ci_fragment_pool`（R/SR/SSR、去重 `unique(lower(btrim(text)))`）+ `ci_draw_from_pool` 加權抽樣。
- `scripts/gen-fragment-pool.mjs`：Haiku 生成（反陳腔/反流水/反敷衍 prompt、28 領域、**多形式**：人物/地點/物件/畫面/意象/對話/詞/句子、ON CONFLICT 去重、可重跑累積）。
- **種島抽 300**（加權、依 category 自動建分類）；碎片蛋改**扭蛋**（SSR≈3%）。
- 市集「靈感精選」從池抽可帶走、各分頁種範例作品 → 不空。
- **完成：10009 顆**（R 5497 / SR 3843 / SSR 669；形式：畫面1877/物件1452/句子1348/人物1185/地點978/對話880/詞793/意象735）。

## 🔧 驗收後加碼（同日續做）
- **創作顧問 Agent**（advise）：選碎片→「💡 適合做什麼」建議作品類型+風格子類+切入角度，可一鍵編織。
- **創作類型擴充**：3→14 種（文章/散文/歌/詩/短篇小說/故事/劇本/短影音腳本/文案/品牌故事/世界觀/角色/課程/產品企劃）。
- **工作室可進入**：studio →自己的島（碎片/分類/迴圈獨立）。**作品庫範例**連實際碎片、顯示「由 N 個碎片長成」。
- **後台監看** `/admin/creator-island`：活動計數 + AI 對話紀錄(ci_agent_runs) + 通知監看；AI 用量併入 /admin/ai/usage。
- **社群升級**（參考 Insight、對接 profiles/ci_）：Phase1 8 表（貼文/限動/短影音/留言/收藏/好友 ci_friendships/私訊 ci_dm_*）+ Phase2 動態牆（發文+圖影音 R2+讚+留言+收藏）。/api/upload 放寬上限。
- 待續：限動 UI、好友+私訊、通知+OG 圖卡+島內對話 AI、cross-post 到本站部落格。

## ⚙️ 後台
- **`/admin/ai/creator-island`**：5 個 agent（凝聚/演化/編織/轉譯/DNA）各自選模型（含 **OpenRouter**），預設自動。`creator_island_agent_models` app_setting。
- **CLI 用量記錄**（補後台 $15 黑洞）：`log-cli-usage.mjs` + 接 gen 腳本 → `ai_model_usage` 標 `cli:`。

---

## ✅ 全站對接驗收（2026-06-29）
- **DB**：13 個 `creator_island_*.sql` 全 db:apply → **30 張 ci_ 表 + 11 RPC + 2 app_settings** 實際存在（已查 information_schema）。
- **欄位對接**：`node scripts/audit-db-columns.mjs` → **「✅ 沒發現 select/eq/order 接到不存在的欄位」**。
- **API**：41 支 creator-island route 全 export HTTP method；所有前端 fetch 端點都對得到 route（audit 的 mismatch 是 template-literal 誤報，redeem/works 子路由實際存在）。
- **UI**：8 個 creator-island 頁 + admin 頁全在、全接 API。
- **RWD**：用 `sm:/md:` + `flex-wrap` + `columns-1 sm:columns-2` + `w-[min(92vw,720px)]`，無寫死大固定寬 → 手機友善。
- **PWA**：`app/manifest.ts`（standalone + shortcuts + share_target）+ `public/sw.js` + `PWAInstall` 註冊全在 ✅。**唯一缺口**：icon 仍只有 `favicon.svg`，缺 PNG 192/512 maskable + apple-touch（沿用既有 TODO，影響 iOS 安裝圖示精緻度）。
- 未接 UI 但已備齊（後端/未來）：`/memory`（記憶目前走 agent 注入，無使用者管理頁）、`/ai/runs`（trace）。

---

## 🔜 剩下待辦（見 MASTER_TODO「Creator Island 收尾」）
- 碎片庫補到 10000（背景跑、可重跑）。
- PWA PNG icons（192/512 maskable + apple-touch）。
- 記憶管理使用者頁（選配）；AI run/成本儀表板（選配）。
- 真金流 marketplace（KYC，需林董決策）。

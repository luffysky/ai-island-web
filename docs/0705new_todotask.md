# 0705 New TODO Task 清單

> 建立日期：2026-07-05
> 來源：全站數據真實性稽核 + Creator Island 靜默 bug 稽核 + 完課獎勵/證書 + gamification 伺服器化 + FIE 白皮書 v1.0。
> 本輪**已完成**的不在此列（見 git log / memory）；此檔只列**還沒做**的。
> 標記：優先序 P0(該做) / P1(中) / P2(可延)。每項含：問題 → 檔案位置 → 做法 → 驗收。

---

## A. 資料真實性小修（幾行的小改，最快清）

### #86 — LearningDashboard 的 ELO 小 tile 仍固定 1200　`P1`
- **問題**：`/me` 的大 ELO 卡已隱藏（沒對戰紀錄不顯示），但 `LearningDashboard.tsx` 裡的 ELO 小方塊仍讀 `profiles.elo_rating`（所有人=預設 1200），看起來像壞的。
- **檔案**：`src/components/me/LearningDashboard.tsx`（ELO tile）；資料源 `src/app/me/dashboard/page.tsx`。
- **做法**：跟 `/me` 一樣，判斷「有沒有 elo 對戰紀錄」（`daily_quiz_attempts.elo_delta` 非 null）才顯示該 tile；沒有就隱藏或改成「尚未開始解題對戰」。
- **驗收**：新用戶 dashboard 不再出現固定 1200 的 ELO 方塊。

### #87 — 排行榜「每天 00:00 更新」標籤誤導　`P2`
- **問題**：`leaderboard` 其實是即時 SQL view，但頁面文案寫「每天 00:00 更新」。
- **檔案**：`src/app/leaderboard/page.tsx`。
- **做法**：文案改成「即時更新」或移除該句。
- **驗收**：文案與實際行為一致。

### #88 — openrouter 用量 cost=0（缺費率）　`P2`
- **問題**：有 1 筆 `ai_usage_daily`（openrouter, 約 79k tokens）`cost_usd=0`，因 `ai_models` 缺該 model 的 `cost_input_per_1m/cost_output_per_1m` → 成本低估。
- **檔案**：DB `ai_models` 表（該 openrouter model 那列）；估價邏輯 `src/lib/ai-usage-log.ts` / `ai-providers.ts`。
- **做法**：在 `ai_models` 補該 model 的費率；或估價找不到費率時 log 警告。
- **驗收**：`ai_model_usage`/`ai_usage_daily` 對該 model 有非 0 成本。

---

## B. Creator Island 經濟 / 市集 / 證書 中型項

### #89 — 商店「花 Z 幣兌換」剩餘品項（需先建底層系統）　`P1`
- **問題**：兌換分頁目前只做了 **AI 額度加值** + **裝飾/稱號**（已上線）。「章節搶先 / 測驗次數 / 寵物造型 / Boost」尚未做，因為對應底層系統不存在。
- **底層現況**：`profiles` 無 cosmetic 欄位；章節無 per-user 鎖定；無測驗次數上限；無 XP 倍率/補簽 hook。
- **檔案**：catalog `src/lib/store-redeem.ts`（加 item + effect kind）；UI `src/app/store/StoreClient.tsx`；效果各接對應系統。
- **做法（逐項、每項先建底層再接，避免製造新靜默 bug）**：
  1. **章節搶先/解鎖**：先在 chapters 加 per-user 解鎖表 + gating（`is_premium`/scheduled 已存在，可延伸）。
  2. **測驗次數**：先建每日測驗次數上限 + 加購次數的計數。
  3. **寵物造型**：`ci_user_cosmetics` 已可存 avatar_frame，但寵物 render 要吃這欄位。
  4. **Boost（XP加倍/補簽卡）**：先建 XP 倍率 buff + 補簽（`profiles.streak_days` 修復）機制。
- **驗收**：每個上架品項兌換後**有真實效果**、可驗證，且不影響既有系統。

### #90 — 路徑證書 / 全站證書（cert_type path|all）　`P1`
- **問題**：目前只做「完成整章自動發 chapter 證書」（`/api/me/lesson-reward`）。`certificates.cert_type` 還有 `path`（學習路徑）、`all`（全站）沒發。
- **檔案**：`src/app/api/me/lesson-reward/route.ts`（chapter 發證的地方）；渲染共用 `src/app/certificates/[code]/page.tsx` + `/api/og/cert`（已支援任意 title）。
- **做法**：定義 path/all 完成條件（例：某 stage 全部章節完成→path 證書；全 80 章完成→all 證書），在完課檢查時一併判斷、`cert_key='path_xxx'`/`'all'` 發證（冪等靠 `UNIQUE(user_id,cert_key)`）。
- **驗收**：完成一個學習路徑 → 自動拿到 path 證書，可下載圖片/PDF。

### #91 — Creator XP 表接線（ci_creator_stats/creator_xp 死碼）　`P2`
- **問題**：`ci_creator_stats`/`creator_xp` 整表從沒被寫；`growth.ts getStats` 改用即時 COUNT（畫面正常，但 spec 的 creator XP/等級/成就沒接）。
- **檔案**：`src/lib/creator-engine/growth.ts`；建立/作品/AI 動作的寫入點（`creator-engine` 各 service）。
- **做法**：決定要不要真的做 creator XP 系統。若要：在 fragment/work/agent 成功時 bump `ci_creator_stats.creator_xp`（RPC 或 upsert，冪等）；否則正式把該表標為 deprecated。
- **驗收**：creator XP 有真實累積，或明確標記不使用。

### #94 — 市集 self-deal 防禦下沉到 RPC 層　`P2`
- **問題**：防自買自賣目前只在 lib 層 `marketplace.ts purchaseListing`（實務夠用，因為只有它呼叫 RPC）；直接打 `ci_purchase_listing` RPC 仍可繞。
- **檔案**：`supabase/creator_island_marketplace_migration.sql`（`ci_purchase_listing`）。
- **做法**：RPC 內加 buyer≠賣方 workspace owner/member 檢查（查 `ci_workspace_members`/`ci_workspaces.owner_id`），回 `own_listing`。改完 `npm run db:apply`。
- **驗收**：直接呼叫 RPC 買自己上架的也被擋。

### #95 — Creator AI 用量寫 ai_usage_daily（parity）　`P2`
- **問題**：creator-engine 的 AI 動作只寫 `ai_model_usage`（callAI 自動）、沒寫 `ai_usage_daily`（web-chat 專用表）。spec 要 parity。
- **檔案**：`src/lib/creator-engine/ai/agents.ts`；`src/lib/ai-usage-log.ts`。
- **做法**：確認是否真的需要（`ai_usage_daily` 語意是 web 聊天）。若要 parity，在 agents 成功後也 upsert `ai_usage_daily`。
- **驗收**：後台 AI 用量報表把 creator AI 也算進 daily（若決定要）。

### #96 — RPC 小瑕疵修正　`P2`
- **問題**：
  1. `ci_validate_asset_ref` 對未知 `asset_type`（含 `workflow`）直接放行（`v_exists:=true`）→ 可指向不存在的 workflow。
  2. `ci_purchase_listing` 重複購買回傳 `{ok:true, already_owned:true}` 但沒帶既有 entitlement/transaction id。
  3. `ci_asset_relations_check` 的 `RAISE EXCEPTION '... (%s) 不存在'` 格式字串多一個 `s`（訊息顯示 `(fragments)`）。
- **檔案**：`supabase/creator_island_assets_migration.sql`、`creator_island_marketplace_migration.sql`。
- **做法**：workflow 型別等 `ci_workflows` 存在後補存在檢查；重複購買回傳既有 id；修 `%s`→`%`。db:apply。
- **驗收**：三個小瑕疵各自修正、行為正確。

---

## C. 記憶 / Embeddings

### #92 — 記憶系統剩餘（語意檢索 + candidate + 顯示 + embedding 回填）　`P1`
- **問題**：記憶注入 prompt 有做、文字編輯已補；仍缺：
  1. 檢索是「最近用 `last_used_at`」而非**語意相關**。
  2. **candidate 推論流程沒做**（沒東西會產生 `status='candidate'` 的候選記憶）。
  3. 「本次用到的記憶」透明化：`ci_memory_usage` 只寫不讀、前端沒顯示。
  4. `ci_memories.embedding` 從不回填、也不查（ivfflat 索引閒置）。
- **檔案**：`src/lib/creator-engine/memory.ts`；`src/lib/creator-engine/ai/agents.ts`（注入處）；`src/app/api/creator-island/memory/*`；前端顯示點。
- **做法**：`getInjectableMemory` 改成先算 query 向量做語意檢索（需 embedding 回填）；AI 動作後從對話/選擇推論 candidate 記憶（`source='agent_run'`、`status='candidate'`）；API/UI 顯示「本次用到的記憶」。
- **驗收**：記憶按相關性注入、有候選記憶待確認、使用者看得到本次用到哪些記憶。

### #93 — ci_fragments embedding 全量回填 cron　`P1`
- **問題**：`createFragment` 不設 embedding；只有點「意外配對」時懶惰回填 40 筆、且需 `ai_api_keys` 有 OpenAI key。沒 key → E4/E5/語意搜尋全靜默空；沒有全量 cron。
- **檔案**：`src/lib/creator-engine/embeddings.ts`（`backfillWorkspaceEmbeddings`）；新增 cron route `src/app/api/cron/ci-embeddings-backfill/route.ts`（仿現有 cron）。
- **做法**：加一支 cron 定期分頁回填所有 workspace 缺向量的 ci_fragments（有 key 才跑）；或 createFragment 時 fire-and-forget 生成。
- **驗收**：碎片建立後一段時間內 embedding 有值，E4/E5/語意搜尋在有 key 時穩定有結果。

---

## D. FIE 白皮書 v1.0　✅ 已完成（2026-07-05）

> **產出：`docs/creator/AI_Island_FIE_v1_0.md`（4023 行，12 章 + 附錄 A–G）。**
> 多代理工作流 19 個代理全成功；審校通過（12 章各區塊齊、無進度灌水、附錄 G 比較表完整、AI 島現況對照 30 處）。
> #97 生成 12 章 ✅ · #98 附錄 A–G ✅ · #99 組稿 ✅ · #100 審校 ✅
> 原 v0.3 稿 `AI_Island_Fragment_Intelligence_Engine_v0_3_COMPLETE.md` 保留未動（可留作歷史或封存）。

<details><summary>原任務拆解（保留紀錄）</summary>


> owner 定案：混合接地 / 繁中+英術語 / 乾淨重寫成單一 v1.0 / 多代理平行。
> 權威 12 章：0 宣言 · 1 Why Current AI Is Shallow · 2 Fragment Philosophy · 3 Reasoning Layer · 4 Fragment Intelligence · 5 Fragment Representation · 6 Reasoning Pipeline · 7 Multiple Narratives · 8 Creator Context · 9 Case Study · 10 Implementation · 11 Future ＋附錄 A–G。

### #97 — 生成 12 章（工作流進行中）　`P0`
- **做法**：每章按 v1.0 規格（核心內容 + Design Goals/Constraints/Engineering Notes(含 AI 島現況對照)/Failure Cases/Trade-offs/3+範例/Counter Example）。
- **驗收**：12 章齊、結構一致、無進度灌水、案例統一用「高中/夏天/我們/宜蘭」。

### #98 — 生成附錄 A–G（工作流進行中）　`P0`
- A Glossary · B Architecture Diagram(ASCII) · C Sequence Diagram(ASCII) · D Data Model(JSON Schema, 含現況對照) · E REST API Draft(含現況對照) · F Future Research · G Comparison(Prompt/RAG/KG/Agent/FIE 表)。

### #99 — 組稿成單一 md　`P0`
- **做法**：把 12 章 + 7 附錄組成 `docs/creator/AI_Island_FIE_v1_0.md`：標題頁 + Abstract + TOC + 章節 + 附錄；統一術語大小寫、去除重複、確保 ASCII 圖排版正確。
- **驗收**：單一乾淨檔、可直接當 GitHub Docs/對外文件。

### #100 — 審校　`P1`
- **做法**：一致性（術語、案例、章節交叉引用）、Engineering Notes 的「AI 島現況對照」是否**準確**（對照真實 ci_* / creator-engine）、風格是否像 research paper、無殘留 Progress/EXP。
- **驗收**：工程師看完能開始做、研究者看得到創新點、PM 看得到定位。

</details>

---

## 建議執行順序
1. **A 組**（#86/#87/#88）——幾行小修，先清乾淨。
2. **#93 + #92**——記憶/embeddings 讓 Creator Island 語意功能真的會動。
3. **#90**（路徑證書）+ **#94/#96**（防濫用/RPC 小修）。
4. **#89 / #91 / #95**——需先建底層系統或屬設計決策，排後面。
5. **FIE 白皮書**（#97–#100）——獨立進行中，與程式碼工作不衝突。

# 0705 New TODO Task 清單

> 建立日期：2026-07-05
> 來源：全站數據真實性稽核 + Creator Island 靜默 bug 稽核 + 完課獎勵/證書 + gamification 伺服器化 + FIE 白皮書 v1.0。
> 本輪**已完成**的不在此列（見 git log / memory）；此檔只列**還沒做**的。
> 標記：優先序 P0(該做) / P1(中) / P2(可延)。每項含：問題 → 檔案位置 → 做法 → 驗收。
> 進度更新（2026-07-05）：~~劃線~~＝已完成。
> **已完成**：#86 #87 #88（`ae21ca8`）、#93（`63c5410`）、#94 #96（`73d0e49`）、#90（`c6b05d7`）、#88/#95 查證為非缺陷、白皮書+Part II #97–#101（`060c707`）。
> **再完成（2026-07-05 下午）**：#92 記憶系統、#94/#96 RPC、#90 證書、**FIE M1–M5 #102–#106**、SECURITY DEFINER view 修復。
> **最後完成（2026-07-05 晚）**：**#89 商店兌換效果全接上**（`435e61e`）、**#91 Creator XP 系統**（`3a2470a`）、函式安全 REVOKE FROM PUBLIC（`fix_function_security`）、綠寶對話暗色白字修+美化（`a5e9e54`）、綠寶對話進後台（`f7e7b8f`）。
> **剩**：✅ **無**——此清單全部完成。

---

## A. 資料真實性小修（幾行的小改，最快清）　✅ 全部完成

### ~~#86 — LearningDashboard 的 ELO 小 tile 仍固定 1200~~　✅ 已完成 `P1`
> 已做：dashboard 查 `daily_quiz_attempts.elo_delta`，沒對戰紀錄就不顯示 ELO tile（grid 改 2 欄）。commit `ae21ca8`。
- **問題**：`/me` 的大 ELO 卡已隱藏（沒對戰紀錄不顯示），但 `LearningDashboard.tsx` 裡的 ELO 小方塊仍讀 `profiles.elo_rating`（所有人=預設 1200），看起來像壞的。
- **檔案**：`src/components/me/LearningDashboard.tsx`（ELO tile）；資料源 `src/app/me/dashboard/page.tsx`。
- **做法**：跟 `/me` 一樣，判斷「有沒有 elo 對戰紀錄」（`daily_quiz_attempts.elo_delta` 非 null）才顯示該 tile；沒有就隱藏或改成「尚未開始解題對戰」。
- **驗收**：新用戶 dashboard 不再出現固定 1200 的 ELO 方塊。

### ~~#87 — 排行榜「每天 00:00 更新」標籤誤導~~　✅ 已完成 `P2`
> 已做：5 處文案「每天 00:00 更新」→「即時更新」（頁面每請求動態渲染＝即時）；保留「隔天 03:00 streak 重設」真排程。commit `ae21ca8`。

### ~~#88 — openrouter 用量 cost=0（缺費率）~~　✅ 已查證：非 bug `P2`
> 查證結果：那筆 cost=0 是 OpenRouter **`google/gemma-4-31b-it:free`** 免費模型，`cost_input/output_per_1m=0` **本來就正確**（免費模型 $0）。稽核代理誤判成「缺費率」。**不改**（硬塞非 0 費率反而會讓免費模型虛報成本）。

---

## B. Creator Island 經濟 / 市集 / 證書 中型項

### ~~#89 — 商店「花 Z 幣兌換」剩餘品項（需先建底層系統）~~　✅ 已完成 `P1`
> 已做：底層 `ci_store_effects` 表 + `ci_consume_store_effect` RPC（原子扣次）。5 種效果全接上並可驗證：
> 1. **章節搶先** → `chapters/[id]` 未發布章 gating（`hasEarlyAccess`，排程章預留）
> 2. **測驗次數** → `/api/quiz/today?extra=1` 消耗 credit 重抽；`DailyQuizClient` 加「再測一次（剩 N 次）」按鈕
> 3. **寵物造型** → `ci_user_cosmetics` 加 `pet_skin`；`me/pet/evolve` 顯示裝備造型徽章
> 4. **Boost（XP 加倍）** → `getActiveXpMultiplier` 接進 `lesson-reward` server 端算 XP
> 5. **補簽卡** → `streak_restore` 即時補 `profiles.streak_days`
> catalog+UI 全上（pet/boost/unlock 分類渲染）。tsc0/eslint0/build0/117測試過/DB探針OK。commit `435e61e`。
- **問題**：兌換分頁目前只做了 **AI 額度加值** + **裝飾/稱號**（已上線）。「章節搶先 / 測驗次數 / 寵物造型 / Boost」尚未做，因為對應底層系統不存在。
- **底層現況**：`profiles` 無 cosmetic 欄位；章節無 per-user 鎖定；無測驗次數上限；無 XP 倍率/補簽 hook。
- **檔案**：catalog `src/lib/store-redeem.ts`（加 item + effect kind）；UI `src/app/store/StoreClient.tsx`；效果各接對應系統。
- **做法（逐項、每項先建底層再接，避免製造新靜默 bug）**：
  1. **章節搶先/解鎖**：先在 chapters 加 per-user 解鎖表 + gating（`is_premium`/scheduled 已存在，可延伸）。
  2. **測驗次數**：先建每日測驗次數上限 + 加購次數的計數。
  3. **寵物造型**：`ci_user_cosmetics` 已可存 avatar_frame，但寵物 render 要吃這欄位。
  4. **Boost（XP加倍/補簽卡）**：先建 XP 倍率 buff + 補簽（`profiles.streak_days` 修復）機制。
- **驗收**：每個上架品項兌換後**有真實效果**、可驗證，且不影響既有系統。

### ~~#90 — 路徑證書 / 全站證書（cert_type path|all）~~　✅ 已完成 `P1`
> 已做：完成整章後判定 stage 全章完成→發 path 證書、全站完成→發 all 證書（冪等，沿用 /certificates/[code]+OG 圖，可下載圖片/PDF）。commit `c6b05d7`。
- **問題**：目前只做「完成整章自動發 chapter 證書」（`/api/me/lesson-reward`）。`certificates.cert_type` 還有 `path`（學習路徑）、`all`（全站）沒發。
- **檔案**：`src/app/api/me/lesson-reward/route.ts`（chapter 發證的地方）；渲染共用 `src/app/certificates/[code]/page.tsx` + `/api/og/cert`（已支援任意 title）。
- **做法**：定義 path/all 完成條件（例：某 stage 全部章節完成→path 證書；全 80 章完成→all 證書），在完課檢查時一併判斷、`cert_key='path_xxx'`/`'all'` 發證（冪等靠 `UNIQUE(user_id,cert_key)`）。
- **驗收**：完成一個學習路徑 → 自動拿到 path 證書，可下載圖片/PDF。

### ~~#91 — Creator XP 表接線（ci_creator_stats/creator_xp 死碼）~~　✅ 已完成 `P2`
> 已做真系統（非標 deprecated）：`growth.ts` 加 `creatorLevel(xp)` 換算 + `bumpCreatorXp(userId,delta)`（upsert 累加 `ci_creator_stats.creator_xp`）。寫入點：寫碎片 +3、產出作品 +20、FIE 推理 +5（`fragments`/`works`/`fie/reason` 三 route）。`GrowthClient` 在 XP>0 時顯示「🎨 創作者 Lv N + Creator XP」。commit `3a2470a`。
- **問題**：`ci_creator_stats`/`creator_xp` 整表從沒被寫；`growth.ts getStats` 改用即時 COUNT（畫面正常，但 spec 的 creator XP/等級/成就沒接）。
- **檔案**：`src/lib/creator-engine/growth.ts`；建立/作品/AI 動作的寫入點（`creator-engine` 各 service）。
- **做法**：決定要不要真的做 creator XP 系統。若要：在 fragment/work/agent 成功時 bump `ci_creator_stats.creator_xp`（RPC 或 upsert，冪等）；否則正式把該表標為 deprecated。
- **驗收**：creator XP 有真實累積，或明確標記不使用。

### ~~#94 — 市集 self-deal 防禦下沉到 RPC 層~~　✅ 已完成 `P2`
> 已做：`ci_purchase_listing` 加 buyer≠賣方 workspace owner/member 檢查→own_listing；db:apply + probe 驗證。commit `73d0e49`。
- **問題**：防自買自賣目前只在 lib 層 `marketplace.ts purchaseListing`（實務夠用，因為只有它呼叫 RPC）；直接打 `ci_purchase_listing` RPC 仍可繞。
- **檔案**：`supabase/creator_island_marketplace_migration.sql`（`ci_purchase_listing`）。
- **做法**：RPC 內加 buyer≠賣方 workspace owner/member 檢查（查 `ci_workspace_members`/`ci_workspaces.owner_id`），回 `own_listing`。改完 `npm run db:apply`。
- **驗收**：直接呼叫 RPC 買自己上架的也被擋。

### ~~#95 — Creator AI 用量寫 ai_usage_daily（parity）~~　✅ 查證：非缺陷 `P2`
> 查證結果：`ai_usage_daily` 是 **web 聊天專用表**；creator AI 走 `callAI` 自動記 `ai_model_usage`（後台「各模型費用」報表**有納入**、audit 確認）。寫進 `ai_usage_daily` 反而汙染 web-chat 指標。**current behavior 正確，不改**（同 #88）。

### ~~#96 — RPC 小瑕疵修正~~　✅ 已完成 `P2`
> 已做：workflow 分支(不再放行不存在 workflow)、重複購買回 entitlement/transaction id、`(%s)→(%)` 修訊息。db:apply + probe 驗證。commit `73d0e49`。
- **問題**：
  1. `ci_validate_asset_ref` 對未知 `asset_type`（含 `workflow`）直接放行（`v_exists:=true`）→ 可指向不存在的 workflow。
  2. `ci_purchase_listing` 重複購買回傳 `{ok:true, already_owned:true}` 但沒帶既有 entitlement/transaction id。
  3. `ci_asset_relations_check` 的 `RAISE EXCEPTION '... (%s) 不存在'` 格式字串多一個 `s`（訊息顯示 `(fragments)`）。
- **檔案**：`supabase/creator_island_assets_migration.sql`、`creator_island_marketplace_migration.sql`。
- **做法**：workflow 型別等 `ci_workflows` 存在後補存在檢查；重複購買回傳既有 id；修 `%s`→`%`。db:apply。
- **驗收**：三個小瑕疵各自修正、行為正確。

---

## C. 記憶 / Embeddings

### ~~#92 — 記憶系統剩餘（語意檢索 + candidate + 顯示 + embedding 回填）~~　✅ 已完成 `P1`
> 已做：`ci_memories_semantic` RPC + `getInjectableMemory(queryText)` 語意注入；`createMemory` 設 embedding；DNA→候選記憶(candidate)；`/memory/used` API + 推理台顯示「用到的記憶」。
- **問題**：記憶注入 prompt 有做、文字編輯已補；仍缺：
  1. 檢索是「最近用 `last_used_at`」而非**語意相關**。
  2. **candidate 推論流程沒做**（沒東西會產生 `status='candidate'` 的候選記憶）。
  3. 「本次用到的記憶」透明化：`ci_memory_usage` 只寫不讀、前端沒顯示。
  4. `ci_memories.embedding` 從不回填、也不查（ivfflat 索引閒置）。
- **檔案**：`src/lib/creator-engine/memory.ts`；`src/lib/creator-engine/ai/agents.ts`（注入處）；`src/app/api/creator-island/memory/*`；前端顯示點。
- **做法**：`getInjectableMemory` 改成先算 query 向量做語意檢索（需 embedding 回填）；AI 動作後從對話/選擇推論 candidate 記憶（`source='agent_run'`、`status='candidate'`）；API/UI 顯示「本次用到的記憶」。
- **驗收**：記憶按相關性注入、有候選記憶待確認、使用者看得到本次用到哪些記憶。

### ~~#93 — ci_fragments embedding 全量回填 cron~~　✅ 已完成 `P1`
> 已做：`/api/cron/ci-embeddings-backfill`（掃缺向量 workspace 逐一回填、上限 400、沒 key 則 no-op+warn）。cron-job.org 設每日 ?secret。commit `63c5410`。
- **問題**：`createFragment` 不設 embedding；只有點「意外配對」時懶惰回填 40 筆、且需 `ai_api_keys` 有 OpenAI key。沒 key → E4/E5/語意搜尋全靜默空；沒有全量 cron。
- **檔案**：`src/lib/creator-engine/embeddings.ts`（`backfillWorkspaceEmbeddings`）；新增 cron route `src/app/api/cron/ci-embeddings-backfill/route.ts`（仿現有 cron）。
- **做法**：加一支 cron 定期分頁回填所有 workspace 缺向量的 ci_fragments（有 key 才跑）；或 createFragment 時 fire-and-forget 生成。
- **驗收**：碎片建立後一段時間內 embedding 有值，E4/E5/語意搜尋在有 key 時穩定有結果。

---

## D. FIE 白皮書 v1.0　✅ 已完成（2026-07-05）

> **產出：`docs/creator/AI_Island_FIE_v1_0.md`（7579 行 = Part I 白皮書 + Part II 實作規格）。commit `79ef5a3` + `060c707`。**
> ~~#97 生成 12 章~~ ✅ · ~~#98 附錄 A–G~~ ✅ · ~~#99 組稿~~ ✅ · ~~#100 審校~~ ✅ · ~~#101 Part II 實作規格~~ ✅
> Part I：12 章 + 附錄 A–G（多代理 19 agent 全成功、審校通過、AI 島現況對照 30 處）。
> Part II：II-1~II-10（完整 DDL+RLS / TS型別+JSON Schema / Pipeline 演算法 / Confidence 公式 / Prompt 模板 / API 契約 / 整合遷移 / 里程碑 M1-M5 / 測試計畫），全接地 `ci_*`。
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

## E. FIE 實作（依 `docs/creator/AI_Island_FIE_v1_0.md` Part II）　✅ M1–M5 全完成（2026-07-05）

> 產出：5 表(ci_fragment_representations/reasoning_runs/candidates/trace/feedback)+`fie/{types,representation,reason,feedback}.ts`+`reason` agent+`/fie/reason*` API+`/creator-island/reason` 推理台 UI（含三模式/candidates/trace/採納否決/用到的記憶）+`fie-scoring.test.ts`(8 測試)。全 db:apply + 117 測試過。
> ~~#102 M1~~ ✅ · ~~#103 M2~~ ✅ · ~~#104 M3~~ ✅ · ~~#105 M4~~ ✅ · ~~#106 M5~~ ✅

<details><summary>原里程碑拆解（保留紀錄）</summary>


> 規格已完整寫在白皮書 Part II（II-1~II-10）。以下依 II-9 里程碑拆成可執行 todo。
> 全程**旁掛新增、不改既有** `/api/creator-island/ai/*`；新檔放 `src/lib/creator-engine/fie/`、新 API 放 `/api/creator-island/fie/`、新表 `ci_` 前綴 + RLS（比照 ci_fragments）。
> 共通驗收基線：`tsc --noEmit` 0 error；API 過 `requireCreatorUser`+`requireWorkspaceRole`；AI 走 `callAI`+Cost Manager 寫 `ci_agent_runs`。
> 相依**線性**：M1→M2→M3 硬相依；M4/M5 部分可在 M3 後並行（UI 用 mock）。每個 Mx 可獨立上線。

### #102 — FIE M1：Fragment Representation 分層 + DDL　`P1`（先做）
- **範圍**：`ci_fragments` 旁掛分層表徵（Surface/Semantic/Structural/Latent），不改既有欄位。
- **產出**：migration `supabase/creator_island_fie_representation_migration.sql`（新表 `ci_fragment_representations` 1:1 對 ci_fragments、concept_embedding vector(1536)+ivfflat、RLS）；`src/lib/creator-engine/fie/representation.ts`（`buildRepresentation`/`upsertRepresentation`+zod）；`scripts/fie-backfill-representations.mjs`（可重跑、分頁）。沿用 `embedText`（需 OpenAI key）。
- **DoD**：backfill 後 ci_fragments 與新表筆數一致；抽 5 筆各層非空、concept_embedding 非 null(1536)；可重跑 no-op；既有資料零破壞。詳見 II-9 M1。

### #103 — FIE M2：Reasoning Pipeline（單 hypothesis）　`P1`
- **範圍**：六階段端到端跑通、只走一條假設（Observation→Hypothesis→Evidence→Missing→單 Candidate→對齊 placeholder）。
- **產出**：新表 `ci_reasoning_runs`（關聯 `ci_agent_runs`）；`ai/agents.ts` 加 `reason` agent（沿用 runAgent+zod `ReasoningOutputSchema`）；`fie/reason.ts`（`runReasoning`，用 `ci_related_fragments` 取 evidence）；`POST /api/creator-island/fie/reason`；最小 debug 面板。
- **DoD**：帶 2 seed 回 status=done 六階段全非 null；`ci_agent_runs` 有對應列且 z_charged>0；evidence 的 fragment_id 真實存在；zod 失敗重試一次、二次 failed 不寫髒；非成員 403。詳見 II-9 M2。

### #104 — FIE M3：多 Candidate + Confidence/Weight　`P1`
- **範圍**：single→N candidate，每個帶 confidence(模型自評)+weight(系統算)，排序回 Top-K。
- **產出**：新表 `ci_reasoning_candidates`（多對一 run、rank/confidence/weight/evidence_ids）；`reason` 輸出改 `candidates[]`；`fie/reason.ts` 加 `scoreCandidates`（weight 公式見 II-5，**純函數+單元測試**）；`/fie/reason` 回 `candidates[]`+`topK`。
- **DoD**：≥3 candidate、rank 連續、weight 排序正確；scoreCandidates 有純函數測試可重現；evidence_ids ⊆ run 的 evidence；M2 舊回傳不破。詳見 II-9 M3。

### #105 — FIE M4：Creator Context 三模式（Familiar/Adjacent/Exploratory）　`P2`
- **範圍**：三模式改變 evidence 檢索範圍 + prompt + weight 的「對齊 vs 新奇」配比。
- **產出**：`fie/modes.ts`（`resolveMode`、三檢索策略：Familiar=`ci_related_fragments`、Adjacent=concept 近鄰+跨 cluster、Exploratory=`ci_surprising_pairs`；`alignToCreator` 讀 `ci_creator_dna`）；三份 prompt 模板；`/fie/reason` 收 `mode`。
- **DoD**：三模式 evidence 交集<50%；mode 正確記錄且 resolveMode 有決定性；alignToCreator 有 DNA 時影響排序、無 DNA 退中性；Exploratory 的 Top-1 novelty 高於 Familiar。詳見 II-9 M4。

### #106 — FIE M5：Reasoning Trace UI + Feedback Loop　`P2`
- **範圍**：完整推理鏈落成可回放 Trace；創作者採納/否決回寫 `ci_memories` 影響後續。
- **產出**：新表 `ci_reasoning_trace`（逐階段）+`ci_reasoning_feedback`；`fie/reason.ts` 每階段 append trace；`fie/feedback.ts`（`recordFeedback`→寫 feedback + accepted 經 embedText 寫 `ci_memories`）；`GET /fie/reason/[runId]/trace`、`POST .../feedback`；Trace 視覺化 UI + 採納/否決按鈕。
- **DoD**：trace 恰 6 stage、step_no 連續；evidence 可點回 ci_fragments；accepted 後 ci_memories 出現對應記憶(embedding 非 null)；feedback 影響後續 run（同 seed 前後 Top-1 變化 + ci_memory_usage 有引用）。詳見 II-9 M5。

</details>

---

## 建議執行順序
1. ~~**A 組**（#86/#87/#88）~~　✅ 已清。
2. ~~**#93**（embeddings 回填 cron）~~　✅ · ~~**#94/#96**（防濫用/RPC 小修）~~　✅ · ~~**#90**（路徑證書）~~　✅
3. ~~**#92 記憶系統**~~　✅ · ~~**FIE 實作 #102–#106（M1→M5）**~~　✅ · ~~**SECURITY DEFINER view 修**~~　✅
4. ~~**FIE 白皮書**（#97–#101，含 Part II）~~　✅ 已完成。
5. ~~**剩下需你決策/較大**：#89（商店品項）、#91（creator XP）~~　✅ 兩者皆做成真系統完成（`435e61e` / `3a2470a`）。

---

## ✅ 全清單完成（2026-07-05）
本檔所有項目已完成或查證為非缺陷。#89/#91 為最後兩項，均已建成**真實可驗證系統**（非佔位、非標 deprecated）。後續新工作另開檔。

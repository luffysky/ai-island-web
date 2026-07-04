# 工作日誌 2026-07-05

> 本日大工程：Creator Island 深度稽核修復 → 經濟/證書/獎勵 → 全站數據真實性 → gamification 伺服器化 → FIE 白皮書 v1.0 + 實作規格 → FIE M1–M5 實作 → 記憶系統 → 安全修復。全程 typecheck 0、測試 117 passed、DB 皆 db:apply + probe 驗證。

## 一、Creator Island 靜默 bug 修復（有 UI/表但沒真接）
- 市集「買了等於白買」→ 買=複製資產進買家 workspace + 已上架資產擋免費 fork。
- 家譜空（synthesize/evolve 沒寫血緣）→ `POST /fragments` 收 derivedFrom+relationType 寫 `ci_asset_relations`。
- 碎片蛋抽到重複 → 退 Dust、不新增、♻️ 提示。
- 市集 self-deal（lib 層）、上架驗資產歸屬。

## 二、經濟核心
- **Cost Manager**（E10 嚴格）：核心免費、演化>6/歌曲導出扣 Z 幣；個人扣 z_coin、studio 扣 workspace wallet；reserve→失敗退款、402。
- **🌰 果實創作幣**（反洗幣）：`ci_fruit_ledger`+`ci_fruit_tx`；市集賣方收果實、買家 Z 幣 sink。
- **商店「花 Z 幣兌換」**：`ci_store_purchases`+`ci_user_cosmetics`；AI 額度加值 + 裝飾/稱號（成長頁顯示）。

## 三、完課獎勵 + 證書
- 小節首次 +5 Z幣；整章 +80 Z幣 +150 XP + 證書。
- **證書自動發放**（chapter/path/all）：完成整章、整 stage、全站各自發證；沿用 `/certificates/[code]` + OG PNG，**可下載圖片/PDF**（PDF 用 print CSS、零套件）。

## 四、全站數據真實性稽核（5 平行子代理 + 實查 DB）
- **結論：無假數據冒充真數據**（nami-playground 是標示的練習沙盒）。
- 修：後台 `.maybeSingle()` 誤用弄空真數據（AI 用量圖/待處理工單 6 張顯示 0）；裝置分佈圖接 `analytics_sessions`;移除從未接的 retention 空圖;`/me` ELO 卡無對戰紀錄隱藏;LearningDashboard ELO tile 同;排行榜「每天 00:00」→「即時」;AI 成本 breakeven 假設值改讀 `app_settings`。
- 查證非缺陷：openrouter cost=0（免費模型）、creator AI 用量（本就記 ai_model_usage）。
- 待底層系統/設計決策：certificates path/all(已做)、ELO 只在 leetcode 測驗動、#89 商店品項、#91 creator XP。

## 五、gamification 伺服器化（防刷分）
- lesson XP + quiz 評分/給獎全搬伺服器端（`/api/me/lesson-reward`、`/api/me/quiz-submit`），伺服器算 XP(clamp)、伺服器評分（答案伺服器讀）。
- 移除 `GamificationEngine.addXp/addCoin`（前端直接寫 profiles 的偽造路徑）。

## 六、FIE（Fragment Intelligence Engine）
- **白皮書 v1.0**：`docs/creator/AI_Island_FIE_v1_0.md` 7579 行 = Part I 研究白皮書（12 章 + 附錄 A–G）+ Part II 實作規格（II-1~II-10，DDL/API/pipeline/Prompt/測試，接地 ci_*）。多代理平行生成。
- **FIE M1–M5 實作**（旁掛新增、不改既有）：
  - 5 表：`ci_fragment_representations`/`ci_reasoning_runs`/`ci_reasoning_candidates`/`ci_reasoning_trace`/`ci_reasoning_feedback`（RLS 比照 ci_fragments）。
  - 服務：`fie/{types,representation,reason,feedback}.ts`；`reason` agent（沿用 runAgent）。
  - Pipeline：Representation→Observation→Evidence(依三模式 Familiar/Adjacent/Exploratory 取 ci_related_fragments/ci_surprising_pairs)→Hypothesis→多 Candidate + Confidence/Weight(scoreCandidates 純函數+8 測試)→Creator DNA 對齊→寫 Trace。
  - API：`/fie/reason`(POST)、`/fie/reason/[runId]`(GET trace)、`.../feedback`(POST，採納→回寫 ci_memories)。
  - **UI**：`/creator-island/reason` 推理台（選碎片→模式→推理→candidates+trace+採納/否決+「用到的記憶」），探索列有入口。RWD ✅。

## 七、記憶系統（#92）
- 語意檢索：`ci_memories_semantic` RPC；`getInjectableMemory(…, queryText)` 用使用者訊息做語意注入（退回最近用）。
- `createMemory` 建立時設 embedding；DNA 分析產生「候選記憶」（candidate）。
- 「本次用到的記憶」：`ci_memory_usage` 讀取 API + 推理台顯示。
- `ci_fragments` embedding 回填 cron（`/api/cron/ci-embeddings-backfill`）。

## 八、安全 / RPC 修
- **SECURITY DEFINER view** 3 個 ERROR（Supabase linter）→ 套用既有 `security_invoker_views_migration.sql`（5 view 全設 security_invoker=on，資料完好）。
- RPC：workflow asset-ref 不再放行、重複購買回 id、錯誤訊息 `(%s)→(%)`。

## 驗證
- `tsc --noEmit` 0 error；`vitest` **117 passed（14 檔）**；所有 migration db:apply + node probe 驗證；DB 欄位稽核（audit-db-columns）我改的檔零錯接；362 route 全有 export；新 UI RWD 響應式、無固定寬。
- 連接性：FIE UI↔API↔後端↔表全接通；記憶 used API 已由推理台呼叫。

## 剩餘（未做，需決策/底層系統）
- #89 商店章節搶先/測驗次數/寵物造型/Boost（需先建對應底層）。
- #91 Creator XP 表（做 or 標 deprecated）。

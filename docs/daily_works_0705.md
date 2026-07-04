# 工作日誌 2026-07-05

> 本日大工程：Creator Island 深度稽核修復 → 經濟/證書/獎勵 → 全站數據真實性 → gamification 伺服器化 → FIE 白皮書 v1.0 + 實作規格 → FIE M1–M5 實作 → 記憶系統 → 安全修復 → #89 商店兌換效果 + #91 Creator XP（兩項最後 todo 收尾）→ 綠寶對話修 UI/進後台 → CI build 修。全程 typecheck 0、lint 0 error、build exit 0、測試 117 passed、DB 皆 db:apply + probe 驗證。`docs/0705new_todotask.md` 全清單完成。

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
- **SECURITY DEFINER 函式權限**（Supabase linter WARN）：14 支給值/改狀態的函式（grant_zcoin/award_z_coin/increment_profile_xp/ci_fruit_tx/ci_dust_tx/ci_debit_workspace_wallet/ci_purchase_listing/…）原本 EXECUTE 預設 grant 給 PUBLIC → anon 可直接呼叫。`fix_function_security_migration.sql`：`REVOKE FROM PUBLIC` + `GRANT service_role`。實測 anon→grant_zcoin 回「permission denied」、service_role 正常。
- RPC：workflow asset-ref 不再放行、重複購買回 id、錯誤訊息 `(%s)→(%)`。

## 九、#89 商店兌換效果全接上（真系統）
- 底層：`ci_store_effects` 表 + `ci_consume_store_effect` RPC（原子扣次、FOR UPDATE、service_role only）。
- 5 種效果全接且可驗證：
  1. **XP 加倍卡** → `getActiveXpMultiplier` 接進 `/api/me/lesson-reward` 伺服器端算 XP。
  2. **測驗次數** → `/api/quiz/today?extra=1` 消耗 credit 重抽考卷；`DailyQuizClient` 加「再測一次（剩 N 次）」按鈕（原本買了無處可用）。
  3. **寵物造型** → `ci_user_cosmetics` 加 `pet_skin`；`me/pet/evolve` 顯示裝備造型徽章。
  4. **章節搶先** → `chapters/[id]` 未發布章 `hasEarlyAccess` gating（排程章預留）。
  5. **補簽卡** → `streak_restore` 即時補 `profiles.streak_days`。
- catalog + `StoreClient` 全上（pet/boost/unlock 分類渲染）。commit `435e61e`。

## 十、#91 Creator XP（真系統，非標 deprecated）
- `growth.ts`：`creatorLevel(xp)` 換算 + `bumpCreatorXp(userId,delta)`（upsert 累加 `ci_creator_stats.creator_xp`）。
- 寫入點：寫碎片 +3、產出作品 +20、FIE 推理 +5（`fragments`/`works`/`fie/reason` 三 route）。
- `GrowthClient` 在 XP>0 顯示「🎨 創作者 Lv N + Creator XP」。commit `3a2470a`。

## 十一、綠寶對話 UI 修 + 進後台
- **暗色模式白字看不清**：使用者訊息泡泡 `text-white`→`text-black`（暗色 accent 是亮綠 #50fa7b、白字低對比；沿用 globals.css 既有系統，明亮模式自動翻白）。同 bug 的好友訊息 `MessagesClient` 一併修。
- **對話介面美化**：`IslandChat` 重繪（品牌漸層氣泡+氣泡尾、綠寶頭像、打字中三點動畫、header 在線狀態、送出鍵漸層）。commit `a5e9e54`。
- **綠寶對話進後台**：AI 對話紀錄頁加分頁「🎓 學習導師 / 💎 創作者島・綠寶」；讀 `ci_chat_sessions`（訊息內嵌 JSONB、user_id 無 FK → server 端手動補 profile+workspace 名），沿用 owner-only 隱私閘門。commit `f7e7b8f`。

## 十二、CI / 文件
- **CI build 修**：`lesson-reward` 的 `let reward` 從未 reassign → `prefer-const` ESLint **error** 讓 `next build` 炸（CI 紅）。在發證分支補 `reward = {...}`，CI 恢復綠。
- **OWNER_SETUP.md**：本輪 6 支已套用但未進 `run-migrations.mjs` 的 migration 具體列出（重建 DB 時補跑）；確認本輪**無新 env、無需手動操作**。commit `1b43ea5`。

## 驗證
- `tsc --noEmit` 0 error；`next lint` 0 **error**；`npm run build` exit 0；`vitest` **117 passed（14 檔）**；所有 migration db:apply + node probe 驗證；DB 欄位稽核（audit-db-columns）我改的檔零錯接；新 UI RWD 響應式、無固定寬。
- 連接性：FIE UI↔API↔後端↔表全接通；記憶 used API 已由推理台呼叫；商店 5 效果 UI↔API↔DB 全接（含測驗次數觸發鈕）。
- 每筆 commit 前皆走：tsc → lint → build → test → DB 探針，通過才 push。

## 剩餘
- ✅ **無**——`docs/0705new_todotask.md` 全清單完成（#89/#91 為最後兩項，均做成真實可驗證系統）。後續新工作另開檔。

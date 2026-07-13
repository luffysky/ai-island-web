# 工作日誌 2026-07-13 — 分身島搜尋大修 + L4/L5/L2 引擎收尾 + 統一金鑰

> 本日詳細分項另見 `docs/worklog/daily_works_0712.md` 尾段（同一 session 連續）。
> **所有待辦統一放 `docs/todo/todo_list_0713.md`**（分身島 × 機會島 × 全站，含已完成劃線 + 建議順序）。以後待辦都寫進那個檔。

## 今日完成（已上線 / 已 push）
1. **Agent 搜尋效率大修**：查夠就收尾（web 工具 7 次硬上限）、合成不丟資料（stepEvidence + 濾驗證頁 + 禁編造）、修「結果吐 reasoning 草稿」（sanitizeAnswer + 強模型吐草稿改用 Haiku 重產）。
2. **搜尋省額度**：三級免費優先 **DDG → Tavily(非中文才用) → Brave**；實測 Tavily 對中文 0 結果 → 中日韓查詢自動跳過。Google CSE 全網被 Google 淘汰 → 移除。
3. **搜尋 BYOK + 統一金鑰**：Brave/Tavily 使用者自貼 key（AES-256-GCM 加密存 `user_api_keys`）+ 兩張卡加「如何免費申請」教學；註冊成 BYOK provider → **匯集 `/settings/ai-keys` 統一新增/測試/開關/刪除**。
4. **技能商店 v2（45→62）**：+11 支會自己搜尋的技能（找店/深研/市調/比價/行程/簡報/競賽獵人/學習教練/找課/計算/動態頁）+ 升級 12 支舊研究技能加 web.search+web.research。migration 已上 prod。
5. **L4 技能合成**：完成的任務一鍵「存成技能」→ AI 蒸餾成一般化技能草稿、開建立視窗預填。
6. **L5 平行多代理**：≥3 個可獨立子任務 → 子代理唯讀並行查 + 強模型合併去重；失敗落回序列。
7. **L2 伺服器瀏覽器（選配、預設關、零風險）**：`browser.render` 加 `ENABLE_SERVER_BROWSER` 開關；Dockerfile 加**選配** build arg `INSTALL_SERVER_BROWSER`（不設＝部署零變動）。
8. **文件**：`docs/todo/todo_list_0713.md` 匯集全部 10 份規劃文件的分身島/機會島完整待辦。

## 🚨 收尾前檢查清單（CLAUDE.md 鐵規則）
1. **API / DB / 資料表**：
   - migration `agent_skills_catalog_v2_migration.sql` 已跑 prod（內建技能 45→62 已驗）。
   - DB 欄位核對：`agent_tasks`(goal/plan/plan_done/result/turn_summary/thread_id/step_count)、`agent_steps`(task_id/idx/thought/tool_name/risk/args/result/ok/verified)、`user_api_keys`(provider/api_key_encrypted/is_active/metadata/label)、`agent_skills` — **全部存在**。
   - 62 支技能引用的 15 個工具名**全是真的註冊工具**（無 typo）。
   - `audit-db-columns` 對本 session 檔案無新錯（既有 ✗ 是 creator-engine 的樣板字串誤判、非本次）。
2. **UI 接對**：存成技能→`/api/agent/skills/synthesize`→草稿→SkillCreator→`POST /api/agent/skills`；Brave/Tavily 卡→`/api/user/ai-keys`（存 masked）；`/settings/ai-keys` 用 `BYOK_PROVIDERS` 列/新增、`testProviderKey` 測 brave/tavily。**皆接真 API、非空殼**。
3. **RWD（手機）**：結果卡標題列 `flex justify-between` + 右側 `flex gap-1.5`（存成技能 + 複製，360px 內放得下）；Tavily 卡＝已驗 Brave 卡的結構複製；申請教學 `<details>` 用可換行清單、短連結。**無新破版、無固定寬度**。
4. **桌面版**：沿用既有 grid/卡片，無版面異動。
5. **PWA**：manifest / sw 本次未動、無影響。
6. **建置**：tsc 0 · vitest 122 綠 · next build 0。
7. **機密**：`.env.local`（含 Brave/Tavily/Google key）未 commit；使用者 key 全 AES-256-GCM 加密存 DB。

## 今日續（0713 下午）— RWD 修 + AI 員工辦公室 MVP
9. **手機導覽破版修（192.jpg）**：TopNav 手機展開選單原本無捲動/無底部安全區 → 最後兩項（分身島/翻譯）被 Android 系統列卡住看不到。改成 `max-h-[calc(100dvh-3.5rem)] overflow-y-auto` + `pb-[calc(1rem+env(safe-area-inset-bottom))]`，超長可捲、不再被卡。
10. **技能商店工具列 wrap（193.jpg）**：員工卡的 `allowed_tools` 原本 `truncate` 單行截斷 → 改 `basis-full break-words` 整串換行、需本機/高風險徽章自然折到下一行。
11. **🆕 AI 員工辦公室 MVP `/agent/office`（對標 Genspark Claw 194–197）**：
    - 狀態列：本機電腦「已連線/離線 + platform」、在職員工數（+工作中）、今日產出件數。
    - **熱門任務快捷格**（7 項：查資料/找機會/寫文案/解釋術語/讀網頁/找課/整理本機檔案）＝點一下**預填指令**到下令列、看過再送出（不自動燒 API）；「整理本機檔案」需電腦上線才可點（gating）。
    - 我的 AI 員工卡（emoji/職務/閒置中/派工→`/agent?skill=<id>`）＋最近工作列表（狀態→`/agent?task=<id>`）。
    - AgentClient 加 `?goal=`/`?skill=` 深連結（辦公室派工用）；`/agent` 技能列加「🏢 辦公室」入口。
    - **純讀 + 導頁設計**（重用 `/api/agent/{skills,devices,tasks}`），不新增寫入 API、不會意外花錢。
12. **回答林董 Genspark 三問**（記進 todo §10-B）：桌面助手 UI ✅ 可做（我們 Web 原生、辦公室頁已達 80% 感覺，原生 tray App 列後期選配）；虛擬伺服器 ⚠️ 技術可行但常駐 VM 每台燒錢不合免費優先 → 改「用完即拋臨時沙盒」且限付費檔（見 §4 Phase E）；工作空間 Hub ✅ 可聚合既有能力（簡報/表格/文件生成器沒有＝大工程後補）。

### 收尾檢查（第二輪）
- **建置**：tsc 0 · vitest 122 綠 · next build 0（`/agent/office` 5.32 kB 已建）。
- **RWD**：辦公室頁 `grid sm:2/lg:3` 響應式；手機選單捲動 + 安全區已修；桌面沿用既有卡片無破版。
- **API/DB**：無新表、無新寫入端點（辦公室全讀既有 3 支 API）；`?goal=/?skill=` 僅前端預填、不改後端。
- **安全紅線**：辦公室頁對外動作＝0；熱門任務只「預填」不自動送、文案類任務文字明示「先給我看過再決定發不發」。

## 待辦
👉 **全部見 `docs/todo/todo_list_0713.md`**（分身島 L1–L5✅/桌面/手機/Android/安全/MCP/AI 員工辦公室 MVP🚧/省 token；機會島 V1✅/V2–V3 部分/V4–V5⬜/後台複刻⬜；全站 AI 記帳 P0–P4/辭典/語言島）。
建議下一步（同檔第四節）：① 辦公室進階（cron 自動排程 + 待批准佇列聚合 + 看員工工作動畫）② 機會島 V2/V3 主幹 ③ 後台複刻 AI 島專屬機會雷達。

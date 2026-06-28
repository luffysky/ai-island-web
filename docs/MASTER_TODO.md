# AI 島 — 全專案待辦總整合（2026-06-29，已對 repo 驗證）

> 整合各檔待辦並**逐項對 repo 驗證**（admin 頁/資料表/元件/章節是否存在）。
> 來源：`TODO.md`(0623)、`REPORTS_TODO_2026-06-03.md`、`BACKLOG.md`、`BEGINNER_FRIENDLY_BACKLOG.md`、`ROADMAP_2026Q3.md`、`docs/ideas_os/`。
> 標記：`[ ]`=驗證後確實未做｜~~刪除線~~=驗證已存在於 repo（附證據）｜🟡=部分/待深核｜🔴=外部設定(code 看不到、靠林董確認)。

---

# 一、✅ 驗證「其實已經做完」（之前沒劃線）

對 repo 查到實體存在，視為**已完成**（保留紀錄）：

- ~~admin 後台 23 頁~~：churn / kpi / cohort / segments / email(campaigns+subscribers) / scheduled / tickets / crm / og-preview / seo / users/[id]/timeline / ai/moderation / marketing(schedule/publish/affiliates) / achievements / gamification / zcoin / web-vitals / ga4 / broadcasts / ab —— 全部 `page.tsx` 存在。
- ~~3D 島嶼~~（`src/app/island/page.tsx` 在）— ROADMAP S7-S8 v0 已落地。
- ~~ch71《Vibe Coding 除錯聖經》+ Debug 練習場~~（`ch71.json` + `api/playground/run`）。
- ~~Streak heatmap~~（heatmap 元件 6 檔）、~~技能雷達~~（radar）、~~每週學習報告~~（13 檔）、~~筆記匯出 MD~~（7 檔）、~~今日推薦下一課~~。
- ~~paywall / 單章購買 / 訂閱~~（paywall + `chapter_purchases`/`subscriptions` 表）。
- ~~可驗證證書~~（`certificates` 表 + certificate 8 檔）、~~作品集~~（`portfolios`）、~~推薦分潤~~（`referral_codes`/`referral_commissions`）。
- ~~AI tutor 額度分層基礎~~（`ai_daily_quota` 表 + ai/chat routes）、~~模擬面試~~（`mock_interview_sessions`）、~~導師檔案~~（`mentor_profiles`）。
- ~~Sentry~~（25 檔）、~~CSP~~（5 處）、~~PostHog~~（2 處）、~~bundle analyzer~~（4 處）。
- ~~退費/工單~~（tickets+crm）、~~流失預警~~（churn）、~~KPI 報表~~（kpi）、~~cohort 留存分析~~（admin/cohort）、~~SEO 預覽~~（og-preview/seo）。
- ~~AI 內容審核~~（ai/moderation）、~~寵物進化~~（me/pet/evolve）。

> 結論：`ROADMAP_2026Q3` S1–S6、S9–S12 與 `REPORTS_TODO` §G 大部分已完成；那兩份可標「歷史」。

---

# 二、🔴 真的還沒做（已驗證 ❌）— 平台 code

- [ ] **PWA icon**：`public/` 只有 `favicon.svg`，缺 PNG 192/512 maskable + apple-touch。
- [ ] **GDPR `user_settings` 表**：supabase 無此表、gdpr/export 默默漏 → 建表 or 刪那行。
- [ ] **Cloudflare Turnstile**：src 0 引用 → 註冊/發文防機器人未做（+ 蜜罐欄位）。
- [ ] **N8N 12 workflow**：src 無實接（只在章節內容提到）→ 自架 n8n 後再開（spec 在 `N8N_INTEGRATION.md`）。
- [ ] **大檔上傳 OOM 防護**：附件走 server 記憶體；無限大需 presigned 直傳。
- [ ] **（選配）自架 Piston**：需 VPS、設 `PISTON_BASE_URL`。
- [ ] **AI 草稿語意抽查**：結構已驗(0 錯)，答案對錯建議人工抽看。
- [ ] **學習社群 / Cohort 使用者端**：❌ 確認沒做（只有 `admin/cohort` 分析、無使用者端頁/表）。期數制 / 進度夥伴 / 組隊 Boss 待開發。

# 三、🟡 深核後的確切狀態（2026-06-29 已查 code）

**自動評測**（拆兩半）
- ~~自動判題 + 發 XP~~ ✅ **已做**：`admin/playground/challenge/submit`（Pyodide 跑 user_code+test_code、第一次 `passed` → `add_xp` + `xp_events`）。
- [ ] **綠寶 AI Code Review（程式點評）**：❌ 無 code-review 端點 → 未做。
- [ ] **作業自動批改**：`me/assignments/submit` 目前 `graded_by:null` = **人工批改**；可加自動判分。

**安全**
- ~~HSTS + X-Frame-Options~~ ✅ 已在 `next.config` headers。
- [ ] **CSP**：❌ 確認**沒做**（先前「CSP 5 處」其實是 ch04 章節內容，非真 header）→ 建議 Report-Only 先行。
- [ ] **v1 API key 一鍵輪替/停用 UI**：`api_keys_v` 表在，但 admin 無輪替/停用介面。

**效能**
- [ ] 其餘列表 API `select("*")`→明確欄位（章節 metas/nav 已做）、RLS `is_admin()` SECURITY DEFINER + index。

# 四、🔴 林董手動設定（code 看不到、靠你確認）

- [ ] **確認部署**：Zeabur Restart 拉 `:latest`；admin 🚀 角標顯示最新 commit。
- [ ] **Stripe**：key → bootstrap → 3 price_id → webhook(6 事件) → `STRIPE_WEBHOOK_SECRET` → 4242 測。(`STRIPE_SETUP.md`)
- [ ] **寵物 4 隻 Lottie URL** → `/admin/lottie-settings`。
- [ ] **cron 排程 7 個**（student-daily-review / recall-user / leetcode-sync / discord-quote / summarize-memories / launchpad-auto-sync / launchpad-retrospective）。(`cron-setup.md`)
- [ ] **Discord 收尾**（VIP role 順序 + `DISCORD_VIP_ROLE_ID`/`DISCORD_CLIENT_SECRET`）。
- [ ] **GitHub Actions** `CRON_SECRET`/`SITE_URL` 對齊；**OAuth `deleted_client`** 確認可登入；**Owner MFA**；**Cloudflare WAF + 藏 origin IP**；**Dependabot + 備份 + 金鑰輪替**。

# 五、📚 內容工作（持續、部分完成）

- [ ] **新手友善化**（`ch26` 規格）：已做 12 章/~309 課；其餘按 P0→P1 順序續推。(`BEGINNER_FRIENDLY_BACKLOG.md`)
- [ ] **strict-spec 重寫**（選配、更高標）：ch68(20 課)、ch55-58/60-67/69-70。附錄 by design 可不改。

---

# 🏝️ 六、Ideas OS / Creator Island（全新、純規格、尚未動工）

> 18 份規格全 Codex PASS；執行細節 `docs/ideas_os/TODO.md`。**整段都是未做**（要從 M0 開工）。

## MVP（v0）— `ci_` 前綴新表　**已實作於 branch `feat/creator-island-m0`、migrations 已 db:apply**
- [x] ~~**M0 Foundation**：6 張 ci_ workspace 表 + RLS + RPC(transfer/debit) + lazy-create + flag(預設開) + `/creator-island` 殼。~~
- [x] ~~**M1 Assets**：ci_fragments/works/work_fragments/asset_relations(多型 trigger)/versions/packages/collections + creator-engine 服務 + API。~~
- [x] ~~**M2 AI loop**：ci_agent_runs；Model Router + Cost Manager(核心免費)；凝聚/演化/編織(zod)；E11 Suno/MV song mode；usage parity。~~
- [x] ~~**M3 Shell**：首頁第三入口 + 創作循環 UI + 作品庫/編輯器 + 工作室管理 + 發布到 blog；E1 first-run；E2 種島；E10 免費。~~
- [x] ~~**M4 Memory + skeletons**：ci_memories(與 user_ai_memory 分開)+usage + 注入 agents；ci_dust_ledger + 碎片蛋；market/community/growth skeleton。~~
- [~] **M5 Hardening + launch**：smoke 擴 `/creator-island` ✅；測試/a11y/perf/security-review 待補；**merge→push→Zeabur 部署**（進行中）。

## Phase 2 — `ENHANCEMENTS.md` + 各 doc Future
- [ ] E3 創作家譜視覺、E4 主動回憶、E5 意外配對每日、E6 語音/拍照捕捉、E7 工作流錄製、E8 文化轉譯楔子、E9 Creator DNA 卡、E11 完整版(封面/風格庫/Prompt Pack)。
- [ ] 完整 Marketplace（Z幣 phase1 → 真金流 phase2 KYC）、完整 Community、完整 Growth(DNA/skill tree/Monthly)、Workflow 視覺編輯器+n8n、其餘 agents(孵化/回收/轉譯/評審/教練)、Knowledge 區。
- [ ] Agent Blueprint 變 Asset（ADR-015）、沉浸式島嶼世界 UX。

## 其他島嶼（長線）
- [ ] Learning / Business / Research Island（共用 Ideas OS 核心）。

---

# 🌌 七、未來版本（v7+，獨立大專案）

- [ ] **AI 模型中台升級**（`AI島_AI模型中台升級規格_v1.md`）：AI Router 三層池 + 成本分級 + Z幣/VIP。
- [ ] Chapter 推薦演算法、全站語意搜尋 UI、Marketing 排程 OAuth、A/B ad copy、人生星圖(暫緩)。

---

## 維護建議
- **以本檔為單一真實來源**；`ROADMAP_2026Q3` / `BACKLOG` / `REPORTS_TODO` 標「歷史」。
- 完成項用 ~~刪除線~~ 保留（專案慣例）。
- 🟡 待深核 3 項（自動評測深度 / cohort 使用者端 / 安全收尾）建議下次開工前各花 5 分鐘確認真實狀態。

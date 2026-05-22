# Admin 後台升級規劃

**版本**：v1.0
**日期**：2026-05-22
**Owner**：雪鑰（執行）／玄樞（gate，目前由董事長代行）
**狀態**：規劃中

---

## 0. 文件性質

本文件是 AI Island v3 後台的**現況盤點 + 升級路線圖**。

- 第 1 章：9 維度成熟度評分（現況）
- 第 2 章：Phase 1 Quick Wins（5 項，每項已有單獨 SPEC）
- 第 3 章：Phase 2 Medium（7 項，概述；動工前再開單獨 SPEC）
- 第 4 章：Phase 3 長線（6 項，概述）
- 第 5 章：建議推進順序

每個 Quick Win 對應一份 `specs/QW-XX-*.md` 詳細規格，含 file scope、API contract、UI 行為、驗證標準。

---

## 1. 9 維度成熟度評分

| 面向 | 成熟度 | 一句話痛點 |
|---|---|---|
| 觀測 / Audit | 40% | 200 筆無分頁、無日期 filter、無 error log 面板 |
| 使用者管理 | 50% | 無搜尋、無分頁、無 impersonate、無 force logout、無批次操作 |
| 內容審核 | **10%** | `blog_comments.is_approved` 欄存在但完全沒 UI；論壇無鎖串／釘文／軟刪 |
| AI / 計費 | 60% | 無 per-user 配額、無 cost alert、無 key 輪替 |
| 遊戲化控制 | **30%** | XP / Z-coin / 成就完全沒手動發放介面；ledger 唯讀 |
| 行銷 / 通訊 | 40% | `email_subscriptions` 表存在但訂閱戶清單看不到；無 segment |
| 分析 | 50% | 無日期 picker、無 cohort、無 funnel、無 CSV 匯出 |
| Compliance | 40% | breach 詳細頁不完整；無 GDPR 匯出／刪除流程 |
| 效能 ops | **0%** | 完全沒 slow query / cache / build 監控 |

**整體成熟度**：約 40%。基本 CRUD + 唯讀 dashboard 都在，缺：進階篩選、批次操作、自動化、合規流程。

---

## 2. Phase 1 — Quick Wins（5 項，~3 天）

> 每項 < 1 天；資料都已存在；純前後端串。

| # | 功能 | 為什麼急 | SPEC |
|---|---|---|---|
| QW-01 | 使用者列表加搜尋 + 分頁 | 硬寫 limit 100，超過完全看不到 | [specs/QW-01-user-list-search-paginate.md](specs/QW-01-user-list-search-paginate.md) |
| QW-02 | 手動發放 XP / Z-coin / 成就 | 辦活動、補錯帳全靠這個 | [specs/QW-02-manual-grant-xp-zcoin-achievement.md](specs/QW-02-manual-grant-xp-zcoin-achievement.md) |
| QW-03 | Audit log 加 filter + CSV 匯出 | 200 筆死掉、查不到特定事件 | [specs/QW-03-audit-log-filter-export.md](specs/QW-03-audit-log-filter-export.md) |
| QW-04 | `email_subscriptions` 訂閱戶清單頁 | 表存在、退訂 token 也在、就是沒人看得到 | [specs/QW-04-email-subscribers-list.md](specs/QW-04-email-subscribers-list.md) |
| QW-05 | Dashboard 加「即時在線」+「即將逾期 breach」widget | 剛接的 interaction analytics + breach 表都有資料、dashboard 沒拉 | [specs/QW-05-dashboard-widgets.md](specs/QW-05-dashboard-widgets.md) |

**這批共同特性**：
- 不動 schema（QW-02 寫入既有的 `xp_events` / `coin_transactions` / `user_achievements`）
- 都走既有 admin API pattern（`createSupabaseServer` 驗 admin → `createSupabaseAdmin` 寫 → 寫入 `audit_logs`）
- UI 都複用既有 admin layout / Stat / Panel 元件
- 不破 RLS、不碰 auth / session

---

## 3. Phase 2 — Medium（7 項，每項 1–3 天）

> 動工前須先開單獨 SPEC（依本文件 §6 的格式）。先在這裡列出題目、為什麼有價值、預期 schema 動向。

### MED-06 Impersonate 使用者
- **動機**：查 UX bug 一定要建測試帳號、極耗時。
- **作法**：複用現有 `/api/admin/sudo`（已寫好的 1 小時短效 token 套路），加 admin 後台 user row「Impersonate」按鈕 → POST → 拿 token 設 cookie → redirect `/`。
- **Schema**：無新表；audit 寫 `admin.impersonate_start` / `admin.impersonate_end`。
- **風險**：必須有自動到期 + 強制 audit；不能讓 admin 永久躲在他人身分後面。

### MED-07 Blog 留言審核佇列
- **動機**：部落格上線最先被 spam 打的就是留言區。
- **作法**：新 `admin/moderation/comments/page.tsx` 列出 `is_approved = false` 留言，bulk approve / reject / soft-delete。
- **Schema**：`blog_comments.is_approved`（已存在）、加 `moderated_by` / `moderated_at` 欄。
- **連動**：新 API `POST /api/admin/moderation/blog-comments`；audit 寫 `moderation.comment_approved` / `..._rejected`。

### MED-08 討論區 thread / reply moderation
- **動機**：11 個版塊都建好、moderation 工具掛零。
- **作法**：新 `admin/moderation/forum/page.tsx`；支援 pin / unpin / lock / unlock / soft-delete。
- **Schema**：`forum_threads` 加 `is_pinned` `is_locked` `is_hidden`、`moderated_by` `moderated_at` 欄；`forum_replies` 加 `is_hidden`。
- **連動**：新 API `PATCH /api/admin/moderation/forum/[type]/[id]`；audit 寫 `forum.thread_pinned` 等。

### MED-09 Z-coin airdrop / segment 發放
- **動機**：之後辦活動會用（例：登入連 7 天送 50 Z-coin、Lv 10+ 一律送 100）。
- **作法**：新 `admin/zcoin/airdrop/page.tsx`、選 segment（全部 / 免費 / 付費 / xp ≥ N / level ≥ N）→ 預覽影響人數 → 確認 → 批次 insert `coin_transactions` + update `profiles.z_coin`。
- **Schema**：無新表；可選新表 `zcoin_airdrops` 記錄一次活動全貌（campaign_id、segment、總發放金額、用戶數）。
- **連動**：批次操作每筆都 audit、加 dry-run 模式。

### MED-10 `learning_events` 行為查詢頁
- **動機**：表一直在寫、卻看不到。
- **作法**：新 `admin/analytics/learning-events/page.tsx`、依 event_type / user / chapter / 日期區間 filter；CSV 匯出。
- **Schema**：無新表。
- **連動**：複用 QW-03 的 CSV 匯出工具函式。

### MED-11 Breach incident 詳細編輯頁
- **動機**：你剛跑的 `breach_and_email_migration.sql` 把表建好了、UI 半成品。
- **作法**：擴 `admin/breach/page.tsx`、加詳細表單：root_cause / containment_actions / remediation_plan / status / reported_to_authority / authority_reference / users_notified / resolved_at。
- **Schema**：無新表（欄都在）。
- **連動**：狀態變更全 audit；72 小時逾期觸發 admin email（可選）。

### MED-12 AI cost 警示閾值
- **動機**：防 budget 爆炸；目前到了才知道。
- **作法**：`ai_api_keys` 加 `alert_threshold_usd` 欄（預設為 `monthly_budget_usd * 0.9`），背景或 cron 檢查、超閾值寫 audit + 寄 admin email。
- **Schema**：`ai_api_keys` 加 1 欄、加 1 表 `ai_budget_alerts` 記每次觸發。
- **連動**：放進 dashboard widget（與 QW-05 共用結構）。

---

## 4. Phase 3 — 長線（6 項，每項 3+ 天，需動 schema）

> 開動前必須先做需求拆解、ROI 評估、schema 影響評估。

### LT-13 User report / 檢舉收件箱
- 新表 `user_reports`（reporter_id / reported_user_id / content_type / content_id / reason / status / admin_note / resolved_at）。
- 前台「檢舉」按鈕 → 後台 inbox + 處理流程。

### LT-14 GDPR 匯出 / 刪除流程
- 新表 `privacy_requests`（user_id / request_type: export|deletion / status / created_at / completed_at）。
- 匯出走 RPC 收集該 user 所有資料 → 打包 JSON；刪除走軟刪 + 30 天 grace period 後硬刪。
- **不可省**：依個資法已生效；breach 表都建了、GDPR 流程不能單獨缺。

### LT-15 Cohort / funnel / retention 分析
- 複用既有 `analytics_sessions` / `analytics_page_views` / `learning_events` / `xp_events` / `profiles`。
- 新 view 或 SQL function 算 Day 1/7/30 留存、註冊 → 完成第一章漏斗、AI 對話 cohort。
- 前端用 recharts 畫。

### LT-16 遊戲化規則編輯器
- 新表 `gamification_rules`（rule_type / value_json / updated_by / updated_at）。
- 把 hardcode 的 XP 數值（每課 / quiz 滿分 / 簽到）改成讀 config；後台可調。
- **風險高**：要做版本紀錄 + 預覽 + rollback；不能讓 admin 一鍵把全站 XP 翻倍。

### LT-17 效能 ops
- 接 Vercel Observability / Sentry / PostHog 之一；本地不建表。
- 後台 dashboard 嵌入第三方 chart（iframe / 走 API 拉）。

### LT-18 批次 user 操作
- user 列表加 multi-select + bulk action 下拉（改 role / ban / 寄 broadcast）。
- **風險**：誤觸成本高，必須有「再次輸入指令確認」+ dry-run。

---

## 5. 建議推進順序

| 順序 | 階段 | 內容 | 預估 |
|---|---|---|---|
| 1 | **Phase 1 全包** | QW-01 ~ QW-05 | ~3 天 |
| 2 | Phase 2 拆兩 sprint | MED-06 (Impersonate) + MED-07 (Blog 審核) + MED-11 (Breach 詳細) | ~1 週 |
|   |   | MED-08 (論壇審核) + MED-09 (Z-coin airdrop) + MED-10 (Learning events) + MED-12 (AI cost alert) | ~1 週 |
| 3 | Phase 3 挑優先 | LT-14 (GDPR)、LT-15 (Cohort 分析) 先；LT-16/17/18 後 | 各 1-2 週 |
| 4+ | **Phase 4+ 擴充 backlog** | 詳見 [`PHASE-4-PLUS-BACKLOG.md`](./PHASE-4-PLUS-BACKLOG.md)（5 區 21 項、~17-18 週） | — |

**為什麼先做 Phase 1 全包**：5 個都 < 1 天、共用同一套 admin API pattern、沒有交互依賴；一次做完比拆開做總成本低（context 不用重切），又能立刻解決 5 個獨立痛點。

**Gate 規則**：
- Phase 1 全部完成、董事長親點驗收 → 才開 Phase 2 第一個 sprint。
- Phase 2 每個 sprint 結束、董事長驗收 → 才開下一 sprint。
- 過程任何「動到 auth / session / supabase client」的需求 → 立刻停下、回報 NEED_CLARIFICATION。

---

## 6. SPEC 撰寫格式（給 Phase 2/3 動工前使用）

每份 spec 放在 `docs/admin_upgrade/specs/<ID>-<short-name>.md`，包含以下章節：

```text
# <ID> <標題>

## 0. Metadata
- 版本 / Owner / 狀態 / 預估工時

## 1. 功能描述
一段話講清楚這 spec 在做什麼。

## 2. 範圍
### In Scope
### Out of Scope

## 3. 設計規則
1. 安全 / RLS / audit 要求
2. UI / UX 規則
3. 邊界條件

## 4. File Scope
### 允許修改
### 允許新增
### 禁止修改（強調 auth / session 永不碰）

## 5. 資料合約
### 既有 schema 引用
### 新增 schema（若有）
### API 合約（method / path / req / res）

## 6. UI 行為
### 流程
### 邊界 / 錯誤狀態
### a11y / 鍵盤可用性

## 7. 驗證標準
- 功能驗證
- 安全驗證（RLS、admin gate）
- 回歸驗證（既有功能不破）

## 8. 工時估
- 後端 / 前端 / migration / test 分開

## 9. 備註與已知風險
```

---

## 7. 文件交付物總覽

```text
docs/admin_upgrade/
├── README.md                                          ← 本文件
└── specs/
    ├── QW-01-user-list-search-paginate.md
    ├── QW-02-manual-grant-xp-zcoin-achievement.md
    ├── QW-03-audit-log-filter-export.md
    ├── QW-04-email-subscribers-list.md
    └── QW-05-dashboard-widgets.md
```

Phase 2/3 的 spec 等動工前再開、不預先寫，避免規格腐化。

---

## 8. 一句話總結

> 後台目前在 40% 成熟度；先做 Phase 1 五項 Quick Win 把 user 管理 / audit / 訂閱戶 / 手動補帳 / dashboard 即時感補齊（~3 天），再分兩 sprint 做 Phase 2 把審核 / impersonate / breach 流程補齊，最後做 GDPR 與分析的長線題。

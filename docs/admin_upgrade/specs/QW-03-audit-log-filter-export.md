# QW-03 Audit log 加 filter + CSV 匯出

## 0. Metadata

- **版本**：v1.0
- **Owner**：雪鑰
- **狀態**：READY TO START
- **預估工時**：6–8h（後端 2h、前端 4h、test 2h）
- **依賴**：無
- **被依賴**：MED-10（learning_events 查詢頁複用 CSV 匯出工具）

---

## 1. 功能描述

`src/app/admin/audit/page.tsx` 目前硬撈最近 200 筆、無任何 filter、無分頁、無匯出，事件超過 200 就死掉，要查特定動作只能瞎滾。本 spec 把它升級成「能依日期、actor、action、target 篩選 + CSV 匯出」的可查詢面板。

---

## 2. 範圍

### In Scope

- 日期區間 filter（from / to，預設近 7 天）
- action filter（下拉，列出 audit_logs 內所有 distinct action 值）
- actor filter（依 username 搜尋）
- target_type filter（下拉：user / order / setting / system / ...）
- 分頁（每頁 100 筆，上一頁 / 下一頁）
- CSV 匯出（套用同樣 filter、最多 50000 筆）
- URL searchParams 同步

### Out of Scope

- target_id 點擊跳到 target 詳細頁 — 之後再加
- 即時 audit log stream（WebSocket）— 過度設計
- 全文搜尋 `changes` JSON 內容 — JSONB GIN index 還沒建，留到 LT
- 自動寄 admin email 警示特定 action — 之後接 broadcast 系統

---

## 3. 設計規則

1. **CSV 走 server**：不在前端組 CSV、不撈一次全部到 client；走 streaming response（`Content-Type: text/csv` + `Transfer-Encoding: chunked`）或一次性回應但 server 端組好。
2. **日期 filter 都帶 timezone**：UI 顯示用瀏覽器本地時區、查詢用 UTC；用 `from.toISOString()` 確保一致。
3. **action 下拉是動態**：頁面 load 時跑一次 `SELECT DISTINCT action FROM audit_logs ORDER BY action`、快取在 props（不用每次都查）。
4. **匯出大量資料時的保護**：上限 50000 筆；超過要在 UI 警告並縮小範圍。
5. **匯出檔名**：`audit-log-YYYYMMDD-HHmm.csv`、UTF-8 with BOM（Excel 在 Windows 才不會亂碼）。
6. **不破壞既有頁面**：URL 不帶任何 filter 時、行為等同今天（顯示最近 200 筆）。

---

## 4. File Scope

### 允許修改

```text
- src/app/admin/audit/page.tsx
```

### 允許新增

```text
- src/app/admin/audit/AuditFilters.tsx       ← client component
- src/app/admin/audit/AuditPagination.tsx    ← 可複用 QW-01 的 UsersPagination 結構
- src/app/api/admin/audit/export/route.ts    ← CSV 匯出 GET endpoint
- src/lib/csv.ts                             ← 共用工具 fn `toCsv(rows, columns)`
```

### 禁止修改

```text
- supabase/admin_migration.sql       ← audit_logs schema 不動
- src/middleware.ts
- src/lib/supabase-*.ts
```

---

## 5. 資料合約

### 既有 schema 引用

```sql
audit_logs (
  id BIGSERIAL,
  actor_id UUID,
  actor_username TEXT,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  changes JSONB,        -- { before, after, reason?, ... }
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)

-- 既有索引（admin_migration.sql）
idx_audit_actor   ON (actor_id)
idx_audit_created ON (created_at DESC)
idx_audit_action  ON (action)
```

### URL 合約

```text
GET /{ADMIN_SLUG}/admin/audit
  ?from=<ISO8601, default 7d ago>
  &to=<ISO8601, default now>
  &action=<exact value, default all>
  &actor=<username search, default empty>
  &target_type=<user|order|setting|..., default all>
  &page=<int, default 1>
```

### Server query 邏輯

```ts
const PAGE_SIZE = 100;
const from = (page - 1) * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;

let q = admin
  .from('audit_logs')
  .select('*', { count: 'exact' })
  .gte('created_at', fromIso)
  .lte('created_at', toIso);

if (action !== 'all') q = q.eq('action', action);
if (actorSearch) q = q.ilike('actor_username', `%${sanitize(actorSearch)}%`);
if (targetType !== 'all') q = q.eq('target_type', targetType);

q = q.order('created_at', { ascending: false }).range(from, to);
```

### Distinct action 查詢（頁面初始）

```ts
const { data: actions } = await admin
  .from('audit_logs')
  .select('action')
  .order('action');
const distinctActions = Array.from(new Set(actions?.map(r => r.action) ?? []));
```

> 注意：對大表這查詢會掃整個 action 欄。Audit 表預期不會大到讓這個變問題；之後如果到百萬筆、改成 `materialized view` 每日刷新。

### CSV 匯出 API 合約

```text
GET /api/admin/audit/export?<same filters as page>
  → 200, Content-Type: text/csv; charset=utf-8
  → Content-Disposition: attachment; filename="audit-log-YYYYMMDD-HHmm.csv"
  → Body:
    ﻿ (UTF-8 BOM)
    id,created_at,actor_username,action,target_type,target_id,changes_json,ip,user_agent
    1,"2026-05-22T...","luffysky00","user.role_changed","user","uuid-...","{\"before\":...}",...
```

CSV escape 規則：
- 包含 `,` / `"` / `\n` 的欄位用雙引號包起
- 內含的 `"` 改成 `""`
- `changes` 整個 JSON 序列化後當一欄

### CSV 匯出限制

- 預設上限 50000 筆
- 超過時 API 回 413 Payload Too Large + 訊息「請縮小日期範圍」
- 不接受沒有日期 filter 的全量匯出

---

## 6. UI 行為

### 頁首 + filter 列

```text
┌─ 📋 Audit Log ─────────────────────────────────────────────┐
│ 共 3,421 筆（套用 filter）· 第 1/35 頁                      │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ 日期：[2026-05-15] → [2026-05-22]   [近 24h] [近 7d] [近 30d] │
│ 動作：[全部 ▼]   目標類型：[全部 ▼]   操作者：[___________]   │
│                                          [清除]  [⬇ 匯出 CSV] │
└────────────────────────────────────────────────────────────┘
```

### 表格

| created_at | actor | action | target | changes | ip |
|---|---|---|---|---|---|
| 2026-05-22 14:30 | luffysky00 | user.role_changed | user@uuid... | role: member → admin | 1.2.3.4 |
| 2026-05-22 14:25 | luffysky00 | admin.grant_xp | user@uuid... | xp: 100 → 200 | 1.2.3.4 |

- `changes` 欄顯示精簡版（before → after 短摘要）；hover 顯示完整 JSON tooltip
- `target_id` 是 UUID 顯示前 8 碼 + tooltip 顯示完整

### 邊界

| 情境 | 行為 |
|---|---|
| 載入中 | 表格半透明 |
| 無結果 | 「目前條件下沒有 audit log」 |
| 日期 from > to | filter 不送出、顯示警告 |
| 匯出超過 50000 筆 | 按鈕變 disabled + tooltip「請縮小日期範圍」 |
| 匯出中 | 按鈕變「⏳ 產生中...」、disable 直到 download 完 |

### 鍵盤

- 「近 24h / 7d / 30d」三個 preset 按鈕
- 匯出按鈕有 `aria-label="匯出 CSV"`

---

## 7. 驗證標準

### 功能

- [ ] 預設載入：顯示近 7 天 audit log，依 created_at desc
- [ ] 套日期 → 列表跟著縮
- [ ] 套 action filter → 只顯示該 action
- [ ] 套 actor 搜尋 → 只顯示該 actor 的紀錄
- [ ] 翻頁 → URL 變、內容換、總筆數不變
- [ ] 按「匯出 CSV」 → 瀏覽器下載 audit-log-YYYYMMDD-HHmm.csv
- [ ] 用 Excel 開 CSV → 中文不亂碼、JSON 欄完整
- [ ] 匯出時的 filter 跟頁面當下一致

### 安全

- [ ] 非 admin 進來 → 被 layout 擋
- [ ] CSV 匯出 endpoint 也驗 admin（不能用任何已登入 user 拿全站 audit）
- [ ] actor 搜尋字串含 `%` `'` `--` 安全
- [ ] 沒給日期 filter 不准匯出（避免一次拉全表）

### 回歸

- [ ] 既有「顯示最近 200 筆」的行為在無 filter 時仍能用
- [ ] tsc / build pass

---

## 8. 工時估

| 項目 | h |
|---|---|
| Server query 改寫 | 1.5 |
| AuditFilters 元件 | 2 |
| CSV 匯出 API | 1.5 |
| src/lib/csv.ts 工具 | 0.5 |
| 整合到 page.tsx + 分頁 | 1 |
| 手動 test（瀏覽器 + Excel）| 1 |
| Smoke + 邊界 | 0.5 |
| **合計** | **~8h** |

---

## 9. 備註與已知風險

- **大量 distinct action 查詢成本**：audit_logs 沒有專門 distinct 索引；當資料破 100 萬筆會慢。Mitigation：頁面初始把 distinct actions 結果快取 60 秒（Next.js fetch `revalidate`）。
- **CSV 50000 筆上限**：是保守值；如果之後常需要全量匯出，改成 streaming 寫 file → cron job → 寄連結。
- **changes 欄 JSON 顯示**：JSON tooltip 在行動裝置上不好用；之後可考慮加「展開列」做完整顯示。
- **時區 bug**：from / to 用瀏覽器 timezone 截斷成日期 → 送 UTC ISO；伺服器解析後比對 created_at（UTC）。需要 e2e 測試確認 23:50 跨日的紀錄被正確包含。
- **與 admin_events 表的關係**：repo 內可能還有 `admin_events` 表（從 ban 路由的 audit comments 看到）。本 spec 只動 `audit_logs`；之後可考慮合併。

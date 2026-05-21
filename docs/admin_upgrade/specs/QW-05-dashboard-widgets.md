# QW-05 Dashboard 加「即時在線」+「即將逾期 breach」widget

## 0. Metadata

- **版本**：v1.0
- **Owner**：雪鑰
- **狀態**：READY TO START
- **預估工時**：5–7h（後端 1h、前端 4h、test 1h）
- **依賴**：無（但跟 QW-03 共享 audit_logs 顯示元件可選）
- **被依賴**：MED-12（AI cost alert 之後也接到 dashboard 同一套 widget grid）

---

## 1. 功能描述

`src/app/admin/page.tsx` 目前的 Dashboard 展示了使用者數、lesson 完成、AI 成本等「30 天統計」，**但完全沒有「現在」的感覺**。剛接的 interaction analytics + breach 表都有資料，本 spec 把這兩塊資訊以即時 widget 形式拉到 Dashboard 頂部，讓 admin 一開後台就知道「現在線上多少人」「有沒有 breach 快逾期」「最近 5 筆 audit log 是什麼」。

---

## 2. 範圍

### In Scope

- 「即時在線」widget：5 分鐘內有 heartbeat 的 session 總數、其中會員 vs 訪客比、目前最熱的 3 個頁面
- 「即將逾期 breach」widget：未通報、距離 72h 截止 < 24h 的事件；點進去跳 `admin/breach`
- 「近 5 筆 audit log」widget：縮減版 audit log feed
- 「AI 預算狀態」widget：每個 enabled key 的「已用 / 預算」進度條（為 MED-12 預留）
- 自動每 30 秒 client-side refresh（用 `useEffect` setInterval、或 React Query 的 stale）

### Out of Scope

- 「即時在線」widget 細看 → 跳到 `admin/ga4`（已有頁、不重做）
- 「breach 詳細編輯」 → MED-11
- 「AI 預算超標警示」 → MED-12
- Notification banner（在 widget 之外、頂部跳通知）— 之後再加

---

## 3. 設計規則

1. **不撞 GA4 page**：本 spec 只是 dashboard 摘要、點 widget 可以跳 `admin/ga4` 看詳細；不複製 GA4 page 的內容。
2. **client refresh 自動暫停**：頁面 hidden（tab 切走）時暫停輪詢，回來再續；省 API call。
3. **後端用 server component + 自動 refetch**：page.tsx 本身是 server component 不變；widget 用 client component + useEffect 30s 重新 fetch 自己的 endpoint。
4. **widget 都要有 graceful empty state**：DB 連線壞、表是空的時、widget 自己顯示「載入中」或「暫無資料」、不能讓整個 dashboard 炸。
5. **API 都 fail-soft**：抓不到資料時回 `{ ok: true, data: [] }` 不回 500。

---

## 4. File Scope

### 允許修改

```text
- src/app/admin/page.tsx               ← 在頂部插入新 widget grid
```

### 允許新增

```text
- src/components/admin/widgets/LiveSessionsWidget.tsx
- src/components/admin/widgets/UpcomingBreachWidget.tsx
- src/components/admin/widgets/RecentAuditFeedWidget.tsx
- src/components/admin/widgets/AiBudgetWidget.tsx
- src/components/admin/widgets/WidgetShell.tsx       ← 共用外殼 (title / loading / error)
- src/app/api/admin/widgets/live-sessions/route.ts
- src/app/api/admin/widgets/upcoming-breach/route.ts
- src/app/api/admin/widgets/recent-audit/route.ts
- src/app/api/admin/widgets/ai-budget/route.ts
```

### 禁止修改

```text
- src/middleware.ts
- src/lib/supabase-*.ts
- src/app/admin/ga4/*                  ← GA4 頁不動
- src/app/admin/breach/*               ← Breach 頁不動（這是 MED-11 的事）
```

---

## 5. 資料合約

### `GET /api/admin/widgets/live-sessions`

```ts
// Query: analytics_sessions where last_seen_at >= now() - 5 min
// 並 join profiles 拿會員資訊

const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
const { data: sessions } = await admin
  .from('analytics_sessions')
  .select('id, user_id, current_path, current_title, device_type, profile:profiles(username, role)')
  .gte('last_seen_at', fiveMinAgo);

const memberCount = sessions?.filter(s => s.user_id).length ?? 0;
const guestCount = (sessions?.length ?? 0) - memberCount;

// 最熱頁面 top 3
const pageCounts = new Map<string, number>();
for (const s of sessions ?? []) {
  if (!s.current_path) continue;
  pageCounts.set(s.current_path, (pageCounts.get(s.current_path) ?? 0) + 1);
}
const topPages = Array.from(pageCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3);
```

```json
// Response
{
  "ok": true,
  "data": {
    "total": 47,
    "members": 23,
    "guests": 24,
    "topPages": [
      { "path": "/chapters/5", "count": 8 },
      { "path": "/", "count": 6 },
      { "path": "/forum", "count": 4 }
    ],
    "asOf": "2026-05-22T14:35:00Z"
  }
}
```

### `GET /api/admin/widgets/upcoming-breach`

```ts
// breach_incidents_urgent view 已經算好 hours_since_discovered + time_status
// 篩 time_status IN ('urgent', 'overdue') AND reported_to_authority = false

const { data } = await admin
  .from('breach_incidents_urgent')
  .select('id, discovered_at, incident_type, severity, hours_since_discovered, time_status, status, affected_user_count')
  .in('time_status', ['urgent', 'overdue'])
  .eq('reported_to_authority', false)
  .order('hours_since_discovered', { ascending: false })
  .limit(5);
```

```json
{
  "ok": true,
  "data": [
    {
      "id": 12,
      "incident_type": "unauthorized_access",
      "severity": "high",
      "hours_since_discovered": 52.3,
      "time_status": "urgent",
      "hoursUntilDeadline": 19.7,
      "affected_user_count": 124
    }
  ],
  "noneOpen": false
}
```

### `GET /api/admin/widgets/recent-audit`

```ts
const { data } = await admin
  .from('audit_logs')
  .select('id, actor_username, action, target_type, target_id, created_at')
  .order('created_at', { ascending: false })
  .limit(5);
```

```json
{
  "ok": true,
  "data": [
    {
      "id": 3421,
      "actor_username": "luffysky00",
      "action": "user.role_changed",
      "target_type": "user",
      "target_id": "uuid...",
      "created_at": "2026-05-22T14:30:00Z"
    }
  ]
}
```

### `GET /api/admin/widgets/ai-budget`

```ts
const { data } = await admin
  .from('ai_api_keys')
  .select('provider, enabled, monthly_budget_usd, used_this_month_usd, reset_date');

// 計算每把 key 的進度條 + 是否超 80% 警示
```

```json
{
  "ok": true,
  "data": [
    {
      "provider": "openai",
      "enabled": true,
      "budget": 50,
      "used": 32.4,
      "pct": 64.8,
      "level": "ok",          // ok | warning (>80%) | critical (>=100%)
      "resetDate": "2026-06-01"
    }
  ]
}
```

---

## 6. UI 行為

### Dashboard 頂部 widget grid（4 欄、md 以下 2 欄、sm 以下 1 欄）

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 即時在線              ⚠ 即將逾期 breach        近期 audit          AI 預算 │
│ 🟢 47 在線           ❗ 1 件 < 24h            luffysky00          openai  │
│ 23 會員 / 24 訪客    高嚴重 · 124 人受影響    user.role_changed   ███░ 65%│
│ 最熱：/chapters/5    [前往 breach →]          30 秒前             50 / 32 USD│
│ [前往 GA4 →]                                  [前往 audit →]      [前往 AI →]│
└──────────────────────────────────────────────────────────────────────┘
                          (現有 30 天統計 grid)
```

### WidgetShell 結構

```tsx
<WidgetShell title="即時在線" icon="🟢" onClickLink="/admin/ga4" loading={loading} error={error}>
  <div>...</div>
</WidgetShell>
```

### 邊界

| 情境 | 行為 |
|---|---|
| API 載入中 | widget 內顯示 skeleton |
| API 500 | widget 顯示「載入失敗、稍後重試」、整 dashboard 仍能用 |
| 即時在線 = 0 | 「目前無在線使用者」+ 灰色狀態 |
| 沒有即將逾期 breach | 「✅ 沒有逾期風險」+ 綠色 |
| 沒有 audit log | 「尚無紀錄」 |
| AI 預算 > 100% | 紅色警示條 + 「立刻處理」連結 |

### Refresh 行為

- 每 30 秒 client-side 自動重抓
- 頁面 hidden（`document.hidden === true`）時暫停
- 顯示 `<small>更新於 28 秒前</small>` 在每個 widget 角落

### 鍵盤 / a11y

- 每個 widget 是 `<section role="region" aria-label="即時在線">`
- 連結有 `aria-label`
- 顏色變化（紅 / 黃 / 綠）同時要有 icon、不依賴顏色辨識

---

## 7. 驗證標準

### 功能

- [ ] Dashboard 載入 → 4 個 widget 都顯示資料或空狀態
- [ ] 開另一個瀏覽器分頁、瀏覽前台 → 30 秒內 dashboard「即時在線」+1
- [ ] 手動在 breach 表插一筆 discovered_at = now() - 50h → 出現在「即將逾期」
- [ ] 對某 user 改 role → 5 秒內出現在「近期 audit」
- [ ] AI 預算用量手動更新 → 「AI 預算」widget 條形變化
- [ ] tab 切走 → 不再發 API（看 Network tab）
- [ ] tab 切回 → 立即重抓
- [ ] 4 個 API 任一壞掉 → 對應 widget 顯示錯誤、其他 widget 正常

### 安全

- [ ] 4 個 widget API 都驗 admin（非 admin call → 403）
- [ ] 沒任何 widget 洩漏 PII（如 email、token）

### 回歸

- [ ] 既有 30 天 dashboard 區塊位置 / 樣式不變
- [ ] tsc / build pass

### 效能

- [ ] 4 個 widget API 各自 < 500ms（線上 Supabase）
- [ ] 30 秒輪詢、即使開著 dashboard 1 小時、不應該卡住瀏覽器或炸記憶體

---

## 8. 工時估

| 項目 | h |
|---|---|
| WidgetShell 共用元件 | 1 |
| 4 個 widget 元件 | 2 |
| 4 個 API route | 2 |
| 整合到 page.tsx | 0.5 |
| 30 秒輪詢 + tab visibility | 0.5 |
| 手動 test + 邊界 | 1 |
| **合計** | **~7h** |

---

## 9. 備註與已知風險

- **30 秒輪詢的成本**：1 個 admin 1 小時打 480 次 API。線上 supabase 配額足；如果之後變多 admin、可考慮 SSE / WebSocket。
- **`analytics_sessions.last_seen_at` 真實性**：依賴 InteractionTracker 的 15 秒 heartbeat。若 tracker 被 ad-block 擋掉、widget 會低估在線數；這不在本 spec 處理範圍。
- **`breach_incidents_urgent` view 已存在**：是 `breach_and_email_migration.sql` 建的；本 spec 純讀。
- **AI 預算 widget 重複功能**：MED-12 會做更完整的「閾值警示」+「自動 email」。本 widget 只是當下狀態的指標、不會自動觸發任何動作。
- **手機版**：dashboard 在手機上 widget 變單欄；要確認 4 個 widget 縱向排列時不會把整個畫面占滿、其他內容看不到。建議手機只顯示其中 2 個（即時在線 + breach）。

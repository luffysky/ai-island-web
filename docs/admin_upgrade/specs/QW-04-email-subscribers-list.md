# QW-04 `email_subscriptions` 訂閱戶清單頁

## 0. Metadata

- **版本**：v1.0
- **Owner**：雪鑰
- **狀態**：READY TO START
- **預估工時**：5–7h（後端 1h、前端 4h、test 1h）
- **依賴**：QW-01（沿用分頁元件、CSV 工具）
- **被依賴**：MED-09（Z-coin airdrop 的 segment 選擇要在這頁的 segment builder 起手）

---

## 1. 功能描述

`email_subscriptions` 表已建立（透過 `breach_and_email_migration.sql`）、註冊時 trigger 自動建一筆、退訂 token 也都齊全，**但後台完全沒有任何頁面看得到訂閱戶清單**。本 spec 新建 `admin/email/subscribers/page.tsx`、讓 admin 能看名單、依訂閱類型篩選、看退訂原因、匯出 CSV。

---

## 2. 範圍

### In Scope

- 訂閱戶列表（email、是否各類訂閱 on/off、最後寄信時間、退訂時間、退訂原因）
- 依訂閱類型 filter（newsletter / product_updates / course_announcements / weekly_digest）
- 依「在訂閱 / 已退訂」狀態 filter
- 依 email 模糊搜尋
- 分頁（每頁 100 筆）
- CSV 匯出（套用同樣 filter、最多 50000 筆）
- 退訂原因聚合（小 chart：top 5 退訂理由 + 各占比）

### Out of Scope

- 強制退訂單一使用者 → MED-09 的 segment 工具會用、不在這 spec
- 寄信 / broadcast — 既有 `admin/broadcasts/*` 負責
- 訂閱類型管理（新增 / 重新命名）— 沒這需求
- 反向：admin 幫 user 「重新訂閱」— 之後再加

---

## 3. 設計規則

1. **個資保護**：email 是 PII；列表顯示時要遮 mask（例 `lu***@gmail.com`），完整 email 只在 hover / 點開時顯示，且這個動作要 audit log 一筆 `email.viewed`。
   > 若太煩、可以只在 CSV 匯出時 audit、列表頁顯示完整。董事長定。本 spec 預設 **列表 mask、hover 顯示、CSV 完整**。
2. **CSV 也要 audit**：匯出操作寫 `audit_logs` action = `email.subscribers_exported`，紀錄 filter 與筆數。
3. **不破壞退訂流程**：本頁是唯讀 + 匯出，不改任何 subscription 狀態。改狀態（強制退訂）走另一支 API、不在本 spec。
4. **退訂理由 chart**：用 `GROUP BY unsubscribe_reason` 做聚合；NULL 視為「未填」。
5. **無索引欄位排序限制**：`email_subscriptions` 只有 `idx_email_subs_email` / `idx_email_subs_token`；排序 `created_at` 沒有索引、但表也不會大。

---

## 4. File Scope

### 允許修改

```text
- src/app/admin/layout.tsx              ← 加 sidebar 連結「Email 訂閱」（可選；之後 phase 統一加）
```

### 允許新增

```text
- src/app/admin/email/subscribers/page.tsx
- src/app/admin/email/subscribers/SubscribersFilters.tsx
- src/app/admin/email/subscribers/UnsubscribeReasons.tsx   ← 退訂原因 chart
- src/app/api/admin/email/subscribers/export/route.ts      ← CSV 匯出
```

### 禁止修改

```text
- supabase/breach_and_email_migration.sql   ← schema 不動
- src/middleware.ts
- src/lib/supabase-*.ts
- src/app/api/blog/unsubscribe/route.ts     ← 退訂 endpoint 不動
```

---

## 5. 資料合約

### 既有 schema 引用

```sql
email_subscriptions (
  id BIGSERIAL,
  user_id UUID,
  email TEXT UNIQUE NOT NULL,
  newsletter BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  course_announcements BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT false,
  transactional BOOLEAN DEFAULT true,
  unsubscribe_token TEXT UNIQUE NOT NULL,
  last_email_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### URL 合約

```text
GET /{ADMIN_SLUG}/admin/email/subscribers
  ?q=<email search>
  &type=<all|newsletter|product_updates|course_announcements|weekly_digest>
  &status=<all|subscribed|unsubscribed>
  &page=<int>
```

### Server query 邏輯

```ts
let q = admin
  .from('email_subscriptions')
  .select('*', { count: 'exact' });

if (search) q = q.ilike('email', `%${sanitize(search)}%`);
if (type !== 'all') q = q.eq(type, true);  // newsletter=true 等
if (status === 'subscribed') q = q.is('unsubscribed_at', null);
if (status === 'unsubscribed') q = q.not('unsubscribed_at', 'is', null);

q = q.order('created_at', { ascending: false })
     .range(from, to);
```

### 退訂理由聚合（同頁面 load 拉一次）

```ts
const { data: reasons } = await admin
  .from('email_subscriptions')
  .select('unsubscribe_reason')
  .not('unsubscribed_at', 'is', null);

const counts = new Map<string, number>();
for (const r of reasons ?? []) {
  const key = r.unsubscribe_reason || '(未填)';
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
const topReasons = Array.from(counts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
```

### CSV 匯出 API 合約

```text
GET /api/admin/email/subscribers/export?<same filters>
  → 200, text/csv
  → filename="email-subscribers-YYYYMMDD-HHmm.csv"
  → columns: id, email, user_id, newsletter, product_updates,
             course_announcements, weekly_digest, transactional,
             last_email_at, unsubscribed_at, unsubscribe_reason,
             created_at
```

匯出前寫 audit：

```ts
await admin.from('audit_logs').insert({
  actor_id: user.id,
  actor_username: me.username,
  action: 'email.subscribers_exported',
  target_type: 'email_subscriptions',
  target_id: null,
  changes: {
    filter: { q, type, status },
    row_count: count,
  },
  ip, user_agent,
});
```

---

## 6. UI 行為

### 頁首 + 概覽

```text
┌─ 📧 Email 訂閱戶 ─────────────────────────────────────────┐
│ 總訂閱：4,521 · 在訂閱：3,892 · 已退訂：629（13.9%）        │
└────────────────────────────────────────────────────────────┘

┌─ 退訂原因 Top 5 ──────────────────────────────────────────┐
│ (未填)            ████████ 312                              │
│ 信太頻繁          ████ 156                                  │
│ 內容不感興趣       ███ 98                                   │
│ 帳號要刪除         █ 42                                     │
│ 其他              █ 21                                      │
└────────────────────────────────────────────────────────────┘
```

### Filter 列

```text
┌────────────────────────────────────────────────────────────┐
│ 搜尋：[___________]   類型：[全部 ▼]   狀態：[全部 ▼]       │
│                                          [⬇ 匯出 CSV]       │
└────────────────────────────────────────────────────────────┘
```

### 表格

| email | 訂閱中 | 上次寄信 | 退訂時間 | 原因 | 註冊 |
|---|---|---|---|---|---|
| lu***@gmail.com | 📰 🎁 📚 | 3 天前 | — | — | 30 天前 |
| ab***@yahoo.com | — | 7 天前 | 2 天前 | 信太頻繁 | 60 天前 |

- `lu***@gmail.com` hover 顯示完整、寫 audit
- 訂閱中欄用 icon：📰 newsletter / 🎁 product_updates / 📚 course_announcements / 📅 weekly_digest

### 邊界

| 情境 | 行為 |
|---|---|
| 訂閱戶為 0 | 顯示「目前沒有訂閱戶」 |
| 搜尋無結果 | 「沒有符合的 email」+ 清除按鈕 |
| 匯出超過 50000 筆 | 按鈕 disable + 警示 |

---

## 7. 驗證標準

### 功能

- [ ] 載入頁面 → 列表 + 概覽 + 退訂原因 chart 一起顯示
- [ ] 搜尋 `gmail` → 只顯示 email 含 gmail 的訂閱戶
- [ ] 切到「已退訂」 → 列表只剩有 `unsubscribed_at` 的人
- [ ] 點某行 email → 顯示完整 email + audit_logs 多 1 筆 `email.viewed`
- [ ] 匯出 → 瀏覽器下載 CSV、Excel 開不亂碼
- [ ] 匯出 → audit_logs 多 1 筆 `email.subscribers_exported`

### 安全

- [ ] 非 admin → 被擋
- [ ] CSV API 也驗 admin
- [ ] 不能用 query 撈 unsubscribe_token（CSV 不含此欄）

### 回歸

- [ ] 既有 `/api/blog/unsubscribe` 不破
- [ ] 既有註冊流程的 `create_email_subscription_on_signup` trigger 不破

---

## 8. 工時估

| 項目 | h |
|---|---|
| Server query + count + reason 聚合 | 1.5 |
| SubscribersFilters | 1.5 |
| UnsubscribeReasons chart | 1 |
| CSV 匯出 API + audit | 1 |
| 整合 + 分頁 + email mask | 1 |
| 手動 test + smoke | 1 |
| **合計** | **~7h** |

---

## 9. 備註與已知風險

- **email mask 程度**：目前設計是 `lu***@gmail.com`（保留前 2 字 + 完整 domain）。這已經足以辨識重複使用者；過度遮罩反而沒實用價值。
- **退訂原因為文字欄、沒有 enum**：用戶可能填任意字、聚合會散；之後可以建議前端退訂頁改成下拉選單 + 「其他」自填。
- **`unsubscribe_token` 不入 UI、不入 CSV**：避免外洩造成大規模退訂攻擊。
- **與 broadcasts 表的關係**：之後做 broadcast 寄信時的「實際發送清單 = 在訂閱且該類型 = true」、可用本頁的 filter 結果當預覽。MED-09 / broadcast 升級會用到。
- **大數查詢**：email_subscriptions 預期 < 10 萬人；ilike 走 seq scan 也能接受。之後加 trgm 索引可優化。

# QW-01 使用者列表加搜尋 + 分頁

## 0. Metadata

- **版本**：v1.0
- **Owner**：雪鑰
- **狀態**：READY TO START
- **預估工時**：6–8h（後端 1h、前端 4h、test 2h）
- **依賴**：無
- **被依賴**：QW-02（手動發放會在 user row 加按鈕、需 user 找得到）

---

## 1. 功能描述

把 `src/app/admin/users/page.tsx` 從「硬寫 limit 100」改成「**可搜尋 + 可分頁 + 可篩選**」的使用者管理頁。讓 admin 能在使用者數超過 100 人後仍能找到任何一個帳號。

---

## 2. 範圍

### In Scope

- 加搜尋輸入框（username / display_name / email 模糊匹配）
- 加分頁（每頁 50 筆、上一頁 / 下一頁、顯示目前頁碼與總筆數）
- 加 role filter（all / member / editor / admin）
- 加 ban 狀態 filter（`bio LIKE '[BANNED]%'` 視為 banned）
- URL `searchParams` 同步（重新整理／分享 URL 仍保留搜尋結果）
- 排序：預設依 `created_at DESC`，加「依 XP 排序」「依最後活躍排序」切換

### Out of Scope

- 批次操作（multi-select / bulk action） — 留給 LT-18
- 進階搜尋（依 z_coin 範圍、依註冊區間）— 之後再加
- 使用者詳細頁的改版 — 本 spec 只動列表頁

---

## 3. 設計規則

1. **不繞 RLS**：列表頁是 server component，目前已用 `createSupabaseServer` + admin layout gate；維持不變。
2. **搜尋走 ilike**：`username.ilike.%q%,display_name.ilike.%q%`；不做向量搜尋。
3. **分頁用 `.range()`** 而非 `.offset()`，遵循 Supabase JS client 慣例。
4. **拿總筆數**：用 `.select('*', { count: 'exact', head: false })`；別撈 100 筆只為了算總數。
5. **URL state**：用 Next.js searchParams（`?q=&page=&role=&sort=`），不用 client state；重新整理不丟。
6. **空狀態 UI**：找不到時顯示「沒有符合條件的使用者」+ 清除按鈕。
7. **無障礙**：搜尋輸入框有 label、分頁按鈕有 aria-label。

---

## 4. File Scope

### 允許修改

```text
- src/app/admin/users/page.tsx
- src/app/admin/users/UserRow.tsx   (僅在需要新欄位時)
```

### 允許新增

```text
- src/app/admin/users/UsersFilters.tsx   (client component；搜尋框 / role 下拉 / sort)
- src/app/admin/users/UsersPagination.tsx (client component；上一頁 / 下一頁 / 跳頁)
```

### 禁止修改

```text
- src/app/admin/layout.tsx             ← admin gate；不動
- src/middleware.ts                    ← admin slug rewrite；不動
- src/lib/supabase-*.ts                ← client；不動
- src/app/api/admin/users/*            ← 本 spec 不開 API（讀都走 page.tsx 內 server 端 query）
```

---

## 5. 資料合約

### 既有 schema 引用

`profiles` 表，使用欄位：`id`、`username`、`display_name`、`email`（若存在 — 否則用 `auth.users.email`）、`role`、`xp`、`level`、`z_coin`、`streak_days`、`avatar_url`、`bio`、`created_at`、`last_active_at`、`ai_unlimited`。

### URL 合約

```text
GET /{ADMIN_SLUG}/admin/users
  ?q=<search-text>
  &page=<int, 1-based, default 1>
  &role=<all|member|editor|admin>, default all
  &status=<all|active|banned>, default all
  &sort=<created_at|xp|last_active_at>, default created_at
  &dir=<desc|asc>, default desc
```

### Server query 邏輯

```ts
const PAGE_SIZE = 50;
const from = (page - 1) * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;

let q = admin
  .from('profiles')
  .select('*', { count: 'exact' });

if (search) {
  q = q.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
}
if (role !== 'all') q = q.eq('role', role);
if (status === 'banned') q = q.like('bio', '[BANNED]%');
if (status === 'active') q = q.not('bio', 'like', '[BANNED]%');

q = q.order(sort, { ascending: dir === 'asc' }).range(from, to);

const { data, count } = await q;
const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
```

> **注意**：用 `${search}` 直接組字串理論上有風險。Supabase 的 `or()` filter syntax 只接受 schema 內名字 + 模式，會對 `%` 內容做 URL encoding；但**保險作法是先 sanitize**：把 `%` 與 `,` 與 `*` 替換掉。

```ts
const safe = search.replace(/[%,*()\\]/g, '');
```

---

## 6. UI 行為

### 頁首

```text
┌─────────────────────────────────────────────────────────────┐
│ 🧑 使用者管理                                                │
│ 共 1,247 人 · 現在第 1/25 頁                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ [🔍 搜尋 username / display name...]  [角色 ▼] [狀態 ▼]      │
│                                       [排序：建立時間 ▼ ↓] │
└─────────────────────────────────────────────────────────────┘
```

### 表格區（沿用既有 UserRow）

- 多加一欄「最後活躍」（`last_active_at` 相對時間，例「3 分鐘前」）
- ai_unlimited 用小 icon `✨` 顯示在使用者名稱旁

### 頁尾

```text
[← 上一頁]   1 2 3 ... 24 25   [下一頁 →]
                                        (50 筆/頁)
```

### 邊界

| 情境 | UI |
|---|---|
| 載入中 | 表格半透明 + 中央 spinner（用 Next.js loading.tsx 也行）|
| 搜尋無結果 | 「沒有符合條件的使用者」+ 「清除搜尋」按鈕 |
| 搜尋字串太短（< 1 字）| 不做模糊匹配，顯示全部 |
| page 超過總頁數 | redirect 回最後一頁 |
| 沒有資料庫連線 | 顯示「載入失敗、請重試」+ 既有 admin 錯誤 banner |

### 鍵盤

- 搜尋框 `Cmd/Ctrl+K` 聚焦
- `Enter` 送出
- 分頁箭頭按鈕可 Tab 到、`Enter` 觸發

---

## 7. 驗證標準

### 功能

- [ ] 沒搜尋時、顯示全部使用者、第 1 頁
- [ ] 輸入 `luffy` 能找到所有 username/display_name 含 luffy 的人
- [ ] role filter 切換、列表跟著變
- [ ] 點下一頁、URL 變 `?page=2`、列表內容換
- [ ] 重新整理頁面、搜尋與分頁狀態保留
- [ ] 排序切到 XP，列表依 XP 由高到低
- [ ] 頁碼點到 999（超過總頁數），自動 redirect 回最後一頁

### 安全

- [ ] 非 admin 進來、被 layout 擋掉（redirect login）
- [ ] 搜尋字串含 `%` `'` `;` `--` 不會造成查詢爆炸或 SQL inject
- [ ] 查不到使用者的查詢不會回傳其他 user 的資料

### 回歸

- [ ] 既有 UserRow 操作鈕（role / ban / ai_unlimited）仍可用
- [ ] tsc --noEmit pass
- [ ] next build pass

---

## 8. 工時估

| 項目 | h |
|---|---|
| Server query 改寫（含 count / range） | 1 |
| UsersFilters 元件 | 1.5 |
| UsersPagination 元件 | 1 |
| 整合到 page.tsx | 1 |
| 邊界 / 空狀態 / loading | 0.5 |
| 手動 test | 1 |
| Smoke (curl 多種 query) | 0.5 |
| **合計** | **~7h** |

---

## 9. 備註與已知風險

- **`profiles.email` 是否存在**：v3 schema 把 email 同步到 profiles 了嗎？若沒有、搜尋 email 要 join `auth.users`，那會跨 schema、需要 admin client。先實作 username/display_name；email 搜尋之後再說。
- **「banned」狀態判定用 `bio LIKE '[BANNED]%'`**：是目前 ban API 的 hack；之後做 LT-18 時應該獨立 `banned_at` / `ban_reason` 欄。
- **count: 'exact' 對大表會慢**：profiles 在 1 萬人內都 OK；之後到 10 萬以上要改成 `estimated`。
- **多重 `or()` 搜尋會影響索引**：username / display_name 沒有 trigram 索引時、`ilike '%xxx%'` 會 seq scan；profiles 在 10 萬以下都 OK。之後可加 `CREATE EXTENSION pg_trgm` + GIN 索引。

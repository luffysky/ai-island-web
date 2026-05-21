# AI Island Collaboration Rule

日期: 2026-05-22
適用專案: `ai_island_v3`
Gate Owner: `玄樞`

## 1. 核心目的

本規則把既有 `RULE/` 協作制度改寫成適用於 AI 島的版本。

AI 島是 Next.js + Supabase 的學習平台，不是 Android IME 專案；因此舊規則中所有 `.kt`、`SettingsActivity`、`YukiBoardIMEService` 條款僅作為精神參考，不直接套用。

本專案目前的主要協作模式：

- `玄樞`：本 repo 內的 Codex CLI，負責讀實檔、比對、移植、gate、最終整合。
- `Claude`：桌面版協作者，不能直接改本 repo；其交付成果以壓縮檔或文字 handoff 呈現。
- 董事長：需求與最終方向裁決。

## 2. Zip Handoff 規則

當 Claude 以 zip 提交成果時，`玄樞` 必須先做只讀盤點，不得直接覆蓋目前專案。

標準流程：

1. 列出 zip 檔案總數與頂層結構。
2. 對 zip 內檔案與當前 repo 做雜湊比對。
3. 分類輸出：
   - `SAME`
   - `DIFFERENT`
   - `ZIP_ONLY`
   - `LOCAL_ONLY`
4. 先核對 auth / session / Supabase client 相關檔案是否落後。
5. 再判定可移植、需重審、不可直接移植的項目。

禁止：

- 未比對就整包解壓覆蓋。
- 用 zip 內容回退已修好的登入、OAuth、session、profile 建立流程。
- 忽略 package / migration / route / RLS 之間的相依性，只搬 UI。

## 3. 高敏感區域

以下區域改動前必須明確說明目的、範圍與驗證方式。

### Auth / Session

- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/auth/**`
- `src/app/api/auth/**`
- `src/lib/supabase*.ts`
- `src/middleware.ts`

規則：

- 不得破壞目前已修好的 email / Google / LINE 登入。
- OAuth callback 必須同時考慮 `code`、`token_hash`、hash token 三種路徑。
- profile 建立優先走 server-side `ensure-profile`，避免 RLS 擋寫入。

### Database / RLS

- `supabase/*.sql`
- 所有使用 `createSupabaseAdmin()` 的 API route
- 所有新增 table / RPC / policy

規則：

- 新 API route 若依賴新 table，必須同時列出對應 migration。
- Public insert / delete policy 必須額外檢查濫用風險。
- Service role 僅限 server route 使用，不得進 client component。

### AI / Billing / Quota

- `src/app/api/ai/**`
- `src/app/admin/ai/**`
- `src/app/settings/ai-keys/**`
- `src/lib/ai-*`

規則：

- 任何「無限額度」或跳過 quota 的改動必須有 admin 控制面、audit log、migration。
- 不可只改 chat route，不補權限欄位與後台操作。

### Content / Course Runtime

- `src/data/chapters/**`
- `src/components/chapter/**`
- `src/lib/gamification.ts`

規則：

- Lesson 完成、XP、streak、achievement 不可重複發放。
- 前端動畫可移植，但不得改變 DB 記帳語意。

## 4. 移植判定

`玄樞` 對 zip 差異必須給出下列判定之一：

```text
READY TO PORT
Reason:
1. ...
2. ...
```

```text
NEEDS REVIEW
Reason:
1. ...
2. ...
```

```text
DO NOT PORT DIRECTLY
Reason:
1. ...
2. ...
```

判定標準：

- 單純 UI link / icon / 小動畫：通常可移植。
- 依賴新 migration 的功能：必須整組 gate。
- 涉及 auth / quota / RLS / public write：預設 `NEEDS REVIEW`。
- 會覆蓋目前已修好的登入流程：`DO NOT PORT DIRECTLY`。

## 5. AI 島專用回交格式

每輪回交使用下列格式：

```text
A. 盤點摘要
B. 差異清單
C. 登入 / auth 風險判定
D. 可移植項目
E. 需要重審項目
F. 玄樞 gate 判定
```

## 6. 當前基線

截至本規則建立時，當前 repo 的登入基線為：

- email/password 登入後呼叫 `/api/auth/ensure-profile`
- Google OAuth 走 `/auth/callback`
- LINE OAuth 走 `/auth/line/callback`，再透過 Supabase magiclink / `token_hash` 回 callback
- logout 同時執行 local signOut 與 `/api/auth/logout`
- Supabase browser client 使用 singleton

任何 zip 或外部 handoff 若缺少上述修復，視為落後版本，不得覆蓋。

## 7. 一句話版本

> Claude 可以用 zip 交付，但 zip 不是來源真相；`玄樞` 必須先只讀比對、守住登入基線、再逐項 gate 移植。

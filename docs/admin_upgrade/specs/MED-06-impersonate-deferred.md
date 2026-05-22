# MED-06 Impersonate（deferred）

## 為什麼暫不做

真正的 impersonate（admin 暫時用 user 身分瀏覽前台）要動到 Supabase 的 session token，有以下挑戰：

1. **Supabase JWT 是 user-scoped**：無法在 server 端「fake」一個用戶身分。必須走 `auth.admin.generateLink()` 產 magic link、由 admin 點擊登入成該用戶。
2. **使用者察覺風險**：用戶 last_active_at 會變、可能觸發 user 的設備提醒。
3. **稽核複雜**：admin 在 user 身分下做的任何操作都歸給 user、要在 audit_logs 額外標記 impersonator。
4. **登出問題**：admin 切回自己要重新登入。

## 80% 的需求已被 `/admin/users/[id]` 滿足

該頁已含：
- 完整 profile + role + ban / AI 特權狀態
- 最後 session 路徑 / 區域 / 裝置
- 近期 XP、Z-coin、lesson、achievement、AI 對話、筆記、書籤、訂單、訂閱、blog、forum 活動

排查 UX bug、客服協查、補帳前查狀態 都用得到。

## 真正需要 impersonate 時的選項

- **方案 1：Magic link**
  ```ts
  await admin.auth.admin.generateLink({ type: "magiclink", email: targetEmail });
  ```
  Admin 點 link 後是真實 user 身分。登出後再回自己。

- **方案 2：View-as cookie**
  - 寫 `admin_impersonate_uid` cookie（admin-signed JWT）
  - Server helper `getEffectiveUserId()`：admin 簽 cookie 存在則回 cookie 內 uid、否則回 auth.uid
  - 全站 server query 改用 `getEffectiveUserId()`
  - 工時：~2 天 + 安全 audit

## 建議

董事長明確需要時再開 round。目前用 `/admin/users/[id]` 已能應付絕大多數使用情境。

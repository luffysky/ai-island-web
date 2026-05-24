# Client-side console 待清單

這份記錄前端（瀏覽器會跑、使用者打開 DevTools 會看到）還保留的 `console.*` 呼叫。
等對應的錯誤路徑徹底修好、不再會踩到時，回來把這條 `devLog.*` 移除。

> 不要直接寫 `console.error/warn/log`，會被使用者看到。
> 一律用 `import { devLog } from "@/lib/dev-log"` → production build 自動 no-op、dev 才印。

---

## 登入 callback 流程（3 條）

### 1. `src/app/auth/callback/CallbackHashHandler.tsx:36`
```ts
devLog.error("[Callback] failed:", reason, raw);
```
- **觸發**：OAuth provider 回 `?error=…`、或 magic-link `token_hash` verifyOtp 失敗、或 20s timeout 仍無 session。
- **等什麼可刪**：登入成功率連續 1 週 100%、再無使用者回報「登入卡住」。
- **狀態**：仍偶發；保留觀察。

### 2. `src/app/auth/callback/CallbackHashHandler.tsx:48`
```ts
devLog.warn("[Callback] ensure-profile fail:", e);
```
- **觸發**：登入後呼叫 `/api/auth/ensure-profile` 補 profile 失敗（網路 / RLS / DB 慢）。
- **等什麼可刪**：ensure-profile API 改成完全冪等且永遠 200；目前還會有 race（profile 沒補成但登入已過）。
- **狀態**：保留。

### 3. `src/app/auth/callback/CallbackHashHandler.tsx:102`
```ts
devLog.warn("[Callback] timeout but session present, proceed");
```
- **觸發**：20s 邊緣 case — `onAuthStateChange` 沒觸發但 `getUser()` 已有 session（行動網路慢）。
- **等什麼可刪**：行動網路下 OAuth callback success rate 不再有此 fallback。
- **狀態**：保留（這條救過好幾個慢手機）。

---

## 登出（2 條）

### 4. `src/components/layout/TopNav.tsx:57`
```ts
devLog.error("[Logout] server signOut failed:", body);
```
- **觸發**：`/api/auth/logout` 回非 200。
- **等什麼可刪**：server signOut 接 GoTrue 全部走得通、不再 race；目前還偶爾 502。
- **狀態**：保留。

### 5. `src/components/layout/TopNav.tsx:60`
```ts
devLog.error("[Logout] failed:", error);
```
- **觸發**：登出整段 catch（網路斷、SDK throw）。
- **等什麼可刪**：同上。
- **狀態**：保留。

---

## AuthContext（1 條）

### 6. `src/lib/auth-context.tsx:86`
```ts
devLog.warn("[auth] profile load failed:", error.message);
```
- **觸發**：AuthProvider 首次 / 登入後載 profiles 表失敗（RLS、SDK race）。
- **等什麼可刪**：profile 一定能撈到（不再 RLS race、不再 SDK token 還沒帶 cookie 就 fetch）。
- **狀態**：保留。

---

## 章節筆記（2 條）

### 7. `src/components/chapter/NotePanel.tsx:41`
```ts
devLog.warn("[NotePanel] load failed:", loadErr.message);
```
- **觸發**：打開筆記 panel 時 load notes 失敗。
- **等什麼可刪**：notes 表 RLS / 索引穩定 1 個月。
- **狀態**：可考慮刪（很久沒看到觸發了）。

### 8. `src/components/chapter/NotePanel.tsx:101`
```ts
devLog.error("[NotePanel] save failed:", e);
```
- **觸發**：筆記儲存 insert/update 失敗。
- **等什麼可刪**：同上、且 toast 也有顯示「儲存失敗」可關閉這條。
- **狀態**：可考慮刪。

---

## AI 導師（2 條）

### 9. `src/components/AITutorWidget.tsx:177`
```ts
devLog.error("[AI tutor] load models failed:", modelsError);
```
- **觸發**：載 `ai_models` 表失敗（RLS / 表不存在）。
- **等什麼可刪**：models 表穩定後（已上 prod、未見過 fail）。
- **狀態**：可考慮刪。

### 10. `src/components/AITutorWidget.tsx:209`
```ts
devLog.error("[AI tutor] load quota failed:", quotaError);
```
- **觸發**：載今日 free quota 失敗。
- **等什麼可刪**：quota 表索引穩定。
- **狀態**：可考慮刪。

---

## Admin AI 模型管理（1 條）

### 11. `src/app/admin/ai/models/ModelsManagerClient.tsx:79`
```ts
devLog.error("[AI admin save failed]", data);
```
- **觸發**：admin 儲存 AI model 設定失敗。
- **等什麼可刪**：API route 自己 throw 過、admin UI 已 toast。
- **狀態**：可考慮刪。

---

## 規則

- 新增 client-side 錯誤路徑 → **一律 `devLog.error/warn`**，不要直接 `console.*`。
- 純 debug log（`console.log("checkpoint X")`）→ 永遠不要 commit。
- server-side（API route、server lib）→ 用 `console.*` 沒事，使用者看不到。

# QW-02 手動發放 XP / Z-coin / 成就

## 0. Metadata

- **版本**：v1.0
- **Owner**：雪鑰
- **狀態**：READY TO START
- **預估工時**：10–14h（後端 5h、前端 5h、test 3h）
- **依賴**：QW-01（user 列表要先能搜尋到才好點補帳）
- **被依賴**：MED-09（Z-coin airdrop 會基於同一套發放 helper）

---

## 1. 功能描述

讓 admin 在後台**手動發放 XP / Z-coin / 成就**給特定使用者，附上原因，並寫進 audit log。這是辦活動、補錯帳、補償客服案件的最低限工具——目前完全沒有。

---

## 2. 範圍

### In Scope

- 3 個新 admin API：
  - `POST /api/admin/grant/xp`
  - `POST /api/admin/grant/zcoin`
  - `POST /api/admin/grant/achievement`
- user row 加「補帳」按鈕 → 開 modal → 選類型 → 填數值 / 選成就 → 填原因 → 確認
- 所有發放都寫 `audit_logs` + 對應的 `xp_events` / `coin_transactions` / `user_achievements`
- 支援負數扣除（XP / Z-coin），但要二次確認
- 支援撤銷成就（DELETE）

### Out of Scope

- 批次 / segment 發放 → MED-09
- 自動規則化（例「升 Lv 10 自動送 100 Z-coin」）→ LT-16
- 對應前台通知（用戶看到「你被補了 100 XP」）→ 之後接 broadcast / in-app notification

---

## 3. 設計規則

1. **單一發放上限**：XP ≤ 10000、Z-coin ≤ 5000、扣除上限 = 該 user 當前餘額；超過要二次確認 + 額外 audit reason。
2. **必填 reason**：不接受空字串、不接受 < 5 個字、不接受純空白。
3. **double-write**：先寫事件表（xp_events / coin_transactions / user_achievements）→ 再 update `profiles.xp` / `profiles.z_coin`；任一失敗、整體 rollback（用 RPC 包成 transaction，或在 server 端做兩段 + 失敗時補刪）。
4. **不能改自己**：admin 不能對自己發放（避免自肥）；前端 + 後端都要擋。
5. **冪等性**：每個 grant API 接受可選 `client_request_id`；同一 id 24h 內重複會回相同結果、不重發。
6. **audit log 必包含**：actor / target / amount / reason / before-after profile balance。

---

## 4. File Scope

### 允許修改

```text
- src/app/admin/users/UserRow.tsx        ← 加「補帳」按鈕
- src/lib/gamification.ts                 ← 可選：抽出共用 awardXp() helper（若還沒有）
```

### 允許新增

```text
- src/app/api/admin/grant/xp/route.ts
- src/app/api/admin/grant/zcoin/route.ts
- src/app/api/admin/grant/achievement/route.ts
- src/app/admin/users/GrantModal.tsx       ← client component（modal 內容）
- supabase/admin_grant_helpers.sql          ← 可選；包成 RPC `admin_grant_xp` / `admin_grant_zcoin`
```

### 禁止修改

```text
- src/app/api/ai/**                       ← AI 跟發放無關
- src/middleware.ts
- src/lib/supabase-*.ts
- supabase/schema.sql                     ← 不動主 schema；發放走既有事件表
```

---

## 5. 資料合約

### 既有 schema 引用

```sql
xp_events (id, user_id, amount, reason, meta jsonb, created_at)
coin_transactions (id, user_id, type, amount, reason, meta jsonb, created_at)
user_achievements (user_id, achievement_id, unlocked_at)
achievements (id, name, icon, xp_reward, z_coin_reward, ...)
profiles (id, xp, z_coin, level, ...)
audit_logs (actor_id, actor_username, action, target_type, target_id, changes, ...)
```

### API 合約

#### `POST /api/admin/grant/xp`

```json
// Request
{
  "userId": "uuid",
  "amount": 100,
  "reason": "活動補償：4/1 sprint 完成獎勵",
  "clientRequestId": "uuid-v4-optional"
}

// Response 200
{
  "ok": true,
  "userId": "uuid",
  "delta": 100,
  "newXp": 1234,
  "newLevel": 5,
  "leveledUp": true
}

// Errors
400 bad_request          | 缺欄位、amount 不是整數、reason < 5 字
403 forbidden             | 非 admin
400 cannot_target_self    | 不能對自己發放
404 user_not_found        | userId 找不到
409 duplicate_request     | clientRequestId 24h 內重複
422 over_limit            | amount > 10000 或會讓 xp < 0
500 internal_error        | DB 寫入失敗（已 rollback）
```

#### `POST /api/admin/grant/zcoin`

```json
// Request
{
  "userId": "uuid",
  "amount": 50,           // 正數 = 給、負數 = 扣
  "reason": "客服補償：訂單 #123 重複扣款",
  "clientRequestId": "uuid-v4-optional"
}

// Response 200
{
  "ok": true,
  "userId": "uuid",
  "delta": 50,
  "newBalance": 250
}

// Errors（同 XP，加 422 insufficient_balance）
```

#### `POST /api/admin/grant/achievement`

```json
// Request
{
  "userId": "uuid",
  "achievementId": "first-lesson",
  "reason": "資料修復：4/1 系統 bug 該得未得",
  "alsoGrantRewards": true,   // 是否也補發成就附帶的 xp / zcoin
  "clientRequestId": "uuid-v4-optional"
}

// DELETE 同 path
{ "userId": "uuid", "achievementId": "first-lesson", "reason": "..." }

// Response 200
{
  "ok": true,
  "userId": "uuid",
  "achievementId": "first-lesson",
  "alreadyOwned": false,
  "grantedRewards": { "xp": 50, "zCoin": 10 }
}
```

### Audit log 寫法

```ts
await admin.from('audit_logs').insert({
  actor_id: user.id,
  actor_username: me.username,
  action: 'admin.grant_xp',           // or grant_zcoin / grant_achievement / revoke_achievement
  target_type: 'user',
  target_id: userId,
  changes: {
    before: { xp: target.xp },
    after: { xp: target.xp + amount },
    reason,
    client_request_id: clientRequestId ?? null,
  },
  ip: req.headers.get('x-forwarded-for') ?? null,
  user_agent: req.headers.get('user-agent') ?? null,
});
```

### Transaction 建議：RPC（可選）

若怕 race condition，把雙寫包進 RPC：

```sql
CREATE OR REPLACE FUNCTION public.admin_grant_xp(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_actor_id UUID
) RETURNS TABLE(new_xp INT, new_level INT, leveled_up BOOLEAN) AS $$
BEGIN
  -- 1. insert xp_events
  INSERT INTO xp_events (user_id, amount, reason, meta)
  VALUES (p_user_id, p_amount, p_reason, jsonb_build_object('source','admin_grant','actor_id',p_actor_id));

  -- 2. update profile
  UPDATE profiles
  SET xp = GREATEST(0, xp + p_amount),
      level = LEAST(60, FLOOR(SQRT(GREATEST(0, xp + p_amount) / 100.0))::INT + 1)
  WHERE id = p_user_id
  RETURNING xp, level INTO new_xp, new_level;

  RETURN QUERY SELECT new_xp, new_level, /* leveled_up logic */;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> Phase 1 可以先不開 RPC，用 server 端兩段寫；如果驗證階段看到 race 再補。

---

## 6. UI 行為

### Modal 觸發

UserRow 在「角色」「Ban」「AI 特權」之外加第 4 個按鈕 `🎁 補帳`，點開 modal。

### Modal 內容

```text
┌─ 補帳：@luffysky00（Lv 5 · 1234 XP · 250 Z-coin） ────────┐
│                                                            │
│  類型：⚪ XP   ⚪ Z-coin   ⚪ 成就                            │
│                                                            │
│  ── 若選 XP / Z-coin ──                                    │
│  數值：[___________]  ⚠ 負數會扣除                          │
│                                                            │
│  ── 若選成就 ──                                            │
│  成就：[請選擇 ▼]                                          │
│  ☑ 同時補發成就附帶 XP / Z-coin                            │
│  動作：⚪ 授予  ⚪ 撤銷                                       │
│                                                            │
│  原因（必填、≥ 5 字）：                                     │
│  [____________________________________________]            │
│                                                            │
│        [取消]  [預覽變更]                                   │
└────────────────────────────────────────────────────────────┘
```

### 預覽變更（按了「預覽變更」後）

```text
即將變更：
  XP：1234 → 1334（+100）
  等級：5 → 5（無變化）

理由：活動補償：4/1 sprint 完成獎勵

[← 修改]   [✓ 確認發放]
```

### 成功後

- Modal 關閉
- 顯示 toast「✅ 已發放 100 XP」+ 「查看 audit log」連結
- UserRow 自動更新數值（refresh router 或直接更新 state）

### 邊界

| 情境 | 行為 |
|---|---|
| 對自己 | 按鈕 disabled + tooltip「無法對自己發放」 |
| reason < 5 字 | 「預覽變更」disabled |
| 超出單次上限 | 顯示警告 + 要二次輸入「我確定」才解鎖確認鈕 |
| 負數扣除導致 < 0 | 顯示「會超扣 NN、最多只能扣 MM」 |
| 連點兩次「確認」 | 第二次回 409 duplicate（要看 clientRequestId 是否帶）|
| API 失敗 | toast「發放失敗：<原因>」+ 不關 modal、不變 UI |

### 鍵盤

- modal 開啟自動 focus 「類型」radio
- `Esc` 關閉、`Enter` 在最後欄送出

---

## 7. 驗證標準

### 功能

- [ ] 給 luffy 100 XP，profile.xp 從 1234 → 1334，xp_events 多 1 筆
- [ ] 扣 luffy 50 Z-coin，profile.z_coin 從 250 → 200，coin_transactions 多 1 筆 type=manual_deduct
- [ ] 授予 luffy 成就「first-lesson」，user_achievements 多 1 筆，alsoGrantRewards 也發了 xp/zcoin
- [ ] 撤銷成就，user_achievements 那筆消失，附帶 reward 也撤掉
- [ ] 三個 API 都寫 audit_logs，actor_id / target_id / changes 都對
- [ ] 同一 clientRequestId 重發 → 第二次回 409、DB 沒重寫

### 安全

- [ ] 非 admin → 403
- [ ] 對自己 → 400 cannot_target_self
- [ ] reason 空 / 純空白 / < 5 字 → 400
- [ ] XP > 10000 → 422 over_limit
- [ ] 扣到負數 → 422 insufficient_balance
- [ ] 不存在 user → 404

### 回歸

- [ ] 既有 user role / ban / ai_unlimited 操作不破
- [ ] 既有 XP 計算邏輯（lesson 完成 / quiz 滿分）不破
- [ ] tsc / build pass

---

## 8. 工時估

| 項目 | h |
|---|---|
| 三個 API route | 4 |
| audit log 寫入 + duplicate check | 1 |
| GrantModal 元件 | 3 |
| UserRow 整合 + toast | 1 |
| 手動 test 三類發放 + 邊界 | 2 |
| Smoke curl + 確認 audit | 1 |
| **合計** | **~12h** |

---

## 9. 備註與已知風險

- **Race condition**：同一 admin 對同一 user 在 1 秒內連按兩次「確認」、又沒帶 clientRequestId → 會發兩次。Mitigation：前端 modal 在 submit 後 disable 按鈕直到回應；後端再加 clientRequestId 保險。
- **Level up 動畫**：發 XP 後若跨級、前端是否要播 LevelUpModal？答：admin 操作不播動畫；那是給 user 自己的體驗。
- **成就附帶 reward 重複問題**：如果該成就之前已給過 XP（用戶自己解過、後來撤銷又再授予）會雙倍。Mitigation：撤銷成就時用 xp_events 找對應 reward event 撤掉。
- **xp_events `reason` 與 `meta` 命名一致**：本 spec 統一 `reason: 'admin grant: <text>'`、`meta: { source: 'admin_grant', actor_id, achievement_id? }`。之後分析時可以 `meta->>'source' = 'admin_grant'` 篩選。
- **與遊戲化引擎的關係**：`src/lib/gamification.ts` 是 client 端 helper（confetti / toast）；本 spec 完全走 server，client 不參與計算。

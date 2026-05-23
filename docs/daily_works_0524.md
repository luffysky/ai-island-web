# Daily Works — 2026-05-24

雪鑰處理、董事長林 luffy。

## 工作主軸

從 ai_island_v3 演算法 / 後台補完 / 3D 島嶼 / UI-UX 大改 / 通知系統 一路推到底、共 25 批 commit。

## Commit 列表（時間倒序）

- `e8d2d51` — 批 24：訪客追蹤 + LINE / Discord / Telegram 多通道 admin 通知
- `3ac3cce` — 批 23：modal register / 通知中心 / 主題動畫 / EmptyState 套 + 修 /achievements 404
- `7e76f31` — 批 22：Command Palette + Mobile Bottom Nav + Overlay Stack + TutorBall 可拖
- `51b7b99` — 批 21：AI 助教 4 mode + Hub + /dashboard fix + favicon PNG + 手機 Pet
- `cd1973a` — 批 20：favicon + 滑鼠 lock + 手機搖桿 + 寵物位置 + 6 動物村民
- `71bf737` — 批 18+19：J Thompson + ELO 整合 + D Leetcode link out
- `196a42a` — 批 17：L 大標題 + K 手機 LookPad + Leetcode 統計
- `9ecc263` — 批 8：alert/confirm/atomic/fire-and-forget 大修
- `4fd291f` — 批 2：Quest NPC + 環境音效
- `e29cc6d` — 寵物進化 + AI 審核
- ……（往前還有 60+ commit）

## 通知系統三層

| 層 | 用途 | 實作 |
|---|---|---|
| **In-app（鈴鐺）** | 用戶看自己的通知 | `notifications` 表 + `NotificationsDropdown` + `/api/me/notifications` |
| **LINE 直推 admin** | 林董手機即時收 | `lib/notify-admin.ts` 多通道 + 訪客 / 登入 / 操作 hook |
| **訪客匿名追蹤** | 連未登入訪客都通知 | `VisitTracker` client + `/api/notify-visit` + `/api/notify-leave` |

## 演算法盤點（7 個全做完）

1. RFM churn — `/admin/churn` 8 segment
2. AI 模型路由 — cheap/mid/pro tier
3. HN 論壇排序 — `(likes+1)·log2(replies+2)/(age+2)^1.5`
4. 動態 XP — 連勝/回歸/新手/週末加成（上限 5x）
5. Thompson Sampling — A/B 自動探索利用
6. FoF Feed — 共同 lesson + forum 互動算 affinity
7. ELO 自適應 — quiz 題目難度跟隨用戶 rating

## 3D 島嶼互動點清單

5 節點 + 18 採集 + 5 寶箱 + 3 NPC + 6 動物村民 + 1 寵物 + 1 家 + 1 釣魚 = **40 個互動點**

加上 4 個 UI 模式（地圖 / 背包 / 設定 / 任務）+ 5 種天氣 + 8 分鐘日夜循環 + 寵物親密度 + ELO 出題。

## 林董要做的事

### 跑過的 SQL（已自動執行 ✅）
- algo_integration_migration.sql
- leetcode_problems_seed.sql（30 題）
- leetcode_binding_migration.sql
- notifications_migration.sql

### Zeabur 加 env（任選一通道做 LINE 通知）
```
ADMIN_LINE_CHANNEL_TOKEN=     # LINE Messaging API token（取代已棄用的 LINE Notify）
ADMIN_LINE_CHANNEL_SECRET=    # Channel secret（驗證 webhook signature）
ADMIN_LINE_USER_ID=           # 加 bot 為好友後、webhook 會 reply 給你看
IPINFO_TOKEN=                 # 訪客地點 lookup（選填）
# 或：
ADMIN_TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_CHAT_ID=
# 或：
ADMIN_DISCORD_WEBHOOK_URL=
```

### LINE Webhook URL 設定
LINE Developers Console → Messaging API → Webhook URL：
```
https://ai-island-web.snowrealm.pet/api/line-webhook
```
並開「Use webhook」。

### 後續方向
- LINE bot 串 AI 對話（已實作、要 env 後生效、林董可直接 LINE 問 AI）
- EmptyState 擴更多 admin 後台空白頁
- BACKLOG.md 整理

## 已知遺留 BACKLOG
參見 docs/BACKLOG.md 第 5/6 節 P4-XX 剩餘項。

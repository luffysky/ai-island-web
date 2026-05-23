# Daily Works — 2026-05-24（v2）

雪鑰處理、董事長林 luffy。

## 工作主軸

從 ai_island_v3 演算法 / 後台補完 / 3D 島嶼 / UI-UX 大改 / LINE 通知系統 一路推到底、共 29 批 commit、~40 個檔案改 / 新增、5 個 SQL migration 已自動 apply。

---

## Commit 列表（時間倒序）

```
316e0aa 批 29-1 LINE 命令擴 13 個 + /grant 雙重確認 + /settings 8 條好處
e08a56b 修 ISP/IP 訊息消失 + 精準定位同意 UI
3b9376d 批 27 LINE 進階四件（Quick Reply + Rich Menu + 多 admin prefs + PostBack）
a057c74 LINE 通知 Flex Message 卡片化 + AI 回覆美化 + 帶按鈕
fcc511b 批 26 LINE 全面強化（多 admin / bot 命令 / 接 hook / cron 報表）
5d16f65 訪客通知擴地理（郵遞區號 / ISP / IP / Maps 連結）
9ee35d0 批 25 LINE bot 串 AI / EmptyState 5 處 / notify hooks / BACKLOG v2.0
e8d2d51 批 24 訪客追蹤 + LINE/Telegram/Discord 多通道
3ac3cce 批 23 modal register + 通知中心 + 主題動畫 + EmptyState
7e76f31 批 22 Command Palette + Mobile Bottom Nav + Overlay Stack + TutorBall 可拖
51b7b99 批 21 AI 助教 4 mode + dashboard fix + favicon PNG + 手機 Pet
cd1973a 批 20 favicon + 滑鼠 lock + 手機搖桿 + 6 動物村民
71bf737 批 18+19 J Thompson + ELO 整合 + D Leetcode link out
196a42a 批 17 大標題進場 + 手機 LookPad + Leetcode 統計
530243c Admin pill + 島嶼省電
d28ddd7 演算法 #4~#7 + 學習主軸校正 + FPV 第一人稱 + CSS 天氣
e008bba 批 9~12 微優化 + G 釣魚 + H HN 排序 + I 我的家
9ecc263 批 8 全專案 bug 掃描後修補
c420999 移除 asset/ 源包
2a70437 批 7 Kenney GLB asset + 設定 + 隨機事件 + AI 路由 + RWD
3e0eed6 批 6 全景導覽風格化
56b1557 批 5 Minimap + 寶箱 + 成就 + 背包
c2eaa5b 清完所有 open task — DB cutover + KPI + nav
34f9e09 批 4 神秘商人 + 占卜師 + buff
b316fd1 批 3 動態天氣 + 寵物對話 + 親密度
4fd291f 批 2 Quest NPC + 環境音效
f6fb979 修手機搖桿 + 採集系統 + 晝夜循環
489ae12 拆 island-bus
d28f4fa WASD 方向修正 + 手機搖桿
97ec575 島嶼節點改 modal
917e1e4 演算法 #1 RFM churn
ee21372 批 3+4 進度連動村莊 + 寵物 + NPC
9d67a70 批 2 節點互動
4999867 批 1 能站上去的島
d2a580d S12 polish
```

---

## 已完成系統盤點

### 🎯 演算法 9 個（藍圖 7 全做 + 額外 2）
1. ✅ RFM Churn（`/admin/churn`、8 segment）
2. ✅ AI 模型路由（cheap/mid/pro tier）
3. ✅ HN 論壇排序（`(likes+1)·log2(replies+2)/(age+2)^1.5`）
4. ✅ 動態 XP（連勝/回歸/新手/週末/buff 加成）
5. ✅ Thompson Sampling A/B（Beta(α,β) 抽樣）
6. ✅ FoF Feed 推薦（共同 lesson + forum 互動）
7. ✅ ELO 自適應題目難度（quiz 系統）
8. ⏳ Chapter 推薦（content + collaborative filter）— 未做
9. ⏳ 全站語意搜尋（embeddings + vector）— 未做

### 🏝️ 3D 島嶼（40+ 互動點 + 5 種天氣 + FPV）
- 主島 + 漂浮天空島 + 8 個區域標記 + 中央水晶高塔
- FPV 第一人稱 + 手機觸控搖桿 + LookPad 右側拖視角
- 18 個採集物 + 5 個寶箱 + 4 套裝飾
- 6 個動物村民（Kenney CC0 GLB）+ 3 個 NPC（漁夫/商人/占卜師）
- 寵物跟隨 + 親密度 + 10 句對話
- 採集系統 + 背包（B 鍵）+ Minimap（點開全螢幕）
- 釣魚 mini-game（5 種魚 + QTE）
- 我的家系統（蓋小屋 / 6 種家具 / 睡覺補心）
- 任務 NPC + 商人 + 占卜師（每日抽運勢）
- 動態天氣（晴/陰/雨/雪/霧 + 風向）+ 8 分鐘日夜循環
- 5 種隨機事件 + 環境音效（CSS keyframes 雨雪、零 GPU 開銷）
- Buff 系統（speed / fast_respawn / double_coin）
- WelcomeOverlay 4 步教學
- 後製：Bloom + Vignette + ACES Filmic
- 省電 quality 模式（low 拿 80% GPU 負擔）

### 📲 LINE 通知系統 三層完整
- 🟢 訪客 visit / leave（含 IP / 地理 / ISP / 裝置 / 上次間隔 / 停留時長）
- 🔑 用戶登入 / 註冊 / 完課 / 升等 / 成就 / 論壇回覆 / 訂單 / 系統錯誤
- 📊 cron 每日報表 + 每週報表（`/api/cron/line-daily`）
- 🤖 bot 雙向 AI 對話（多 admin 各自 history、注入身份 system prompt）
- 🪪 多 admin 支援（ADMIN_LINE_USERS JSON、Nami 預留位）
- 🎨 Flex Message 卡片化（SimpleCard / KpiCard / ListCard / AiReplyCard）
- ⚡ Quick Reply 浮按鈕（常用命令 7 個）
- 📋 Rich Menu 6 格 setup endpoint（要圖 url）
- 🔘 PostBack actions（prefs_toggle / ban_user / grant_coin / ack_error）
- ⚙️ 個人通知偏好（admin_line_prefs 表 + /prefs 命令）

### 🤖 LINE bot 命令 19 個
- **報表類**：/today /kpi N /online /sub /orders N /ai-cost N /quiz /island
- **用戶**：/users /churn /leetcode user
- **動作**：/notify msg /maint on|off /feature key on|off /email user msg /refund id /grant user amount（大金額雙重確認）
- **系統**：/errors /prefs /who /clear

### 🎨 UI/UX 4 大件
- Command Palette（⌘K / Ctrl+K、全站搜尋）
- Mobile Bottom Nav（5 入口、iOS safe area）
- Overlay Stack（modal 開時隱藏 Pet / TutorBall / AdminPill）
- EmptyState 統一元件（套 5 處）

### 🛡️ 隱私 / 合規
- 精準位置同意 UI（GeolocationConsent modal + 8 條好處告知）
- 設定頁 PreciseLocationToggle（含 details 摺疊好處）
- profiles 加 geo_country / geo_city / geo_consent_at / geo_revoked_at
- 只存大致縣市、不存原始 GPS

### 🎮 學習主軸
- 70 章節 DB cutover（content.ts 優先讀 DB + 1 min cache + JSON fallback）
- AI 導師（綠寶、5 persona）+ AI 助教（4 mode）+ AI 學習規劃
- 每日測驗（chapter miniQuiz + leetcode 抽題 + ELO 自適應）
- Leetcode 推薦 link out（30 題 seed + leetcode-stats-api 同步）
- 動態 XP（連勝 / 回歸 / 新手 / 週末加成 / buff 倍率）
- 通知中心 in-app（Bell dropdown）

---

## 已自動 apply 的 SQL migration

1. `algo_integration_migration.sql` — ELO / Thompson / Leetcode link out 表
2. `leetcode_problems_seed.sql` — 30 個熱門題 seed
3. `leetcode_binding_migration.sql` — profiles 加 leetcode 欄
4. `notifications_migration.sql` — 通知中心表
5. `line_prefs_migration.sql` — admin LINE 個人偏好表
6. `geo_consent_migration.sql` — profiles 加精準位置欄

---

## 林董要做的事 ✅ 已完成 / ⏳ 待做

### ✅ 已做
- LINE Channel 建立 + token 拿
- ADMIN_LINE_CHANNEL_TOKEN / SECRET / USER_ID env 設好
- IPINFO_TOKEN 設好
- LINE Webhook URL 設好
- bot 加好友 + 拿 userId 完成綁定
- LINE Official Account 「自動回應 / 聊天」關掉、Webhook 開啟

### ⏳ 待做
1. **Rich Menu 圖檔** — 自製 2500×1686 PNG → 上傳 imgur 拿 URL → 設 `RICH_MENU_IMAGE_URL` env → GET `/api/admin/line/setup-richmenu`
2. **CRON_SECRET env** + 外部 cron 觸發每日報表（GitHub Actions / cron-job.org）
3. **Nami 加入 admin LINE**（等她拿 userId、加進 `ADMIN_LINE_USERS` JSON）
4. **GOOGLE_MAPS_API_KEY env**（精準位置反查台灣縣市才準、不填用 fallback）

---

## 仍待辦（按優先序）

詳見 `docs/BACKLOG.md` §10 v3。

# AI Island v3 — ROADMAP 2026 Q3+

**版本**：v1.0
**日期**：2026-05-23
**Owner**：雪鑰
**目的**：把所有未做事項合併、排優先、定 sprint。

來源：
- 林董 2026-05-23 列出的 50+ 功能清單
- `docs/待閱/greenbao_ai_cost_spec_v0.md`（綠寶 AI 成本快取 v0）
- `docs/待閱/Chapter01_debug_mindset.md`（Chapter 01 課程內容 4 lesson）
- `docs/待閱/AI島_3D島嶼_規格書_SnowRealm版.md`（3D 島嶼 v0）

---

## 0. Sprint 編號規則

- `S1` ~ `S12`：12 個 sprint，每 sprint 約 1-2 週
- 每項標記：`[Sprint] 預估天數 · 依賴 · Owner`
- Owner 預設「雪鑰」（單線），可拆給未來新角色

---

## §A · Sprint S1（本週、最高優先）— 快得到價值

### A1. 綠寶 AI 成本快取 v0（依 `greenbao_ai_cost_spec_v0.md`）
`[S1] 1.5 天 · 無依賴 · 雪鑰`

- **批 1**：`ai_response_cache` 表 + `src/lib/ai-cache.ts`（normalize / hash / writeCache）+ 接入 `chat/route.ts` 寫入端
- **批 2**：lookupCache + 命中回放 SSE + 不扣 quota
- **批 3**：後台 `/admin/ai/cache` 看命中率 + Top 10 熱問題
- **驗收**：相同問題第二次秒回、`hit_count` +1、`cost_usd = 0`

### A2. 學習日曆 / Streak heatmap（仿 GitHub 草地）
`[S1] 0.5 天 · 無依賴 · 雪鑰`

- `/me` 頁加 GitHub-style heatmap（過去 90 天）
- 從 `learning_events` 或 `lesson_progress` count by date
- 純前端 + 一個 API endpoint

### A3. 首頁雙入口（依 3D 島嶼 spec 附錄 B、不依賴 3D 完成）
`[S1] 0.5 天 · 無依賴 · 雪鑰`

- 改 `src/components/home/Hero.tsx` 兩按鈕成「🏝️ 島嶼 / 📋 經典」兩張對等卡
- v0 階段「島嶼」連到佔位頁 `/island`（之後實作 3D）

### A4. forum_post / blog_write / daily_quiz quest hook
`[S1] 0.5 天 · 無依賴 · 雪鑰`

- forum 新發文 / blog 發佈 / daily_quiz 完成 → 推進對應 quest
- 把學習任務 4 個 type 全部接齊

### A5. TopNav z 幣 + XP 飄字動畫
`[S1] 0.5 天 · 無依賴 · 雪鑰`

- 拿到時 framer-motion spring 飄字 + counter 滾動
- listen `pet:xp-earned` 與新 event `coin:earned`

**S1 Total: ~3.5 天**

---

## §B · Sprint S2 — 使用者後台高 ROI

### B1. 今日推薦下一個 lesson
`[S2] 0.5 天 · 無依賴 · 雪鑰`
- 找上次完成的下一個未完成 lesson、置頂顯示「繼續學」
- 邏輯：last `lesson_progress` → 同章下一個未完成 → 沒有就抓下一章第一個

### B2. AI 學伴聊天記錄一覽
`[S2] 1 天 · 無依賴 · 雪鑰`
- `/me/ai-history` 頁面、列 ai_conversations + 對話內容
- 篩日期 / persona、能展開對話

### B3. 個人技能雷達圖
`[S2] 1 天 · 無依賴 · 雪鑰`
- 用 recharts RadarChart
- 維度：前端 / 後端 / AI / 商業 / 工具 / 創作 — 對應 stage 完成度

### B4. 每週學習報告 email
`[S2] 1.5 天 · email_campaigns table 已建 · 雪鑰`
- 每週日 23:00 cron 寄上週統計（XP / lesson / 連勝）
- 接 Resend 或 supabase 的 email
- Email opt-out 接 user_settings

### B5. 學習筆記匯出 Markdown
`[S2] 0.5 天 · 無依賴 · 雪鑰`
- `/me/notes` 加「匯出 .md」按鈕
- 全部 notes 合併成 markdown 檔下載

**S2 Total: ~4.5 天**

---

## §C · Sprint S3 — 管理員後台 ops

### C1. 使用者活動時間軸
`[S3] 1 天 · 無依賴 · 雪鑰`
- `/admin/users/[id]` 加「活動時間軸」分頁
- 合併 xp_events + coin_transactions + lesson_progress + login + forum + blog 排序
- filter by type、按日 group

### C2. 流失預警 dashboard
`[S3] 1 天 · 無依賴 · 雪鑰`
- `/admin/churn` 列出「last_active 7 天 / 14 天前、XP > 100」的 user
- export CSV 給 email 行銷批次召回

### C3. KPI 自動報表 email
`[S3] 1 天 · 無依賴 · 雪鑰`
- cron 每日 09:00 寄報表給 admin: DAU/WAU/MAU、新註冊、AI 用量、收入
- 接 Resend

### C4. 學員作業成績單匯出 CSV
`[S3] 0.5 天 · assignments 已建 · 雪鑰`
- `/teacher/grading?export=csv` 直接下載
- 含 assignment_title / user / score / submitted_at / graded_at

### C5. SEO 預覽（P4-03）
`[S3] 1 天 · 無依賴 · 雪鑰`
- `/admin/chapters/[id]/seo-preview` 預覽 OG 圖 + Google search snippet 模擬
- meta_title / meta_desc 即時編輯 → 寫回 `seo_overrides`

**S3 Total: ~4.5 天**

---

## §D · Sprint S4 — 補完已建 schema 的 UI

### D1. Email campaigns UI（已 task #31）
`[S4] 2 天 · email_campaigns/recipients 已建 · 雪鑰`
- `/admin/email/campaigns` CRUD + segment 選擇 + 發送 + 統計
- 接 Resend 實際送信 + open tracking pixel

### D2. Segment 儲存 + 重複用（P4-09）
`[S4] 1 天 · user_segments 已建 · 雪鑰`
- `/admin/segments` CRUD + 套用到 email campaigns 與 broadcasts
- Segment 預覽人數

### D3. 內容草稿 / 排程發布（P4-04）
`[S4] 1 天 · `scheduled_publish_at` 欄已加 · 雪鑰`
- `/admin/scheduled` 看待發布隊列
- cron 每分鐘 publish 過期的

### D4. 教師業績儀表板（#28）
`[S4] 1 天 · 無依賴 · 雪鑰`
- `/teacher/stats` 看自己批改數 / 平均給分 / 學員滿意度
- 抽成計算（若有業績制）

**S4 Total: ~5 天**

---

## §E · Sprint S5 — Chapter 01 debug 思維課程上架

依 `docs/待閱/Chapter01_debug_mindset.md` 內容。

### E1. 新章節 ch71《Vibe Coding 除錯聖經》
`[S5] 2 天 · 章節 cutover 完成 · 雪鑰`
- 4 個 lesson 灌進 `chapters` + `lessons` DB
- title: 「除錯聖經」、subtitle:「Debug 思維建立」
- stage: 7（附錄）或新 stage 8（除錯）
- 每 lesson 結構照原文：🎯 / 🧠 / 👶 / 🏗 / 🧩 / ❌ / 🔍 / 🛠 / 🤖 Claude / 🤖 Codex / 🧪 / ✅ / 📌
- 補上 miniQuiz（從每課重點抽 4 題）
- 提供 chapter-end quiz（章末綜合測驗）

### E2. 「Debug 練習場」playground
`[S5] 1 天 · 無依賴 · 雪鑰`
- ch71 內加特殊 playground type "debug-puzzle"
- 給有 bug 的 code、玩家修好過關
- 8-10 個 debug 題、各拿 z 幣

**S5 Total: ~3 天**

---

## §F · Sprint S6 — 商業化第一波

### F1. 付費訂閱 paywall（前 5 章免費）
`[S6] 3 天 · 無依賴 · 雪鑰`
- chapters 加 `is_premium` 旗標（已部分有）
- 第 6 章起未訂閱 user 看到「升級才能繼續」遮罩
- 接現有 subscriptions 表

### F2. 單章購買 + 包年方案
`[S6] 2 天 · 無依賴 · 雪鑰`
- 新表 `chapter_purchases`
- /pricing 頁含 3 種：單章 NT$99、月訂 NT$299、年訂 NT$2999
- 接金流（先 Stripe / TapPay 之一、看林董）

### F3. AI tutor 訊息分層（free 10/day、premium 無限）
`[S6] 1 天 · 已有 `consume_ai_quota` · 雪鑰`
- 訂閱 user 跳過扣 quota
- 免費 user 達 10/天提示「升級無限」

### F4. 退費 / 客訴工單系統（P4-07）
`[S6] 2 天 · 需新表 tickets · 雪鑰`
- `/admin/tickets` 收訊息 / 認領 / 回覆
- 接 email 收件箱（Resend webhook）
- /me/support 學員提工單

**S6 Total: ~8 天**

---

## §G · Sprint S7-S8 — 3D 島嶼 v0

依 `docs/待閱/AI島_3D島嶼_規格書_SnowRealm版.md`。

### G1. 批 1：能站上去的島
`[S7] 2 天 · 無依賴 · 嶼築（暫由雪鑰兼）`
- `npm install three @react-three/fiber @react-three/drei nipplejs`
- `/island` 路由 + `IslandCanvas.tsx`
- 地面 + 玩家膠囊體 + WASD + 虛擬搖桿 + 第三人稱相機
- profiles 加 `preferred_mode` 欄

### G2. 批 2：節點與進入內容
`[S7] 2 天 · G1 完成 · 雪鑰`
- `island-map.ts` 含 5 個節點（3 chapter / 1 dungeon / 1 village）
- `MapNode.tsx` 互動 + 浮 label + 走近提示
- 進節點 → next/router 跳對應 page

### G3. 批 3：進度連動 + 村莊
`[S8] 2 天 · G2 完成 · 雪鑰`
- 節點依 lesson_progress 顯示已完成 / 進行中 / 未解鎖
- HUD（Lv / XP / 小地圖）
- 村莊節點顯示討論區活絡度

### G4. 批 4：AI 角色 + 寵物
`[S8] 2 天 · G3 完成 · 雪鑰`
- `IslandNPC.tsx` + 對話接 /api/ai/chat（不同 system prompt）
- `FollowPet.tsx` 跟隨玩家
- 節點微動畫、進入區域轉場

**S7-S8 Total: ~8 天**

---

## §H · Sprint S9 — 中期戰略

### H1. AI 導師個人化學習規劃
`[S9] 3 天 · 無依賴 · 雪鑰`
- `/me/ai-plan`：AI 看 user 歷史（已完成 lesson、停留時間、quiz 表現）→ 推薦下一個學什麼 + 學習風格
- 「懶人包 / 標準 / 詳細」三種深度模式
- 用 system prompt + tool call 接現有 chapters API

### H2. cohort 留存分析（LT-15）
`[S9] 2 天 · 無依賴 · 雪鑰`
- `/admin/cohort` 留存表（註冊週 vs N 週後 active）
- funnel: signup → 1 lesson → 5 lesson → boss → premium

### H3. 學習小組 / 讀書會（#19）
`[S9] 3 天 · 新表 study_groups + members · 雪鑰`
- 5-10 人組、共同進度看板、互相 review notes
- 簡單版：純資料 + 排行榜、不做即時聊天

**S9 Total: ~8 天**

---

## §I · Sprint S10 — 進階功能

### I1. 作品集系統（#21）
`[S10] 3 天 · 新表 portfolios · 雪鑰`
- 學員把 playground 整理成公開 portfolio /portfolio/[username]
- og 圖自動生（@vercel/og）

### I2. Discord / LINE 群整合（#22）
`[S10] 2 天 · 無依賴 · 雪鑰`
- LINE Bot：通知作業 / 完成 lesson / 機器人領寵物禮包
- Discord webhook：每日 highlight

### I3. 寵物進化（#23）
`[S10] 2 天 · 新欄 pets.evolution_stage · 雪鑰`
- 喂 z 幣 → 升 stage（baby → adult → legendary）
- 不同 stage 換 emoji + 動畫

### I4. AI 內容自動審核（#25）
`[S10] 2 天 · ai_moderation_flags 已建 · 雪鑰`
- forum 新文 / blog 新文發布前用 Claude haiku quick check
- 命中關鍵字 / classifier 寫 flag

**S10 Total: ~9 天**

---

## §J · Sprint S11 — 進階 ops

### J1. 直播 / 即時答疑（#20）
`[S11] 3 天 · 新表 live_sessions · 雪鑰`
- teacher 排定時段、學員報名
- 整合 Google Meet / Zoom link（不自建 video）

### J2. 企業方案 dashboard（#)
`[S11] 4 天 · 新表 organizations + members · 雪鑰`
- 企業買 N 帳號、admin 看部門 / 個人進度
- 學員自動歸屬到企業

### J3. 聯盟分潤計畫（升級 P4-08）
`[S11] 2 天 · referrals 已建、加 commission 表 · 雪鑰`
- 推薦人拿 30% 第一個月訂閱費
- 自動發 z 幣或 cash payout
- /me/referrals 加業績儀表板

**S11 Total: ~9 天**

---

## §K · Sprint S12 — Polish 與後續

### K1. 小體驗 polish 一批
`[S12] 4 天 · 無依賴 · 雪鑰`
- 暗黑 / 明亮模式切換
- 章節頁加閱讀時間估
- lesson 結尾「下一個 lesson」浮動按鈕
- AI tutor 加「儲存我的 prompt」
- comment 加 emoji reaction
- 手機底部固定 nav bar
- 無 javascript 友善 fallback

### K2. A/B 測試 stat sig（#27）
`[S12] 1 天 · 已有 schema · 雪鑰`
- /admin/ab/[key] 加 p-value 自動算
- 顯示「目前差異是否 statistically significant」

### K3. 金流 / 訂單追蹤面板（#26）
`[S12] 2 天 · 需 Stripe webhook · 雪鑰`
- /admin/payments charge / refund / dispute 看板
- 對帳

### K4. 進度匯出 PDF 證書（#3）
`[S12] 2 天 · 無依賴 · 雪鑰`
- @react-pdf/renderer 生章節完成證書
- 帶 user 名 + 章節 + 日期 + 簽名圖

### K5. 同學動態 feed（#7）
`[S12] 2 天 · 無依賴 · 雪鑰`
- /feed 朋友 / 全站動態：誰完成 lesson / 拿成就 / 發文
- 純讀 既有 events 表

**S12 Total: ~11 天**

---

## §L · 後續版本（v1+，超出 Q3）

- **3D 島嶼 v1**：完整 6 區域、70 章節點、村莊、副本入口、模型替換
- **3D 島嶼 v2**：AI 角色生態（多 NPC、寵物深化、動態事件）
- **3D 島嶼 v3**：社交與共存（足跡、組隊、共學房間）
- **企業 SaaS 進階**：API key 給企業用、自架白牌、學分認證
- **多語系**：英文 / 日文 / 簡中
- **AI 老師 marketplace**：第三方人設 / prompt 上架

---

## §M · 總計

| Sprint | 內容 | 估時 |
|---|---|---|
| S1 | 綠寶快取 / heatmap / 雙入口 / quest hook / 飄字 | ~3.5 天 |
| S2 | 推薦 lesson / AI 聊天記錄 / 雷達圖 / 週報 / 筆記匯出 | ~4.5 天 |
| S3 | 活動時間軸 / 流失預警 / KPI 報表 / CSV / SEO 預覽 | ~4.5 天 |
| S4 | Email campaigns / Segments / 排程發布 / 教師業績 | ~5 天 |
| S5 | Chapter 01 課程上架 + Debug playground | ~3 天 |
| S6 | Paywall / 單章 / AI 分層 / 工單系統 | ~8 天 |
| S7-S8 | 3D 島嶼 v0 四批 | ~8 天 |
| S9 | AI 個人化 / cohort / 學習小組 | ~8 天 |
| S10 | 作品集 / Discord LINE / 寵物進化 / AI 審核 | ~9 天 |
| S11 | 直播 / 企業方案 / 聯盟分潤 | ~9 天 |
| S12 | Polish / A/B p-value / 金流 / PDF 證書 / feed | ~11 天 |
| **合計** | | **~73.5 工作天 ≈ 15 週** |

---

## §N · 動工順序建議（雪鑰 view）

| 優先 | Sprint | 為什麼 |
|---|---|---|
| 1 | S1 | 綠寶快取省錢剛需、heatmap 立刻有感、雙入口為 3D 島嶼鋪路 |
| 2 | S5 | Chapter 01 課程已寫好、灌進 DB 就上線 |
| 3 | S2 | 使用者後台高 ROI、retention 直接拉 |
| 4 | S6 | 商業化、能開始收錢就值得 |
| 5 | S3 | 管理員工具、客服效率剛需 |
| 6 | S4 | 補完已建 schema 的 UI、不浪費 |
| 7 | S7-S8 | 3D 島嶼 v0、長期戰略亮點 |
| 8 | S9 | AI 個人化規劃、差異化賣點 |
| 9 | S10-S11 | 進階社交 / 企業 |
| 10 | S12 | Polish 收尾 |

---

## §O · 動工流程

1. 開動前在本檔對應項目從未做 → 「進行中」
2. 完成 commit hash 寫進對應行
3. 跨 sprint 的依賴在 §M 表標 ⛓️
4. SQL migration 套用前先給林董看（依 memory rule）
5. 每 sprint 結束更新 BACKLOG.md 對應條目狀態

---

## §P · 變更紀錄

| 日期 | 內容 |
|---|---|
| 2026-05-23 | 初版：整合 50+ 林董清單 + 3 份待閱 spec + 既有 backlog、排 12 sprint |

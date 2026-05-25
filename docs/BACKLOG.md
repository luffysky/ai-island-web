# AI 島 — 完整 Backlog

**版本**：v4.0 · **日期**：2026-05-26 · **Owner**：雪鑰

當前狀態：這 session 已 push **26 commits**、4 個新章節 (Ch72-75)、13 個新 admin 頁、5 個 AI 圖 provider、後台 7 頁批升級。

剩餘工作 **60-80hr**、列下方按 sprint 排序。

---

## 🗓️ 我建議的執行順序 (Sprint 1 → 8)

| Sprint | 主題 | 估時 | 累計 | 為何排這順序 |
|---|---|---|---|---|
| **S1** | 緊急 bug 修 + AI 圖實測 | 4h | 4h | 林董正在卡、修一條才動下一條 |
| **S2** | alert/confirm → Toast | 6h | 10h | 全站質感跳 1 級、之後所有頁都受益 |
| **S3** | 後台剩 50+ 頁批美化 | 12h | 22h | PageHero 元件已建、批改快、Nami醬上班 |
| **S4** | `<img>` → `<Image>` | 4h | 26h | SEO / LCP / Google 排名 |
| **S5** | Loading skeleton | 4h | 30h | 冷啟動感、配合 S2 一起感受 |
| **S6** | Optimistic update | 10h | 40h | 全站點擊感從 500ms → 0ms |
| **S7** | 行銷功能補完 + chapter OG 套 AI 圖 | 12h | 52h | 行銷區塊閉環、SEO 加分 |
| **S8** | UX 細節 + Phase C 收尾 | 15h | 67h | 移動 / 微互動 / 無限滾動、Lottie 林董挑後套 |

需林董本人跑的 (我 blocked)：
- Boss 戰 / 寵物 / 簽到 實機測 (1h)
- RWD audit 跑 Lighthouse (1h)
- LINE admin AI 實測確認
- AI 圖 5 個 provider 實測
- Lottie 動畫 URL 挑

---

## S1 · 緊急 bug 修 (~4h)

> 林董現在直接撞到、必須先修

### S1-1 · AI 圖 4 provider 真實錯誤 root cause + 修 ✅ **已修 (本次 commit)**
- HF: `api-inference.huggingface.co` 已 deprecated → 改 `router.huggingface.co`
- Together: endpoint `.xyz` → `.ai` (新 domain)
- Replicate: 加 polling fallback (cold start)
- 錯誤一律 pass-through 真實 status + msg + hint、不再 wrap 502

### S1-2 · `/auth/line/callback` timeout (壞掉.md 報) — 30min
- 看 route 為何 timeout
- 可能 OAuth code exchange 超 10s、或 Supabase signInWithIdToken 卡

### S1-3 · `/s/[code]` timeout — 20min
- 短連結 redirect 不該超 100ms
- 看 DB query 跟 redirect 邏輯

### S1-4 · `/api/og` 502 ✅ **已修** (commit 4ccb499)

### S1-5 · chapter JSON 13/15/43/44 殘留「60 章」hardcode 修 — 20min
- 跑腳本批改、跳過練習編號

### S1-6 · Boss 戰 / 寵物 / 簽到 實機測 — **林董本人 1h**
- 我 grep code 沒看到明顯 bug、需林董跑 happy path 列實際問題

---

## S2 · alert/confirm → Toast (~6h)

> UX-AUDIT 標 P1、39 處、做完全站質感跳一級

### S2-1 · Toast 元件確認 — 30min
- `src/components/ui/Toast.tsx` 已存在、確認 API + style 完整

### S2-2 · ConfirmDialog 元件 — 1h
- radix-ui dialog、有「撤銷 5 秒」選項
- 破壞性操作改 toast + undo (Gmail / Linear 風格)

### S2-3 · 39 處 alert/confirm 全站搜替 — 4h
- forum 8 處 (ThreadReplies / Actions / etc)
- admin 18 處 (UserRow x6 / moderation x4 / SideNav x3 / SettingsForm x3 / etc)
- 其他 13 處

### S2-4 · type check + commit + push — 30min

---

## S3 · 後台剩 50+ 頁批美化 (~12h)

> PageHero / AdminStatCard 元件已建 (本次 session)、剩批改

### S3-1 · 中度頁 8 個 — 2h
- db-check / kpi / cohort / churn / segments / impersonate / breach / gdpr
- 各 10-15 min、套 PageHero

### S3-2 · 次要頁 10 個 — 2h
- ga4 / analytics / web-vitals / ab / settings / env / audit / rate-limits / ops / app-settings

### S3-3 · LINE 區 5 頁 — 1h
- line / line/users / line/canned / line/rich-menu / line/broadcast

### S3-4 · Email 區 3 頁 — 30min
- email/subscribers / email/campaigns / email/test

### S3-5 · 內容區 8 頁 — 2h
- achievements / gamification / changelog / scheduled / chapters/[id]/edit / quiz-builder / chapters/[id]/seo / broadcasts

### S3-6 · AI 區 4 頁 — 30min
- ai/conversations / ai/usage / ai/moderation / ai/moderation-keywords

### S3-7 · Detail 頁 6 個 — 1h
- users/[id] / users/batch / tickets/[id] / breach/[id] / segments/[id] / impersonate/[id]

### S3-8 · 行銷 ads CRUD — 2h
- 補 ads UI CRUD (AI copy 生成 + 編輯 + 列表)

### S3-9 · TopNav / SideNav 一致性檢查 — 1h
- 確認所有後台連結都通、沒孤兒

---

## S4 · `<img>` → `<Image>` (~4h)

> UX-AUDIT 標 P2、29 處、SEO + LCP / CLS 改善

### S4-1 · TopNav / 部落格 / 章節 LessonCard / forum 等熱路徑 — 2h
- 跑 grep 列 29 處
- 每處量 width / height、加 placeholder="blur"

### S4-2 · admin 後台圖片 — 1h
- 用戶頭像 / 上傳預覽

### S4-3 · type check + commit — 1h

---

## S5 · Loading skeleton (~4h)

> 全站 0 個 loading.tsx、冷啟動白屏

### S5-1 · 全站列出該加的位置 — 30min
- chapters/[id] / blogs/[userSlug] / forum/thread/[id] / me / admin/*

### S5-2 · 寫 Shared SkeletonCard 元件 — 1h

### S5-3 · 各重點頁加 loading.tsx — 2h

### S5-4 · commit — 30min

---

## S6 · Optimistic update (~10h)

> UX-AUDIT 標 P3、21 處阻塞 setLoading

### S6-1 · 列 21 處 + 設計 optimistic pattern — 2h
- BookmarkButton / NotePanel / ThreadReplies / 各表單

### S6-2 · 改用 useOptimistic / useTransition — 6h
- 點下去先動 UI、await server、失敗 revert

### S6-3 · 錯誤 revert + toast — 1h

### S6-4 · type check + commit — 1h

---

## S7 · 行銷功能補完 + AI 圖套 chapter OG (~12h)

### S7-1 · chapter / blog OG 套 AI 圖 — 1h
- `/api/og/chapter/[id]` 改用 `/api/og/ai?provider=<林董挑>&prompt=...`
- 林董到 /admin/og-preview 試完選 provider 後我來套

### S7-2 · Ads (廣告 copy AI 生成 + CRUD) — 3h
- DB schema 已建、補 UI 跟 /api/admin/marketing/ads/generate route

### S7-3 · Affiliates 推薦碼 CRUD — 2h
- 列表已 OK、加新增 / 編輯 / 失效 / 重發

### S7-4 · Competitor 競品 AI 抓取 + CRUD — 3h
- AI 抓網頁 + 結構化 + 寫 DB

### S7-5 · Schedule cron job 自動發佈 — 2h
- vercel.json 加 cron / 或 Zeabur scheduled job
- 每分鐘 scan scheduled_at <= now 的 drafts、觸發 publish

### S7-6 · 短連結 click 統計 + 防 bot — 1h
- 加 unique IP / UA 統計、bot 過濾

---

## S8 · UX 細節 + Phase C 收尾 (~15h)

### S8-1 · UX-S5 行動裝置 (~3h)
- Pet.tsx + 對話泡泡 + safe-area
- iOS Safari 100vh bug 修

### S8-2 · UX-S6 微互動 + 無限滾動 (~5h)
- button hover scale / focus ring 動畫
- chapters list / forum / blog 用 react-intersection-observer 自動載

### S8-3 · 多管理員權限細分 (~2h)
- editor 跟 admin 區分權限 matrix
- teacher 跟 admin 區分

### S8-4 · 後台「我的設定」(~2h)
- /admin/me — 個人 admin profile / 偏好

### S8-5 · Lottie 動畫套到頁面 (~1h)
- 林董挑好 URL 後、我把 admin layout + 前台 hero 套上

### S8-6 · HowTo schema 套到 lesson — 等 lesson 獨立頁 (~2h)
- 先建 /chapters/[id]/lessons/[lid] route
- HowTo schema 套到每個 lesson page

---

## P2 · AI / LINE / 圖表 (~6h、可穿插各 sprint)

- 圖表時間段切換 (7d/30d/90d) — Dashboard 5 圖表都靜態 30 天 (~3h)
- LINE webhook timeout 22s→18s (~30min)
- AI 用途↔模型 10 slot 細調 (~30min)
- LINE admin AI 實測 — 林董本人跑

## P3 · 內部 tech debt

- TypeScript strict 完整跑 — 散落 `as any` 約 30 處 (~3h)
- 新加 3 頁 RWD audit — 林董手機跑 Lighthouse 給清單後再修
- robots.txt / sitemap audit (~30min)
- chapter / blog Author / Reviewer schema propagate (~30min)

---

## 🧑 林董要做的 (我這邊 blocked)

| 任務 | 工時 | 完成後 |
|---|---|---|
| Boss / 寵物 / 簽到 happy path 跑 | 1h | 列 bug 給我修 |
| RWD 三斷點手機跑 Lighthouse | 1h | 給我清單批修 |
| LINE admin AI 實測 | 5min | 報是否回應、若失敗看 /admin/errors |
| AI 圖 4 provider 實測 (Zeabur build 後) | 10min | 挑 1 個當預設、我套到 chapter OG |
| Lottie 8 個 slot 挑動畫 URL | 30min | 自動套全站 |
| AI 用途↔模型 10 slot 分配 | 10min | optional、走預設可 |
| Together / Cloudflare / HuggingFace token 確認可用 | 5min | 已都接好、本次 commit 後 build 完試 |

---

## 📊 統計

- **總剩 ~67-80hr**
- **Sprint 8 個、每個 4-15hr**
- **若林董每天 1hr 來、約 9 週做完**
- **若林董全力推、約 2-3 週做完**

---

## ✅ 完成定義 (DoD)

每個 sprint 結束必須：
1. `npx tsc --noEmit` 過、無新 error
2. `npm run build` 過 (production build 不爆)
3. git commit + push (1 sprint 1-3 commits)
4. 改動的 UI 林董跑 5 min smoke test
5. 改動的 API 端點 admin 用 site-audit 跑一次

---

## 🏆 本 session 已完成 (回顧)

26 commits、最後 commit: 30fb4a6 → 本次修 og/ai

**內容升級**
- ✅ Ch72 React 進階 / Ch73 Vue 進階 / Ch74 Vite / Ch75 HTTP 協定完整 (4 章 / sortIndex 衍生編號)
- ✅ Ch08/Ch09/Ch16 標題同步 (避免重複)

**後台新頁** (13 頁)
- ✅ 行銷主控台 + AI 文案 + UTM + 排程 + 發佈 + 廣告 + 品牌 + Affiliates + 競品 (9 頁)
- ✅ Lottie 設定 / Nami IDE (VSCode 風) / AI 用途↔模型 / AI OG 圖預覽 (4 頁)

**後台批升級** (7 個熱門頁)
- ✅ orders / errors / tickets / health / users / subscriptions / crm

**新元件 / helper**
- ✅ PageHero + AdminStatCard (給後台批升級用)
- ✅ NavGroup client (可折疊群組)
- ✅ chapterDisplayNumber (sortIndex 衍生 Ch08a / Ch09a)
- ✅ is-owner.ts (5 種 signal 中央識別)
- ✅ Lottie picker + 樣本

**API / 架構**
- ✅ AI 圖 5 個 provider 統一 route (Pollinations / Cloudflare / Together / HF / Replicate)
- ✅ JSON-LD: faqSchema / howToSchema / learningResourceSchema / itemListSchema / withAuthorAndReviewer
- ✅ AiSummaryBlock (給 AI 引擎抓)
- ✅ RelatedChapters (Internal linking)
- ✅ Charts Gallery 8 圖表 + 8 範例 (Recharts 可改 + matplotlib preset)
- ✅ Nami IDE VSCode 風 (file tree + folder + 多 tab + 自動分流)
- ✅ Nami Playground tab 拖曳

**DB migration**
- ✅ chapters sort_index
- ✅ profile owner role + is_owner
- ✅ marketing 6 表
- ✅ Lottie settings
- ✅ AI usage models

**Bug 修**
- ✅ owner 進不了後台 (4 UI 入口)
- ✅ /api/og 502 (Satori CSS + edge)
- ✅ /api/og/ai env (edge → nodejs)
- ✅ LINE admin AI 加診斷
- ✅ Nami Playground 6 tab bug

**SEO / GEO 9 大強化**
- ✅ Course / FAQ / HowTo / LearningResource / ItemList schema
- ✅ Author/Reviewer
- ✅ AI Engine summary block
- ✅ Internal linking
- ✅ Dynamic OG

---

## 📜 變更紀錄

- **2026-05-26 v4.0** — 雪鑰大改、加 Sprint 排序 + 本 session 回顧 + 林董任務清單
- **2026-05-25 v3.0** — 之前版本

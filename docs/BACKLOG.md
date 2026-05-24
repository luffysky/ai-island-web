# AI Island v3 — Master Backlog

**版本**：v3.0
**日期**：2026-05-25
**Owner**：雪鑰
**目的**：所有未完成事項的單一入口。動工前在這找、做完在這劃掉。

---

## ✨ 進度總覽（2026-05-25 更新）

| 大塊 | 狀態 |
|---|---|
| **演算法藍圖** | 7 / 9 ✅（剩 #8 Chapter 推薦、#9 全站語意搜尋） |
| **3D 島嶼系統** | ✅ 40 互動點 / FPV / 採集 / 寶箱 / 6 動物 / 3 NPC / 寵物 / 家 / 釣魚 / 5 天氣 |
| **AI 系統** | ✅ 導師（綠寶 5 persona）/ 助教（4 mode）/ 模型路由 / 對話審核 / 學習規劃 / **LINE AI bot（tool use + 即時快照 + 異常 cron + 週月報）** / 寵物 AI 客製化 |
| **通知系統** | ✅ in-app 鈴鐺 / LINE 直推 admin / 訪客追蹤 + 地理 / **低調模式 user opt-out** |
| **後台 Phase 1-4** | ✅ 99%（剩 P4-05 KPI email / P4-12 clear cache）|
| **UI/UX** | ✅ Command Palette / Mobile Bottom Nav / Overlay Stack / EmptyState / **floating-ui Popover / useEdgeSafe 碰撞偵測 / 霧面玻璃 Flex** |

---

## 🎯 v1 收尾範圍（這一輪做完就標 v1 freeze）

| # | 項目 | 估時 | 狀態 |
|---|---|---|---|
| 1 | BACKLOG.md 同步用刪除線 | 30min | ✅ 本次完成 |
| 2 | A/B 後台加 thompson UI 切換 | 0.5 天 | ❌ |
| ~~3~~ | ~~user opt-out 我的訪問被通知 admin~~ | | ✅ commit `1098e30` `6197057` |
| ~~4~~ | ~~隱私權頁更新（GPS / IP / 收集用途）~~ | | ✅ commit `515f4bc` |
| 5 | ELO progress 顯示 /me | 0.5 天 | ❌ |
| 6 | P4-12 clear cache 按鈕 | 0.5 天 | ❌ |
| 7 | P4-05 KPI email 自動報表 | 0.5 天 | ❌ |
| 8 | 演算法 #8 Chapter 推薦 | 1 天 | ❌ |
| 9 | 演算法 #9 全站語意搜尋（embeddings + vector） | 2 天 | ❌ |
| 10 | user 端綁 LINE（個人通知推 LINE） | 1 天 | ❌ |
| 11 | PWA 升級（offline-first + push notif） | 5 天 | ❌ |
| 12 | **SEO 加強**（外國流量多、台灣少、要強化）| 1-2 天 | ❌（新追加） |

**v1 完成定義**：上述 1-12 全部做完。

---

## 📦 v2 範圍（v1 凍結後再啟動）

| # | 項目 | 估時 |
|---|---|---|
| insight-engine 社群 5 抄（追蹤 / 留言按讚 / 巢狀回覆 / 檢舉封鎖 / 部落格全文搜尋） | 2-3 天 |
| 島嶼 v1 deepen（多島 / 公會 / boss 戰 / coop 副本） | 1-2 週 |
| 多人 ghost（島上看其他玩家位置軌跡） | 3 天 |
| P4-08 admin Referral / 邀請碼管理（referrals 表已存在、缺 admin UI）| 1 週 |

---

## 0. 文件性質

這是「**未做**清單」、不是規劃文件。詳細設計都在獨立 spec：

- `docs/admin_upgrade/README.md` — Phase 1-3 規劃（QW / MED / LT）
- `docs/admin_upgrade/PHASE-4-PLUS-BACKLOG.md` — Phase 4+ 21 項
- `docs/UX-AUDIT.md` — UX 6 sprint 路線圖
- `docs/admin_upgrade/specs/*.md` — 個別 spec

---

## 1. 🔴 林董親自要做（無法代）

| # | 項目 | 估時 |
|---|---|---|
| O-1 | GA4 Zeabur env：`GA4_PROPERTY_ID` / `GA4_SA_CREDENTIALS` | 5 min |
| ~~O-2~~ | ~~瀏覽器驗證綠寶模型下拉~~ | — |
| ~~O-3~~ | ~~綠寶 placeholder「問點什麼...」~~ | — |
| O-4 | 寵物 milestone 30/60/100 burst（要達 30 lesson 後） | 等里程碑 |
| O-5 | 寵物節日頭飾驗證（聖誕 / 萬聖 / 跨年 / 情人 / 國慶當天） | 等節日 |
| ~~O-6~~ | ~~論壇刪回覆 5 秒 undo 體驗驗證~~ | — |
| O-7 | GitHub Secrets：`SITE_URL` + `CRON_SECRET`（給 GH Actions cron） | 5 min |
| O-8 | Rich Menu PNG 2500×1686 → imgur → 設 `RICH_MENU_IMAGE_URL` env | 0.5 hr |
| O-9 | Nami userId 加進 `ADMIN_LINE_USERS` JSON（她加 bot 後拿 userId） | 5 min |
| O-10 | `GOOGLE_MAPS_API_KEY`（選填、精準縣市反查更準） | 5 min |

---

## 2. ~~🟧 UX 修法路線圖（依 `docs/UX-AUDIT.md`）~~ ✅ 全做

| Sprint | 內容 | 狀態 |
|---|---|---|
| UX-S1a | Toast + ConfirmDialog 元件 + 示範改造 | ✅ |
| UX-S1b | 全站 alert/confirm → useConfirm 替換 | ✅ |
| UX-S2 | 全站 optimistic update | ✅ |
| UX-S3 | `loading.tsx` skeleton | ✅ |
| UX-S4 | `<img>` → `<Image>` | ✅ |
| UX-S5 | Pet.tsx 行動裝置 | ✅ |
| UX-S6 | callback loading + 微互動 + 無限滾動 | ✅ |
| **UX-S7（新）** | **floating-ui Popover + useEdgeSafe 碰撞偵測（4 浮窗 + 4 popover）** | ✅ commit `2394311` |

---

## 3. ~~🟦 TODO list 功能~~ ✅ 全做（commit `8a4ae7a`+ 系列）

---

## 4. ~~🟨 Admin 後台 Phase 3~~ ✅ 全做

| ID | 內容 | 狀態 |
|---|---|---|
| ~~LT-13~~ | ~~User report / 檢舉收件箱~~ | ✅ `admin/reports` |
| ~~LT-14~~ | ~~GDPR 匯出 / 刪除流程~~ | ✅ `admin/gdpr` + SQL apply |
| ~~LT-15~~ | ~~Cohort / funnel / retention 分析~~ | ✅ `admin/cohort` |
| ~~LT-16~~ | ~~遊戲化規則編輯器~~ | ✅ `admin/gamification` |
| ~~LT-17~~ | ~~效能 ops~~ | ✅ `admin/ops` + 新加 `admin/health` |
| ~~LT-18~~ | ~~批次 user 操作~~ | ✅ `admin/users/batch` |

---

## 5. 🟨 Admin 後台 Phase 4+

| ID | 內容 | 狀態 |
|---|---|---|
| ~~P4-01~~ | ~~章節後台直接編輯~~ | ✅ `admin/chapters/[id]` |
| ~~P4-02~~ | ~~章節版本記錄 + diff~~ | ✅ `chapter_versions` + UI |
| ~~P4-03~~ | ~~章節 SEO 預覽~~ | ✅ `admin/chapters/[id]/seo` |
| ~~P4-04~~ | ~~內容草稿 / 排程發布~~ | ✅ `admin/scheduled` |
| **P4-05** | **KPI 自動報表 + email** | ❌ v1 #7（LINE cron 已替代一半） |
| ~~P4-06~~ | ~~使用者活動時間軸~~ | ✅ `admin/users/[id]/timeline` |
| ~~P4-07~~ | ~~退費 / 客訴工單系統~~ | ✅ `admin/tickets` + `admin/crm` |
| **P4-08** | **Referral / 邀請碼 admin 管理** | ❌ v2（表已存在、缺 admin UI） |
| ~~P4-09~~ | ~~Segment 儲存~~ | ✅ `admin/segments` |
| ~~P4-10~~ | ~~錯誤日誌面板~~ | ✅ `admin/errors` |
| ~~P4-11~~ | ~~DB 健康 widget~~ | ✅ `admin/health` commit `78bc8e3` |
| **P4-12** | **快取狀態 / clear cache 按鈕** | ❌ v1 #6（`admin/ai/cache` 有看但缺 clear） |
| ~~P4-13~~ | ~~環境變數面板~~ | ✅ `admin/env` commit `78bc8e3` + env 申請 `7b91196` |
| ~~P4-14~~ | ~~API rate limit per user~~ | ✅ `admin/rate-limits` |
| ~~P4-15~~ | ~~批次 email 發送~~ | ✅ `admin/email/campaigns` |
| ~~P4-16~~ | ~~網站效能 dashboard~~ | ✅ `admin/web-vitals` |
| ~~P4-17~~ | ~~公開 changelog 頁面~~ | ✅ `admin/changelog` |
| ~~P4-18~~ | ~~A/B 測試平台~~ | ✅ `admin/ab` + AbExperimentsClient |
| ~~P4-19~~ | ~~助教 / 教師角色~~ | ✅ `/teacher` |
| ~~P4-20~~ | ~~學員作業批改介面~~ | ✅ `/teacher/grading` |
| ~~P4-21~~ | ~~AI 對話審核~~ | ✅ `admin/ai/moderation` |

---

## 6. 🟪 Admin Phase 2 deferred

| ID | 內容 | 狀態 |
|---|---|---|
| MED-06 | Impersonate 使用者 | 🟡 spec defer、`admin/impersonate` 已存在但可能不完整 |

---

## 7. 🆕 2026-05-25 這天新加 / 完成的（補進來）

| 項目 | commit |
|---|---|
| LINE Flex 卡片霧面玻璃風 | `d500e7c` `e741b44` `576ac67` |
| LINE bot AI 即時站台快照（30s cache、規模 / 健康 / 訪客 / 活躍會員） | `d1a967a` |
| LINE bot tool use（run_command / get_user / get_error / get_order / get_period_report） | `4977eb1` |
| LINE bot 異常 cron（6 種異常偵測、AI 寫 2-3 句報告推 LINE） | `850bcc9` |
| GitHub Actions 排程（anomaly-check 每 30min / line-daily 每日 09:00 + 22:00） | `3d024f5` |
| floating-ui Popover + useEdgeSafe 碰撞偵測（修 popover 撞視口） | `2394311` `4977eb1` |
| 4 個 fixed 浮窗套 useEdgeSafe（AITutor / Assistant / AiWrite / PetChat） | `2394311` |
| admin/users 桌面 table / 手機 card（lg breakpoint） | `2394311` `154f0f3` |
| admin/env 環境變數面板 + ENV 申請工單（含 LINE 通知 owner） | `78bc8e3` `7b91196` |
| admin/health 系統健康 widget | `78bc8e3` |
| EmptyState 擴 admin 5 處 | `78bc8e3` |
| 寵物 AI 客製化（model / 自訂 prompt / BYOK） | `5b5da60` |
| DailyCheckin 加進 /me 頂部 | `82a528e` |
| Admin chip 撞 sidebar 修正（useOverlayRegister + 預設右側） | `924c045` |
| 隱私權頁更新（GPS / IP / AI 對話 / admin 監看透明度） | `515f4bc` |
| 低調模式（user opt-out 即時通知、預設啟用） | `282d2c6` `1098e30` `6197057` |
| 全站前端 console → devLog (production no-op) | `0b72019` |
| 全站 50 個檔案 `flex-shrink-0` → `shrink-0` canonical | `2394311` |
| LINE bot 一般訊息不回（hard timeout + 強化 prompt） | `563d296` |
| 寵物 AI 口氣太正式（system prompt 重寫 + few-shot example） | `e2b7cd0` |

---

## 8. ⚠️ 已知但暫不做

| 項目 | 為什麼 |
|---|---|
| LINE DM messages 表照抄 | insight-engine 綁 LIFF session、要重寫 |
| Stories 限時動態 | 要 R2 storage + cron 過期、ROI 低 |
| TipTap 編輯器照抄 | bundle 大、可能跟現有衝突 |
| zcoin 從 insight 抄 | insight 有自己經濟系統、要剝離 |
| Three.js yukirin 角色 | 依賴 insight 專案資產 |

---

## 9. 動工流程

1. 動工前打開本檔、確認該項在 v1 收尾範圍 / v2 / Phase
2. 依該項對應 spec / audit 文件動工
3. 完成後 commit + push、本檔對應行加 ~~刪除線~~ + commit hash
4. 若途中發現新待辦、追加到對應區、保持本檔為唯一入口

---

## 10. 變更紀錄

| 日期 | 內容 |
|---|---|
| 2026-05-22 | v1 初版 |
| 2026-05-24 | v2 — Phase 1-4 大量完成、加 §10 |
| **2026-05-25** | **v3 — 重新整理、已做標 ~~刪除線~~、明確 v1 收尾 + v2 範圍 + SEO 新增** |

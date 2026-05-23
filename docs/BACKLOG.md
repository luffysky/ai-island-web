# AI Island v3 — Master Backlog

**版本**：v1.0
**日期**：2026-05-22
**Owner**：雪鑰
**目的**：所有未完成事項的單一入口。動工前在這找、做完在這劃掉。

---

## 0. 文件性質

這是「**未做**清單」、不是規劃文件。詳細設計都在獨立 spec / audit：

- `docs/admin_upgrade/README.md` — Phase 1-3 規劃（QW / MED / LT）
- `docs/admin_upgrade/PHASE-4-PLUS-BACKLOG.md` — Phase 4+ 21 項新功能
- `docs/UX-AUDIT.md` — UX 6 sprint 修法路線圖
- `docs/admin_upgrade/specs/*.md` — 個別功能 spec

本檔的角色是「**索引 + 進度看板**」、追蹤誰在做、做到哪。

---

## 1. 🔴 林董親自要做（不阻塞我）

| # | 項目 | 來源 |
|---|---|---|
| O-1 | GA4 Zeabur 補 3 個 env：`GA4_PROPERTY_ID` / `GA4_SA_CREDENTIALS` / `CRON_SECRET` | `Claude_to_Codex.md:136-141` |
| O-2 | 瀏覽器驗證綠寶模型下拉看到 7 個 | `daily_works_0522.md` |
| O-3 | 瀏覽器驗證已登入綠寶 placeholder「問點什麼...」不閃過「請先登入」 | 同上 |
| O-4 | 瀏覽器驗證寵物 milestone 30/60/100 burst（要達 30 lesson 後）| commit `1a93d3b` |
| O-5 | 寵物節日頭飾驗證（要等到對應節日當天看：聖誕 12/15-26 / 萬聖 10/25-31 / 跨年 12/29-1/3 / 情人 2/13-14 / 國慶 10/9-10） | commit `1a93d3b` |
| O-6 | 瀏覽器測新 toast：去論壇刪一則自己的回覆、看 5 秒 undo 設計感覺對不對 | commit `9a5f95a` |

---

## 2. 🟧 UX 修法路線圖（依 `docs/UX-AUDIT.md`）

| Sprint | 內容 | 估時 | 狀態 |
|---|---|---|---|
| **UX-S1a** | Toast + ConfirmDialog 元件 + ThreadReplies 改造（示範） | 6 hr | ✅ commit `9a5f95a` |
| **UX-S1b** | 剩 38 處 alert/confirm 跨 19 檔逐檔替換（清單見下） | ~3 hr | ✅ |
| **UX-S2** | 全站 optimistic update（BookmarkButton / NotePanel / blog comment / etc）| ~10 hr | ❌ |
| **UX-S3** | 加 `loading.tsx` skeleton（首頁 / chapters / blogs / me / forum 等 8 個熱路徑）| ~4 hr | ❌ |
| **UX-S4** | `<img>` → `<Image>`（29 處 20 檔）| ~4 hr | ❌ |
| **UX-S5** | Pet.tsx 行動裝置（@media + safe-area-inset） | ~2 hr | ❌ |
| **UX-S6** | callback loading + 微互動（button active scale）+ 無限滾動 | ~7 hr | ❌ |

### UX-S1b alert/confirm 待清單（19 檔）

| 檔案 | 次數 |
|---|---|
| `src/app/admin/users/UserRow.tsx` | 6 |
| `src/app/admin/moderation/forum/Actions.tsx` | 4 |
| `src/components/SideNav.tsx` | 3 |
| `src/app/settings/SettingsForm.tsx` | 3 |
| `src/app/admin/broadcasts/BroadcastForm.tsx` | 2 |
| `src/app/admin/moderation/comments/ModerationActions.tsx` | 2 |
| `src/app/me/blog/page.tsx` | 2 |
| `src/components/blog/CommentSection.tsx` | 2 |
| `src/components/blog/ArticleEditorForm.tsx` | 2 |
| `src/components/chapter/ChapterView.tsx` | 1 |
| `src/components/blog/LikeButton.tsx` | 1 |
| `src/components/gamification/DailyCheckin.tsx` | 1 |
| `src/components/forum/ThreadReactionBar.tsx` | 1 |
| `src/app/settings/ai-keys/AIKeysClient.tsx` | 1 |
| `src/app/admin/zcoin/airdrop/AirdropForm.tsx` | 1 |
| `src/app/admin/chapters/[id]/quiz-builder/QuizBuilder.tsx` | 1 |
| `src/app/admin/ai/models/ModelsManagerClient.tsx` | 1 |

---

## 3. 🟦 TODO list 功能（林董 2026-05-22 交辦）

| 階段 | 內容 | 狀態 |
|---|---|---|
| Backend | migration / types / recur parser / 3 API route | ✅ commit `8a4ae7a` |
| UI | TopNav dropdown 入口（counter badge / Cmd+Shift+T 快捷） | ❌ |
| UI | TodoItem + 縮排子任務 + inline title edit | ❌ |
| UI | dnd-kit 拖曳排序（含跨父） | ❌ |
| UI | TodoEditModal（截止日 / 優先 / recur picker） | ❌ |
| 寵物 | `pet:todo-completed` event + chatter `todo-completed` key + ~10 條台詞 | ❌ |

**新依賴待裝**：`@dnd-kit/core` + `@dnd-kit/sortable`

---

## 4. 🟨 Admin 後台 Phase 3（依 `docs/admin_upgrade/README.md §4`）

| ID | 內容 | 估時 | 狀態 |
|---|---|---|---|
| LT-13 | User report / 檢舉收件箱 | 3+ 天 | ❌ |
| LT-14 | **GDPR 匯出 / 刪除流程**（合規剛需、不可省）| 3+ 天 | ❌ |
| LT-15 | Cohort / funnel / retention 分析 | 3+ 天 | ❌ |
| LT-16 | 遊戲化規則編輯器（風險最高、最後做） | 3+ 天 | ❌ |
| LT-17 | 效能 ops（Vercel/Sentry/PostHog 之一） | 3+ 天 | ❌ |
| LT-18 | 批次 user 操作 | 3+ 天 | ❌ |

---

## 5. 🟨 Admin 後台 Phase 4+（依 `docs/admin_upgrade/PHASE-4-PLUS-BACKLOG.md`）

林董 2026-05-22 加碼、5 區 21 項、合計 ~17-18 週。

| ID | 內容 | 估時 | 狀態 |
|---|---|---|---|
| P4-01 | 章節 / lesson 後台直接編輯（取代 JSON file-based）| ~2 週 | ❌ |
| P4-02 | 章節版本記錄 + diff | ~1 週 | ❌ |
| P4-03 | 教材 SEO 預覽（OG 圖 / meta） | ~3 天 | ❌ |
| P4-04 | 內容草稿 / 排程發布 | ~3 天 | ❌ |
| P4-05 | 每日 / 每週 KPI 自動報表 + email | ~3 天 | ❌ |
| P4-06 | 使用者活動時間軸 | ~2 天 | ❌ |
| P4-07 | 退費 / 客訴工單系統 | ~1 週 | ❌ |
| P4-08 | Referral / 邀請碼 | ~1 週 | ❌ |
| P4-09 | Segment 儲存 + 重複用 | ~3 天 | ❌ |
| P4-10 | **錯誤日誌面板（剛需、雪鑰建議插隊）** | ~3 天 | ❌ |
| P4-11 | DB 健康 widget | ~1-2 天 | ❌ |
| P4-12 | 快取狀態 / clear cache 按鈕 | ~1 天 | ❌ |
| P4-13 | 環境變數面板（read-only mask） | ~1 天 | ❌ |
| P4-14 | **API rate limit per user（剛需、雪鑰建議插隊）** | ~3 天 | ❌ |
| P4-15 | 批次 email 發送 + 開信率追蹤 | ~1 週 | ❌ |
| P4-16 | 網站效能 dashboard（Web Vitals） | ~3 天 | ❌ |
| P4-17 | 公開 changelog 頁面 | ~2 天 | ❌ |
| P4-18 | A/B 測試平台（風險最高、放最後） | ~2 週 | ❌ |
| P4-19 | 助教 / 教師角色 | ~1 週 | ❌ |
| P4-20 | 學員作業批改介面 | ~1 週 | ❌ |
| P4-21 | AI 對話審核（content moderation 剛需） | ~3 天 | ❌ |

---

## 6. 🟪 Admin Phase 2 未做的 1 項（故意 defer）

| ID | 內容 | 狀態 |
|---|---|---|
| MED-06 | Impersonate 使用者 | 🟡 spec 名 `MED-06-impersonate-deferred.md`、待林董解 defer |

---

## 7. 📊 整體合計

| 大塊 | 項目數 | 純單線估時 |
|---|---|---|
| O-1 ~ O-6（林董運維 / 驗證） | 6 | — |
| UX-S1b ~ UX-S6 | 6 sprint | ~30 hr |
| TODO list UI | 5 子任務 | ~6 hr |
| Phase 3 LT-13~18 | 6 | ~3 週 |
| Phase 4+ P4-01~21 | 21 | ~17-18 週 |
| MED-06（deferred） | 1 | ~1-2 天 |
| **合計工作量** | **~40 個** | **~21-22 週純單線** |

---

## 8. 雪鑰建議推進順序

| 優先 | 項目 | 為什麼 |
|---|---|---|
| 1 | UX-S1b（38 處 alert/confirm 清完） | 元件已建、清替繁瑣但機械、累積完整質感 |
| 2 | TODO list UI 收尾 | 林董新交辦、backend 已上線、缺一個 UI 就可用 |
| 3 | UX-S3 loading.tsx skeleton | 影響首屏感受、做完一次性大改善 |
| 4 | UX-S4 圖片全換 next/image | 影響 Web Vitals + SEO |
| 5 | UX-S2 全站 optimistic | 互動感升級、需逐檔改 |
| 6 | P4-10 錯誤日誌 + P4-14 rate limit | 剛需止血、合包 1 週 |
| 7 | LT-14 GDPR | 合規剛需、不可省 |
| 8 | P4-01 + P4-02 章節後台編輯 + 版本 | 內容運維瓶頸 |
| 9 | UX-S5 Pet 行動裝置 + UX-S6 細節 | 用戶感受 polish |
| 10+ | 其餘 Phase 3 / Phase 4+ 依本檔 §4 §5 順序 | 大件事擺後 |

---

## 9. 動工流程

1. 動工前打開本檔、確認該項在 §1-6 還是 ❌
2. 依該項對應 spec / audit 文件動工
3. 完成後 commit + push、本檔對應行從 ❌ 改成 ✅ commit hash
4. 若途中發現新待辦、追加到對應區、保持本檔為唯一入口

---

## 10. 變更紀錄

| 日期 | 內容 |
|---|---|
| 2026-05-22 | 初版、整合 Phase 1-4+ / UX-AUDIT / TODO list / 林董運維清單 |

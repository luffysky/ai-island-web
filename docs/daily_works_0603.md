# Daily Works — 2026-06-03

雪鑰處理、董事長林董（Luffy Lin）。約 14 小時、57 個 commit。

## 工作主軸

一整天分三大塊：**(1) 安全大關收尾**（把散落 114 條後台路由的授權收斂到單一 helper、補齊 XSS/驗證/RLS）→ **(2) 一票學員看得到的新功能**（程式碼遊樂場、Telegram 設定頁、課程圖片燈箱、筆記背景+液態玻璃、筆記漂浮預覽、LINE 直接看筆記）→ **(3) 內容**（29 張操作教學圖全插好、ch01「用人話講」整章用國中生生活化重寫）。中途穿插 RWD 體檢、課數動態化、DB migration 套用。

---

## Commit 列表（時間倒序、本日 57 個）

完整見 `git log 3b4cc3f..HEAD`。分類重點：

- **安全（B）**：`943af9b` 起一路到 `8495a33`——admin-guard 12 批、headers/rate-limit、B1 XSS、B2 驗證、RLS、TG secret、ADMIN_SLUG
- **效能（C）**：`6ec82eb` OPT-1、`5a53df2` analyzer、`cd47d3a` OPT-9
- **功能**：`7aafb26` playground、`23b0e63` Telegram UI、`2a92a9c` 圖片燈箱、`3f81ff7` 筆記背景、`5b48eec` 漂浮預覽、`721fd24` LINE 看筆記
- **內容**：`8c23e45`/`348f592`/`6901ed5` 圖片、`b7e46b4` ch01 用人話講

---

## 1️⃣ 🔒 安全大關（B）— 基本 100% 收完

- **admin-guard：0 → 111/114**（13 批、每批 tsc 0 + 獨立 commit、無壞授權進 main）。把散落各路由的 inline `role!=="admin"` / 本地 `assertAdmin`/`guard`/`gateAdmin` 全收斂到中央 `requireAdmin`；放寬給 editor/teacher/assistant 的 6 條改新增的 `requireStaff(roles[])`、保留原角色集合。剩 3 條是 multi-path 認證（cron 或 admin），刻意保留。
- **B1 XSS 雙層**：新增 `sanitize-html` + `rich-html-server.ts`，blog/forum 渲染與**寫入**都白名單清洗。
- **B2 驗證**：UGC 寫入面（文章/系列/設定/留言/論壇發文+編輯）全 `parseBody` zod 限長 + like 路由 uuid 防呆。
- **其他**：全站 security headers/HSTS、`/api/v1/chat` rate-limit、**TG webhook 改 fail-closed**、achievements 公開 SELECT policy（已套 DB）、9 條寫入 policy 補 explicit `WITH CHECK`（已套 DB）、2 份 migration 重新套用、ADMIN_SLUG 收斂單一來源。

## 2️⃣ 🎨 學員看得到的功能

- **`/me/playground` 程式碼遊樂場**：多語言 Monaco + 5 範例 + 問綠寶。
- **Telegram Bot 設定頁** `/admin/telegram`：env 檢查 + 一鍵設 webhook。
- **課程圖片燈箱** `LessonImage`：markdown 圖點擊放大原畫質（之後任何章節插圖自動有）。
- **筆記頁專屬背景**：純色/漸層/圖樣（點點/方格/橫隔線/斜紋）+ 自訂上傳圖 + **液態玻璃層**（可調霧面、預設關），存 localStorage。
- **筆記漂浮預覽**：所有筆記變漂浮便利貼、點開看/編輯。
- **LINE 直接看筆記**：打「我的筆記」回 Flex 清單卡（內容摘要 + 章節 + 看完整鈕）。

## 3️⃣ 📚 內容（E）

- **圖文圖全插好**：`public/lesson-img/` 共 **29 張 100% 引用**（ch00×5、ch26×9、ch01/08/10/17/22/25/31/39/48/64 共 15 張），10+ 章重匯入 DB。**LESSON_IMAGE_SPEC A 區（操作教學圖）全到位。**
- **ch01「用人話講」整章 25/25**：當第一次碰電腦的國中生、**讀每課實際內容**寫、大量生活比喻（招牌櫥窗/樂高積木+玻璃罩/無障礙坡道/圖片減肥/期末大作…）。**這是新標準。**
- **課數改動態**：首頁本就動態、OnboardingTour 硬編「75 章 1158」改吃 chapters-lite（→ 76 章 1163）。

## 4️⃣ 🐞 修 / RWD

- 章節大綱側欄：桌機改**常駐側欄**（收合成細欄、展開有動畫）、手機維持抽屜。
- RWD 體檢：整體良好；修了 cookies 表格橫滑。
- ch26 移除 26.2 殘留的截圖作者備註（Nami 那句）。
- KPI cron 查證完整 wired。

---

## ⏭️ 待續（下次做）

1. **🖼️ 圖片 B 區（概念示意圖、diagram 型）還沒做** ← 林董提醒：`LESSON_IMAGE_SPEC.md` B 區那票概念圖（ch07 變數賦值/迴圈、ch02 box model/flexbox、ch04 event loop、ch08 UI=f(state)、ch17 JOIN、ch46 RAG…）等生圖後依檔名插入。A 區操作圖已全做完。
2. **「用人話講」剩 69 章**（ch01 ✅ 完成）。下次從 **ch02（CSS）** 起、照 ch01 同標準：**讀每課內容 → 國中生生活化比喻**。各章覆蓋現況見下。
3. **C OPT-8**：RLS `is_admin()` SECURITY DEFINER function + 補 index（要寫 production DB）。
4. **部署提醒**：(a) Zeabur 設 `TELEGRAM_WEBHOOK_SECRET` 並重跑 `/api/admin/telegram/setup`、否則 admin TG bot 會停；(b) 線上要 **redeploy** 才會服務新圖片檔 + LINE 看筆記新指令（DB 內容已生效）。

### 用人話講 各章覆蓋（要補的 69 章）
ch02 0/25 · ch03 12/25 · ch04 0/25 · ch05 16/25 · ch06 0/25 · ch07 16/28 · ch08 14/25 · ch09 0/25 · ch10 0/25 · ch11–15 0 · ch16 5/25 · ch17–25 0 · ch26 21/35 · ch31 12/25 · ch32 13/25 · ch33–75 多為 0（詳細隨時可重掃）

> 工程進度都已 commit/push 到 main + 內容匯入 DB。先休息、明天接著補圖 B 區 + ch02 起的用人話講。

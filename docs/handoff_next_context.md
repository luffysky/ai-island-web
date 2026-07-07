# 交接：下一個 context 待辦（更新於 2026-07-07）

> 前一輪超長 session 做了 69 commit（見 `docs/daily_works_0707.md` 全記錄）。build 綠、117 測試過、DB 物件都在。以下是**還沒完成**的，依優先序。

---

## 🔴 A. i18n 全站抽字串（最大宗、多輪工程）
**現況**：地基好了 — next-intl cookie 切語言（不動路由）、**四語 中/英/日/韓**、右上切換鈕、chrome（導覽/頁尾/使用者選單）已抽；內容翻譯層（`content_translations`，翻一次快取、來源變才重翻）已上線、部落格文章頁已接。

**要做**：**除了後台 admin 以外，所有頁面（~800 檔）的硬字串逐頁抽進 `messages/{zh,en,ja,ko}.json`**。
- 做法：一頁 `const t = useTranslations()` → 把中文字串換 `t('ns.key')` → 在 4 個 messages 檔補 key（zh 原文、en/ja/ko 翻譯）。
- **建議用平行 subagent 一區一區掃**（首頁 / 章節 / 遊戲 / 論壇 / 筆記 / 創作島 / 商店 / 設定…），每個 subagent 認一個 top-level namespace，避免 4 個 JSON 互撞（或各寫獨立 namespace 檔再合併）。
- 內容（章節/lesson/部落格/論壇）用 `/api/admin/translate-content`（scope+locale）**批次預翻**各語言，靠 hash 只翻一次。
- **後台 admin 頁不做 i18n**（依林董指示）。

## 🟠 B. 需瀏覽器 QA（CLI 測不到）
- `/quest` 7 種遊戲能玩 + 通關發 XP/Z 幣（Turtle 判定最可能要調 snap）。
- AI 導師 11 位夥伴人格 + 記憶（尤其多聞純陪聊、專門角色轉介）。
- 語言切換（英/日/韓）視覺 + Noto Sans TC 中文字體有沒有上（要確認**部署**上線 + 硬重整）。
- 金流測試機各過一筆（見 `docs/payments_setup.md`）。

## 🟡 C. 金流上線（owner 操作 + 少量 code）
- 填 live env（綠界個人賣家/藍新測試店→正式、Stripe 台灣開不了→用 MoR）。見 `/admin/payments` 面板 + `docs/payments_setup.md`。
- **台灣訂閱**：接綠界「信用卡定期定額」（目前 Pro 只綁 Stripe、台灣用不到）。
- **海外訂閱**：MoR（Lemon Squeezy/Paddle）目前走一次性，要接 subscription 事件才自動續訂。
- **果實提現 B/C**：Stripe Connect（海外）/ 綠界藍新分潤（台灣）— 需先向金流商申請服務，再沿用 `ci_payouts.method` 接。

## 🟢 D. 這輪已完成（別重做；保留劃線、不刪）
- [x] ~~設計系統打底 + Noto Sans TC 中文字體 + 光氛/表面 primitives~~
- [x] ~~對話框全站美化（native alert/confirm/prompt → in-app modal）~~
- [x] ~~導覽重構（左上章節 / 右上探索抽屜、加遊戲/筆記）~~
- [x] ~~7 種遊戲（迷宮/畫圖/Turtle/數字/抓蟲/排序/CSS）+ AI 關卡生成器~~
- [x] ~~AI 夥伴 3→11 位 + 人格被導師框架蓋掉的 bug 修好（多聞純陪聊）~~
- [x] ~~種子：討論區36 / 部落格86(哥布林75篇生成器) / 社群 / 筆記市集免費包~~
- [x] ~~種子工作室（討論區·部落格·筆記 一頁分頁、AI+手動）~~
- [x] ~~部落格：系列收合 + owner/admin/客服 官方身份發文 + 官方部落格~~
- [x] ~~創作者公開展示頁（作品庫發佈）~~
- [x] ~~果實提現 A 版（申請 + 後台人工撥款對帳）~~
- [x] ~~筆記 Notion 化（L1 樹 / L2 區塊引用）+ 知識市集金流~~
- [x] ~~金流：綠界/藍新/Stripe + MoR(Lemon Squeezy/Paddle) + 狀態面板 + 雙 webhook secret~~
- [x] ~~i18n 四語地基(中/英/日/韓) + 內容 AI 翻譯層(翻一次快取)~~
- [x] ~~簽到後今日任務即時更新 / 2 支新 cron / PWA SW v16~~

## 開場白建議（貼給下一個 context）
> 讀 `docs/handoff_next_context.md` + `docs/daily_works_0707.md`。主要做 **A：i18n 全站抽字串（除後台外所有頁面、中英日韓四語）**，用平行 subagent 一區一區掃、內容用 translate-content 批次預翻。每步 tsc/build 綠、動 DB 就 db:apply、改 UI 注意 RWD 不破版。

# Daily Works — 2026-06-04

雪鑰處理、董事長林董（Luffy Lin）。
主題：**課程內容三合一收尾 → 全站清乾淨 → ch48/49 大擴充 → UX 順滑 + 圖片接線**。

---

## 🟢 上半場（早上）

### 1. 程式碼區塊全站美化
- CodeBlock 改版（macOS 燈號 + 終端/檔案外觀 + 語言標籤）
- `rehype-smart-lang`：` ```text ` 自動偵測上色、ASCII 圖跳過
- `cli-glossary`：終端區塊自動附「📖 指令說明」小抄
- ⚠️ 程式碼變更，需 Zeabur redeploy 才上線

### 2. 用人話講全站 100%（1163/1163 課）
- 全章每課都有「☕ 用人話講」
- ch33「Rust 完整」原內容被 SEO 行銷汙染 → **整章重寫成真 Rust 課**
- 摘要錯位（oneLine/analogy 殘留舊課表）大量修正
- 佔位 playground ~100 個換成各章主題範例
- AI 聊天**拖拉上傳圖片**

---

## 🔵 下半場（午後～晚上，本日大宗）

### 3. 截斷尾巴逐課重寫（34 課）
- ch03/07/08/16/32/43/44/45/48/49/50/59 共 34 課，截斷的程式碼/範例補完整
- 殘留罐頭框改成乾淨的「進階技巧/踩雷警告」markdown
- **全專案未閉合 code fence 歸零**

### 4. 移除罐頭框（116 個 / 17 章）
- 工具推薦（VS Code/Live Server）、**接案 promo**（違反不掛保證原則）、學習加速器、罐頭趨勢（Theo/Fireship）
- 用固定模板文字當錨點刪除，真內容零誤刪（保留客製化的 ### 2026 趨勢、客製學習加速器）

### 5. 罐頭 tip → 每課真建議（235 課，4 批全清）
- 每課的「這個技術 2026 還在主流…」換成跟該課主題相關的實用建議
- 踩雷型標 warn（如 box-sizing 全域設、=== 不用 ==、Monolith first、rate limit Day 1、idempotency、Manage Up…）
- **剩餘罐頭 = 0**

### 6. ch48 Vibe Coding 大擴充（25 → 29 課）
- 🆕 **48.4b Codex 完整**（CLI/IDE/Cloud 三介面、approval 三段、vs Claude Code）
- 🆕 **48.4d Gemini CLI → Antigravity**（Google 終端 agent；**Gemini CLI 2026/6/18 對個人方案停服、改推 Antigravity CLI**，已查證）
- 🆕 **48.4c 零基礎 30 分鐘做出第一個成品**（→ Netlify 上線）
- 🆕 **48.5b Claude Design**（prompt→原型/簡報，2026/4 Anthropic Labs）
- 48.4 加「第一次打開畫面長怎樣」；48.21 → 終端 agent 三巨頭比較
- ch08 8.1 加「完整前端地圖」分層段（框架 / Meta Framework / Build Tool 釐清）

### 7. ch49 AI Agent 大擴充（25 → 28 課）
- 🆕 **49.6b 從零打造你專屬的 Agent**（50 行不靠框架，三零件＋記憶＋改成你要的）→ 達成「學完能**開發** agent」
- 🆕 **49.1b 零基礎做出第一個 Agent**（無碼 Custom GPT / n8n）
- 🆕 **49.13b Claude Cowork**（Anthropic 桌面知識工作 agent，2026/1，已查證）

### 8. UX 順滑（過渡動畫 + 側欄泡泡）
- 側欄 lesson 標題截斷時 **hover 顯示完整名稱**（精美泡泡、淡入＋箭頭）
- globals.css 全站互動過渡（所有 hover/focus/active + 帶 hover: class 的元素統一 200ms）
- `animate-expand/fade-in/scale-in`；SideNav 章節/大綱展開套滑出動畫
- `prefers-reduced-motion` 仍歸零，無障礙不受影響

### 9. RWD 安全網
- 內容圖片 max-width:100% 不溢出、超長字串自動換行
- 主要畫面（Hero 等）本就有 md:/lg: 斷點

### 10. 圖片接線（林董重生 38 張）
- 林董整批重生 A 區圖、命名有變動 → 逐一核對檔名+內容佈線
- 合併（line_console、cursor_setup）、拆分（deploy_zeabur→1+2）、新截圖（claude_code_cli/codex_cli/gemini_cli/ai_coding_tools_landscape）
- **全 38 張：被引用 38、孤兒 0、壞引用 0**
- ch10 10.1 改放 next_vs_nuxt；ch64 vscode_zhtw 指向 ch00 既有圖

### 11. 其他
- 首頁文案數據改為**自動抓 DB**（不再寫死 75 章/1158 課）
- 桌機章節大綱改**常駐側欄**（收合細欄、伸縮式主內容）
- **資料庫健檢**：131 個 public 物件，所有 migration 預期 table 都存在、**無漏建資料表**

---

## 📊 數據總覽（本日結束）
- 全站 **77 章 / 1196 課**
- 罐頭框 0、罐頭 tip 0、截斷課 0、壞圖引用 0
- 本日約 18 個 commit，全部 push 到 main

## ⚠️ 待 redeploy 才生效（程式碼/靜態檔）
> 內容 / tip / 圖片路徑 / 資料庫都已**即時上線**；以下要 **Zeabur redeploy**：
- CodeBlock 美化 + 指令小抄
- 側欄 hover 泡泡、全站過渡動畫、RWD 安全網
- **圖片新版**（public/ 靜態檔跟著 build 走；redeploy 後 + 強制重整 Ctrl+Shift+R 才看得到新圖）

---

# 📋 所有待辦

## A. 內容 / 課程
- [ ] **Ch00 零基礎 vs 有經驗「分流路徑」**（林董指示先記待辦）：完全沒碰電腦 vs 有 coding 經驗，給不同起點/跳課路徑。較大工程，需先想分流方式（標籤？引導頁？）
- [ ] **strict-spec 重寫**（選配、更高標準）：ch68 高階工程師(20)、ch55-58 / 60-67 / 69-70 strict rework（用人話講已補、內容已可用）
- [ ] 附錄 ch61-67 / 69-70 by design 可不改

## B. 圖片（等林董生圖，依檔名插入）
- [ ] **B / D / E / F 區概念圖**約 110+ 張（D 前端框架含 CRA、E Python/爬蟲/Node、F 補 ch01-25、B 概念示意）——產製順序見 `LESSON_IMAGE_SPEC.md`
- [ ] **ch10 `ch10_create_next.png`**：A 區重生時沒生這張，10.1 暫用 next_vs_nuxt；林董補生後換回
- [ ] （可選）ch64 專屬 vscode_zhtw（目前指向 ch00 同內容圖）

## C. 部署 / 上線
- [ ] **Zeabur redeploy**：套用 CodeBlock 美化、側欄泡泡、過渡動畫、RWD、**新圖**（最迫切）
- [ ] 部署後**強制重整**（同檔名圖有瀏覽器/CDN 快取）；若仍舊圖 → 加版本參數/改檔名破快取
- [ ] TG webhook secret 待設

## D. 林董手動設定（REPORTS_TODO）
- [ ] **Stripe 訂閱付款**：key → bootstrap → 3 price_id → webhook（6 事件）→ secret → 4242 測一筆（`STRIPE_SETUP.md`）
- [ ] **寵物 4 隻 Lottie URL**：lottiefiles 挑 4 個貼 `/admin/lottie-settings`
- [ ] **cron-job.org 7 個排程**：student-daily-review / recall-user / leetcode-sync / discord-quote / summarize-memories / launchpad-auto-sync / launchpad-retrospective
- [ ] **Discord 收尾**：bot role 拖到 VIP 之上 + Manage Roles + `DISCORD_VIP_ROLE_ID` / `DISCORD_CLIENT_SECRET`
- [ ] **GitHub Actions secrets**：`CRON_SECRET` / `SITE_URL` 對齊 Zeabur
- [ ] 其餘 env（選設）：OWNER_LINE_USER_IDS / TELEGRAM_* / PISTON_BASE_URL / N8N_*
- [ ] 後台登入 `deleted_client`：建新 OAuth client（林董表示已處理、待確認能登入）

## E. 安全 / 維運
- [ ] **OPT-8**：RLS `is_admin()` SECURITY DEFINER + 補 index（production DB）
- [ ] OPT-7 其餘列表 API `select("*")` → 明確欄位
- [ ] Egress 來源確認（必要時 `NEXT_PUBLIC_CONTENT_SOURCE=file`）
- [ ] Owner 帳號開 MFA/TOTP（Supabase）
- [ ] Cloudflare 擋在 Zeabur 前（DDoS/WAF/Bot Fight）+ 隱藏 origin IP
- [ ] Dependabot + Supabase 定期備份 + 金鑰輪替（AI_KEY_SECRET / CRON_SECRET / service_role）
- [ ] CSP（Report-Only 先行）；註冊/發文加 Turnstile + 蜜罐
- [ ] bundle analyzer 基準 → TipTap/recharts/CodeMirror 動態 import；評估收斂 Monaco

## F. 功能 Backlog（留存/變現/成長）
- [ ] **B1 自動評測 + 綠寶 AI Code Review**（隱藏 test cases → 自動判對錯 → XP/Z幣 → AI 點評）**留存核心**
- [ ] **B4 可驗證證書**（`/verify/[certId]` + QR + LinkedIn）+ 課程市集收尾
- [ ] **C1 學習社群 / Cohort**（期數制、進度夥伴、組隊 streak/Boss）
- [ ] B2 SRS 間隔複習、D2 綠寶每週複習報告、C2 賽季排行榜
- [ ] Z 幣商城 sink + 儲值 4 套餐 + 訂閱監測 dashboard
- [ ] B5 職缺媒合板、D1 Z-coin 跨產品錢包
- [ ] **web_front**：RWD audit 完整版（手機溢出/touch target/table scroll，本日已加安全網）、PWA 升級、a11y 無障礙
- [ ] **N 系列自動化**（n8n）：onboarding 7 天、每日 KPI→LINE、流失 winback、客服 AI 分流、內容工廠、通知 fan-out、章節自動發布、Stripe→Supabase、DB backup、異常偵測、release→changelog
- [ ] **discord**：OAuth 綁定、Premium role 自動分配、新人 onboarding DM、slash /quote /recommend /vision
- [ ] **AI 模型中台升級**（v1 規格 1603 行）：AI Router 三層模型池 + 成本分級 + Z幣/VIP 經濟（等 B/D 收尾後啟動）
- [ ] LT-17 效能 ops（Sentry/PostHog）、P4-19 教師/助教 admin、P4-20 作業批改介面
- [ ] Chapter 推薦演算法、全站語意搜尋 UI、人生星圖（跨專案暫緩）

> 來源：`REPORTS_TODO_2026-06-03.md`、`BACKLOG.md`、`LESSON_IMAGE_SPEC.md`。
> import 偶發 Cloudflare 522，retry 即可。

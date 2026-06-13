# Daily Works — 2026-06-14

董事長林董（Luffy Lin）。雪鑰值班。
主題：**AI 聊天語音輸入輸出 → 每日測驗修復 → Ch79 新章 + 全站內容大補（metadata / miniQuiz / 偏薄章補厚 / 空殼補實 / Ch26 去重）→ 全專案檢查 → ch26 圖佈線**。今天量很大、收尾推上線。

---

## 🎙️ AI 聊天語音輸入輸出（免費版、零後端零 API 費用）
- 用瀏覽器內建 Web Speech API：`useSpeechInput`（語音轉文字）/ `useSpeechOutput`（朗讀）兩個 hook。
- 共用元件 `MicButton`（🎤）/ `SpeakButton`（🔊）、接上 **綠寶導師 / 寵物 / Nami 助教** 三個聊天框；朗讀走共用 `ChatMessageBubble`。
- 釐清：Claude 不吃音訊、也不會講話 → 「語音直接傳給 AI」做不到、實作走「語音↔文字 + 朗讀已回文字」。
- **PWA 安全降級**：不支援的瀏覽器（含 iOS 加到主畫面的 standalone PWA）自動藏麥克風鈕、不影響打字；朗讀幾乎全平台可用。執行時 feature-detect、不是判斷是不是 PWA。

## 🧠 每日測驗修復（找到真兇）
- 真兇：leetcode 半邊一直讀**空表 `leetcode_questions`**（題庫斷線）、整份考卷只剩 ≤15 題章節 miniQuiz → 學員覺得「題目都沒變」。不是寫死、是題庫斷掉。
- `api/quiz/today` 重寫：**最近 14 天出過的題不重抽** + 兩個題池**互相 backfill** 補滿 8 題。
- 新增 `scripts/seed-leetcode-questions.mjs`：從 `leetcode_problems` 目錄用系統 AI key 生成含選項/答案/解析的繁中概念題、灌進 `leetcode_questions`（已灌 **50 題**：medium 30 / easy 10 / hard 10）。

## 📘 Ch79《語言模型入門》（顯示 Ch28c、9 課、接 Ch78）
- 釐清：綠寶把章號記錯了——它說的 28a/28b 是真實 **Ch77 機器學習 / Ch78 深度學習**（用 `number` 顯示 28a/28b）；28c = 新檔 id 79、`sortIndex 28.8` 卡在 Ch78 後。
- 9 課刻意避開跟 Ch78/46/47 重複、走「更深 + 更動手」：本質(next-token) / Tokenization / 注意力 Q·K·V / 預訓練+in-context / Hugging Face / LoRA·QLoRA / Prompt 原理 / RAG / 評估+Ollama。
- `scripts/_build-ch79.mjs` 產出、註冊進 `chapters.ts`、每課含 miniQuiz。

## 📗 Ch26 補 3 課 + 確認型別轉換已有
- 新增 `26.3.5` 字串方法、`26.4.5` Unpacking、`26.6.5` global/nonlocal（依零基礎友善規格）。
- 查證：型別轉換**原本 26.3 就有**（型別轉換段 + 型別查詢+轉換總表）→ 不重複加。

## 🏗️ 全站內容大補（AI 草稿、待人工抽查）
- **metadata**：80 章補齊 `summary / faq / outcomes`（誠實、不掛保證）。原本只有 4 章齊全。
- **miniQuiz**：每課自我檢測、**27 → 1,238 題**（同時餵每日測驗章節池）。
- **偏薄章補厚**：Ch77/78（882/810 → **3,850/3,764 字/課**）、Ch34/35/36/38/40/41、Ch51–58、60 全擴寫到 3,200–5,200 字/課。
- **空殼補實**：Ch65/66/67/69/70（89–421 → 1,600–2,300 字/課）、**附錄 Ch61–70 翻 published**。
- 工具腳本（皆可重跑、idempotent）：`gen-chapter-metadata.py`、`gen-lesson-miniquiz.py`、`gen-enrich-thin-lessons.py`、`gen-stub-lesson-content.py`、`_lib/print-ai-creds.mjs`。
- 踩雷：Haiku 把長 markdown 包進 JSON 會吐 raw 換行 → JSON 壞。改成「純 markdown 回傳」/ 分隔線格式解決。

## 🔗 Ch26 巨章去重（先比對、確認目標夠完整才導）
- 先量兩邊：資料分析 Ch27（137k 字）≫ Ch26 區塊（18k）→ 直接導；ML/DL 原本 **Ch77/78 反而較薄** → **先補厚到 ≥ Ch26 才導**（補厚後 Ch77 96k / Ch78 94k ≫ Ch26 區塊）。
- 26.13–24 共 **12 課加 📌 導引**（不刪原文）到 Ch27 / Ch77 / Ch78 / Ch79。

## 🔍 推前全專案檢查
- ✅ DB 欄位無接錯、254 支 route 全有 export、API 接線乾淨。
- ⚠️ **既有空心**：`api/user/gdpr/export` 查不存在的 `user_settings` 表（`safe()` 包著不崩、但 GDPR 匯出默默漏掉這塊）。是「之前規劃、表沒建、沒在運作」。**待林董定奪**：建表接起來 or 刪那行。
- 誤報排除：playground 的 `.from('users'/'posts')` 是教學示範碼；og 路由其實存在；「缺 10 表」是 check-all-tables 過時硬編清單（程式 0 處用）。
- ✅ RWD：無撐破手機的公開元素（admin 固定寬可接受）；PWA：紮實（動態 manifest / SW / shortcuts）。小建議：補 PNG 192/512 maskable icon。

## 🖼️ ch26 圖佈線（林董生圖 → 雪鑰佈線）
- 22 async/DI→26.27、23 SQLAlchemy→26.28、24 部署 ASGI→26.32、**28 型別轉換→26.3**（型別查詢+轉換總表 段）。
- 修 26.4 slicing：v1 已刪、引用改 **v2**（不然破圖）。
- 驗證 ch26 全 **28 張**圖引用都對得到實體檔。LESSON_IMAGE_SPEC G-1 表同步更新（22/23/24/28 標 ✅、slicing 註記 v2）。

## 🚨 上線除錯馬拉松（部署 404 → 真正根因是 DB 沒同步）
推上線後整站 404、查了一輪：
- **不是 code**：本地 `next build` exit 0、GitHub Actions（docker.yml）全綠。
- **Zeabur runtime log 只有 Caddy**（GOMAXPROCS/GOMEMLIMIT、沒 `▲ Next.js`）→ zbpack 把 Next 誤建成「靜態 + Caddy、沒起 node server」→ 全站 `/api` 被 Caddy 回 404、Cloudflare 快取撐住部分靜態頁。不是記憶體（GOMEMLIMIT 7.3GB）。
- **切 GHCR 預建 image**（繞開 zbpack）：Zeabur 服務改 Prebuilt Image = `ghcr.io/...:latest`。私有 image 報「anonymous token 401」→ 把 GHCR package 設 **Public** 解決（image 不含 server 機密）。
- **自動重部署**：docker.yml 尾巴加 Zeabur GraphQL `restartService`（image 服務正解；`redeployService` 只給綁 git 的服務、會回 Cannot redeploy in-place）。token 存 GitHub secret `ZEABUR_API_TOKEN`。
- 🎯 **真正根因（卡最久）**：換 image / 改 sortIndex 都沒用、28c 不見 + Angular 跑到最後 + Ch26 像少課——因為 **前台章節是讀 Supabase DB（`content.ts` → `chapters`/`lessons` 表）、不是 JSON**。DB 裡沒 ch79、76/77/78 的 `sort_index` 是 NULL。
- **修**：`import_chapters_to_db.mjs` 補上漏掉的 `sort_index`、跑同步（**80 章 / 1258 課 / 0 錯**）。`/chapters` 是 `force-dynamic` → DB 改完即時生效、不用 rebuild。
- 順手修：`next.config` Permissions-Policy `microphone=(self)`（語音輸入解禁）；ch79 `sortIndex 28.8→28.9`（之前撞 Ch28b、改成顯示 Ch28c）。
- **教訓寫進 `CLAUDE.md` + 記憶**：線上章節怪 → 先看 DB、不是看 JSON、也不是換 image；改 JSON 必跑 import 同步。

---

# 📋 待辦 / 提醒
- **GDPR `user_settings`**：既有空心、待林董決定（建表 or 刪那行）。
- **AI 草稿抽查**：metadata / miniQuiz（尤其答案）/ 補厚章技術正確性，找時間人工校；要改就調 prompt 重跑生成器再推。
- **leetcode 題庫**：目前 50 題、要更多可 `node scripts/seed-leetcode-questions.mjs --limit 300`。
- **PWA icon**：可補 PNG 192/512 maskable（非必要）。
- 其他章節圖佈線：林董持續生圖、生好丟我繼續對位。

---

## 📦 本日 commit
`0a92aa0` 語音輸入輸出（綠寶/寵物/Nami） ·
`363158e` 每日測驗修復 + 防重複 + backfill + leetcode 種子 ·
`ae9a9d1` Ch79 新章 + 全站 metadata/miniQuiz + 偏薄章補厚 + Ch26 去重導引（86 檔） ·
`3a43e46` ch26 佈線 4 圖（22/23/24/28）+ slicing v2 ·
`0300ff8` 更新 LESSON_IMAGE_SPEC + daily_works_0614 ·
`9a95203` ch79 顯示編號改 Ch28c（sortIndex 28.8→28.9） ·
`64ba894` Permissions-Policy 開放 microphone=(self) ·
`67b736f` / `8963283` docker.yml 自動觸發 Zeabur redeploy（改用 restartService） ·
`99d4011` 新增 CLAUDE.md（章節從 DB 讀的雷 + 部署/同步 SOP）+ import 腳本補 sort_index。

> 註：DB 同步（`import_chapters_to_db.mjs`）是直接對 Supabase 跑、不是 commit；跑完線上章節才正確。

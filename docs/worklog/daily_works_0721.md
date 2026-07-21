# 工作日誌 2026-07-21

## 📖 程式辭典 — Python 模組大擴充（第 36–39 批，共 97 條）

林董要「辭典 Python 部分加上各種模組：內建＋外部、依用途分類（爬蟲/資料分析…）、每條含詳細功能＋怎麼使用＋範例」，後續再要「calendar 那種、不管常不常用、有用/特別的都加」。

- **seed-36（內建 stdlib 22 條）**：csv / sqlite3 / random / secrets / uuid / time / functools / glob / shutil / zipfile / urllib / socket / heapq / bisect / queue / statistics / concurrent.futures / multiprocessing / tempfile / configparser / traceback / base64。
- **seed-37（外部第三方 23 條）**：scrapy / playwright / httpx / aiohttp / lxml / openpyxl / pillow / opencv / scipy / plotly / polars / tqdm / rich / typer / pyyaml / python-dotenv / boto3 / openai / anthropic / langchain / streamlit / celery / faker。
- **seed-38（更多內建 25 條）**：calendar / hashlib / decimal / fractions / textwrap / difflib / pprint / contextlib / operator / inspect / importlib / timeit / cProfile / struct / io / ipaddress / unicodedata / warnings / getpass / platform / smtplib / webbrowser / ctypes / weakref / doctest。
- **seed-39（更多外部 27 條）**：transformers / spaCy / nltk / gradio / statsmodels / xgboost / pymongo / redis / psycopg2 / uvicorn / websockets / cryptography / pyjwt / passlib / marshmallow / arrow / python-dateutil / apscheduler / watchdog / loguru / sentry-sdk / black / ruff / mypy / hypothesis / pyinstaller / qrcode。

每條格式一致（helper `T()`）：`category:"tool"`、`langs:["python"]`、`plain`=詳細功能＋**何時用**（爬蟲/資料分析/加密/排程…）、`analogy`=白話比喻、`example`=可跑真範例、`related`=交叉連結。補上先前被 related 引用但未建的 `hashlib-module`。

## 🚨 收尾檢查（鐵規則）
- **API/DB/資料表**：純資料檔（`scripts/_data/dictionary-seed-38/39.json`），由 `import-dictionary.mjs` 依 slug upsert 進 `dictionary_terms`；冪等、零 API。已跑 import。
- **無 slug 衝突**：掃全 36 個 seed 檔，`DUP slugs: 0`。JSON 皆合法。
- **UI 接對**：辭典頁 `/dictionary` + `/dictionary/[slug]` 既有管線，新條目自動出現在搜尋/分類（tool）/語言（python）篩選。無假功能。
- **RWD / PWA / 建置**：本批純資料、不進 app bundle、不動元件；tsc/build 不受影響（頁面渲染邏輯未變）。
- **i18n**：辭典已接翻譯管線；之後可跑 `node scripts/translate-sync-all.mjs` 補譯（免費 Google、冪等、未譯 fallback 中文）。
- **機密**：未動 `.env.local` / manifest / sw。

進度：辭典 1690 → **1742 條** / 目標 5000。下批從 `dictionary-seed-40.json` 接。

### 追加：seed-40（特殊/實用模組 31 條）
林董指定方向「sympy/networkx/geopy/feedparser/pypdf/python-docx 這類特殊用途外部庫，＋ abc/enum/dataclasses/shelve/gzip/tarfile 這類還沒收的內建」。
- 內建：enum / dataclasses / abc / gzip / tarfile / shelve / fnmatch / signal / atexit / locale / gettext / cmath / mmap / array。
- 外部：sympy / networkx / feedparser / pypdf / python-docx / python-pptx / reportlab / tabulate / humanize / schedule / tenacity / click / gunicorn / pygame / pyautogui / geopy / validators。
- import upsert **1773、失敗 0**；slug 全域無衝突。**辭典現 1773 條**，下批從 `dictionary-seed-41.json` 接。

---

## 📚 章節重寫：ch49 AI Agent — de-can 練習 + 新教具 AgentLoop
ch49（28 節）內容本身夠深（3000–5000 字＋架構圖），問題在**練習題罐頭**：22/28 節共用同一句「打開編輯器、把本節 code copy 進去跑、改 1-2 個參數」。

- **de-can 22 題**：每題改成**對得上該節主題的應用/設計/分析題**（question+hint+answer 三欄）。例：49.3 手寫 ReAct trace、49.5 設計寫文章 multi-agent 團隊、49.7 訂餐 agent 工具集（含危險工具保護）、49.8 健身教練 agent 的 memory 分層、49.15 客服 agent 分層轉真人規則、49.18 四大災難對應四支柱、49.19 production queue/監控/alert…（6 節原本已是好題、保留）。不掛收入/接案保證。
- **新教具 `AgentLoop`（agent-loop）**：`src/components/chapter/demos/AgentLoop.tsx`。把一段 ReAct trace 拆成 Thought(想)→Action(做/呼叫工具)→Observation(看結果) 逐格揭曉、最後給 Final Answer，「下一步 / 全部跑完 / 再看一次」；教 loop 收斂與跳出條件。掛 **49.3**（找 iPhone 差別 3 輪）、**49.6**（跑步建議 2 輪、示範 loop 結束）。
  - 接線：`types.ts` union 加 `'agent-loop'`；`LessonDemos.tsx` 派發器 + SUPPORTED 白名單加 case；RWD＝垂直時間軸 / break-words / flex-wrap 按鈕列 / 無寫死寬 / 亮暗 design token。

### 🚨 收尾檢查（鐵規則）
- **API/DB**：`import_chapters_to_db.mjs ch49` → 28 lessons / 0 errors；**DB 覆核**：49.3 demos=agent-loop(3steps)、49.6 agent-loop(2steps)、49.7 無 demo（正確）、三節 exercise 皆已換成應用題。無假功能。
- **UI 接對**：demos → LessonDemos → AgentLoop 真渲染（新增 case）；非空殼。
- **建置**：`tsc --noEmit` ✓ · `vitest run 137` ✓ · `next build` exit 0 ✓。
- **RWD / 亮暗**：AgentLoop 純垂直、無固定寬、按鈕 flex-wrap、文字 break-words、色彩用 token + dark: 變體。
- **機密/PWA**：未動 `.env.local` / manifest / sw。

ch49 完成。

---

## 📚 章節重寫：ch50 n8n 自動化 — de-can 練習 + 新教具 WorkflowFlow
ch50（25 節）同型問題：17/25 節練習罐頭。內容夠深、只換練習 + 疊教具。

- **de-can 17 題**：改成對得上 n8n 主題的設計/分析題。例：50.4 畫出你的 workflow（Trigger+Actions）、50.5 訂單流程加 IF 分支、50.9 AI 分類節點要求 JSON 輸出、50.10 為何不能寫死 key、50.13 客服 RAG『找不到別硬掰』、50.15 錯誤處理＋冪等（重跑不寄兩份）、50.18 純自動化 vs Agent 混合、50.23 self-host 上線三件事。變現題（50.17/25）只談問題與可行性、不掛收入保證。
- **新教具 `WorkflowFlow`（workflow-flow）**：`src/components/chapter/demos/WorkflowFlow.tsx`。把 workflow 畫成 Trigger→Node→Node 節點鏈、按「資料流過下一個節點」逐格前進、每格顯示節點在做什麼＋payload 怎麼變；節點型別（http/ai/if/set/action/code/db）各自配色。掛 **50.4**（表單→記錄→通知 3 節點）、**50.11**（早安簡報：排程→抓天氣→讀行程→AI 整理→LINE 4 節點，含 AI Node）。
  - 接線：`types.ts` union 加 `'workflow-flow'`；`LessonDemos.tsx` 派發器 + 白名單。RWD：垂直節點鏈、payload `overflow-x-auto`、按鈕 flex-wrap、亮暗 token。

### 🚨 收尾檢查
- **API/DB**：`import_chapters_to_db ch50` → 25 lessons / 0 errors；**DB 覆核** 50.4 workflow-flow(3nodes)、50.11 workflow-flow(4nodes)、50.7 無 demo（正確）、exercise 已換應用題。
- **建置**：`tsc` ✓ · `vitest 137` ✓ · `next build` exit 0 ✓。RWD／亮暗 token 同 AgentLoop 規格。機密/PWA 未動。

ch49 + ch50（AI Agent / n8n 兩大旗艦章）完成。**教具庫新增 2 個：AgentLoop、WorkflowFlow。**

---

## 📚 薄章補厚 — 開工（linj 指示：三軌都做、順序自訂、全手寫不花 AI 錢）
**重新認定**：survey 的「<1500 字＝薄」會誤判——實讀 ch06 多數節（含 table/code/用人話講）其實夠好。**真正一致的缺口是「練習罐頭 + 沒互動教具」**。故薄章治療 = **de-can 練習 + 疊合適教具（能複用就複用）+ 只補真正 stub 的內容**，不硬灌已夠好的節（守寧缺勿濫）。

### ch06 JSON 完整（25 節）
- **de-can 20 題** → 對得上 JSON 主題的應用題（手寫 5 型別物件、parse/stringify 方向與丟失、JSON Schema 註冊表單、Zod/Pydantic 執行期驗證、LLM 結構化輸出、REST vs GraphQL、五大地雷情境、JWT payload 為何不能放密碼、JSON Patch、tRPC 限制、一份 Zod schema 走全端…）。
- **新教具 `JsonTree`（json-tree）**：`src/components/chapter/demos/JsonTree.tsx`。互動可展開/收合的 JSON 樹、型別配色、`overflow-x-auto`。掛 **6.1**（第一份 JSON——補足 6.1 原本沒有任何 JSON 範例的缺口）、**6.6**（巢狀結構、看 author 重複）。types union + 派發器接線。
- 檢查：`tsc`/`vitest 137`/`next build` 全綠；`import ch06` 0 errors；DB 覆核 6.1/6.6 demos=json-tree、練習已換。**教具庫 +1（JsonTree）。**

### ch11 行動裝置 App（25 節）
- **de-can 20 題** → React Native/Expo 應用題（Expo Router 檔案路由設計、Zustand vs TanStack Query 分工、三種本地儲存選型＋token 為何不能放 AsyncStorage、拍照上傳流程、LBS 背景定位隱私、推播不濫發界線、為何別自刻 auth、Reanimated UI thread、deep link fallback、local-first 衝突處理、上架前準備、i18n 不只翻譯…）。變現題只談取捨、不掛收入保證。
- 教具：mobile-specific 教具需另建、暫不硬塞（守寧缺勿濫），先只 de-can。

### ch12 資安基礎（25 節）
- **de-can 18 題** → 資安應用題（SQLi 參數化、XSS 三防禦、CSRF token/SameSite、bcrypt/argon2 慢雜湊+salt、JWT 地雷、HTTPS 中間人、rate limit 規則、CORS 誤解、security headers/CSP、供應鏈、log 不記密碼、攻擊者思維 IDOR 自測、WAF vs rate limit、金鑰輪替、container 非 root、Web3 不可改風險、App 反編譯、資安事件 SOP 三步）。
- **教具＝複用 `ScenarioJudge`**（安全情境判斷 可以/有風險/不行，7 題）掛 **12.15**（Pentest 心法）。完美對題、零新元件。
- 檢查（ch11+12 純資料、ScenarioJudge 已於 ch06 批次建置並 build 綠、無新 TS）：`import ch11/ch12` 各 0 errors；DB 覆核 12.15 demos=scenario-judge(7)、兩章練習已換。

### ch14 / ch23 / ch25 / ch37 / ch42 — 收尾批（de-can 33 題 + 複用教具 ×2）
- **ch14 PWA（22 節）**：de-can 13 → PWA 應用題（SW 為何限 HTTPS、manifest 四欄、離線+Background Sync 合作、推播別一進站就要權限、iOS 加到主畫面引導、Capacitor 何時用、SW 生命週期更新坑、IndexedDB vs localStorage、Offline UX 誠實回報、部署快取失效、PWA 不是萬靈丹）。**複用 `WorkflowFlow`** 掛 **14.2**（Service Worker cache-first 攔 fetch 流程：if 查快取→命中回 cache→未命中打網路→存回，完美對映節點型別）。
- **ch23 雲端架構（10 節）**：de-can 6 → Serverless 適/不適、K8s 編排三件事、CDN vs 源站、Serverless 隱藏成本、cache hit/miss + TTL、DR vs HA。
- **ch25 網域+DNS+SSL（10 節）**：de-can 8 → A/CNAME 與 DNS 傳播、HTTPS 必要性、subdomain 策略、自有網域信箱、DNS 解析流程、Let's Encrypt 自動續期、選註冊商陷阱、SPF/DKIM/DMARC。
- **ch37 WordPress（6 節）**：de-can 2 → 主題快速交付的好處與坑、自訂 block/主題的價值。
- **ch42 接案流程（6 節）**：de-can 4 → 找客戶/報價/簽約、一次性變月費、合約三要件+訂金、月費維護方案價值溝通。**複用 `ScenarioJudge`** 掛 **42.5**（接案避雷 7 情境：該接/有風險/別接）。變現題全程只談價值與自保、不掛收入保證。
- 檢查：`import` 五章各 0 errors；DB 覆核 14.2 workflow-flow、42.5 scenario-judge、各章練習已換；**`next build` exit 0**（收尾跑一次全綠）。

---
## ✅ 薄章補厚 — 完成盤點
- **de-can 練習**：ch06(20)+ch11(20)+ch12(18)+ch14(13)+ch23(6)+ch25(8)+ch37(2)+ch42(4) = **91 題**罐頭全換成應用/設計/分析題。（ch15/ch24 本就 0 罐頭、跳過。）
- **教具**：新增 `JsonTree`；複用 `ScenarioJudge`(ch12/ch42)、`WorkflowFlow`(ch14)。守寧缺勿濫——ch11 行動 App 無對味現成教具、暫不硬塞（待建 mobile 專屬教具）。
- **本輪教具庫總計 +3 新元件**：AgentLoop、WorkflowFlow、JsonTree（＋ScenarioJudge 等複用）。

---
## 🗂️ 辭典 seed-41（工程師黑話）— 首版廢棄
- 想加 31 條黑話/術語（bikeshedding/yak-shaving/rubber-duck…），跑 slug 去重掃描發現 **27/31 撞名**——辭典早期 seed（1/4/6/8/9/11/21/23）已收很多黑話。**首版作廢、刪檔**，避免 upsert 覆蓋既有整理過的條目。
- 教訓寫進待辦：續辭典前**先跑去重**、改挑真正沒收的主題（資料庫術語/Git 進階/雲原生/LLM 名詞…）。辭典維持 **1773 條**。

---
## 📋 待辦大整合 — `todo_list_0721.md`（新現行主檔）
- 用 3 組 subagent **逐項對照「程式碼 + git」核對**全部 10 個舊 todo 檔（MASTER_TODO/ROADMAP/0705/0713/0714/0715/TODO/BACKLOG/BEGINNER_FRIENDLY/REPORTS）。
- 結論：**舊檔全歸檔為歷史**（0705 已 100% 關閉；0715 曾為主檔），未完項 deduped 併入新主檔，做完的劃線保留。5 層子任務編號（1/1.1/1.1.1/1.1.1.1/1.1.1.1.1）。
- 結構：🅰林董手動 / 一·大眾變現四功能（含深層拆解）/ 二·分身島補完 / 三·機會島 / 四·內容辭典教具 / 五·首頁UI / 六·商業變現 / 七·安全合規技術債 / 八·Creator收尾 / 九·長線 / 十·0717–0721 完成劃線 / 附錄A 舊檔核對裁決表。
- **核對修正**（避免重開已完成的工作）：PWA 192/512 icon **已完成**（勿再開，只缺 apple-touch）；TG/Discord 現有 webhook 是 **admin AI-chat、非 agent 入口**（仍待做）；社群 send adapter 是**最大半成品**（有表有 UI、零平台真的能發）。
- CLAUDE.md「現行主檔」指標改指 0721、0715 加已歸檔橫幅。

---
## 🩺 收尾健檢（API / DB / UI / RWD 前後端接線）
本輪程式異動集中在 3 個新教具元件（AgentLoop/WorkflowFlow/JsonTree）＋派發器接線，其餘為資料（章節/辭典）與文件（todo）。健檢：
- **建置/型別**：`tsc --noEmit` ✓ · `next build` exit 0 ✓ · `vitest 137` ✓（多次）。
- **DB 欄位審計**：`node scripts/audit-db-columns.mjs` — 441 支 route 皆有 export HTTP method；旗標多為 template-literal 誤判（動態欄位/路徑）。
  - 真實問題確認 1 個（已在 todo §7.3）：**GDPR 匯出 `/api/user/gdpr/export/route.ts:81` 查 `user_settings` 表、但該表無 migration**（`safe()` 包住＝靜默略過、不 crash，但匯出漏這塊）。→ 建表或移除引用。
  - `/api/og` 存在（`route.tsx`）＝誤判；`/api/health` 無 route（外部健檢用、低優先）。
- **教具接線 DB 覆核**：ch49 49.3/49.6=agent-loop、ch50 50.4/50.11=workflow-flow、ch06 6.1/6.6=json-tree、ch12 12.15/ch42 42.5=scenario-judge、ch14 14.2=workflow-flow 皆有值、非空殼。
- **RWD**：新教具皆垂直流 / flex-wrap 按鈕列 / payload `overflow-x-auto` / `break-words` / 無寫死寬 / 亮暗 token（Chrome 擴充未連、無法目視截圖，靠 code 級 RWD 紀律）。
- **全站前後端接線掃描**（subagent × 441 route vs 全站 fetch + 206 migration）：
  - ✅ **「只有 UI 沒後端」＝ 0 個**：每個前端 `/api/...` fetch 都對得到真 route（未解析的都是外部 API/教學範例字串）。
  - ✅ **本輪兩個新功能端到端接好**：章節教具（agent-loop/workflow-flow/json-tree 派發器+元件+DB）、創作島綠寶搜碎片寫歌（`/api/creator-island/fragments/search` ↔ `CreatorIslandClient` ↔ `searchFragmentsByQuery`）。
  - 🟡 **「只有後端沒前端」＝ ~14 支 dead endpoint**（無前端呼叫）：其中 ~5 支冗餘/被 sibling 取代（`me/checkout`→`payments/checkout`、`store/inventory`、`review/list`、`me/learning-plan` base、`assets/[id]/lineage`），可刪；~9 支真孤兒、最可能是**半成品 UI**：`creator-island/{fruit, ai/runs, community/follow, series/[id]}`、`me/recommended-chapters`、`forum/user/[userId]`、`ai/route-suggest`、`agent/threads`、`notify-leave`。→ 已記進 todo §7.15 待清。
  - 🔴 **唯一真 DB bug**：GDPR 匯出查無 `user_settings` 表（見上、todo §7.3）。

---
## 🚀 下次開工建議（從 `todo_list_0721.md` 挑最要緊的）

> 內容工作已到乾淨檢查點、樹乾淨、全部推上線。下次可從這裡直接接：

### A. 變現功能開工（都無外部依賴、可直接做，林董最在意的缺口）
1. **#1 每日運勢 / AI 命理 + LINE 推播**（todo §一.1）— TAM×黏著×好做最高。先做 `/fortune` 頁 + `fortune_profiles`/`fortune_daily` 表 + `/api/fortune/today`（星座/塔羅先行、八字標進階）+ 每日 cron 推播。**建議首選。**
2. **#2 訊息軍師**（§一.2）— 最快落地，純情境模板 + LLM，`/message-coach`。
3. **#4.1 生活助理範本庫**（§一.4.1）— 把 Agent 轉成普通人工具：`src/lib/agent/task-templates.ts` 分類日常範本 + 露出在普通人找得到處。

### B. 修真實缺口 / 補假功能（健檢 + 核對確認的）
4. **GDPR `user_settings` 表**（§7.3）— `/api/user/gdpr/export/route.ts:81` 查無此表、靜默漏資料。建表或移除引用。
5. **真 CSP header**（§7.1）+ **Turnstile**（§7.2）+ **v1 key 輪替 UI**（§7.4）— 安全三缺口。
6. **可驗證證書頁 `/verify/[certId]`**（§6.2）— 證書功能有發、無公開驗證頁。
7. **社群發布 send adapter**（§2.3.2）— 最大半成品：有表有 UI、零平台真的能發。先接 LINE/TG/Discord。
8. **TG / Discord agent 入口**（§2.2.2/3）— 現有 webhook 是 admin-chat、非 agent bridge。

### C. 內容 / 辭典（手寫、不花 AI 錢）
9. **剩餘技術章 de-can**（§4.1.1）：ch01/02/04/05/07–10/16/17/26–36/46… 罐頭練習；deep-rewrite tier ch15/24/32/34–36/40/41/63/68/72–75。
10. **辭典 → 5000**（§4.2）：seed-41 **先跑 slug 去重**、改挑沒收主題（資料庫/Git/雲原生/LLM 名詞）。

### 🔴 卡林董（做完解鎖）
- Zeabur `ENABLE_SERVER_BROWSER=1`（L2 沙盒/瀏覽器）、cron #10 daily-brief、金流 Stripe 金鑰、**首頁 5 層 stage-layer 生圖素材**（首頁改版全卡這）、通路 bot token。詳 todo §🅰。

---

## 🔮 大眾變現 #1「每日運勢」— 第一刀 MVP 上線（0721 下午·休息後開工）

休息後回頭做 todo §一（大眾變現四功能）。依「無外部依賴者先做」的順序，開 **#1 每日運勢**。先派 Explore 代理把全站慣例掃清楚（migration/RLS、API auth、`completeForUsage` 記帳、LINE 推播、cron、Z幣 gating、前端頁慣例），再照樣蓋，確保跟既有架構一致、不重造輪子。

### 這一刀做了什麼（星座每日運勢跑通）
- **DB**（`supabase/fortune_migration.sql`，已跑、DB 實測過）：
  - `fortune_profiles`（生日資料、user_id 當主鍵、RLS 本人可讀寫、updated_at trigger）。
  - `fortune_daily`（同人同日+kind 唯一鍵、payload jsonb ＝冪等快取、不重複燒 LLM）。
  - `profiles.line_pref_fortune`（每日運勢 LINE 推播偏好、預設開、additive）。
- **核心 lib**（純函式、8 支單元測試全綠）：
  - `src/lib/fortune.ts`：`zodiacFromBirthDate`（純月/日算西洋星座、零外部庫）、`buildFortunePrompt`（護欄：不做醫療/投資/法律斷言、正向不製造焦慮）、`parseFortune`（容錯：切 markdown 圍欄、幸運數字越界收斂 1–9、score 越界丟棄、缺欄 fallback、無 overall→null）。
  - `src/lib/fortune-service.ts`：`getOrCreateDailyFortune()` ＝快取優先/沒有才生成寫回，`/api/fortune/today` 與 cron **共用同一份生成邏輯**（不重複）。
- **API**：
  - `GET/PUT /api/fortune/profile`（存生日、自動算星座、改生日作廢今日快取）。
  - `GET /api/fortune/today`（快取命中直接回；沒快取才對「生成」這條限流 + `completeForUsage("agent_core")` 記帳；生成/解析失敗 → 溫和 fallback 不寫快取、下次可重試）。
  - `GET /api/cron/fortune-daily`（`verifyCronAuth`；inner-join 撈「綁 LINE + 開推播 + 有生日」者、生成今日運勢、`notifyUserLine({category:"fortune"})` 推、notifications 表 dedupe + 站內鈴鐺、cap 500）。
- **前端** `/fortune`（`page.tsx` server + `Fortune.tsx` client，照 OpportunityBrowse 慣例）：
  - 首次 → 生日/時辰/曆別/性別輸入精靈；之後 → 每日運勢卡：星座 emoji + score 進度環 + 整體 + 三面向卡（愛情/事業/財運）+ 幸運色色塊 + 幸運數字 + 今日提醒 + 分享（native share／複製、帶站點浮水印）+「開啟每日 LINE 推播」導 /settings。RWD + 亮暗 token 全帶、免責一行。
- **入口**：`TopNav` NAV_LINKS 加「每日運勢」(Sparkles icon)、`nav.fortune` 補 4 語（zh/en/ja/ko）；`/settings` 通知偏好加「每日運勢」開關 + `notification-prefs` API 加 `line_pref_fortune`。

### 🚨 收尾檢查（鐵規則、全綠）
- **API/DB/資料表**：migration 已跑；node 實測 `fortune_profiles`/`fortune_daily`/`profiles.line_pref_fortune`/cron inner-join query 全 **OK**（0 rows＝還沒人設定、預期）。**非假功能、端到端接線實測過。**
- **UI 接對**：/fortune 卡打 today API、精靈打 profile API、設定開關打 notification-prefs API，資料流通。
- **RWD / 亮暗**：flex-wrap / grid / `max-w-2xl mx-auto` / 亮暗雙 token；無寫死寬。
- **建置**：`tsc --noEmit` ✅ · `vitest run` **145 passed（+8）** ✅ · `next build` exit 0 ✅（/fortune、/api/fortune/{profile,today}、/api/cron/fortune-daily 都編出）。
- **PWA / 機密**：未動 manifest/sw、未動 `.env.local`。

### 下一刀（第二刀 fortune）
1. 🔴 **cron-job.org 加 job #10**：`GET /api/cron/fortune-daily?secret=<CRON_SECRET>` 每天 00:00 UTC（=台灣 08:00）— 不加就不會自動推。
2. **塔羅**：78 張牌庫 + 抽牌 + `/api/fortune/tarot` + 翻牌 UI（`kind='tarot'` 快取欄已留）。
3. **付費/Z幣 gating**（§1.5）：免費看整體、付費解四面向深解+塔羅（沿用 `gateHighTierModel`/Z幣）。
4. **八字/紫微**：裝 `lunar-javascript` 接農曆↔國曆 + 時辰（§1.1.1.2）。
5. **首頁模式卡**入口（配 §🅰 生圖）、截圖分享圖卡（html-to-image）。

---

## 💬 大眾變現 #2「訊息軍師」— 完整上線（0721·接著 #1 一路做）

依 §一順序「2 訊息軍師·最快落地」，一刀做完（無外部依賴、無 🔴 卡點）。先派 Explore 代理查「有沒有現成的每日用量計數 / 付費判斷 / 最像的 AI 工具頁可抄」，結論：**全站只有月配額、沒有日計數** → 採「COUNT 今日列數」最簡路徑。

### 做了什麼
- **lib**（`src/lib/message-coach.ts`，純資料+邏輯、8 支單元測試）：
  - 12 情境（加薪/婉拒/道歉/催款/請假/房東/老師/客戶/難開口私訊/客訴/婉拒告白/設界線），每情境 emoji + hint + 預設語氣；5 語氣（客氣/專業/堅定/幽默/溫暖）。
  - `buildCoachPrompt`（護欄：直接給可抄本文、3 版層次、顧對方感受、不捏造、不寫違法脅迫辱罵、支援 refine 微調）、`parseCoachVersions`（切 `[...]`、容忍圍欄、純字串陣列、上限 3、空訊息略過）。
- **DB**（`supabase/message_coach_migration.sql`，已跑、DB 驗證）：`message_coach_logs`（**刻意不存訊息內容**顧隱私、只記 user/scenario/tone/time 做每日計數與分析、RLS 本人可讀）。
- **API** `POST /api/message-coach`：auth + rateLimit；驗 scenario/tone/points；**付費判斷**（`hasAiUnlimited || getUserSubTier`）→ 付費/特權無限、免費 `COUNT(今台北日) >= 3` 回 429；`completeForUsage("message_coach")` 生成 → 解析 → 記一列 → 回 `{versions, remaining, unlimited}`。
- **前端** `/message-coach`：情境卡格 → 填要點（含 hint placeholder、800 字上限）→ 語氣 chips → 產 3 版（每版標籤+複製）→ 微調 chips（再短/再委婉/更堅定/更有溫度/換一批）；剩餘次數顯示、429 顯示升級提示；RWD + 亮暗。
- **接線**：nav「訊息軍師」(MessageSquareHeart、4 語 i18n)；`message_coach` 註冊進 `AiUsageKey` + `USAGE_LABELS`（後台 /admin/ai/usage-models 可配模型）。

### 🚨 收尾檢查（全綠）
- **API/DB**：migration 已跑；node 實測 `message_coach_logs` + COUNT-since-台北午夜 query = **OK**。付費 bypass 走既有 `hasAiUnlimited`/`getUserSubTier`（非新造）。
- **UI 接對**：情境/語氣資料由 lib 單一來源、前後端共用；前端打 API、資料流通、非空殼。
- **建置**：`tsc` ✅ · `vitest` **153 passed（+8）** ✅ · `next build` exit 0（/message-coach、/api/message-coach 都編出）✅。
- **RWD/亮暗/機密**：grid/flex-wrap/亮暗雙 token；未動 manifest/sw/.env.local。

### 本日大眾變現進度
- ✅ #1 每日運勢（第一刀）、✅ #2 訊息軍師（完整）。
- 下一個：**#4.1 一鍵生活助理範本庫**（無依賴、把 Agent 轉成普通人生活助理）或 **#3 AI 求職包**（履歷/面試模擬、可沿用現有 resume + PDF）。#1 第二刀（塔羅/八字/付費）之後補。

---

## 🤖 大眾變現 #4.1「一鍵生活助理範本庫」— 上線（0721）

林董原選的優先項（「先把 Agent 補完+生活助理範本」）。把分身島從工程師工具轉成普通人的生活助理，純前端/內容、無 🔴 卡點、無新後端（沿用既有 `/agent?goal=` 預填機制）。

### 做了什麼
- **範本庫** `src/lib/agent/task-templates.ts`（單一資料來源、4 支測試）：5 分類（生活🌤️/工作💼/財務💰/學習📚/家庭🏠）共 **31 個範本**。每個欄位：id/emoji/title/hint/goal 模板（含「（在這裡填…）」佔位）/category/needsDevice/needsOAuth/popular。
  - 涵蓋：每日新聞摘要、旅遊/菜單/送禮、讀網頁、翻譯潤稿、健康 QA、查資料摘要、寫文案/email、會議記錄、比較決策、簡報大綱、整理檔案(需電腦)、查政府補助、比價、追蹤降價、預算、合約白話、解釋術語、學習計畫、出題考我、長文摘要、育兒 QA、行程規劃、長照資源、親子活動…
- **office 熱門任務**（`OfficeClient.tsx`）：原本 7 個偏工程的 inline QUICK_TASKS → 改引用 `popularTemplates()`（不重複定義）；加 needsOAuth「即將開放」badge + 「看全部範本 →」連結。
- **獨立範本頁** `/agent/templates`：全部+5 分類 tab、卡片點擊 → `/agent?goal=<預填>`；needsOAuth 範本標「即將開放」+ disabled（不誤導、不做假功能）。RWD + 亮暗。
- **誠實護欄**：needsOAuth（讀信箱/加行事曆）OAuth 還沒接（§4.2），先標「即將開放」不給死連結；健康/育兒/合約/預算範本都帶「僅供參考、非專業意見」語。

### 🚨 收尾檢查（全綠）
- **無新 DB/API**：純資料 + UI，沿用 `/agent?goal=` 既有預填（AgentClient.tsx:390 讀 `?goal`）與既有 launch 流程 → 非假功能。
- **建置**：`tsc` ✅ · `vitest` **157 passed（+4）** ✅ · `next build` exit 0（/agent/templates 編出）✅。
- **RWD/亮暗**：grid/flex-wrap/亮暗雙 token。

### 本日大眾變現進度（累計）
- ✅ #1 每日運勢（第一刀） · ✅ #2 訊息軍師（完整） · ✅ #4.1 生活助理範本庫（完整）。
- 剩：#3 AI 求職包（可沿用現有 resume + PDF + agent 面試模擬）、#1 第二刀（塔羅/八字/付費）、#4.2 OAuth🔴/#4.3 沙盒🔴/#4.4 ROI dashboard。

---

## 🔮 #1 每日運勢 第二刀 — 塔羅占卜上線（0721）

延續 #1 第一刀，補上塔羅（§1.1.4/1.2.2/1.3.2）。無新 migration（沿用 `fortune_daily` 的 `kind='tarot'` 唯一鍵當每日快取/計數）。

### 做了什麼
- **牌庫 lib** `src/lib/tarot.ts`（純資料/函式、7 支測試）：78 張（22 大阿爾克那手寫正逆位關鍵字 + 56 小阿爾克那＝4 花色×14 階、依花色主題關鍵字）；`drawCards(n, rand)`（server 抽、可注入亂數決定論、各張獨立正逆位、去重）、`describeDraw`、`buildTarotPrompt`（三張牌陣＝過去/現在/未來、護欄：不預言吉凶/不做醫投法斷言）、`parseTarotReading`（容錯 JSON）。
- **API** `/api/fortune/tarot`：GET 回顯今日已抽 + canDraw；POST 抽 3 張（**server 決定防作弊**）+ LLM 解讀 + upsert 存 `fortune_daily(kind=tarot)`。免費**每日 1 抽**（已抽回 429 + 附既有解讀）、付費/特權（`hasAiUnlimited`/`getUserSubTier`）當日可覆蓋再抽。
- **UI** `/fortune` 加展開式 `TarotSection`：提問輸入（可留空）→ 抽牌 → 三張牌卡（位置/牌名/正逆位）+ 逐張解讀 + 總結 + 一句建議；回顯今日、免費用完顯示「明天再抽」、付費可再抽。RWD + 亮暗。

### 🚨 收尾檢查（全綠）
- **API/DB**：無新表；`fortune_daily` 唯一鍵 `UNIQUE(user_id,date,kind)` 已用 pg 實測確認 → upsert `onConflict:"user_id,date,kind"` 正確解析。
- **建置**：`tsc` ✅ · `vitest` **164 passed（+7 tarot）** ✅ · `next build` exit 0（/api/fortune/tarot 編出）✅。
- **RWD/亮暗/機密**：grid/亮暗雙 token；未動 manifest/sw/.env.local。

### #1 剩餘（之後）
- 付費/Z幣 gating（§1.5，運勢四面向深解、塔羅無限）、八字/紫微（裝 lunar-javascript §1.1.1.2）、cron job #10🔴、首頁模式卡、截圖分享圖卡。

---

## 🎒 大眾變現 #3「AI 求職包」— 上線（0721）

先派 Explore 代理盤點「求職相關現有功能」，發現 **#3 大半已存在**：履歷(`/me/resume` 依學習資料即時生成)、面試模擬(`/me/mock-interview` 多輪對話+評分+`mock_interview_sessions` 歷史、5 模式 14 角色)、`/me/career-path` 求職閉環 funnel。**只缺自傳、求職信、以及一個統整 hub。** → 只補這三塊，不重造。

### 做了什麼
- **共用 lib** `src/lib/job-kit.ts`：`loadCareerData`（撈 profiles/lesson_progress/portfolios/certificates；**改兩段查 chapters 標題、不靠 PostgREST embed**——實測發現 lesson_progress↔chapters 無 FK relationship、resume 舊 code 是靜默降級成空章節，這裡修穩）、`buildBioPrompt`/`buildCoverLetterPrompt`（護欄：只依真實資料、不捏造）、`generateJobKitMarkdown`（模型解析 + callAI + 回 tokens）。
- **API**（鏡像 resume 的 requireAiAction 月配額 + admin_assistant 模型 + consumeAiTokens）：
  - `POST /api/me/job-kit/bio`（自傳、依學習資料 + 可選 focus、`bio` 3/月）。
  - `POST /api/me/job-kit/cover-letter`（求職信、需 company/jobTitle + 可選 jd/highlights、`cover_letter` 3/月）。
  - `AI_ACTION_CAPS` 加 `bio:3`/`cover_letter:3`（`consume_ai_action` RPC 是 generic text-keyed、**免 migration**、已實測 check_ai_action 兩型都 OK）。
- **前端** `/me/job-kit`（留在 /me 內、共用 auth/sidebar/quota，不另開 top-level）：履歷+面試入口卡 + 自傳/求職信兩個產生器（表單→生成→markdown 預覽→複製/下載.md/印 PDF，沿用 ResumeClient 的 renderMarkdown + `window.print()`）。
- **入口**：`MeSidebar` 加「🎒 AI 求職包」（置於履歷/面試上方）。

### 收尾檢查（全綠）
- **PDF**：專案無真 PDF 生成庫（`unpdf` 只是 parser）→ 沿用既有 `window.print()` + `@media print`（零新依賴）。要像素級再加 @react-pdf。
- **DB 接線實測**：loadCareerData 四查（profiles/lesson_progress/portfolios/certificates）+ chapters `.in()` 兩段查 = OK；`check_ai_action(bio/cover_letter)` = OK。
- **建置**：`tsc` ✅ · `vitest` **164 passed** ✅ · `next build` exit 0（/me/job-kit、/api/me/job-kit/{bio,cover-letter} 編出）✅。

### 大眾變現總進度（0721）
- ✅ #1 每日運勢（第一刀星座 + 第二刀塔羅） · ✅ #2 訊息軍師 · ✅ #3 AI 求職包 · ✅ #4.1 生活助理範本庫。
- 四大功能主幹全部落地。剩：各功能的付費 gating（#1.5/#2.4/#3.4）、#1 八字精算、#4.2 OAuth🔴/#4.3 沙盒🔴/#4.4 ROI、cron job #10🔴、首頁模式卡入口。

---

## 🏠 首頁「免費 AI 小工具」獲客區塊 — 上線（0721）

四功能主幹做完後、補上**首頁討喜的入口**（獲客漏斗的關鍵——這些工具就是要讓一般人從首頁點進來）。刻意做成**獨立 section**、不動 Hero/WorldZone 那套 5 層視差組合（那塊卡在生圖）。

- `src/components/home/FreeToolsSection.tsx`（server component、純 Link）：4 張漸層卡＝每日運勢🔮 / 訊息軍師💬 / AI 求職包🎒 / 生活助理🤖，各一句白話說明 + hover 動效。放在 `MascotIntro` 之後、章節地圖之前（顯眼但不搶 Hero）。
- 對齊首頁既有 section 樣式（`max-w-7xl mx-auto px-6 py-16 border-b border-border`）、RWD（1/2/4 欄）、亮暗 token。
- **收尾**：`tsc` ✅ · `next build` exit 0（91 靜態頁生成、`/` 正常）✅。
- 記憶：新增 `mass-market-features` memory（四功能位置/資料表/gating/待補），供下次開工不必重查。

---

## 📖 程式辭典每個詞條加「分享 + OG 圖」（0721·林董指定）

林董要「程式辭典每個幫我加上可以分享的功能 要 og」。因分享/OG 都掛在共用的 `/dictionary/[slug]` 頁，**一次改、1773 個詞條全部生效**。

- **OG 圖產生器** `src/app/api/og/dict/route.tsx`（edge runtime `ImageResponse`、鏡像既有 `/api/og/cert`）：分類色光暈 + 「📖 AI 島程式辭典」品牌 + 分類 chip + 大詞名 + 中文名 + plain 摘要 + langs + 站點；含 SVG fallback（Satori 失敗也不 500）。參數 `?term=&zh=&cat=&plain=&langs=`。
- **詞條頁 metadata**：`generateMetadata` 補 `openGraph` + `twitter`（summary_large_image）指向 OG 圖 → 貼到 LINE/FB/X/Threads 有漂亮預覽卡。
- **分享按鈕**：詞條標題列右上加 `ShareButton`（既有元件：手機原生分享 + 桌機 LINE/X/FB/複製連結 modal）。
- **收尾**：`tsc` ✅ · `next build` exit 0（92 頁、/api/og/dict + /dictionary/[slug] 編出）✅；RWD（標題列 flex justify-between、按鈕 shrink-0）。

---

## 📖 辭典 seed-41：DB/Git/K8s/LLM/分散式系統 33 條（0721·手寫零 API）

承林董「辭典優先」+ todo §4.2（→5000）。辭典已很滿（1773），先建**去重流程**再 author：cat 全 40 個 seed 抽 slug → grep 候選主題 → python 驗證無 collision 才寫。發現 DB/Git/雲原生/LLM 主幹詞多半已收，挑真正的縫隙。

- **seed-41（33 條、全查過 0 衝突、欄位齊全）**：
  - DB查詢：n-plus-1 / query-optimization / full-text-search
  - Git：detached-head / fast-forward
  - K8s雲原生：pod-k8s / container-orchestration / sidecar-pattern / k8s-namespace / horizontal-scaling / vertical-scaling / blue-green-deploy / rolling-update / infrastructure-as-code / ci-cd-pipeline / liveness-probe / readiness-probe
  - LLM：top-p-sampling / semantic-search / lora-finetune / mcp-protocol / tool-calling / function-calling
  - 分散式系統：idempotency / exponential-backoff / message-queue / pub-sub / two-phase-commit / bloom-filter / consistent-hashing / quorum / leader-election / gossip-protocol
- 每條：plain（功能＋**何時用**）＋生活比喻 analogy ＋可跑 example ＋ related 交叉連結，difficulty 2–3。
- **import 1806、失敗 0**；DB 實測 total=1806、新 slug 抽查 7/7 present。**辭典 1773 → 1806 / 目標 5000。**
- CLAUDE.md 進度指標更新（續寫從 seed-42 接、附 41 批主題）。
- 待辦：seed-41 之後跑 `translate-sync-all.mjs` 補 i18n（免費 Google、冪等）。

---

## 📖 辭典 seed-42：網路協定 / Web / 資安 / 加密驗證 41 條（0721·手寫零 API）

接續 seed-41、續攻辭典縫隙。發現網路/資安主題比前端/TS 更多沒收，挑真正的缺口（同樣先 cat 全 seed 抽 slug 驗無 collision）。

- **seed-42（41 條、0 衝突、欄位齊全）**：
  - 網路/協定：tls-handshake / mtls / dns-resolution / cname-record / mx-record / http2 / http3 / quic-protocol / mtu / packet-loss / latency-network / dns-over-https
  - Web/HTTP：preflight-request / same-origin-policy / csp-header / keepalive-http / chunked-transfer / etag-http / sni-tls
  - 資安/攻擊：mitm-attack / idor / ssrf / path-traversal / privilege-escalation / session-hijacking / replay-attack（category=error）
  - 加密/驗證：argon2 / pbkdf2 / hmac / certificate-authority / public-key-crypto / totp
  - Cookie/加固：httponly-cookie / samesite-cookie / secure-cookie / subresource-integrity
  - 營運資安：zero-trust / key-rotation / secrets-management / waf / nonce-crypto
- 每條 plain（功能＋何時用＋常見防禦）＋生活比喻＋可跑/可貼範例＋related。
- **import 1847、失敗 0**。**辭典 1806 → 1847 / 目標 5000。** CLAUDE.md 續寫指標→ seed-43。
- 本日辭典兩批共 +74 條（seed-41 33 + seed-42 41），皆手寫零 AI 花費。

---

## 📚 章節 de-can：ch01 HTML 全 25 節（0721·林董排第一優先）

盤點 ch01：**1.2–1.25 全是同一句罐頭練習**「打開 VS Code、建 HTML 檔、用本節標籤做個人介紹頁」+ 完全一樣的 hint（「課程內有 N 段 code 範例、先跑通再改」）+ 完全一樣的 answer（「三階段：完整 copy / 小改觀察 / 重寫」）。更糟的是自動抽的「標籤 fill」常是壞的——1.9=`@vercel/og`、1.12=`${name}: ${oldVal}`、1.22=`<Image>`（React 不是 HTML）、1.4/1.11 直接是亂碼片段。等於 24 節共用一題假練習。

- **全 25 節換成各節量身題**、題型刻意變化（應用/設計/除錯/比較/分析），每題 question/hint/answer 都扣該節主題、對零基礎友善：
  - 1.1 用比喻解釋 HTML/CSS/瀏覽器分工｜1.2 三個症狀（慢/標題空白/無預覽）對應 head 與 script 載入除錯｜1.3 div 湯改語意化骨架｜1.4 strong vs b、em vs i 判斷｜1.5 三種清單選 ul/ol/dl｜1.6 target=_blank 的 rel 安全 + img alt｜1.7 課表無障礙表格（th scope/caption）｜1.8 表單原生驗證（form/type/required/inputmode）｜1.9 社群分享卡 OG 標籤｜1.10 JSON-LD 富結果｜1.11 div 假按鈕→原生 button vs ARIA｜1.12 Web Component + attributeChangedCallback｜1.13 PWA manifest 為何要 192/512｜1.14 inline SVG vs img 時機｜1.15 font-display/fetchpriority 效能｜1.16 報名頁整合骨架｜1.17 article vs section 判斷｜1.18 自訂下拉的鍵盤無障礙清單｜1.19 fieldset/inputmode/readonly vs disabled｜1.20 新聞站 OG/Twitter 規劃｜1.21 商品頁 Product schema｜1.22 lazy/srcset/picture + 首屏別 lazy｜1.23 iframe sandbox 最小權限｜1.24 data-* 與全域屬性｜1.25 作品集頁上線前 8 點檢查表。
- **收尾**：Python 改（json.dump ensure_ascii=False indent=2 + \n、格式一致）→ diff 剛好 75+/75-（25×3 欄、無整檔重排）→ `import_chapters_to_db.mjs ch01`（25 lessons、0 errors）→ `tsc` ✅ / `next build` exit 0 ✅。章節讀 DB、已生效。
- 續攻：ch02/04/05/07–10/16/17/26–32/34–36/46…（§4.1.1）。

---

## 📚 章節 de-can：ch02 CSS 全 25 節 + 辭典 i18n 補譯一輪（0721）

- **ch02（CSS）de-can**：原本 22/25 節是「打開編輯器、把 code copy 進去、改 1-2 參數」罐頭練習（同 hint/answer）。全 25 節換成各節量身題（應用/設計/除錯/比較/分析），對零基礎友善：CSS 分離好處、選擇器三需求、特異性排勝負、box-sizing 算實際寬、display 三態選用、flex 導覽列、grid 相簿 auto-fill/minmax、position 五情境、HSL 調同色系深淺、字型堆疊+行高、box-shadow 四值、RWD mobile-first、CSS 變數切深色模式、transition vs animation、transform 效能、Sass mixin、Tailwind 取捨、CSS-in-JS、Design Token、動畫心理學、a11y 對比/焦點、捲動效能、版面除錯三兇手、上線檢查表。
  - Python 改（格式一致、diff 75+/75-）→ `import_chapters_to_db.mjs ch02`（25 lessons、0 err）→ tsc ✅ / next build exit 0 ✅。
- **辭典 i18n**：跑一輪 `translate-sync-all`（背景、免費 Google），本次翻 **1058 欄位×語言**（dictionary 達 500/輪上限 → seed-41/42 新詞已覆蓋、仍有 backlog；lesson 也有 backlog）。冪等、重跑即可清完。
- 本日章節 de-can 累計：ch01 + ch02（各 25 節）。續攻 ch04/05/07–10/16/17/26–32/34–36/46…

---

## 📚 章節 de-can：ch04 JavaScript 全 25 節（0721）

原本 ~20/25 罐頭練習。全 25 節換成各節量身題（多為除錯/預測/設計/分析型，貼近真實 JS 開發）：
JS 職責、var/let/const 選用、值 vs 參照預測、`0==''` 等 == 陷阱、箭頭函式 this、map/filter/reduce 三招、Map/Set/WeakMap 選用、class 私有欄位保護、原型鏈找方法、事件迴圈 A-D-C-B 排序、Promise.all vs 序列 await、generator 無限序列、事件委派省監聽、fetch 為何 404 不 reject、儲存選型與 token XSS 風險、Web Worker 不能碰 DOM、Wasm 適用場景、ESM vs CommonJS tree-shaking、設計模式勿過度、debounce/throttle 對症、XSS/CSRF/原型污染防禦、測試三層價值、記憶體洩漏三來源、正則手機驗證+災難性回溯、2026 新特性（?./??/structuredClone）。

- Python 改（diff 75+/75-）→ `import_chapters_to_db.mjs ch04`（25 lessons、0 err）→ tsc ✅ / next build exit 0 ✅。
- **本日章節 de-can 累計：ch01 HTML + ch02 CSS + ch04 JavaScript（各 25 節、共 75 題重寫）。** 續攻 ch05 TypeScript…

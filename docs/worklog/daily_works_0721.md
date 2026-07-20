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
- 下一步：辭典 seed-41 續寫、或手寫筆記/部落格種子 top-up（全手寫、不花 AI 錢）。

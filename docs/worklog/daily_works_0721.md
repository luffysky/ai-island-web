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

ch49 + ch50（AI Agent / n8n 兩大旗艦章）完成。**教具庫新增 2 個：AgentLoop、WorkflowFlow。** 下一步可續：ch06/11/12/14/15/23/24/25/37/42 薄章補厚，或辭典 seed-41 續寫。

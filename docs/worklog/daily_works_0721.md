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

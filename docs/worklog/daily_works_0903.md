# 工作日誌 · 2026-09-03

Nami 的真實回饋（附 `bug/bugpic/256.jpg`）：**「JSON 的介紹說明不詳細不清楚，重新編寫」「`with open` 跟 `class` 章節都寫得不清楚、看得很吃力」「我最不熟的好像就是 class」**。對應 Ch26《Python 基礎》的兩課，依 `docs/content/ch26_beginner_friendly_spec_v0.md` 的三條規則（英中對照＋白話、四種區塊標籤 📄🖥️⌨️💬、預設讀者零基礎）改寫。

---

## A. L14《檔案 I/O + with 語法》（lesson `26.8`）

原內容一開頭就丟 `f = open(...)`，沒解釋「開檔到底在幹嘛」、也沒拆 `with open(...) as f:` 這一行——零基礎會直接卡在第一段。

**新增：**
- **新 §「先搞懂：電腦『打開檔案』到底在幹嘛」** — open/close ＝ 跟作業系統借通道/還通道；圖書館借還書比喻；不關檔的真實後果（Windows 檔案被鎖、緩衝區沒寫入 → 內容缺一截）。
- **新 §「`with open(...) as f:` 逐字拆解」** — 把這一行拆成 4 格表格（`with` / `open(...)` / `as f` / `:` 加縮排各是什麼）；點名零基礎最常卡的三點：**`f` 不是內容是「檔案本人」**、**縮排就是檔案開著的範圍**、**不要自己寫 `close()`**。
- 模式表補 `"r"` 是預設值；「3 種讀法」原本卻列了 4 個（原文自相矛盾）→ 修正為 **4 種讀法**；`for line in f` 補「檔案物件本身就能 for」。
- 寫檔範例全部補 `encoding="utf-8"`（原本只有讀檔提、寫檔沒帶，會踩同一個雷）。

**JSON 段整段重寫（原本只有 3 個 code block、沒說 JSON 是什麼）：**
- **JSON 是什麼、為什麼需要它**（dict 活在記憶體、程式關了就沒了；別的語言看不懂 Python dict）＋ **宅配紙箱比喻**（dump 打包 / load 拆箱）。
- **JSON 檔實際長什麼樣**（含 `true` / `null` 的真實範例）。
- **Python ↔ JSON 型別對照表**（dict↔object、list↔array、`True`↔`true`、`None`↔`null`、tuple 會變 array、set/datetime 不支援）——這是「長得像 dict 但不一樣」的踩雷點。
- **4 個函式一張表 + 記法**：**「沒有 `s` 的跟檔案打交道、有 `s` 的跟字串打交道」**；補「什麼時候會用到 `loads`」（API 回來的文字）。
- **完整流程走兩遍**（📄 寫進程式檔 → 💬 電腦會顯示 / 檔案長怎樣），`json.dump(data, f, indent=2, ensure_ascii=False)` 四個參數用箭頭逐一標註。
- 補「檔案是雙引號、print 出來是單引號，**內容一樣、不是壞掉**」——這是實際會嚇到人的點。
- `ensure_ascii` 解釋它字面意思（確保只用 ASCII）＋ 為何預設會變 `\uXXXX`；datetime encoder 範例補中文註解。
- **新增「JSON 3 個最常見錯誤訊息 → 中文意思 → 怎麼修」對照表**。

## B. L16《OOP：class、繼承、dataclass》（lesson `26.10`）

Nami 明說「最不熟的就是 class」。原內容第一個 code block 直接是完整 class（含 class attribute、dunder、動態加屬性），資訊量太大且沒有逐行解釋。

**新增：**
- **新 §「先問：為什麼要有 class？」** — 先給**不用 class 的痛苦版**（dog1_name / dog2_name 一堆散變數 + 資料和行為對不起來），再說 class 是來解決什麼的。餅乾模比喻前移。
- **新 §「基本 class：一行一行拆開看」** — 先給最小可跑範例（只有 `__init__` + 一個 method），再 ①~⑥ 逐行拆：
  - `class Dog:` 命名慣例、縮排範圍
  - `__init__` **什麼時候跑**（`Dog(...)` 的那一瞬間、你永遠不會自己呼叫）
  - **`self.name = name` 兩個 name 的差別**（左邊＝存在物件身上的欄位、右邊＝傳進來就消失的參數）用表格講；並說明少寫 `self.` 會怎樣
  - method 為何第一個參數一定是 `self`
  - `Dog("Lucky", 3)` 只傳 2 個值但定義 3 個參數 → **`self` 是 Python 自動塞的**
  - `lucky.bark()` 實際上是 `Dog.bark(lucky)` — **點號前面的物件會被塞進 `self`**
- 完整版 code 保留，補「兩隻狗互不影響」的驗證行 + **屬性 vs 方法（有沒有括號）**的分辨法。
- **新 §「class 新手 4 大錯誤」對照表**：忘了 `self` 參數 / method 裡寫 `name` 而非 `self.name` / `name = name` 沒存進物件（不報錯最難查）/ `lucky = Dog` 少括號 —— 各給錯誤訊息與正確寫法。口訣：**「class 裡面凡是這個物件自己的東西，前面一定有 `self.`」**。
- 繼承段補「**Python 找方法的順序**」（自己沒有才往父類找，所以 Dog 沒寫 `eat`/`__init__` 也能用）＋ `super().__init__()` 忘了呼叫會怎樣。
- dunder 段開頭點明「**你已經見過一個了：`__init__`**」，把 dunder 從陌生概念接回已學的。
- dataclass 補 boilerplate 中譯、「用法完全一樣、只是少打 12 行」、`default_factory` 為何要這樣寫。
- `@property` 補「外面用的人不用改寫法」的好處。
- 結尾「用人話講」改成**三句話重點**（class 是藍圖 / `__init__` 何時跑 / `self.` 口訣）。

兩課的 `oneLineSummary`、`outline` 一併同步（26.8 舊 outline 還留著已不存在的「讀檔案」項）。

**篇幅**：26.8 `7,470 → 13,309` 字元、26.10 `8,147 → 12,882` 字元（**只加不刪**，原範例、深度、教學順序全保留）。

---

## 驗證（鐵規則）
- `node scripts/import_chapters_to_db.mjs ch26` ✅ 1 chapter / 38 lessons / 0 errors；回查 DB `lessons` 26.8=13,323、26.10=12,890 且含新段落（**線上讀 DB、不是 JSON**）
- `npx tsc --noEmit` ✅ 0 錯
- `npx vitest run` ✅ 34 檔 242 測試全綠
- `npx next build` ✅
- RWD：純內容改動；新增的表格都是 2~3 欄，`LessonCard.tsx:187` 的 `table` 已包 `overflow-x-auto`，code block 走既有 `CodeBlock`；表格管線數逐行核對一致（無破格）
- API/DB 欄位、PWA：未動

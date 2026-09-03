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

---

## B. 動態背景「只要粒子」模式（Nami 回饋 `bug/bugpic/257.jpg`）

回饋：**「設定動態背景平台會變成黑色」「幫我把動態粒子元素單獨提出來、背景變不透明」**。

**原因**：每個場景（`SCENES`）自帶一個 `base` 深色漸層（`DARK`/`NIGHT`/`CITY_*`…），`ProceduralScene` 把它鋪在整個固定背景層上；套用時 `html[data-bg-active] body { background-color: transparent }` 讓 body 透明 → **全站看到的底色變成場景的深色漸層**，主題色被蓋掉（亮色主題也整站變黑）。

**做法**：把「粒子」和「場景底色」拆開，只留粒子疊在 `<html>` 原本的不透明主題底色（`--color-bg`）上。
- `BackgroundSpec` 新增 `particlesOnly?: boolean`（`scenes.ts`）——**預設 true**（省略即「只要粒子」，舊 cookie/DB 也直接受惠、不用重新套用）；設 `false` 才回到舊行為（鋪場景深色底）。
- `ProceduralScene` 新增 `showBase` prop（預設 true）；`false` 時容器 `background: transparent`、只畫 canvas 粒子。
- **亮色模式粒子可見度**：沒有深色底時白雪/白星在淺色底上等於看不見 → 新增 `adaptColor()`，只要粒子 + `html[data-mode="light"]` 時把亮度 > 0.6 的粒子壓到約 0.34 亮度（**保留色相**，深色粒子與暗色模式原樣）。用 `Map` 快取、並掛 `MutationObserver` 監聽 `data-mode` 切換即時重算。`drawShape()` 改吃現成的 `col` 字串。
- `BackgroundLayer`：`particlesOnly = scene.kind === 'dynamic' && spec.particlesOnly !== false`（**靜態場景只有底色沒粒子 → 一律照鋪**）；只要粒子時也跳過 `overlayColor` 遮罩（否則會染整頁）。
- `/background` 選擇器：加「**只要粒子（保留平台底色）**」勾選框（只在選到動態場景時出現、預設勾），大預覽框跟著切 `bg-bg`／`bg-bg-elevated` 即時看效果；套用時把旗標一起送出。場景縮圖仍用 `sc.base` 當識別色。
- `/api/background/apply`：白名單加 `particlesOnly`（存 `profiles.active_background` + `ai_bg` cookie）。

## 驗證（鐵規則）
- `npx tsc --noEmit` ✅ 0 錯
- `npx vitest run` ✅ 34 檔 242 測試全綠
- `npx next build` ✅
- API/DB：**無 migration**（`particlesOnly` 存在既有 `profiles.active_background` jsonb 內）；API ↔ 前端欄位名一致
- UI 有接對：勾選框 → `apply()` body → API 白名單 → cookie/DB → `BackgroundLayer` 的 `showBase`（全鏈路通）
- RWD／桌面：新增的只有一個 `flex items-start` 全寬勾選列（文字自動換行、無固定寬），窄寬螢幕都不溢出
- PWA：未動

---

## C. 修 CI：GHCR image build 掛在 Playwright 安裝那步（擋住 B 的上線）

B 推上去後 `docker.yml` 的 buildx 失敗：
```
process "/bin/sh -c if [ -n \"$INSTALL_SERVER_BROWSER\" ]; then ... npm i playwright@1.58.2 --no-save ..." did not complete successfully: exit code: 1
```

**根因**：那步在 **`/app`** 裡跑 `npm i`。runner 階段的 `/app/package.json` 是 Next standalone 抄過去的**整包專案** package.json（上百個 deps + devDeps），但 `/app/node_modules` 只有 trace 過的 ~38 個套件 → npm 會想把整棵樹重裝；而 runner 階段**沒有 `.npmrc`**（`legacy-peer-deps` 只在 deps 階段 COPY），tiptap 的 peer 衝突就會 ERESOLVE → exit 1 → 整個 image build 紅掉、Zeabur 拿不到新 image。

**修法**（`Dockerfile`）：
- 其實 `playwright` / `playwright-core` 的 JS 套件**本來就被 trace 進 image**（`.next/standalone/node_modules/` 裡有），runtime 的 `import("playwright")` 直接可用 —— 缺的只有「瀏覽器二進位 + apt 系統相依」。
- 改成在 **`/opt/pw`** 開一個獨立的小 package.json 裝 playwright（純粹為了跑它的下載器），**完全不碰 `/app`**；版本用 `node -p require('/app/node_modules/playwright-core/package.json').version` 自動對齊（免得 browsers revision 跟 image 內的 core 對不上）。裝完 `rm -rf /opt/pw /var/lib/apt/lists/* /root/.npm`，只留 `/ms-playwright`。
- **整段包成 `( … ) || echo`、永不擋部署**：`browser.render`（`src/lib/agent/tools.ts:284`）本來就 graceful（沒瀏覽器就回「請改用 web.research / web.fetch」），選配功能不該讓 image build 變紅。
- ⚠️ 串接用 **`&&` 而不是 `set -e`**：`set -e` 在 `( … ) || …` 的左側子 shell 內是**無效**的（POSIX：狀態被測試的指令不套用 -e）——本機實測舊寫法失敗後還會繼續往下跑、最後印「安裝完成」假成功。

**驗證**：把該 RUN 的 shell 抽出來（照 Docker 的 `\`+換行併行規則）跑 `sh -n` ✅ 語法過；實跑「未設 ARG」→ 印 skip、exit 0；「設 ARG 但故意失敗」→ 印 WARN、exit 0（不會擋 build）。下次 build 看 log 的 `[server-browser]` 那幾行就知道 Chromium 有沒有真的裝起來。

**追加**：「只要粒子」勾選框原本只在「已選到動態場景」時才 render → 開頁面是「無背景」的人（＝一般情況）根本看不到它、也就不知道有這個開關。改成**一律顯示**，沒選到動態場景時 `disabled` + `opacity-60` 並換成引導文案（「先挑一個標『動態』的場景」）。

**注意**：線上 `/api/version` 顯示 commit `d435439`、`builtAt 2026-08-23` → **8/23 之後所有 commit 都沒真的部署過**（Playwright 那步每次都讓 image build 掛掉）。C 修好之前的東西全部積在 git 沒上線。

---

## D. 主題 × 背景要一起考量（Nami 回饋）

「只要粒子」模式下、粒子的底色其實**就是主題的 `--color-bg`** → 這兩個系統不能各做各的。

- **粒子顏色改看「實際底色亮度」、不再看 `data-mode`**：主題是使用者在 `/theme-studio` 自己調的，`--color-bg` 什麼顏色都可能、亮暗也**不保證跟 `data-mode` 一致**（自訂主題可以在暗模式用淺底）。新的 `src/lib/background/particle-color.ts`（純函式）：`ancestorBgLuminance()` 往上找第一個真的有畫底色的祖先量亮度 → 淺底(>0.55)+亮粒子 → 壓暗；深底(<0.45)+暗粒子 → 提亮；都等比縮放 RGB **保留色相**。
- **監聽主題變動即時重算**：`MutationObserver` 盯 `<html>` 與父層的 `style` / `class` / `data-mode` / `data-palette` / `data-theme`（Theme Studio 是把變數寫在預覽框自己的 `style` 上、不是 `<html>`）。
- **Theme Studio 即時預覽把背景畫進去**：讀 `ai_bg` cookie → 預覽框內直接跑 `ProceduralScene`（`showBase={!particlesOnly}`），旁邊一行寫「目前背景：X（只要粒子）」+ 連到 `/background`。調主題時粒子就飄在預覽的底色上、當場看得出搭不搭。
- **修 `applyThemeToPreview` 的既有 bug**：它用 `el.style.cssText = …` 整條覆蓋 → 把 React 寫在 style prop 上的 `background/color/border-color` **洗掉**，而且 props 沒變 React 不會補回來 → 預覽框其實一直是「站台的卡片底色」而不是「預覽中那個主題的底色」。現在 cssText 尾巴自己帶上這三個。
- **兩頁互相接起來**：`/background` 加「底色來自主題 → 去主題工作室調底色」、Theme Studio 加「去換背景」。
- **共用工具**：`readBackgroundCookie()` / `isParticlesOnly()` 移到 `lib/background/scenes.ts`，`BackgroundLayer` 與 Theme Studio 共用同一份判斷（免得兩邊各判各的、對不起來）。

## 驗證（鐵規則）
- 新增 `tests/background-particles.test.ts`：14 個 case（亮度解析 / 壓暗提亮 / 保留色相 / 壞字串不炸 / `isParticlesOnly` 各種 spec 與靜態場景例外）
- `npx tsc --noEmit` ✅、`npx vitest run` ✅ **34 檔 256 測試**、`npx next build` ✅
- API/DB：未動（`particlesOnly` 仍走既有 `profiles.active_background` jsonb）
- RWD／桌面：新增的都是全寬 `<p>` 說明列與預覽框內的 canvas（`overflow-hidden` 不外溢）


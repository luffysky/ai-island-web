# Daily Works — 2026-06-11

董事長林董（Luffy Lin）。雪鑰值班。
主題：**ch26 圖改檔名破快取 → 綠寶記住所選模型 → 記住上次看到的段落可一鍵 / 透過綠寶跳轉 → 綠寶/Admin 浮層永遠蓋在章節大綱上 → 桌機大綱展開不鎖內容捲動**。

---

## 🖼️ Ch26 圖快取吃到舊圖 → 改檔名破快取
- 瀏覽器 / CDN 一直吃到舊版圖。檔名統一加 `_v1` 後綴強制重抓（git 認出是 100% 純改名、內容不變）。
- `ch26.json` 內 9 張 dark 引用同步改 `_v1`（light 由 LessonImage 自動推導，不用改）。

## 🤖 綠寶 — 記住所選 AI 模型（task 2）
- 症狀：選過模型，重新整理 / 下次再進網站又變回「Auto（依難度自動選）」。
- 修：選的模型（含 Auto）寫進 `localStorage`（`ai_tutor_model`），重整 / 回訪都還在。
- 防呆：models 載入後驗證，若後台把該模型停用了 → 自動退回 Auto，不卡死。

## 📍 記住「上次看到的段落」+ 跳轉（task 3）
長章節找上次讀到哪很花時間。新增整套「續讀」：
- `src/lib/reading-position.ts`：localStorage 記每章一筆 + 全站最後一筆（client-only、不碰 DB）。
- `ChapterView` 用 **IntersectionObserver** 追視窗最上方的 lesson、停 1.2s 才寫（不狂寫）。
- 重開章節頂部出現「**繼續上次閱讀 · LESSON X.X**」橫幅、一鍵平滑捲回並高亮 2 秒（在第一節就不打擾、帶 hash 跳轉時不顯示）。
- 綠寶空狀態加「**📍 跳到我上次看的段落**」：同章直接捲、跨章導去 `/chapters/<id>#lesson-<id>`（ChapterView 既有 hash 跳轉接手）。
- LessonCard 補 `data-lesson-id` 給 observer 用。

## 🟢 綠寶 / Admin 浮層 — 永遠蓋在章節大綱上（task 4）
- 一開始：綠寶 z-30 / Admin z-40 被左側大綱（aside z-50）蓋住 → 先把兩者拉到 **z-55**。
- 林董補充：「**就算大綱展開也要蓋在上面**」。但大綱展開原本註冊成一般 overlay → 連帶把綠寶/Admin 一起隱藏。
- 修 overlay-stack：新增 `navCount`（導覽抽屜專用）+ `useModalOverlayCount()`（= 非導覽 overlay 數）。
  - 綠寶 / Admin 改用它：**只有真 modal / dropdown / 聊天面板開才隱藏，章節大綱展開不算** → 配合 z-55 直接浮在大綱上。
  - Pet / Todo 維持原樣（大綱展開仍讓位）。

## 📜 桌機大綱展開 → 內容頁滑不動（修）
- 林董：「為什麼大綱展開 內容頁面就沒辦法動」。
- 主因：SideNav 一律以 `lockScroll=true` 註冊 overlay → 連**桌機常駐側欄**展開都鎖了 body scroll。
- 桌機大綱是「常駐側欄」、展開只把內容往右推、頁面本該照滑；手機才是「抽屜 modal」要鎖背景。
- 修：用 `matchMedia(min-width:1024px)` 判斷——**只有手機抽屜開啟才註冊鎖捲動 + Pet/Todo 退位；桌機展開不註冊**（不鎖、綠寶/Admin 仍 z-55 蓋在上面）。

---

# 📋 待辦 / 提醒（延續）

## 要林董手動處理
- **Gemini 儲值**：ai.studio → Billing → 加值 prepaid credits（不然持續 429）。
- **Supabase 慢回應**：模型清單重試擋大部分「只剩 Auto」，根因仍是實例回應慢。

## 可選 / 實機驗收
- 桌機展開「章節大綱」滑內容應可正常捲；綠寶/Admin 不論收合或展開都壓在最上層可點；碰到真彈窗才讓位。
- 選個模型重整看是否記住；章節中段離開再回來看「繼續上次閱讀」橫幅 + 綠寶「📍跳到上次段落」。

---

## 📦 本日 commit（上半）
`13e75fe` ch26 圖改檔名 _v1 破快取 + json 路徑 ·
`86cbcf7` 記住所選模型 + 記住上次段落可跳轉 + 綠寶/Admin z-55 ·
`547f133` 大綱展開時綠寶/Admin 仍蓋在上面（navCount） ·
`e80549e` 桌機大綱展開不鎖捲動、內容可滑。

---

# 🌙 續（同日大批）— Capitalize 修正 → 圖片規格 → Python 新章 → 全站健檢

## 🐍 capitalize() 範例修正（ch26）
- 林董抓到：`s = "  Hello World  "`（開頭空白）上做 `capitalize()`、Python 實際回 `'  hello world  '`（首字是空白、不會大寫任何字母）、與說明「第一個字大寫」矛盾。
- 改用 `'hello world'.capitalize()` → `'Hello world'`、並補開頭空白的眉角。`s` 保留空白（strip/find/startswith/replace 等下游範例仍依賴）。
- 順手核對整章大小寫/切片/進位/f-string/list/set 範例、全對。

## 🎨 LESSON_IMAGE_SPEC：A 回填 + 新增 G 區 + 出圖提示詞
- A 區 ch26 回填實際佈線檔名（9 張 ✅）。
- 新增 **G 區**＝ch26–30 ＋ 28.a/28.b 權威工作清單（命名規格 dark/light + _v1、含完成狀態）。
- **G-0 出圖提示詞**：主提示詞模板（填空式、含配色/版面/深淺兩版）+ 操作型/概念型修飾語 + 3 個照抄即用範例。

## 🆕 Python 新章：Ch28a 機器學習 + Ch28b 深度學習（各 25 課）
- 依 `docs/ch26_beginner_friendly_spec_v0` 寫（零基礎、術語英中對照、四區塊標籤 📄🖥️💬、☕用人話講）、排序在 ch28 之後（28→28a→28b→29、id 77/78、sortIndex 28.5/28.7）。
- **Ch28a（25 課）**：基礎/資料清理/特徵工程 → 七種演算法（線性·邏輯迴歸/決策樹/隨機森林/KNN/SVM/XGBoost）→ 過擬合·交叉驗證·評估指標·調參 → Pipeline/K-means/PCA/不平衡資料/SHAP 解釋性 → 收尾。
- **Ch28b（25 課）**：神經元/層/激活函數 → 前向·反向·梯度下降·優化器 → PyTorch（tensor·autograd/訓練5步/分類/批次/防過擬合）→ CNN·RNN·Transformer·Embedding → 遷移學習·Hugging Face·生成式AI·訓練曲線診斷·限制與風險·部署 → 收尾。
- 註冊 chapters.ts + chapter-display.ts；**林董授權後直接 import 進 DB**（各 25 課、一次 Cloudflare 522 retry 即過）。
- **佈線 26 張教學圖**（G-4 12 + G-5 14、只寫 dark、light 自動推導）；⚠️ 圖尚未生成、放進 `public/lesson-img/ch28a|ch28b/` 即生效。

## 🔍 全 79 章 / 1207 課內容健檢（scripts/_audit-content.mjs）
- JSON 全合法、無重複 lesson id、code fence 全平衡、**無壞圖連結**、算式無實錯（6 筆浮點/abs 誤報）。
- 🔴 揪到真問題：**ch03（UI/UX）3.3~3.14 有 14 個程式碼框被佔位「稍後將補回」卡住** → 全補上真實可動 HTML/CSS 範例（壞vs好排版/Modal/Form/Empty·Skeleton·Error/Toast/ARIA）。

## 🛠️ 側欄筆記/收藏/歷程讀不到 → DB RLS 修
- 診斷：notes 的 `notes_select_shared` 政策呼叫 `is_note_collaborator()`、該函式對 **anon 已被 REVOKE EXECUTE**、未登入/session 未水合 時讀 notes 直接 ERROR、連帶側欄三分頁全空。
- CASE 包不住（Postgres 對政策引用的函式照樣查 EXECUTE 權限）→ 正解：**把協作政策限定 `TO authenticated`**、anon 根本不套用、不引用函式、安全回空；登入者照常。
- 林董授權後**直接套用 prod 並驗證**（anon 讀 notes 不再報錯）。

## 🧮 順帶回答：專案有 8 套自寫演算法
`src/lib/`：#1 筆記間隔複習(SM-2)、#2 AI 模型路由(綠寶 Auto)、#3 論壇 HN 排序、#4 動態 XP、#5 Thompson Sampling A/B、#6 朋友推薦 feed、#7 ELO 自適應出題、#8 章節推薦；外加 embeddings(RAG) + gamification。

## 📋 待辦 / 提醒
- **生 26 張圖**：用 G-0 提示詞模板生成、放進 `public/lesson-img/ch28a|ch28b/`（dark+light 一組）、破圖即消失。
- 28a/28b 上線後實機翻一遍、確認顯示順序與內容。

## 📦 本日 commit（續）
`035c139` capitalize 範例修正 · `f10cce0` 圖規格 G 區 · `c197460` G-0 出圖提示詞 ·
`54d3199` 新增 28a/28b（首批） · `e423f1f` ch03 補 14 HTML 範例 + 健檢工具 ·
`6f4d4e3`/`a884b3d` notes RLS 修（TO authenticated、已套 prod） ·
`235a6ac` 28a 擴到 25 課 · `b95f823` 28b 擴到 25 課 · `c77caef` 28a/28b 佈線 26 圖。

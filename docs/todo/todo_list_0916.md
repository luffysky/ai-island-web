# 待辦 · 2026-09-16（專項）

> 現行主檔待辦仍是 `docs/todo/todo_list_0806.md`。本檔獨立追蹤 **Nami 0916 反饋的大型內容工程：ch26/ch27 重寫教學方式 + 程式碼註解**（量大、分批、需獨立列管）。

---

## 🔴 ch26 / ch27「程式碼註解改寫成初學者一行一行白話」

### 背景（Nami 0916 原話）
- 「最近直接看資料分析篇章（ch27）但很多看不懂」「程式碼的註解我都沒看懂，因為它都是簡單註解」。
- 「叫 Claude 教我 pandas，Claude 是一行一行解釋得超清楚、用初學者都懂的方式，每一行都能非常淺顯易懂敘述每行在幹嘛」。
- 「**26、27 章都要**」「用初學者能理解的方式教學」「覺得教的方式不夠基礎，尤其程式碼註解」。
- 佐證截圖：`bug/bugpic/259.jpg`、`261.jpg`（看不懂的精簡註解，如 `# 3x3 全 1`、`# mean=0, std=1`、`# 之後所有 random 都相同`、`# 均勻 [0,1)`）；`260.jpg`（**目標風格＝「這個是 claude 教我的」**）。

### 目標風格（照 bug 260）
- 程式碼**每一行下方**加**完整句子**的白話說明 ＋ 生活比喻（如「Excel 裡的一欄數字」）。
- 解釋「這個函式在做什麼、每個參數是什麼、變數現在裝了什麼」——不是右側對齊的精簡標籤/術語。
- code fence `text → python`（有語法 highlight）。
- 對症「初學者卡點」：`全1/全7`→「裡面每一格都是 1／都填 7」、`均勻[0,1]`→「0~1 之間每個數字被抽到機會差不多」、`mean=0 std=1`→「平均約 0、標準差約 1」、`seed`→「隨機的起始密碼，設一樣每次結果就一樣」、`axis=0/1`→「上下壓扁算每行／左右壓扁算每列」等。
- 遵循 `docs/content/ch26_beginner_friendly_spec_v0.md`（術語英中對照 + 四種區塊標籤 📄🖥️⌨️💬 + 預設讀者零基礎 + ☕用人話講）。不對學員掛保證。

### 進度
- [x] ~~**ch27 L3「NumPy」立標竿**~~ ✅ 0916（commit `eb7c17ca`）——8 個 code block 全改 `python` + 逐行白話，6002→7121 字，import DB。＝Nami 直接截圖那課。**待她確認風格**再滾動套用其餘。
- [ ] **ch27 其餘 24 課**（L1、L2、L4~L25）逐課改寫 code block 註解。
- [ ] **ch26 全 38 課**逐課改寫 code block 註解。

### 執行方式（每批）
1. 讀該課 `content`（markdown 內嵌 fenced code）。
2. 把 code block 的精簡註解改成「逐行白話 + 比喻」（照上面目標風格、參考 27.3 標竿）。
3. **用 Python 改 chapter JSON**（`json.dump(ensure_ascii=False, indent=2)+"\n"`；別用 JS 免整檔 diff）。
4. `node scripts/import_chapters_to_db.mjs ch27`（或 ch26）同步 DB。
5. 鐵規則 build gate（tsc / vitest / next build）綠 → 更新工作日誌 → commit / push。
6. 量大 → 分批 commit；風格鎖定後可考慮平行子代理（各領不重疊的課、我彙整套用、再統一驗），但語氣/品質要跟 27.3 一致。

### 注意
- 章節內容是**從 DB 讀**（`@/lib/content`）→ 改完 JSON **一定要跑 import_chapters_to_db.mjs**，否則線上是舊的（見 CLAUDE.md）。`/chapters/[id]` revalidate=60、改 DB 即時生效、不用 rebuild image。
- 純內容/註解改寫、程式邏輯不變；code block 多為展示用（非 playground），改 `text→python` 只影響 highlight、不影響執行。

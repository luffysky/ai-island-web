# 工作日誌 · 2026-09-16

## 🐛 bug 258：章節浮動標籤拖到頂被導覽列蓋住、點不到也拖不出來

**現象**（`bug/bugpic/258.jpg`）：章節閱讀頁的浮動筆記標籤（「筆記 · LESSON 27.1」）被使用者拖到畫面最上面後，卡在頂部導覽列底下——被蓋住看不到、也點不到、拖不回來。

**根因**：
- `TopNav` 是 `sticky top-0 z-40`、高 `h-14`(56px)、且有 `backdrop-blur` 自成堆疊脈絡。
- `FloatingNoteButton`（`fixed bottom-24 left-4 z-40`）拖曳 clamp 用 `minY = -(innerHeight - 160)`，換算後鈕的**上緣可到約 24px**＝深入 56px 導覽列底下。同為 z-40 又被導覽列的堆疊脈絡蓋過 → 卡死。

**修法**（`src/components/chapter/FloatingNoteButton.tsx`）——雙管齊下（含 Nami 建議的「調整圖層順序」）：
- **① 圖層順序（Nami 建議）**：觸發鈕 `z-40 → z-50`，蓋在 TopNav(z-40) 之上 → 就算重疊也點得到、不會被遮。（鈕原本跟導覽列同層 z-40、又被導覽列的 backdrop-blur 堆疊脈絡蓋過，才會卡死。）
- **② clamp**：抽出共用 `clampNoteBtnPos()`，把拖曳 offset clamp 回可視範圍、**上緣不高於 `NAV_SAFE_TOP=72`**（導覽列 56 + 16）→ 讓鈕留在導覽列下方、不會反過來擋住導覽列的按鈕。三處統一用它：載入還原（**舊壞位置自動拉回、重整即自癒**）、拖曳中即時 clamp、放開存檔。DRY 掉原本重複兩份 clamp。
- 兩者互補：z-50 保證「永遠點得到」、clamp 保證「不擋導覽列且拿得回」。

**順帶修同類 bug**（`src/components/admin/AdminFloatingToolbar.tsx`）：admin 浮動工具列的 `clampToViewport` 上緣只 clamp 到 `y≥8`、同樣會被拖到導覽列底下。改成 `y≥NAV_SAFE_TOP(64)`。（使用者本身是 admin、也會踩到。）

**驗證**：`tsc --noEmit` ✅、`vitest run` ✅ 256 測試全綠、`next build` ✅。純前端 clamp 邏輯、無 DB/API 變動。

> 章節浮動標籤 = `FloatingNoteButton`（顯示當前 lesson、可拖曳做筆記）。

### 🔁 補正：真正被蓋住的是「章節大綱 FAB」不是筆記鈕

Nami 回報「章節那個選單拖到 header 還是被蓋住」→ 重查發現**第一版修錯元件**。截圖紅框那顆在**左上角**、是 `SideNav` 的「**章節**」浮動鈕（開章節大綱抽屜、`useDraggableFab("chapter-nav-fab-pos")`）——底部的「筆記 · LESSON」是另一顆(FloatingNoteButton、在預設位置沒被拖)。這顆章節 FAB 原本 `fixed left-3 top-[4.5rem] **z-30**`，比 TopNav(z-40) **還低** → 拖到頂被導覽列蓋住（正是 Nami 說的「調整圖層順序」）。

**真正修法**：
- `SideNav.tsx`：章節 FAB `z-30 → z-50`（蓋在導覽列之上）。
- `use-draggable-fab.ts`（共用 hook、章節 FAB + admin aside FAB 都用）：加 `minTop=64` 參數，拖曳與載入都 clamp 上緣不進導覽列；**載入時 re-clamp → 已卡住的舊位置自動歸位（重整即自癒）**。一次修好兩顆 FAB。
- 前一版對 `FloatingNoteButton` 的 z-50+clamp 保留（它本來也是 z-40-under-nav、順手更穩，只是不是這次回報的那顆）。

tsc/next build 綠。（提醒：元件改動要等 GHCR image 重建 + Zeabur 重部署才生效、非 DB 即時。）

---

## 📚 Nami 反饋：ch26/ch27 程式碼註解太精簡、初學者看不懂 → 改寫成「一行一行白話」教學

**Nami 原話**：最近看資料分析篇（ch27）很多看不懂，程式碼註解都太簡單（如 `# 3x3 全 1`、`# mean=0, std=1`、`# 之後所有 random 都相同`）看不懂在說什麼；希望像 Claude 教 pandas 那樣「一行一行、用初學者都懂的方式」解釋每行程式碼在幹嘛。ch26、ch27 都要。

**目標風格**（來自 bug 260「這個是 claude 教我的」）：程式碼下方逐行加**完整句子**的白話說明＋生活比喻（如「Excel 裡的一欄數字」），解釋每個函式/參數在做什麼、變數現在裝了什麼——而不是右側對齊的精簡標籤。

**Phase 1（本次·先立標竿）**：改寫 Nami 直接點名的那一課 **ch27 L3「NumPy」**（含 bug 259/261 那個 numpy 建立陣列 block）：
- 8 個 code block 全部 `text → python`（有語法highlight）＋每行下方加白話註解。
- 直接對症她看不懂的：`全1/全7` → 「裡面每一格都是1 / 都填7」、`均勻[0,1]` → 「0~1 之間每個數字被抽到機會差不多」、`mean=0 std=1` → 「平均約0、標準差約1」、`seed` → 「隨機的起始密碼，設一樣每次結果就一樣」、`axis=0/1` → 「上下壓扁算每行 / 左右壓扁算每列」逐一白話。
- 6002 → 7121 字。import ch27 已同步 DB。

> **待 Nami 確認風格** 再滾動式套到 ch26(38 課)+ch27(其餘 24 課) 全部 code block——先立一課標竿、避免整批改完才發現風格要調。此為大型內容工程、分批進行。

**Phase 1.5（0917·風格確認 + ch27 L4）**：
- Nami 再給 bug 260/262（pandas Series 建立、選取資料 df[]/.loc/.iloc）「**要像這樣清楚**」→ 跟 27.3/27.4 逐行白話完全一致＝**風格鎖定**，可放心滾動。
- 改寫 **ch27 L4「Pandas 瑞士刀」**（Nami 正在讀、bug 260/262 內容就在這課）：9 個 code block 全 `text→python`+逐行白話——DataFrame/Series 建立(含排出來長怎樣)、選取 df[單欄]回Series/df[[多欄]]回DataFrame/.loc標籤vs.iloc位置(切片含尾差異)、缺值 NaN、groupby/pivot_table、merge on/how、pd.cut/apply、to_csv 各參數。4886→6482 字，import DB。commit 見下。

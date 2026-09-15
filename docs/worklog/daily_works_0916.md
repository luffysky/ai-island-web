# 工作日誌 · 2026-09-16

## 🐛 bug 258：章節浮動標籤拖到頂被導覽列蓋住、點不到也拖不出來

**現象**（`bug/bugpic/258.jpg`）：章節閱讀頁的浮動筆記標籤（「筆記 · LESSON 27.1」）被使用者拖到畫面最上面後，卡在頂部導覽列底下——被蓋住看不到、也點不到、拖不回來。

**根因**：
- `TopNav` 是 `sticky top-0 z-40`、高 `h-14`(56px)、且有 `backdrop-blur` 自成堆疊脈絡。
- `FloatingNoteButton`（`fixed bottom-24 left-4 z-40`）拖曳 clamp 用 `minY = -(innerHeight - 160)`，換算後鈕的**上緣可到約 24px**＝深入 56px 導覽列底下。同為 z-40 又被導覽列的堆疊脈絡蓋過 → 卡死。

**修法**（`src/components/chapter/FloatingNoteButton.tsx`）：
- 抽出共用 `clampNoteBtnPos()`：把拖曳 offset clamp 回可視範圍，且**上緣不得高於 `NAV_SAFE_TOP=72`**（導覽列 56 + 16 間距）。
- 三處統一用它：① 載入時從 localStorage 還原（**舊的壞位置會自動被拉回安全區**→ 使用者重整即自癒）② 拖曳中即時 clamp（鈕停在導覽列下緣、不會滑進去）③ 放開存檔時 clamp。
- 順手 DRY 掉原本重複兩份的 clamp 邏輯。

**順帶修同類 bug**（`src/components/admin/AdminFloatingToolbar.tsx`）：admin 浮動工具列的 `clampToViewport` 上緣只 clamp 到 `y≥8`、同樣會被拖到導覽列底下。改成 `y≥NAV_SAFE_TOP(64)`。（使用者本身是 admin、也會踩到。）

**驗證**：`tsc --noEmit` ✅、`vitest run` ✅ 256 測試全綠、`next build` ✅。純前端 clamp 邏輯、無 DB/API 變動。

> 章節浮動標籤 = `FloatingNoteButton`（顯示當前 lesson、可拖曳做筆記）。z-index 不動（維持 z-40）；靠「拖不進導覽列區」根治，比拉高 z-index 疊在導覽列上更乾淨（不會擋到導覽列控制項）。

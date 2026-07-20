# 工作日誌 2026-07-18

> （0721 回補）依 git 紀錄重建。本日主題＝**互動教具層 L3 起步 + 內容重寫範本章 ch51**。

## 🎮 互動教具層 L3 — 兩個通用教具上線

延續 0717 的教具 POC（LayoutGallery），本日再做兩個跨章通用的引導式互動教具，補進 `src/components/chapter/demos/` + `LessonDemos.tsx` 派發器。

### box-model 盒模型教具（commit `c15fb372`）
- **`BoxModel.tsx`**：點/拉調整 `margin` / `border` / `padding` / `content` 四層，即時看 CSS 盒模型怎麼疊、總寬高怎麼算；`box-sizing: content-box vs border-box` 的差異一眼看懂。
- 掛載 **ch02.3（盒模型）**；`types.ts` 加 `'box-model'` 型別、派發器加 case。
- RWD：預覽 `maxWidth:100%`、控制列 flex-wrap、亮暗 token。

### prompt-lab 提示詞實驗教具（commit `f45e5775`）
- **`PromptLab.tsx`**：config 驅動的 prompt 實驗場——引導學員改 prompt 的關鍵句、對照「模糊 vs 具體」提示詞會拿到怎樣不同的 AI 輸出；教「怎麼把需求講清楚」。
- 掛載 **ch51.1**（AI 全系列通用的入門教具）；`types.ts` 加 `'prompt-lab'`、派發器加 case、吃 `demo.config`。

## 📚 內容重寫 — 範本章 ch51 六課全深度重寫（commit `d8cd32a9`）

- ch51 當「**深度＝完整走查 + 成品**」的**範本章**先行（0717 audit 定案的重寫標準：不停在表面、每課帶可驗證成品、練習對得上主題、去罐頭）。
- 六課走 **prompt → AI 輸出 → 批改 → 成品走查** 的一條龍，讓後續章節照這個模子重寫。

## 🚨 收尾檢查（鐵規則）
- **DB 同步**：`import_chapters_to_db.mjs ch02` / `ch51`（章節讀 DB 非 JSON）；demos 欄位 DB 驗證有值。
- **建置**：`tsc --noEmit` ✓ · `vitest run` ✓ · `next build` ✓。
- **RWD / 亮暗**：兩教具皆 flex-wrap / 無寫死寬 / 亮暗 token。
- **教具庫進度**：LayoutGallery(0717) + BoxModel + PromptLab。

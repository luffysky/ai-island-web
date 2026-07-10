# AI 島（ai-island-web）— Codex / AI agent 工作須知

繁體中文專案。Next.js 15 App Router + Supabase + Zeabur。站點：ai-island-web.snowrealm.pet
完整細節見 `CLAUDE.md`；本檔是給 Codex / 其他 AI agent 的重點與**鐵規則**。

---

## 🚨 鐵規則：每次 commit / push 前一定要跑完這張檢查清單

**不准跳過。任何一項沒過就不 commit、不 push。** 全部綠燈後「先更新工作日誌」再 commit / push。

1. **API / 資料庫 / 資料表**：這次改動有沒有需要**跑腳本 / 建表 / 改欄位**？
   - 新增或改欄位/表 → migration 有沒有跑？（`supabase/*.sql`）
   - 內容有沒有需要跑 seed / import / 生成腳本才會生效？（章節要 `node scripts/import_chapters_to_db.mjs`；部落格/留言等寫 DB 的內容跑對應 script）
   - **API ↔ 前後端 ↔ 欄位有沒有接對**：前端打的 API 真的存在、回傳欄位名跟前端一致、DB 欄位真的存在（`node scripts/audit-db-columns.mjs` 可驗），不要有「有 UI / 有表但沒真接」的假功能。
2. **UI 有沒有接對**：畫面上每個按鈕 / 表單 / 資料，背後 API 與資料流真的通，不是空殼。
3. **RWD（手機版）不要破版**：所有動到的介面在窄螢幕都不能溢出/跑版；超出用 scroll、別 hidden 硬切。
4. **桌面版也不要破版**：不是只顧手機——**所有介面、桌面寬螢幕一樣要檢查**，版面/對齊/間距都正常。
5. **PWA**：有沒有影響 PWA（manifest / service worker / 離線 / 安裝）？動到就驗。
6. **建置驗證**：`npx tsc --noEmit`、`npx vitest run`、`npx next build` 都要綠（push = 自動上線，build 壞了會害 CI 失敗、可能推出壞版）。
7. **全部沒問題 → 先更新工作日誌（`docs/daily_works_*.md`）→ 再 commit / push。** 完成的 todo 用刪除線標記、不要刪。
8. **機密**：`.env.local` / 真金鑰永不 commit；`docs/logerr.md`、`docs/note.md` 保持 untracked。

> 排查心法：介面怪 → 先確認「資料有沒有真的接到」（API/欄位/腳本），而不是只改前端樣式。

---

## 其他關鍵雷（詳見 CLAUDE.md）

- **章節內容從 Supabase DB 讀、不是 JSON**：改 `src/data/chapters/*.json` 後要 `node scripts/import_chapters_to_db.mjs [chN]` 才會生效（含 `sort_index`）。線上章節怪先看 DB、不是換 image。
- **Supabase 1000 筆截斷**：撈整表要 `.range()` 分頁，別直接 `.select('*')`（`lessons` 已 >1000 筆）。
- **部署**：push `main` → GitHub Actions 建 Docker image → GHCR → Zeabur `restartService` 自動重部署（image 服務用 `restartService`、不是 `redeployService`）。
- **內容生成器**：可重跑、憑證走 `scripts/_lib/`；長 markdown 別包進 JSON（Haiku 會吐壞換行）。
- commit 訊息結尾加：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

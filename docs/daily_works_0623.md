# Daily Works — 2026-06-23

董事長林董（Luffy Lin）。雪鑰值班。
主題：**Telegram webhook 修復 → R2 設定 → Actions 省分鐘 → 沙盒(Judge0/C#中文/檔名/終端) → 部落格(自訂 slug + 影音上傳) → Wandbox 自動更新**。

---

## 📨 Telegram AI 沒反應 — 真因 webhook 雙斜線
- getWebhookInfo 抓到 url `…snowrealm.pet//api/telegram-webhook`（雙斜線）→ Next.js 回 **308 Redirect** → Telegram 不跟 redirect → 訊息永遠送不到 handler。
- 修：setup route 的 site 去尾斜線；直接打 Telegram setWebhook 修正線上 URL（即時生效）。

## 🖼️ R2 上傳「尚未設定」
- 真因：Zeabur 少設 **`R2_ACCOUNT_ID`**（isR2Configured 要 5 個 env、缺一即 false）。補上重啟即解。

## 💸 GitHub Actions 2000 分鐘用完
- 真因：每次 push 都跑完整 Docker build、且文件/SQL commit 也照跑。
- 修 docker.yml：`paths-ignore`（docs/**、*.md、supabase/**、scripts/**、bug/**）+ concurrency cancel-in-progress。林董已提高 spending limit 解燃眉。

## 🧪 沙盒 / 終端機
- 後端鏈 **Piston→Judge0→Wandbox**（依設定退避、Wandbox 墊底、各加 timeout）。
- **Judge0** 接好（env-gated：JUDGE0_URL/KEY/HOST、RapidAPI 或自架）。
- **C# 中文亂碼** 修正：mono 把非 ASCII 輸出成「?」→ 自動注入 UTF-8 StreamWriter（SetOut）。
- **沙盒檔名輸入**：PlaygroundCard 加檔名欄；Java 自動對齊 public class 名。
- **虛擬終端機**：所有 playground + **admin Nami 練習場**新增「終端機」tab（Python REPL + Shell）。
- **Wandbox compiler id 每月自動更新**：`scripts/update-wandbox-compilers.mjs` + `.github/workflows/wandbox-update.yml`（抽到 `src/lib/wandbox-compilers.ts`）。

## 📝 部落格
- **自訂 slug**：ArticleEditorForm 加 slug 欄（未手動改前跟標題自動產生、可重設）；create/update 都帶 slug。
- **影片/音樂上傳**：BlogEditor 註冊 VideoNode/AudioNode（`<video>/<audio controls>` 直接播）+ 工具列鈕 + 拖放/貼上；/api/upload 接受影片(≤50MB)/音訊(≤20MB)；sanitizer 放行 video/audio/source/iframe(YouTube/Vimeo 白名單)。
- slug 404 已於前一輪修（blog_slug + 文章 slug 都 ilike 大小寫不敏感）。
- 釐清：使用者看到的 UUID 是文章「id」(編輯網址用)、DB slug 其實是中文、沒壞；404 是 blog 名大小寫造成、已修。

## ✅ 檢查
- tsc 0、build 綠；gemini-2.0 無 src 寫死（只 ch46 教學範例提到、低優先）。

---
待辦見 docs/TODO.md。

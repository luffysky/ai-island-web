# Daily Works — 2026-07-03

董事長林董（Luffy Lin）。雪鑰值班。
主題：**創作者島嶼/引擎大補（碎片搜尋・多對多演化・綠寶聚焦・成長分工作室・操作記錄）+ 全站 TipTap 保真 + 部落格 AI SEO/GEO + 章節一行寫法修正 + 定價全免費 + 破版/溢出收尾**。

---

## 📝 章節 / 定價
- **一行寫法（bug 121/122）**：ch26「三元運算」「Hello World」拿掉 JS/Java/C 對比，改列**原本的普通 Python 寫法**（shorthand→longhand，讓學員能推敲對應）。已 `import_chapters_to_db.mjs ch26` 同步進 DB。
- **CodeBlock 語言標籤**：補齊 `LANG_LABEL`（csharp→C#、cpp/go/rust/… 一票），修 Python 被誤標成 **CSHARP** 的 bug（fence 從 ```text 改 ```python）。
- **定價頁（bug 117）**：改成 **全部免費・不販售・不訂閱**，移除 99/299/2999 方案 + Stripe 按鈕，**常見問題全重寫**（誠實、無接案/收入保證）。paywall 本來就沒強制、無副作用。

## 🌐 部落格 SEO + GEO
- **AI 輔助 SEO**：`/api/blog/ai-seo`（`completeForUsage("seo_meta_gen")`、auto-log 成本、10/min 限流）→ 編輯頁「✨ AI 建議 SEO」自動填 SEO 標題/描述、關鍵字併入標籤。
- **GEO（給 AI 抓）**：文章強化 Article JSON-LD（articleBody/keywords/wordCount/inLanguage…）+ 機器可讀「AI 摘要」區塊；`/llms.txt` 加最新文章清單。

## 🎨 創作者島嶼 / 創作引擎
- **碎片搜尋**：碎片森林 + 引擎「碎片素材」都加搜尋框。
- **演化多對多**：`evolve` 改吃 `fragmentIds[]`（種子上限 12）→ **多選碎片交叉演化**；UI 顯示「演化×N」。
- **適合做什麼・全選**：碎片森林加「全選/取消全選（本頁）」；`advise` route 對上百個碎片**均勻抽樣 60** 控成本。
- **綠寶聚焦**：`IslandChat` 收 `focusFragments`，chat route 注入「使用者選中的碎片」上下文；面板顯示「正在看你選的 N 個碎片」。
- **成長分工作室（bug 113）**：`getStats(userId, workspaceId?)` 可 scope；growth 頁 `?ws=` + **範圍切換（個人島／各工作室／全部）**。修掉原本 `created_by` 跨工作室加總的 bug。
- **查看成員（bug 114）**：本來按了默默塞一行像沒反應 → **可展開/收合 + 載入中 + 成員數 + 中文角色**；卡片角色徽章改 `ROLE_ZH`。
- **操作記錄**：新 `/creator-island/activity` + `lib/creator-engine/activity.ts`，彙整 AI 動作/碎片/作品/草稿時間軸（依工作室篩、僅本人可見、不另開 audit 表）；島上探索列有入口。
- **引擎素材同步**：`create/[id]/page` 改 `listAllFragments`（本來只截 100）→ 素材欄跟碎片庫同源、可搜尋。
- **編織更融合（東一塊西一塊）**：synthesize/compose(含 song) prompt 全面強化——先定貫穿主線、統一視角時態、補轉場、合併重複意象、**明令不准一段塞一個碎片**。

## 🧩 全站 TipTap 保真（發佈公開頁 + 草稿都不掉格式）
- 根因：`rich-html-server.ts` sanitizer 白名單漏 **font-size** → 存檔被清、字級跑掉。已補 `font-size/font-family/line-height`。
- 另修：TextAlign 會把 style 寫到 **heading/blockquote/li**，但白名單沒放行 → 標題置中等對齊被清。已補這些標籤的 style。
- 草稿存 raw HTML（不過 sanitizer）full-fidelity；部落格/論壇渲染走修好的 sanitizer。編輯器功能已完整（字級/48 色/表格/圖影音/附件/YouTube/待辦/程式碼…）。

## 📐 版面 / RWD / 溢出
- **Header menu（bug 115）** 重設計 + 加**創作者島嶼**（每項帶 lucide icon）。
- **排行榜規則卡重疊（116）**、**導覽氣泡出界（118）**、**筆記浮動 pill 移左下避開綠寶（119）**、**程式碼工具列破版（120，flex-wrap）** 全修。
- **全站不出界**：確認 `globals.css` 全域護欄（`body overflow-x:hidden`、fixed/absolute `max-width:100vw`、pre/table/氣泡各自 scroll）→ 頁面層級無橫向溢出，展開內容也被夾住。

## ✅ 推前檢查（2026-07-03）
- `npm run build` ✅ 綠。
- **API**：326 route 全 export HTTP method（含新 `/api/blog/ai-seo`）。
- **DB**：`audit-db-columns` 無新錯（既有 `ci_posts/ci_stories` 樣板字串誤報非本批）；成長/操作記錄用到的欄位 live 實查存在。
- **PWA**：`sw.js` v11 → **v12**。

## 🔜 未做 / 待續（承 07-01）
- [ ] emoji 零星（首頁主題/吉祥物、無對應 lucide 者、engine-types type glyph）。
- [ ] PWA PNG icons 接進 `manifest.ts`（logo 192/512 已產）。
- [ ] Google 同意畫面去 `supabase.co`（需 Supabase 自訂網域或 GCC 設定，林董手動）。
- [ ] 輪替 Supabase service key / DB 密碼（等專案完成）。
- [ ] 作品庫 `WorkEditor` 仍是純 textarea（引擎來的 HTML 作品在此顯示 raw tag）——低優先、可日後換成 rich 檢視。
- [ ] H2 殘留（embeddings/Whisper/圖片生成，非 Claude）。

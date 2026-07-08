# 工作日誌 2026-07-07

> 本輪：一批手機截圖回報的 bug / 體驗改善（bugpic 130–138）＋ 讀 `docs/note.md`（這幾天跟 GPT 討論碎片創作引擎/知識生態系）。全程 tsc 0、lint 0 error、build exit 0、vitest 117 passed、DB probe 綠。

## 修的東西（對應截圖）

### 推理台（FIE）— 兩隻真 bug（130 系列最關鍵）
- **134「開始推理」回 `Unexpected token '<'`**：推理鏈是**序列** AI 往返（`buildRepresentation` 每個種子各一次 embed → `retrieveEvidence` 再一次 → 記憶注入再一次 → LLM），種子一多就超過上游 gateway timeout、回 HTML 錯誤頁、前端 `res.json()` 爆掉。
  - 修：`representation.ts` 每碎片 embedding 改 `Promise.all` 並行；`reason.ts` 先撈種子、再 `Promise.all([representation, evidence])` 併行；route 加 **55s 自帶逾時**、逾時回乾淨 JSON 504（不再讓前端吃到 HTML）；`ReasonClient` 的 `api()` 改「先讀 text 再 parse」、非 JSON 給友善訊息。
- **133 碎片清單沒撈全部**：`reason/page.tsx` 原本 `listFragments(limit:60)` → 改 `listAllFragments`（分頁撈滿，331 全給），Client 加搜尋框 + 捲動區（已選置頂）。
- **133 推理完沒後續動作**：每個推理方向加「用這個方向編織成作品」→ `POST /works` 建草稿帶入選到的碎片、跳作品編輯器。

### 131 碎片卡依稀有度配色
- rarity 存在 tags（N/R/SR/SSR/UR）。卡片底色/邊框 + 稀有度徽章按級上色（R 天藍 / SR 紫 / SSR 琥珀金 / UR 洋紅漸層），一眼分辨。

### 132 意外配對可多選
- 原本「點一對＝取代選取」→ 改成點配對 **累加/toggle** 碎片（勾選態 + 清空鈕），可一次挑多對一起凝聚/編織。

### 135 預置工作流
- 「我的工作流」空的 → 內建 4 個範例工作流（凝聚→短文 / 演化→編織 / 凝聚→一首歌 / 編織→英文轉譯），一鍵加入即可對選到的碎片重播（真 agent pipeline、沿用既有 POST）。

### 136 排行榜多榜別
- 新增 `leaderboard_lessons` RPC（跨使用者聚合 `lesson_progress` 完課數，SECURITY DEFINER 繞 RLS、REVOKE public + GRANT anon/auth/service）。頁面加三榜切換：🏆 XP / 🔥 連勝 / 📚 完課（`?tab=`、server 端 SEO 友善），podium/列/我的排名皆顯示當前榜別數值。probe：hotnami111=6 課、Luffy=5 課、anon 可執行 ✓。

### 137 創作島綠寶對話 = 課程綠寶等級
- 每則綠寶回覆加 **複製 / 分享（Web Share，退回複製）/ 接入創作**（把該段直接開成作品草稿、跳編輯器）。

### 130 章節導覽 hover 泡泡過邊界
- lesson 預覽泡泡原本固定 `r.right + 12`，手機滿版 drawer 會被切掉 → 右邊放不下就翻左邊 + 箭頭反向 + `max-w` clamp 進視口。

### 138 iOS 首頁 Cookie 橫幅 × PWA 更新橫幅重疊
- Cookie 橫幅把自身高度發成 CSS 變數 `--cookie-banner-h`（ResizeObserver 動態），PWA 更新橫幅 `bottom: calc(var + 0.5rem)` 疊在其上、不再重疊。

## 維運
- PWA SW cache `v13-2026-07-05 → v14-2026-07-07`。
- `OWNER_SETUP.md` 補列 `leaderboard_lessons_migration.sql`（重建 DB 補跑）。**無新 env、無需手動操作。**

## 驗證
- `tsc --noEmit` 0 error；`next lint` 我改的檔 0 **error**（僅既有風格 warning）；`npm run build` exit 0；`vitest` 117 passed（14 檔）；`leaderboard_lessons` RPC 已 db:apply + probe。
- API/DB/UI 連接：reason→works、pairs→選取、preset→workflows POST、weave→works POST、完課榜 RPC 皆實接。RWD：新 UI 皆 flex/grid + clamp、無破版固定寬。

## note.md 想法
另於對話回覆整理（碎片敘事引擎 ≈ 已落地的 FIE；知識生態系四條線；論壇種子/知識流；付費點在「陪伴累積後的洞察」而非單次生成）。

---
---

# 本日後續（同一天、後面的 context）— 共 69 commit / build 綠 / 117 測試過 / DB 都在

## 1. 全站 UI / 設計系統
- 醜對話框全站換 in-app modal（30+ 檔）`40b73efc`；導覽收成左上/右上角落抽屜+加遊戲/筆記 `e7c205f1`；SideNav 泡泡改上方夾視口 `8e92b7d5`
- **設計系統打底**：next/font(Inter/Outfit/JB Mono)、標題排版、surface/hover-lift/glow/gradient primitives、氛圍光暈、頁面轉場 `2f3d1385`；鋪到首頁/章節/討論區/lesson prose `60da4fde`；空狀態徽章+骨架 shimmer `ea68de8f`
- **「感覺長一樣」真因**：中文用系統字→改載 **Noto Sans TC 網頁字體** + 光氛加濃 + 卡片陰影加重 `f56e8a40`

## 2. 遊戲（Code Quest 第三島）
- 5 種遊戲(迷宮/畫圖/Turtle/數字/抓蟲)+PixiJS+像素+音效+遊戲風UI+修通關獎勵沒真發 `c1d54c42`…`f9a87cbf`
- **2 新遊戲**：排序視覺化(Pyodide+長條)、前端CSS關(iframe) `5e5e33e8`；**AI 關卡生成器**(後台生→存DB→自動上線) `2380c0d5`

## 3. AI 導師：3→**11 位**夥伴 `3259356e`,`f2ead6cf`；**人格被導師框架蓋掉的 bug 修好**(多聞改純陪聊、人格最高優先) `6aec4687`；頭像跟著夥伴 `7aca6355`

## 4. 內容/種子/人氣
- 討論區 36 主題、部落格 **86 篇**(含哥布林 **75 篇 Python 系列生成器**)、社群 10 貼文、筆記市集 3 免費官方包18則
- **種子工作室 `/admin/seed-studio`**(討論區/部落格/筆記 一頁分頁、AI+手動) `408a01f8`,`99087d8a`,`df6eefba`,`e5d79395`,`436b6e15`

## 5. 部落格：系列可展開收合 `dfc92edf`；owner/admin/客服 官方身份發文 `7fdc700f`；一鍵公開 `4068e2ea`

## 6. 創作者島嶼：碎片宇宙/影片/漂流瓶/今日配對 `60467229`…；**公開展示頁**(作品庫發佈) `77fac3f9`；**果實提現 A 版**(申請+後台對帳) `13021e14`

## 7. 筆記：Notion L1 樹/L2 區塊引用(page-mention) `287e4af8`,`d7b90bb0`,`e0a95b4c`；知識市集金流 `492614a9`；市集按鈕改 toast `4a089788`

## 8. 金流（`docs/payments_setup.md`）
- 綠界/藍新/Stripe + **Lemon Squeezy + Paddle(海外 MoR)** `ce1a592b`；Stripe 台灣開不了→MoR/綠界；**金流狀態面板 `/admin/payments`** `390dda14`；雙 webhook secret `108de7de`；設定文件補齊 `dda4f6ad`

## 9. i18n
- **地基(#157)**：next-intl cookie 切語言(不動 591 路由)+EN/中+chrome `1e1f4799`
- **內容 AI 翻譯層(#159)**：翻一次快取、來源變(hash)才重翻、`/api/admin/translate-content` 批次、部落格頁接上 `4f663a2b`
- **本次追加：EN/中 → +日文/韓文**（見下方「i18n 現況」）

## 10. Bug/維運：簽到後今日任務即時更新 `e19379a9`；麵包屑不 404 `1f0e9c0e`；2 支新 cron `0f29aadf`；migration 全納入 run-migrations；PWA SW **v16** `408a01f8`

## ✅ 收尾檢查
- build 綠 / tsc 0 / **test 117 passed** / 383 route 全有 HTTP method
- DB 新物件都在：content_translations、ci_payouts、quest_ai_levels、note_products、ci_works.is_showcased/showcased_at、user_blog_articles.author_identity（`ci_payout_accounts` 沒建=正確，A 版把銀行欄位放 ci_payouts）
- 內容量：公開部落格 86 / 上架商品 3 / 討論串 36 / 社群貼文 10
- RWD：CSS 遊戲 iframe 改 `w-full max-w`；後台表格 overflow-x-auto；新頁面 grid sm:/md:
- PWA：SW `v16-2026-07-07`

## ⏳ 未完成 / 交接（重要）
- **#158 i18n 全站抽字串（尚未完成、大工程）**：地基+內容層+chrome 好了；**剩「除了後台 admin 以外，所有頁面(~800 檔)的硬字串逐頁抽進 messages」**，語言＝**中/英/日/韓** 四語。做法：一頁 `useTranslations()` + 加 key 到 `messages/{zh,en,ja,ko}.json`；內容(章節/lesson/部落格)用 #159 翻譯層批次預翻各語。**這是多輪持續工程、建議用平行 subagent 一區一區掃。**
- **需瀏覽器 QA**：/quest 7 遊戲+發獎、11 夥伴人格、英文/日/韓切換、金流測試機各過一筆。
- **金流上線**：填 live env(owner)；台灣訂閱→綠界定期定額、海外訂閱→MoR(目前一次性)。
- **果實提現 B/C**：Stripe Connect(海外)/綠界藍新分潤(台灣)，需先申請服務(沿用 ci_payouts.method)。

---
---

# i18n #158 抽字串進度 — 創作者島嶼（creator namespace）

> 本輪把 `creator-island` 整區的硬字串全數抽進 `creator` namespace。動了 37 個檔（`src/app/creator-island/**/*.tsx` 全部 + `src/components/creator-island/ComingSoon.tsx`）。messages/*.json 未動（由統整端合併）。

## 抽出的東西
- 只抽 **靜態 UI chrome**：按鈕、標籤、標題、分頁名、空狀態、字面量 toast/confirm、表單 placeholder、區塊標題。
- **不抽** DB/使用者內容（作品標題、使用者名、市集商品名、變數化的 Z幣/果實數字），不動 className / emoji / URL / logic / RWD。
- 共 ~300 個 key，全 4 語（中/英/日/韓）。placeholder（`{n}` `{count}` `{name}` `{pct}` …）四語一致；Z幣→Z coins / Zコイン / Z코인 一致。

## 怎麼分批執行 i18n（可複用 SOP）
1. **Glob 先列全部檔**（`creator-island/**/*.tsx` + `src/components/creator-island/**`），確認 namespace 尚未存在（`node -e` 檢查 `messages/zh.json`）。
2. **切區、開平行 subagent**：本區 37 檔 → 拆 8 組（hub / create / community / works / market+payout / friends+messages / studio+growth / reason+universe+activity+ComingSoon），一組一個 general-purpose subagent，同一則訊息一次發完（併發跑）。
3. **每組指定唯一 key 前綴**（hub* / create* / comm* / work* / market*+payout* / friend*+msg* / studio*+growth* / reason*+universe*+activity*+soon*）→ 保證跨組 key 全域不撞。
4. **subagent 只回中文 key map**（key→zh 字面，placeholder 直接寫在 zh 值裡），統整端再一次補齊 4 語 → 翻譯口徑一致、避免各 agent 亂翻。
5. **規則交代死**：client 用 `useTranslations("creator")`；server async 用 `await getTranslations("creator")`；已存在區域變數 `t`（如 `.map(t=>…)`）改用 `tr` 避免撞名；dynamic 值走 `t("k",{n})`。
6. **module-scope 字串（hooks 跑不了的頂層 const / metadata / SEO OG）先跳過並列清單**，之後改成 `labelKey` 於 render 時翻、或搬進 component。

## 已知待收尾（module-scope，本輪按規則跳過、需另處理）
- `CreatorIslandClient` `PRESET_WORKFLOWS` 標題/描述、`transLang` 語言名陣列（兼 API param）；`IslandTour` `STEPS` 13 步導覽文案。
- `works/page` `STATUS_LABEL`/`TYPE_LABEL`；各頁 `generateMetadata`/`export const metadata` 的 SEO/OG 字串。
- `PayoutClient` `STATUS`、`StudioClient` `ROLE_ZH`、`SocialFeed` `SCOPES`、`ReasonClient` `MODES` 與 `api()` 錯誤字面量。
- 多處 `"創作者"`／`"訪客"` 名稱 fallback、`"未命名草稿"` 等寫進 DB 的預設值 → 屬資料層、刻意不抽。

---

# 0707 深夜收尾（同日、接續 context）

## i18n（已 commit 上線的批次）
- **地基強化**：`request.ts` 加**地區預設語言**（TW/HK/CN/MO→zh、JP→ja、KR→ko、其他→en，退回 Accept-Language）。
- **內容翻譯改快取讀取**：`content-i18n.ts` 用 Next **Data Cache**（`unstable_cache` revalidate+tag、重翻 `revalidateTag` 立即失效）→ 同(內容,語言)每小時一次 DB、中文用戶零查詢。
- **render wiring**（#161）：blog 文章頁 + **章節 `localizeChapter`**（章 title/subtitle + lesson title/content）+ **論壇主題頁** 都接上快取譯文。
- **背景翻譯填充**：抽共用 `runTranslateBatch`；新 `/api/cron/translate-content` + **手動 workflow `Translate Content`**（只 dispatch、不排程、用使用者自己的 AI key、跑到 total=0）。
- **UI 抽字串**：batch 1–4 已合併四語並 commit — home / store / chapters / quest(68) / forum(95) / notes(198) / island(175) / dashboard(32) / profile(17) / leaderboard(27) / career(8) + nav.works + notes.openFullPage。
- ⚠️ **未完成**：creator(606) / me(149) / mentor(154) / learn(240) 四區 keymap agent 已回、但 .tsx **revert 未 commit**（避免 session 中斷留破頁）→ 見 `docs/handoff_next_context.md` #①。

## Bug 修復
- **141 header 破版**：語言切換改精簡藥丸（手機短碼 繁/EN/日/한、桌面全名）、header gap 手機收窄、logo 不換行 → Lv 徽章不再被擠出畫面。
- **143 筆記懸浮鈕**：左下 → 右下、且可自由拖曳（點=開筆記、拖=移動、位置存 localStorage）。
- **146 單篇筆記全頁**：新 `/me/notes/[id]`（prose-custom 正確分段、擁有者或公開可看）+ 筆記卡動作環加「整頁開啟」。

## 內容（全部手寫、真人口吻、非腳本）
- **官方免費筆記**改寫成真人口吻 + 加量至 **51 則**（Python 16 / 前端 13 / 後端 12 / 基本功 10），輪播便利貼配色。目標每包 120+（未完）。
- **match-case** 補進正式教材 **Ch26** + `import_chapters_to_db ch26`（144 回饋：突然跳模式匹配沒鋪陳）。
- **/works 公開作品牆**：新頁 + header nav + 創作者島入口；`seed-creator-works.mjs` 種 **7 件真作品 / 4 位正經創作者**（蘇晚/林之遠/何默/江見、碎片編織、`is_showcased`）→ 145「社群≠作品」解決。
- **創作者部落格** `seed-creator-blog.mjs`：4 位創作者各一篇手寫文。
- **討論區** +5 則學員口吻討論串（共 41 串）。

## 商業模式修正
- **筆記市集抽成 0% → 平台 10% / 作者 90%**：新 migration `notes_market_commission_migration.sql`（改 `buy_note_product` RPC，作者實收 `floor(price*0.9)`）、已 apply + 納入 `run-migrations.mjs`；文案（market page metadata + `marketIntro`/`listIntro` 四語）同步改。
- ⚠️ 創作者島市集 `marketSubtitle`「抽成 0%」（果實經濟、不同流程）尚未改 → 留待確認。

## 交接
- 完整待辦見 **`docs/handoff_next_context.md`**（i18n 4 區合併 → 筆記加量到 120 → 維運/擁有者）。tree 乾淨、tsc 綠。

---

# 續・2026-07-08（接力這棒）

## i18n / 內容翻譯
- **#162 i18n 4 區合併完成**：creator(560)/me(202)/learn(225)/mentor(145) = 1697 keys×4語；綠寶英日韓統一 Emerald。
- **#166 內容翻譯（部分）**：`localizeChapterMetas` + `localizeList` 通用 helper；接了 **/chapters 列表、側欄 nav、/blogs/[userSlug] 文章列表**。寫了獨立翻譯器 `scripts/translate-content-cli.mjs`（系統 AI key、比對 `source_hash` 只翻改動的）→ **章節 metas 已翻 en/ja/ko（480 筆）**。
- **#168 市集文案**：`marketSubtitle`「抽成 0%」→「果實可提現」（提現有手續費、吹 0% 誤導）。

## 官方筆記（#164 達標）
- **4 包各衝破 120**：Python 125 / 前端 120 / 後端 120 / 基本功 120 = **485 則**（全手寫真人踩雷味、HTML 安全掃描、便利貼色輪播）。
- **每篇標「相關章節」chapter_id**（AI 逐篇對應 + 主線驗證：100%覆蓋/章id有效/連結全有效/抽查無亂標）；seed insert 加 `chapter_id` 欄。
- 筆記卡「Ch XX·章名」做成**可點連結** → 跳該章。

## 筆記市集（買到→我的筆記）
- `buy_note_product` RPC 新 migration：**購買後整包複製進買家「我的筆記」**（保留 chapter_id/lesson_id/title/color/category、`is_public=false`、tag `from:<product>` 冪等補發、擋重購）。BuyButton 顯示「已加入你的筆記(N篇)」+連 /me/notes。

## 內容加量（#167）
- 討論區 41→**59 主題**（100 回覆/113 讚，補冷門版）、創作者作品 7→**15 件**（每人+2 手寫、依各自聲音）。

## AI 夥伴個性差異化（D）
- 根因：system prompt「國中生講解腔」強制所有人設同一種開場、淹掉 persona。
- 修：`ai-tutor-prompt.ts` 改「精神非模板」+ 硬禁罐頭開場；`ai-personas.ts` 每角色加【開場】【禁】【結構】【這樣開場】few-shot。實測 4 角色開場結構明顯不同。

## 動態 emoji / GIF（E，參考 insight-engine 改動態版）
- `AnimatedEmoji`（Noto 動態 WebP、自動推導 code、fallback 靜態）、`AnimatedEmojiPicker`（9 分類+搜尋）、`EmojiText`（顯示端渲染動態）、`GifPicker`（GIPHY，靠 `NEXT_PUBLIC_GIPHY_API_KEY`）、`reactions.ts` 反應包。
- **已掛所有主要輸入框**：論壇回覆/發文、部落格、創作引擎(EngineWorkspace)、社群發文+留言、私訊、AI 聊天(AITutorWidget)、島上 AI(IslandChat)。論壇反應條也動起來。
- ⚠️ picker 加 `max-w-[calc(100vw-1.5rem)]` 防手機破版。

## 維運
- PWA service worker `v16-2026-07-07` → `v17-2026-07-08`（新版上線、cache 失效讓使用者拿新版）。
- 全面驗證：DB 表/欄位/RPC 邏輯、API routes、migration 註冊、無敏感檔 stage、picker RWD 都過。tsc + next build 綠。

## ⬜ 還沒做（排下次，詳見 handoff_next_context.md）
1. **#166 剩餘**：/forum thread 列表在地化（client API 端套 `localizeList`）；背景翻譯 forum(~354便宜) / blog / lesson(1258筆量大耗額度，先問林董)。
2. **E 後續**：學習反應 UI（懂了/卡住/太神…用 `LEARN_REACTIONS`）+ 課程完成動畫；自架 Noto 素材（webp 放 `public/noto/`、`NOTO_BASE` 改 `/noto`）。
3. **D 收尾**：瀏覽器各切一個 AI 人設實測語氣。

---

# 2026-07-09 續（林董 bug 批次 147–160 + 收尾 TODO）

> 林董一批截圖 bug + 需求，自動連續處理。tsc + next build 綠、migration 已跑。

## 上線體驗 bug（RWD / 建置 / auth）
- **GIPHY 讀不到（149/151）**：`NEXT_PUBLIC_*` 是 **build 時嵌入**、GHCR build 在 GitHub Actions 跑（不是 Zeabur）。docker.yml + Dockerfile 補 `NEXT_PUBLIC_GIPHY_API_KEY` build arg。
  - ⚠️ **林董待辦**：到 **GitHub repo → Settings → Secrets and variables → Actions → Variables** 加 `NEXT_PUBLIC_GIPHY_API_KEY`（Zeabur 那個只是 runtime、build 讀不到）。加完 push 一次才會嵌進 bundle。
- **表情重複（153）**：`ThreadReactionBar` 渲染動態+靜態兩個 `AnimatedEmoji`（`hidden`/`inline-block` 跟 img base class 打架）→ 改單一動態。
- **手機筆記跑版（148/152）**：`from:<uuid>` 購買追蹤 tag 撐爆卡片。顯示端過濾 `from:` 開頭 tag + pill 加 `max-w truncate` + `.note-rich` 加 overflow-wrap。
- **emoji picker 被切（150）**：picker 用固定錨點超出視口不回推。`AnimatedEmojiPicker`/`GifPicker` 加視口 clamp（量測後 translateX 拉回）；AI 聊天 picker 改 `align="left"`。
- **已登入卻要登入（154）**：`ThreadReplies` 用 `getUser()`（靜態頁 hydration race 回 null）→ 改用 `useAuth()` context 單一來源。

## 功能
- **作品牆點進去 404（157/158）**：公開作品牆連到 `/creator-island/works/[id]`（私人編輯頁、要 workspace 成員）→ 建**公開唯讀頁 `/works/[id]`**（admin 讀、只給 `is_showcased`、免登入），作品牆改連這。
- **引用筆記可點（159）**：`insertNoteRef` 改嵌 `[[note:id|title]]` token，`renderContent` 解析成 Link → 點跳 `/me/notes/[id]`。
- **主文存成筆記+分享（156）**：新 `ThreadPostActions`（存成筆記 + `ShareButton`）掛在討論串主文。
- **部落格關聯課程到 lesson**：新 migration `blog_article_chapter_link`（`user_blog_articles` 加 `chapter_id/lesson_id`）；`publish-blog` 從筆記帶入（準確不猜）；文章頁顯示可點「Ch XX·章名·節名」pill 跳該 lesson。筆記卡 header 也細到 lesson。（在地化三元本來就有、待 blog 背景翻譯才顯現）
- **Suno 歌詞防護（180）**：`compose` song 分支 + assist `suno` mode 加硬規則：sunoPrompt 禁真實人名/樂團/歌名、禁「like XXX」指名模仿；歌詞須原創。
- **創作者 AI 餵喜好（181）**：`ci_memories` 已注入所有 agent（背景偏好）。新建**品味庫** `/creator-island/taste`（`TasteLibrary`）讓創作者放喜歡的作品/風格 → 存 personal memory kind='taste' → AI 編織/演化自動參考。creator-island nav 加「品味」入口。
- **AI 人格第二輪（155）**：多聞（陪聊）缺 few-shot、開場仍問課程進度。補【開場】【禁】【這樣開場】硬禁「嗨X！怎樣Python學得如何」導師腔；綠寶也補開場 few-shot；`buildTutorSystemPrompt` 對 chatCompanion 不注入「目前在學 Ch/進度」context。

## 維運
- PWA `v17-2026-07-08` → `v18-2026-07-09`。
- migration 跑過（62/62）；含新 blog chapter link。

## ✅ 續做完成（同日）
- **#184 forum 列表在地化（wiring）**：`/api/forum/threads` GET 套 `localizeList("forum",...,["title"])`、回 private cache。**譯文待跑** `node scripts/translate-content-cli.mjs forum`（~354 便宜、花 AI key，林董在忙沒自動跑）。
- **#185 學習反應 UI**：`lesson_reactions` 表 + `/api/lessons/[lessonId]/reactions` + `LearnReactionBar`（LEARN_REACTIONS 動態 emoji、按下 micro 慶祝上浮）掛在每節底部；未登入用 fingerprint。migration 已跑。

## ✅ 再續做完成（同日，Nami/林董追加）
- **#177 程式碼補執行結果**：新工具 `scripts/add-code-outputs.py`（**沙箱真跑**教學碼取真實輸出、補 inline # 註解；受限 import 白名單、拿掉 open/input/exec、步數上限、非確定性/已標/超長都跳過）。ch26 Python 基礎 7 課補上缺的輸出（含 Nami 指的 26.5）；框架章自動跳過不誤補。已 import DB。
- **#182 操作記錄可點**：林董澄清＝使用者自己（創作者島嶼+全站操作）。做①後台 `/admin/audit` 目標欄可點（`lib/audit-target-href`）②使用者端 `/me/activity`「我的操作記錄」時間軸（聚合創作者島嶼AI/作品/課程/筆記/討論/Z幣/購買、每筆可點）+ MeSidebar 入口。
- **#183 部落格種子留言**：`scripts/seed-blog-comments.mjs`，8 篇熱門文各 2-3 則手寫貼題留言（含新手問→學長回覆）、共 19 則、idempotent。
- **🔔 緊急告警誤報修復**：TG 投遞抖動(fetch failed)被記 error → anomaly 不分 level 全數 → 誤報「錯誤激增」→ 又發 TG 放大。查證近12hr 僅 6 筆全是 TG 投遞失敗、0 筆真錯誤。修：anomaly 只數 `level='error'`、notify 網路失敗改記 `warn`。

## ⬜ 還沒做（排下次）
1. **背景翻譯批次**：`translate-content-cli forum`（便宜先跑，forum 列表在地化 wiring 已備）、`blog`、`lesson 600`（1258 筆量大耗額度、先問林董）。**花 AI key、沒自動跑。**
2. **#185 收尾**：完整「整章完課」慶祝動畫（現只有每則反應的 micro-burst）；自架 Noto webp 到 `public/noto/`、`NOTO_BASE` 改 `/noto`（現走 gstatic CDN）。
3. **#177 延伸**：ch26 以外的可跑章若之後想補，跑 `python scripts/add-code-outputs.py chXX --review <file>` 先審再 `--write` + import。

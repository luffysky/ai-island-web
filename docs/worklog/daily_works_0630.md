# Daily Works — 2026-06-30

董事長林董（Luffy Lin）。雪鑰值班。
主題：**創作引擎（直接開寫 7 種創作）＋ 創作者島嶼 RWD / 視口 / 後台 AI 收尾。**

---

## ✨ 創作引擎（新 Tab，7 類型一次到位）
不再只能「玩碎片」——新增 **`/creator-island/create`「✨ 創作引擎」**：選類型 → 進專屬工作台直接開寫；**編織完的成品也能一鍵「導入創作引擎」續寫**。

- **DB**：`ci_drafts`（work_type/title/body(TipTap HTML)/doc(類型結構)/meta/fragment_ids/word_count/status/published_work_id）+ RLS(`ci_is_workspace_member`) + index。完稿 `publishDraftToWork` → `ci_works`（記 composition）。**已 db:apply + live CRUD 驗證（全欄位存在、insert/update/delete ✅）。**
- **lib/API**：`drafts.ts`（CRUD + 字數估算 + publish）＋ `/api/creator-island/drafts`（GET/POST）、`[id]`（GET/PATCH/DELETE）、`[id]/publish`（→work）。皆 `requireWorkspaceRole` 守門。
- **通用工作台**（`EngineWorkspace`）：複用部落格 **TipTap `BlogEditor`**（圖/影/音/附件直傳 R2）＋ **自動存草稿（debounce）**＋字數＋**碎片素材欄**（點碎片放進內文並列素材、記家譜）＋**綠寶隨側 AI 工具**（選字→改寫/潤稿/擴寫/精簡/轉譯；續寫；各類型專屬）＋**存成作品 / 存成作品並發部落格草稿**。
- **7 類型專屬工具**（`engine-types.ts` + `/api/creator-island/ai/assist` 多模式）：
  - 📖 長篇小說：章節大綱／角色卡／世界觀／一致性檢查／取書名
  - 📝 短篇/故事：三幕骨架／結局發想／取標題
  - 🎵 歌詞：段落結構／押韻建議／Suno 提示／MV 分鏡
  - 🪶 詩：形式骨架／意象擴展／煉字
  - 🎬 劇本/腳本：場景骨架／對白生成／分鏡表／短影音腳本
  - ✍️ 文章：大綱／SEO 標題摘要／取標題
  - 📣 文案/品牌：Slogan 多版本／品牌故事／賣點條列／平台適配(IG/FB/短)
- **assist agent**：`agents.ts assistText`（純文字、不走 JSON schema），寫 `ci_agent_runs(agent_type:'assist')` + `logAiUsage`，走 Model Router（後台可指定模型）。

## 🐛 創作者島嶼這頁的雷（依林董回報）
- **綠寶被底部導覽列擋＋不能拖**：改成**可拖曳浮動鈕**（pointer 拖動、沒移動=點擊開關），面板自動貼按鈕且**永不出視口**；預設位置避開手機 56px 底部 nav + 安全區。
- **手機導覽超出視口**：`IslandTour` tooltip 改成**寬高都夾進視口**（量寬度 clamp、下方放不下翻上方、避開底部 nav）＋卡片 `max-h-60vh` 可捲。❓鈕、浮動創作工具列、toast 全部抬高 `bottom-[5.5rem] md:bottom-4` 清開 nav。
- **碎片在手機看不到編輯鈕**：✎ 原本只 hover 顯示（觸控無 hover）→ **手機常駐、桌機 hover**。
- **所有東西不超出視口**：聊天/導覽/工具列寬度 `min(92vw,…)` + clamp + `break-words`。

## ⚙️ 後台 AI 補齊
- `admin/ai/creator-island` 原本只列 5 個 agent → **補上 💡創作顧問(advise)、✨綠寶對話(chat)、🖋️創作引擎助手(assist)**；chat 原本沒接 router → 改 `resolveModel("chat")`，現在三者都可在後台指定模型、用量都進 `ci_agent_runs` + `/admin/ai/usage`。

## 🔧 其他
- **煙霧測試修復**：`/creator-island` 斷言從「必須 307」改為 **接受 200 或 307**（flag 開未登入=307；flag 關=200 FeatureOffNotice，兩者都代表頁活著、非 500/404）。
- **PWA**：`sw.js` VERSION → `v8-2026-06-30`（新路由生效）。

## ✅ 推前檢查
- `npm run build` ✅ 綠（Compiled successfully）。
- `ci_drafts` 欄位 + CRUD live 驗證 ✅。
- `audit-db-columns.mjs`：317 route 全 export HTTP method；唯一**真**問題（engine 誤打 `works/*/publish-blog`，正解是 `works/[id]/publish`）已修；其餘為 template-literal 誤報（`ci_stories.${AUTHOR}`、`${p.id}` 等）。

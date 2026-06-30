# Daily Works — 2026-07-01

董事長林董（Luffy Lin）。雪鑰值班。
主題：**AI 成本記帳全面修正 + 全站 emoji→lucide UI icon 化（含後台）+ 對比/RWD/PWA 收尾**。

---

## 💸 AI 成本記帳（真實 $20 但後台只記 ~$5 → 修好）
- **H1（主因）Anthropic prompt-cache tokens 沒算**：`cache_creation`(1.25×)/`cache_read`(0.1×) 以前完全不計 → 快取後 `input_tokens` 近 0、成本嚴重低估。
  - `ai-providers.ts`：`callAnthropic`/`streamAnthropic` 補捕捉 cache tokens；新增 `billableInputTokens()` 加權；`AICompletionResponse`/`StreamChunk` 加 cache 欄位。
  - `logAiUsage` 加 `cache` 參數、cost 用等效 input；`callAI` 自動帶 cache。章節聊天 cost 改用等效 input + 記實際處理量。
- **H3 創作島重複記帳**：`callAI` 已自動記，移除 `agents.ts`(runAgent/assistText)、creator-island chat route 的重複 `logAiUsage`（原本翻倍）。
- **H4** `admin/ai-cost` top_spenders 用 `gate.userId` 當 key（應 `p.id`）→ 每人都顯示成自己，已修。
- **H2 隱形花費（raw Anthropic 完全沒記）**：補上 logging — `line-ai-tools`(admin LINE/TG 工具迴圈)、`line-user-ai-tools`(學員 LINE 家教)、`pet/chat`(streamAI done chunk)、`admin/rewrite-lessons`。每輪 raw 回應後 `logAiUsage`(含 cache)。
- **結論**：所有 AI 呼叫（callAI 自動 + 章節聊天 + 四個 raw 黑洞）現在都記帳、費率本就正確 → 往後後台數字反映真實帳單。
- 連帶修：`agent-models/route.ts` 不能 export 非 HTTP 的 `AGENTS`（Next15 型別擋）→ 移到 `lib/creator-engine/ai/agent-list.ts`。

## 🎨 全站 emoji → lucide UI icon
UI 介面 emoji 全面換成 lucide 線條 icon（**不動**章節教學內容/碎片文字/AI 提示詞/訊息字串/資料 emoji）：
- **創作島**：主導覽、主畫面(HUD/捕捉/工具列/結果/分類/碎片卡/編輯)、綠寶聊天、導覽鈕、工作室、好友(含「送出的邀請」名單)、社群動態牆(公共/別人/自己分流 + 分享)、限動、私訊、市集、作品庫、成長、創作引擎(工作台+選類型頁)、engine-types 工具標籤。
- **共用 chrome**：TopNav/SideNav/NotificationsDropdown、首頁地圖/職涯/TrapBosses、章節 UI(LessonCard/ChapterView/BossBattle/EndQuizPlayer/PlaygroundCard/資源/筆記/付費牆…)。
- **後台 99 檔**：儀表板/AI/用戶/報表/訂單/客服/行銷/通訊/治理/內容/審核 等。保留 PageHero emoji prop、側欄 nav(當 localStorage key)、IDE/playground 深色面板。
- 用 3 個並行代理（creator-island / 共用 chrome / admin）分非重疊檔案跑；一個 admin 子代理誤改 26 個越界檔、用 `git checkout` 還原時連帶刪掉另兩批未提交的工作 → 已先 commit admin 保住、再重跑 A/B 復原（並下「禁用任何 git 指令」規則）。

## 🐛 同期修
- **低對比 badge**：~25+ 處亮色看不到字的 `text-X-200/300/400` 補 `dark:` 分流（admin idea-fragments/creator-island/line/reports + ComingSoon/AskAI/GeolocationConsent + 市集/作品庫/成長/HUD/工具列…）。110 RFM 卡其實已 theme-safe，是舊 image。
- **RWD**：`min-w-760px`→`min-w-[760px]`、ChapterView/SideNav 的 `flex-1 truncate` 補 `min-w-0`、Hero 600px 圈響應式。
- 105 導覽出界、106 演化全部可存+toast、106/108 碎片不限 100、107 後台模型頁 RWD（前批）。

## ✅ 推前檢查（2026-07-01）
- `npm run build` ✅ 綠（三批 + 引擎全部編譯過）。
- **API**：`audit-db-columns` → 325 route 全 export HTTP method、無欄位誤接。
- **資料庫**：13 張關鍵表 live 確認存在（含 ci_drafts/ci_series/ai_shares/email_verifications/ci_chat_sessions）。
- **UI/UX + RWD**：icon 化 + 對比修正、build 綠、icon+text 用 inline-flex 包好。
- **PWA**：`sw.js` v11。

## 🔜 剩下 / 待辦（同步進 `docs/MASTER_TODO.md`）
- [ ] **emoji 零星**：首頁 Hero/MissionDungeons/吉祥物主題 emoji（刻意保留行銷設計）、ResourceCard 成長刻度(🌱🌿🌳)、無對應 lucide 的 🐹🗺️👹🐍、engine-types 的 type `emoji:` 欄位（需把 CreationType 改帶 Icon component）。
- [ ] **PWA PNG icons 接線**：logo 192/512 已產生，`app/manifest.ts` 仍指 `favicon.svg` → 換 PNG + apple-touch/maskable。
- [ ] **Google 同意畫面去 `supabase.co`**：Supabase 自訂網域(付費) 或 GCC consent screen 設 App name+logo+發布（林董手動）。
- [ ] **輪替 Supabase service key / DB 密碼**：林董指示「等專案完成再做」。
- [ ] **H2 殘留(非 Claude、低額、可選)**：embeddings/Whisper/og 圖片生成 仍未記用量。
- [ ] **EMAIL_FROM**：Zeabur 若有設要改 `AI島 <service@snowrealm.pet>`。
- [ ] 長線：真·外部平台 cross-post(OAuth)、記憶管理 user 頁、AI run/成本儀表板前端、真金流 marketplace(KYC)。

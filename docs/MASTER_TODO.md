# AI 島 — 全專案待辦總整合（2026-06-29，已對 repo 驗證）

> 整合各檔待辦並**逐項對 repo 驗證**（admin 頁/資料表/元件/章節是否存在）。
> 來源：`TODO.md`(0623)、`REPORTS_TODO_2026-06-03.md`、`BACKLOG.md`、`BEGINNER_FRIENDLY_BACKLOG.md`、`ROADMAP_2026Q3.md`、`docs/ideas_os/`。
> 標記：`[ ]`=驗證後確實未做｜~~刪除線~~=驗證已存在於 repo（附證據）｜🟡=部分/待深核｜🔴=外部設定(code 看不到、靠林董確認)。

---

# 一、✅ 驗證「其實已經做完」（之前沒劃線）

對 repo 查到實體存在，視為**已完成**（保留紀錄）：

- ~~admin 後台 23 頁~~：churn / kpi / cohort / segments / email(campaigns+subscribers) / scheduled / tickets / crm / og-preview / seo / users/[id]/timeline / ai/moderation / marketing(schedule/publish/affiliates) / achievements / gamification / zcoin / web-vitals / ga4 / broadcasts / ab —— 全部 `page.tsx` 存在。
- ~~3D 島嶼~~（`src/app/island/page.tsx` 在）— ROADMAP S7-S8 v0 已落地。
- ~~ch71《Vibe Coding 除錯聖經》+ Debug 練習場~~（`ch71.json` + `api/playground/run`）。
- ~~Streak heatmap~~（heatmap 元件 6 檔）、~~技能雷達~~（radar）、~~每週學習報告~~（13 檔）、~~筆記匯出 MD~~（7 檔）、~~今日推薦下一課~~。
- ~~paywall / 單章購買 / 訂閱~~（paywall + `chapter_purchases`/`subscriptions` 表）。
- ~~可驗證證書~~（`certificates` 表 + certificate 8 檔）、~~作品集~~（`portfolios`）、~~推薦分潤~~（`referral_codes`/`referral_commissions`）。
- ~~AI tutor 額度分層基礎~~（`ai_daily_quota` 表 + ai/chat routes）、~~模擬面試~~（`mock_interview_sessions`）、~~導師檔案~~（`mentor_profiles`）。
- ~~Sentry~~（25 檔）、~~CSP~~（5 處）、~~PostHog~~（2 處）、~~bundle analyzer~~（4 處）。
- ~~退費/工單~~（tickets+crm）、~~流失預警~~（churn）、~~KPI 報表~~（kpi）、~~cohort 留存分析~~（admin/cohort）、~~SEO 預覽~~（og-preview/seo）。
- ~~AI 內容審核~~（ai/moderation）、~~寵物進化~~（me/pet/evolve）。

> 結論：`ROADMAP_2026Q3` S1–S6、S9–S12 與 `REPORTS_TODO` §G 大部分已完成；那兩份可標「歷史」。

---

# 二、🔴 真的還沒做（已驗證 ❌）— 平台 code

- [ ] **PWA icon**：`public/` 只有 `favicon.svg`，缺 PNG 192/512 maskable + apple-touch。
- [ ] **GDPR `user_settings` 表**：supabase 無此表、gdpr/export 默默漏 → 建表 or 刪那行。
- [ ] **Cloudflare Turnstile**：src 0 引用 → 註冊/發文防機器人未做（+ 蜜罐欄位）。
- [ ] **N8N 12 workflow**：src 無實接（只在章節內容提到）→ 自架 n8n 後再開（spec 在 `N8N_INTEGRATION.md`）。
- [ ] **大檔上傳 OOM 防護**：附件走 server 記憶體；無限大需 presigned 直傳。
- [ ] **（選配）自架 Piston**：需 VPS、設 `PISTON_BASE_URL`。
- [ ] **AI 草稿語意抽查**：結構已驗(0 錯)，答案對錯建議人工抽看。
- [ ] **學習社群 / Cohort 使用者端**：❌ 確認沒做（只有 `admin/cohort` 分析、無使用者端頁/表）。期數制 / 進度夥伴 / 組隊 Boss 待開發。

# 三、🟡 深核後的確切狀態（2026-06-29 已查 code）

**自動評測**（拆兩半）
- ~~自動判題 + 發 XP~~ ✅ **已做**：`admin/playground/challenge/submit`（Pyodide 跑 user_code+test_code、第一次 `passed` → `add_xp` + `xp_events`）。
- [ ] **綠寶 AI Code Review（程式點評）**：❌ 無 code-review 端點 → 未做。
- [ ] **作業自動批改**：`me/assignments/submit` 目前 `graded_by:null` = **人工批改**；可加自動判分。

**安全**
- ~~HSTS + X-Frame-Options~~ ✅ 已在 `next.config` headers。
- [ ] **CSP**：❌ 確認**沒做**（先前「CSP 5 處」其實是 ch04 章節內容，非真 header）→ 建議 Report-Only 先行。
- [ ] **v1 API key 一鍵輪替/停用 UI**：`api_keys_v` 表在，但 admin 無輪替/停用介面。

**效能**
- [ ] 其餘列表 API `select("*")`→明確欄位（章節 metas/nav 已做）、RLS `is_admin()` SECURITY DEFINER + index。

# 四、🔴 林董手動設定（code 看不到、靠你確認）

- [ ] **確認部署**：Zeabur Restart 拉 `:latest`；admin 🚀 角標顯示最新 commit。
- [ ] **Stripe**：key → bootstrap → 3 price_id → webhook(6 事件) → `STRIPE_WEBHOOK_SECRET` → 4242 測。(`STRIPE_SETUP.md`)
- [ ] **寵物 4 隻 Lottie URL** → `/admin/lottie-settings`。
- [ ] **cron 排程 7 個**（student-daily-review / recall-user / leetcode-sync / discord-quote / summarize-memories / launchpad-auto-sync / launchpad-retrospective）。(`cron-setup.md`)
- [ ] **Discord 收尾**（VIP role 順序 + `DISCORD_VIP_ROLE_ID`/`DISCORD_CLIENT_SECRET`）。
- [ ] **GitHub Actions** `CRON_SECRET`/`SITE_URL` 對齊；**OAuth `deleted_client`** 確認可登入；**Owner MFA**；**Cloudflare WAF + 藏 origin IP**；**Dependabot + 備份 + 金鑰輪替**。

# 五、📚 內容工作（持續、部分完成）

- [ ] **新手友善化**（`ch26` 規格）：已做 12 章/~309 課；其餘按 P0→P1 順序續推。(`BEGINNER_FRIENDLY_BACKLOG.md`)
- [ ] **strict-spec 重寫**（選配、更高標）：ch68(20 課)、ch55-58/60-67/69-70。附錄 by design 可不改。

---

# 🏝️ 六、Ideas OS / Creator Island（全新、純規格、尚未動工）

> 18 份規格全 Codex PASS；執行細節 `docs/ideas_os/TODO.md`。**整段都是未做**（要從 M0 開工）。

## MVP（v0）— `ci_` 前綴新表　**已實作於 branch `feat/creator-island-m0`、migrations 已 db:apply**
- [x] ~~**M0 Foundation**：6 張 ci_ workspace 表 + RLS + RPC(transfer/debit) + lazy-create + flag(預設開) + `/creator-island` 殼。~~
- [x] ~~**M1 Assets**：ci_fragments/works/work_fragments/asset_relations(多型 trigger)/versions/packages/collections + creator-engine 服務 + API。~~
- [x] ~~**M2 AI loop**：ci_agent_runs；Model Router + Cost Manager(核心免費)；凝聚/演化/編織(zod)；E11 Suno/MV song mode；usage parity。~~
- [x] ~~**M3 Shell**：首頁第三入口 + 創作循環 UI + 作品庫/編輯器 + 工作室管理 + 發布到 blog；E1 first-run；E2 種島；E10 免費。~~
- [x] ~~**M4 Memory + skeletons**：ci_memories(與 user_ai_memory 分開)+usage + 注入 agents；ci_dust_ledger + 碎片蛋；market/community/growth skeleton。~~
- [~] **M5 Hardening + launch**：smoke 擴 `/creator-island` ✅；測試/a11y/perf/security-review 待補；**merge→push→Zeabur 部署**（進行中）。

## Phase 2 — **已實作 + 部署（2026-06-29）**
- [x] ~~E3 創作家譜（作品顯示 composition+衍生）~~
- [x] ~~E4 主動回憶（語意 related）~~ + [x] ~~E5 意外配對（ci_surprising_pairs + embedding backfill）~~
- [x] ~~E6 語音/拍照捕捉~~、[x] ~~E7 工作流錄製/重播~~、[x] ~~E8 文化轉譯（Transcreator + 家譜）~~、[x] ~~E9 Creator DNA 卡 + Growth 頁~~
- [x] ~~完整 Marketplace（Z幣 phase1、抽成 0%、賣家進 workspace wallet、entitlement）~~
- [x] ~~完整 Community（follow/collect/like/comment + fork/remix→複製+家譜）~~
- [ ] 仍 future：真金流 marketplace（KYC，需決策）、Workflow 視覺編輯器+n8n、其餘 agents(孵化/回收/評審/教練)、Knowledge 區、Growth skill tree/Monthly report、E11 完整版(封面/風格庫/Prompt Pack)、Agent Blueprint 變 Asset(ADR-015)、沉浸式島嶼世界 UX。

## Creator Island 收尾（2026-06-29 全站對接驗收後）
> 驗收結果：30 ci_ 表 + 11 RPC 全建、欄位審計 0 錯接、41 API 全 export、8 UI 頁全接、RWD/PWA 已接。詳見 `docs/daily_works_0629.md`。
- [x] ~~**碎片庫滿 10009**（R 5497 / SR 3843 / SSR 669；形式：畫面/物件/句子/人物/地點/對話/詞/意象；去重）~~。可再跑 `gen-fragment-pool.mjs` 擴充。
- [x] ~~**社群（參考 Insight）完整**：動態牆(發文/圖影音/讚/留言/收藏) + 限動 Stories(24h) + 短影音 + 好友(邀請/接受) + 私訊(文字+附件) + 站長監看私訊(owner-only+稽核)~~。
- [x] ~~**通知**(讚/留言/好友/私訊→鈴鐺) + **分享 OG 圖卡**(作品) + **Discord/LINE/TG**(貼文/新創作者/成交→notifyAdmin) + **內容單獨複製** + **聚光導覽**~~。
- [x] ~~**島內對話 AI 綠寶**（多模態聊天：文字/🎤語音/📷看圖(vision)/📎檔案；寫 ci_agent_runs → 後台 AI 對話可見）~~。
- [x] ~~**發佈到本站部落格**（works→blog + 社群貼文→blog publishPostToBlog）~~。
- [x] ~~**presigned 直傳 R2**（圖/影/音/檔皆可、client 直 PUT 不經 server、上限放寬至 GB 級；社群/限動/私訊/聊天皆改用）~~。
- [x] ~~**創作引擎**（2026-06-30）：`/creator-island/create`「✨ 創作引擎」直接開寫 7 類型（小說/短篇/歌詞/詩/劇本/文章/文案），每類型專屬工具(章節大綱/角色卡/押韻/Suno/MV/分鏡/SEO/Slogan…)＋通用 TipTap 編輯器＋碎片素材欄＋綠寶 assist＋自動存草稿＋存作品/發部落格；`ci_drafts` 表(live CRUD 驗證)；編織完一鍵導入續寫~~。
- [x] ~~**後台 AI 補齊**：admin/ai/creator-island 補 advise/chat/assist（原僅 5 個）；chat 接 `resolveModel("chat")`~~。
- [x] ~~**RWD/視口修復**：綠寶可拖曳+清開底部 nav、導覽 tooltip 夾進視口、手機碎片編輯鈕常駐、浮動 UI 抬高 `bottom-[5.5rem]`~~。
- [ ] 真·外部平台 cross-post（Threads/IG/Medium，需 OAuth 金鑰，未做）。
- [ ] **PWA PNG icons**：`app/manifest.ts` 仍只指 `favicon.svg`；補 192/512 maskable + apple-touch（與平台共用 TODO）。
- [ ] **記憶管理使用者頁**（選配）：`ci_memories` 後端 + agent 注入已備，缺 user-facing 管理 UI。
- [ ] **AI run / 成本儀表板**（選配）：`/api/creator-island/ai/runs` 已備、缺前端。
- [ ] **真金流 marketplace**（KYC，需林董拍板）。

## 2026-06-30 ~ 07-01 衝刺（含臨時交辦、做完畫刪除線、未做保留）
> 詳見 `docs/daily_works_0630.md`、`docs/daily_works_0701.md`。

### ✅ 已完成（含原不在清單上的臨時交辦）
- [x] ~~**系列 / 專輯 + 再分類**：`ci_series`(kind series/album, category)；草稿/作品 series_id；創作引擎指派(歌詞=專輯)+建立頁依分類分組~~。
- [x] ~~**綠寶島內對話歷史**：`ci_chat_sessions`(訊息 jsonb，RLS) + 列表/載入/刪除；聊天框 🕘 歷史 + 開新對話~~。
- [x] ~~**工作室/創作引擎/編輯頁 加「我的部落格」入口**~~。
- [x] ~~**註冊 Email 驗證碼**：`email_verifications`(sha256/10分/限流) + send-code/verify + 密碼👁 + 防自動填入；Resend 寄件改已驗證 `snowrealm.pet` 網域~~。
- [x] ~~**OAuth 首次登入自選顯示名稱**：`profiles.display_name_set` + `/onboarding/name` + ensure-profile 不直接用第三方真名~~。
- [x] ~~**AI 回答分享短連結**：`ai_shares` + `/share/ai/[token]` 落地頁(撐完整回答 + OG)；取代長編碼亂碼網址~~。
- [x] ~~**社群三分流**(公共/別人(好友)/自己) + **貼文分享**(`/creator-island/p/[id]` 公開永久連結 + OG)~~。
- [x] ~~**好友「送出的邀請」名單**(listSent + 可收回)；工作室角色標示修(成員→查看成員/中文角色)~~。
- [x] ~~章節「快速滑過」提醒**可展開列出哪幾節**並一鍵跳去細看~~。
- [x] ~~綠寶**不誇大/不掛保證**(tutor prompt)、後台標題直排修、分享網址亂碼修、碎片手機可編輯、手機導覽出界、綠寶可拖曳~~。
- [x] ~~bug 105–108：導覽出界(數值置中)、演化**全部可存+toast**、碎片**不再限 100**(listAllFragments)、後台 AI 模型頁 RWD~~。
- [x] ~~**AI 成本記帳全面修**：H1 Anthropic prompt-cache tokens 計價、H3 創作島重複記帳移除、H4 top-spender keying、H2 四個 raw 黑洞(LINE admin/student 工具迴圈、寵物聊天、改寫課程)補 logging~~。
- [x] ~~**全站 emoji → lucide UI icon**：創作島全頁 + 共用 chrome(TopNav/SideNav/通知/首頁/章節UI) + 後台 99 檔。保留教學內容/quiz/訊息字串/主題 emoji~~。
- [x] ~~**對比度**：~25+ 處亮色看不到字 badge 補 `dark:`；**RWD** 5 處破版；**PWA** sw v9→v11~~。
- [x] ~~**安全加固**(Codex/Claude 審計)：admin guard 永遠放行 bug(9處)、og 診斷端點鎖 requireOwner、fetch-url SSRF 防護、upload/presign 上限+MIME allowlist、sudo 移除 dev-secret fallback、resume markdown XSS、sanitize-html nonTextTags 防 xmp、`npm audit fix`(ws DoS 等)~~。
- [x] ~~Logo PNG 512/192 產生(給 Google OAuth consent screen)~~。

### ⏳ 未做 / 待續
- [ ] **emoji 零星未換**：首頁 Hero/MissionDungeons/吉祥物的主題性 emoji(刻意保留行銷設計)、ResourceCard 成長刻度(🌱🌿🌳)、無對應 lucide 的 🐹🗺️👹🐍、engine-types 的 type `emoji:` 欄位(需把 CreationType 改帶 Icon component)。
- [ ] **PWA PNG icons 接線**：logo 192/512 已產生，但 `app/manifest.ts` 仍指 `favicon.svg` → 換成 PNG + 補 apple-touch/maskable。
- [ ] **Google 同意畫面去除 `supabase.co` 字樣**：需 Supabase 自訂網域(付費 add-on) 或 GCC OAuth consent screen 設 App name「AI 島」+logo+發布(林董手動)。
- [ ] **輪替 Supabase service key / DB 密碼**：林董指示「等專案完成再做」。
- [ ] **H2 殘留(非 Claude、低額、可選)**：embeddings(OpenAI)、Whisper、og/ai 圖片生成 仍未記用量。
- [ ] **EMAIL_FROM 確認**：Zeabur 若有設要改成 `AI島 <service@snowrealm.pet>`(已驗證網域)。

## 其他島嶼（長線）
- [ ] Learning / Business / Research Island（共用 Ideas OS 核心）。

---

# 🌌 七、未來版本（v7+，獨立大專案）

- [ ] **AI 模型中台升級**（`AI島_AI模型中台升級規格_v1.md`）：AI Router 三層池 + 成本分級 + Z幣/VIP。
- [ ] Chapter 推薦演算法、全站語意搜尋 UI、Marketing 排程 OAuth、A/B ad copy、人生星圖(暫緩)。

---

## 維護建議
- **以本檔為單一真實來源**；`ROADMAP_2026Q3` / `BACKLOG` / `REPORTS_TODO` 標「歷史」。
- 完成項用 ~~刪除線~~ 保留（專案慣例）。
- 🟡 待深核 3 項（自動評測深度 / cohort 使用者端 / 安全收尾）建議下次開工前各花 5 分鐘確認真實狀態。

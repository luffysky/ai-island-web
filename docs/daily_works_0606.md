# Daily Works — 2026-06-06

董事長林董（Luffy Lin）。雪鑰值班。
主題：**AI 體驗大修（綠寶正名/平台 FAQ/聊天滾動）→ 手機 RWD → 寵物記憶+智商 → 學員 LINE 連環修（含真正主因 surrogate）→ AI 模型成本/路由 → Supabase 安全告警全清 → owner ⊇ admin 權限統一 → 接錯表修正**。

---

## 🟢 AI 體驗（不分模型都生效）
- **三位網站導師（綠寶/肥仔/菇寶）正名**：被問身份不再自稱「雪鑰」（雪鑰＝LINE 管理後台＋學員 LINE 專屬）。`buildStudentWebIdentity()` 依 persona 給身份；LINE 仍是雪鑰。
- **平台功能 FAQ + 鐵則**：被問「有沒有 App / 筆記 / 對話歷史」一律明確說「有」並指路（PWA / /me/notes / /me/ai-history），嚴禁回「目前還沒有」。
- **bug 76 聊天滾動**：AI 導師視窗改「非鎖頁面捲動 + overscroll-contain」→ 游標在頁面滾頁面、在聊天室才滾聊天室。`overlay-stack` 加 `lockScroll` 參數區分 modal/浮動面板。
- **分享 AI 圖卡 OG 中文亂碼**：載入 Noto Sans TC 子集字型。

## 📱 手機 RWD
- `/me` 左側欄手機改**橫向捲動快捷列**（不再擠壓/蓋住內容＝bug 80/81）。
- 手機 nav 加**深淺色 on/off 切換鈕**。
- 筆記工具列手機加**收合旋鈕**（旋轉展開次要功能）。
- 全站已有 `body{overflow-x:hidden}` 擋橫向爆版；admin 後台桌面優先、不動。

## 🐹 寵物 AI — 記憶 + 智商升級
- 對話記憶 10→**30 則**，合併連續同角色 / 確保 user 開頭（避免 Anthropic role 不交替 400）。
- 加「你記得我們剛剛在聊什麼」續聊指令 + 放寬過度死板的 30 字硬限。
- **滾動長期記憶**：每 12 則訊息把對話濃縮進 `pets.memory_summary`（長期記得名字/喜好/在學什麼/約定）。
- maxTokens 200→280。

## 🔵 學員 LINE AI — 連環修（三刀）
1. **韌性 fallback**（`513c270`）：模型/金鑰挑選改「依序找第一個可用 provider」，不再一個壞就整個掉 ticket；兩條 null 路徑寫進 `error_logs`。
2. **admin 直接用高模型**（`5707769`）：owner/admin/editor 在學員 LINE 候選模型按強度降序（Opus→Sonnet→…）先試；付費 Premium 走 `line_user_vip` 用途鍵。
3. **真正主因 — 落單 surrogate**（`d008f3c`）：error_logs 實證 Anthropic 400「no low surrogate in string」。注入學員筆記時 `slice(0,250)` 切在 emoji 代理對中間 → 落單 UTF-16 surrogate → JSON 不合法 → 整個請求炸 → 退化成 ticket。修：provider 邊界 `stripLoneSurrogates()`（buildAnthropicSystem / toAnthropicMessages / contentToText），完整 emoji 與中文不受影響。

## ⚡ AI 模型 — 成本/路由（#1 完成）
- **Prompt cache 前綴拆分**（`b68caec`）：`PROMPT_CACHE_MARKER` 把「全站共用穩定前綴（導師身份+規則+課程結構）」跟「個人化後綴」切開，Anthropic 端前綴設獨立 ephemeral cache → 同 persona/tone 所有使用者**跨對話共用快取**（課程結構最大塊、命中 0.1x）。
- VIP/付費/admin 模型路由（`ea60360` + 上述）。
- （待續 #2~#6：模型分級路由分類器 / web 改 tool 查課程 / pgvector RAG / skills SOP / 回饋迴路。）

## 🛡️ Supabase 安全告警 — 全清
- **SECURITY DEFINER views ×5**（Critical）→ `security_invoker=on`，並驗證 leaderboard(anon) 仍讀得到、沒壞。
- **function_search_path_mutable**：自有 **38 個**函式設 `search_path=public`（pgvector 140 個是套件內建、忽略）。
- **security_definer_function_executable 54→14**：SERVER_ONLY（觸發器+admin.rpc）收回 anon+authenticated（留 service_role）；AUTH_KEEP（登入者 RPC/RLS helper）只收回 anon、留 authenticated；view 計數函式留匿名。
- **notifications insert policy → `WITH CHECK(false)`**：擋 client 偽造通知（service_role 照常寫）。
- SQL 都備在 `supabase/*.sql`（views / search_path / secdef grants）。

## 🪪 權限統一 — owner ⊇ admin
- **28 處** gating 把「只認 admin」補上 owner（後台頁 redirect、API forbidden、forum 版主、teacher 系列、ai_unlimited、island admin、pet-vip tier…）。原本一堆 `role !== "admin"` 會在 owner 化之後把林董擋在外面。
- 角色設定 SQL 備妥 `supabase/set_owner_role.sql`：**Luffy Lin → owner**、**luffysky004（測試小號）→ member**。（部署後再跑、避免 owner 短暫被擋。）
- 查到：`hotnami111`（admin+學員雙身份）已綁 LINE → 學員 LINE 會自動給她高模型 ✅。

## 🧱 接錯表 / 沒建表（DB 審計）
欄位錯接 0；但發現幾個**接到不存在的表**：
- `forum_posts` → 應為 `forum_replies`（LINE 工具拉討論回覆）→ **已修**。
- `system_settings` → 應為 `app_settings`（LINE 維護模式開關）→ **已修**。
- `seo_overrides`：admin SEO 覆寫功能在用、表沒建 → **備 migration** `supabase/seo_overrides_migration.sql`（待跑）。
- `user_settings`：只有 gdpr export 讀、已用 `safe()` 包住、不會壞 → 列待辦（可補建）。
- `posts` / nami-playground = 沙盒動態表、非 bug。

---

# 📋 所有待辦（彙整 + 本日新增；✅=完成）

## A. 要你手動跑/設（最迫切）
- [x] ✅ **`set_owner_role.sql`**：Luffy Lin→**owner**、luffysky004→**member**（順手發現 `profiles_role_check` 原本不允許 'owner'、已把 owner 加進 constraint）
- [x] ✅ **`seo_overrides_migration.sql`**：補好 SEO 覆寫表
- [x] ✅ views / search_path / secdef grants / notifications policy 都已套用到正式機（SQL 留存供查）
- [ ] Supabase Dashboard：開**外洩密碼防護** + **MFA(TOTP)** + 縮短 OTP 有效期
- [ ] Zeabur redeploy 到最新 commit；學員 LINE 部署後再戳一次確認正常
- [ ] （選）`user_settings` 表補建（目前只有 gdpr export 讀、已 safe() 包住不會壞）

## B. AI 升級 #2~#6（接著做）
- [ ] **#2 模型分級路由**：輕量分類器判難度 → 簡單用 Haiku/Flash、難題升 Sonnet/Opus（接 `ai_models.tier`）
- [ ] **#3 Web 改 tool 查課程**：網站也走 `search_lessons`（省 token、只餵相關章節）
- [ ] **#4 pgvector RAG**：lesson embedding + 向量檢索（殺幻覺）
- [ ] **#5 Skills/SOP 工具化**：解 bug / code review / 出題 / 批改 做成可重用工具
- [ ] **#6 回饋迴路**：AI 回答讚/倒讚 → 收爛 case → 改 prompt / few-shot
- [ ] AI 模型中台：統一路由 + quota + fallback + BYOK + 成本/延遲/品質 dashboard

## C. v2 島嶼（還沒動，重點專案）
- [ ] **3D 島嶼 v2**：重做島嶼互動/場景（v0/IslandV0 → v2），整合章節地圖、寵物漫步、據點（排行/論壇/部落格/週賽）、季節/節日
- [ ] 島嶼任務系統與每日 quest 串接、據點解鎖動畫、效能（lazy load 3D 資源）

## D. 筆記/聊天 UI（先前承諾、未做）
- [ ] **Messenger 式聊天視窗**：最小化 vs 關閉、可調大小並記憶、最小化保留捲動位置、關閉再開回最底（綠寶頭像氣泡當展開/縮小鈕）
- [ ] `user_settings` 表補建（gdpr export 完整）

## E. 內容 / 圖片（沿用 0605）
- [ ] Ch00 零基礎 vs 有經驗分流路徑
- [ ] B/D/E/F 區概念圖 ~110+（深淺雙版本）、ch10 create_next 圖
- [ ] strict-spec 重寫（ch68 高階、ch55-58/60-67/69-70 選配）

## F. 安全 / 維運（沿用 + 本日）
- [ ] `auth_rls_initplan`（159 條、純效能）：RLS policy `auth.uid()` → `(select auth.uid())`，之後出安全批次
- [ ] `multiple_permissive_policies`（9 組）合併
- [ ] extension_in_public（pgvector 搬 schema、風險高、低優先）
- [ ] Cloudflare 擋在 Zeabur 前、CSP、Turnstile、金鑰輪替、Dependabot、備份

## G. 功能 Backlog（沿用 0605）
- [ ] B1 自動評測 + 綠寶 code review、B4 證書、C1 Cohort、Z 幣商城、職缺媒合、n8n 自動化、Discord OAuth、模型中台 v1

---

# 🌙 本日後續（深夜場：AI 升級 #2~#6 + GA4 + 收尾）

## ✅ 已完成上線
- **學員 LINE 真正主因**：tool 路徑（askStudentAIWithTools）自組 Anthropic body、繞過 surrogate 清洗 → deepStrip 修好（學員＋admin 兩條）
- **AI 升級全套**：#2 Auto 模型分級路由（依難度 flash↔sonnet、設預設）、#4 RAG（接 vectorSearchLessons、1163 篇已 embed）、#5 智慧記憶（按需載入省 token）、#6 讚/倒讚回饋（ai_feedback 表）
- **Supabase 安全**：5 views security_invoker、38 函式 search_path、函式 EXECUTE 收緊 54→14、4 個 policy WITH CHECK(false)（notifications + 3 遙測）→ war.json 60→~15（剩皆刻意保留）
- **owner ⊇ admin**：28 處 gating 補 owner；Luffy→owner、luffysky004→member（順手把 owner 加進 profiles_role_check）
- **接錯表修**：forum_posts→forum_replies、system_settings→app_settings；補建 seo_overrides
- **手機 RWD**：viewport 鎖縮放、筆記卡片底部改收合旋鈕、綠寶 Messenger 縮小/展開 + 可調大小記憶
- **GA4 A+B**：trackEvent helper、登入綁 user_id+受眾屬性、接 sign_up/login/ai_chat_send/ai_feedback/share_answer/checkin/lesson_complete/quiz_complete/note_save/begin_checkout

## 📋 GA4 C+D（要你在 GA4 後台點選、程式給不了）
- [ ] **自訂定義**（Admin → 自訂定義）：事件維度 persona/model/rating/method/chapter_id/lesson_id/xp/streak；使用者屬性 role/level/streak
- [ ] **Enhanced Measurement** 開：scroll / outbound / site search / file download / form
- [ ] **標關鍵事件**：sign_up / begin_checkout / lesson_complete → 轉換目標
- [ ] **BigQuery 連結**（免費）→ 留存 / cohort
- [x] page_title 已含章名（Ch26：… | AI 島）= C5 OK

## 🧱 DB 審計發現（皆優雅降級、不 crash；需產品決定真實表名再修）
- [ ] `active_sessions`（admin/health 計數）→ 疑為 `analytics_sessions`
- [ ] `email_subscribers`（admin 計數）→ 疑為 `email_subscriptions` / `blog_subscribers`
- [ ] `courses`（island 首頁區塊）→ 無對應表、courses 功能尚未建表（島嶼該區塊顯示空）
- [ ] `ai_usage_logs` / `feature_flags` / `user_settings`：**已有 try-catch「表未建」優雅處理**、屬可選功能、非 bug（feature_flags 的維護模式已改寫 app_settings）
- ✅ 欄位錯接 0、254 支 route 全註冊、ai_feedback / seo_overrides 已建

## ⏭️ 還沒做
- [ ] GA4 剩餘事件（pet_chat / playground_run / line_bind 在 LINE 端故略）
- [ ] 33 篇新 lesson 補 embedding（.env.local 放 OPENAI_API_KEY 跑 backfill_embeddings.mjs）
- [ ] v2 島嶼、AI 模型中台 dashboard、Nami 貼圖（林董手作中）

## 🎁 小巧思批次（UI 微互動，無 DB 變更、審計 0 錯）
**學員**：`<CountUp>` 數字滾動（等級/XP/Z幣/連勝/生命，側欄+TopNav）、`<StreakFlame>` 連勝越燒越旺、摸寵物浮愛心+彈跳、複製氣泡改液態玻璃、升級撒 confetti。
**後台**：`AdminGreeting` 時段問候+雪鑰揮手+今日註冊、KPI `<CountUp>`（漲跌箭頭本來就有）、`PulseDot` 近 7 日活躍呼吸燈、`RingGauge` AI 預算環形量表。
**留著沒做（有原因）**：① 後台浮動工具列改環形 → 現有面板有標籤+拖移+關閉/隱藏，環形會犧牲這些、不划算；② Z 幣入袋飛行粒子 → 數字已用 CountUp 滾、飛行粒子屬額外、需掛全站得幣事件、列為選配。

> 來源：`daily_works_0605.md` + 本日進度。

# 語言島 MVP 架構草案（Language Island）

> 狀態：草案 v0（2026-07-09）。AI 島的**第四個模式**（程式學習島 / 創作者島 / 語言島）。
> 原則跟創作者島一樣：**最大化複用現有系統，不重造輪子**。先驗證單一語言的留存，再擴。

---

## 1. 一句話定位

> **AI 對話優先的語言學習島**：用真的能跟你聊天的 AI 夥伴練口說 + 你自己的 SRS 單字庫 + 遊戲化闖關，綁在技術/創作社群裡。

**差異化（別跟 Duolingo 正面打）**：服務「想邊待在技術/創作圈、邊把外語練起來」的人——工程師練英文（面試/文件/接案）、練日文（就業/接案）。跟現有受眾同一批人，不是從零找新客。

**核心賣點**＝多數 App 最弱的三塊，我們現成：
1. **AI 對話夥伴**（可糾錯、可調難度、可角色扮演情境）。
2. **你自己的 SRS 單字庫**（間隔複習，語言學習的真核心引擎）。
3. **社群 + 經濟**（果實/Z幣、排行榜、streak）本來就有。

---

## 2. MVP 範圍（先做 / 先不做）

**先做（MVP）**
- **一種語言**：建議「英文（給繁中受眾）」或「日文」二選一先做（本草案以「目標語言 = 英文、介面/母語 = 中文」為例，架構語言無關、可擴）。
- **AI 對話練習**：情境對話（點餐/面試/自我介紹…）、即時糾錯、依 CEFR 難度分級。
- **SRS 單字卡**：加單字→間隔複習（沿用 `note_reviews` 的 SM-2 引擎）。
- **闖關課程**：10–15 關的最小課程（字母/發音→常用句→情境），沿用 quest/XP。
- **每日目標 + streak + 果實獎勵**（沿用現有 gamification）。

**先不做（之後再說）**
- 多語言同時上（先驗證一種）。
- 完整 CEFR A1–C2 全課綱（內容是重活，先做 A1–A2 骨架）。
- 語音辨識評分（口說發音打分，靠第三方 ASR，成本/複雜度高）→ v2。
- 寫作批改、考試模擬（TOEIC/JLPT）→ v2。

---

## 3. 複用的現有系統（重點：幾乎不用重造）

| 現有系統 | 檔案 / 表 | 語言島怎麼用 |
|---|---|---|
| **AI 對話 + persona + 自動備援** | `/api/ai/chat`、`ai-personas.ts`、`ai-tutor-prompt.ts`、`resolve-usage-ai.ts` | 新增「語言老師」persona（見 §6）；串流 + 額度備援直接沿用（Claude 掛了自動換 Gemini/GPT） |
| **SRS 間隔複習** | `note-srs.ts`（SM-2）、`note_reviews` 表、`NotesManager` 的複習 UI | 單字卡就是「一則 note + 一筆 note_review」，或抽成專用 `vocab_cards`（見 §4，建議專用表較乾淨） |
| **TTS 朗讀** | 剛加在翻譯器的 `speechSynthesis` | 單字/例句/對話發音 |
| **翻譯器** | `/translate`、`/api/translate`（免費 Google） | 學習中「這句什麼意思」即點即譯；查生字 |
| **關卡 / 遊戲引擎** | `/quest`、`quest_completions`、`quest_ai_levels`、PixiJS | 語言闖關關卡（配對/填空/聽力選擇） |
| **內容 i18n + 免費翻譯同步** | `content_translations`、`translate-sync-all.mjs`、`sync-ui-messages.mjs` | 課程/UI 多語；學習者母語可切換 |
| **gamification** | `profiles`（xp/z_coin/streak_days/hearts）、`user_daily_goals`、簽到 | 每日目標、連勝、果實/Z幣獎勵直接沿用 |
| **島嶼模式外殼** | `creator-island/**` 的架構（hub + nav + workspace 概念）、首頁模式切換 | 語言島 = `/language-island` 一個新 hub，複製創作者島的頁面骨架 |
| **內容從 DB 讀** | `@/lib/content`、chapters/lessons | 語言課程也走同套（新 course_type / 或獨立表，見 §4） |
| **排行榜** | `leaderboard_lessons` RPC 模式 | 語言島單字量/連勝榜 |

---

## 4. 新增資料表（schema 草案）

盡量少開表。MVP 只要 4 張：

```sql
-- 語言課程單元（關卡）。跟程式 chapters/lessons 分開，避免污染。
create table language_lessons (
  id text primary key,                 -- e.g. "en-a1-01"
  lang text not null,                  -- 目標語言 'en' / 'ja'
  level text not null,                 -- CEFR: a1/a2/b1...
  sort_index numeric not null,
  title text not null,
  intro text,                          -- 這關要學什麼
  items jsonb not null default '[]',   -- 題目/句型/單字陣列（見下）
  xp int not null default 20,
  created_at timestamptz default now()
);
-- items 範例（jsonb）：
--   [{ "type":"vocab", "term":"apple", "meaning":"蘋果", "example":"I eat an apple." },
--    { "type":"sentence", "text":"How are you?", "meaning":"你好嗎？" },
--    { "type":"quiz", "q":"「蘋果」的英文？", "options":["apple","banana"], "answer":0 },
--    { "type":"listen", "audio_text":"Good morning", "answer":"Good morning" }]

-- 使用者單字庫（SRS）。沿用 SM-2 欄位（跟 note_reviews 同結構、但語言專用）。
create table vocab_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lang text not null,
  term text not null,                  -- 目標語言的詞/句
  meaning text not null,               -- 母語意思
  example text,                        -- 例句
  audio_lang text,                     -- TTS 用的語言碼
  -- SRS（跟 note-srs.ts / note_reviews 對齊）
  due_at timestamptz not null default now(),
  interval_days int not null default 0,
  ease numeric not null default 2.5,
  reviews int not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, lang, term)
);
create index vocab_cards_due on vocab_cards(user_id, lang, due_at);

-- 使用者語言島進度（每個 lang 一列）。
create table language_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lang text not null,
  level text not null default 'a1',
  completed_lessons text[] not null default '{}',
  xp int not null default 0,
  streak_days int not null default 0,
  last_active_date date,
  primary key (user_id, lang)
);

-- AI 對話練習記錄（可選；也可直接沿用現有 ai_conversations + 標 context）。
-- MVP 建議：直接複用 ai_conversations，加一個 meta 標 { island:'language', lang, scenario }。
```

> **決策點**：單字 SRS 要「開 `vocab_cards` 專用表」還是「沿用 `notes` + `note_reviews`」？
> 建議**專用表**——語言單字的欄位（term/meaning/example/audio_lang）跟筆記不同，混用會髒。SRS 演算法（`note-srs.ts` 的 `nextSrs`）可直接複用、只是換一張表存。

---

## 5. 新增頁面 / API

**頁面（複製創作者島骨架）**
- `/language-island` — hub：選語言、今日目標、繼續闖關、複習到期單字數、streak。
- `/language-island/learn/[lessonId]` — 闖關頁（單字/句型/quiz/聽力，沿用關卡 UI）。
- `/language-island/practice` — **AI 對話練習**（選情境 → 跟語言老師 persona 對話，沿用 AITutorWidget/chat 串流）。
- `/language-island/vocab` — 我的單字庫 + **今日複習**（沿用 NotesManager 的 SRS 複習條 UI）。
- （首頁模式切換加「語言島」入口；TopNav 之後可加）

**API（多數沿用現有）**
- 對話：直接用現有 `/api/ai/chat`（帶 `personaId=lang_teacher` + context 帶 lang/scenario）。**不用新開**。
- `/api/language/vocab`（GET 到期卡 / POST 加卡 / PATCH 評分重排）— 薄薄一層，SRS 用 `note-srs.ts`。
- `/api/language/progress`（GET/PATCH 進度）。
- 課程內容：`language_lessons` 用 admin 撈（比照 `content.ts`）。
- 翻譯/TTS：沿用 `/api/translate` + 前端 `speechSynthesis`。

---

## 6. AI 對話夥伴（語言老師 persona）

在 `ai-personas.ts` 加 1–2 個語言老師 persona（沿用現有 persona 機制 + `buildTutorSystemPrompt` 疊 system prompt）：

- **persona `lang_teacher`**：耐心、鼓勵、**用目標語言對話但會即時糾錯**（在括號裡給中文提示 / 修正）、依使用者程度調整難度（CEFR）、情境角色扮演（店員/面試官/朋友）。
- system prompt 疊加要點：
  - 「你在跟一個母語是中文、正在學英文（level A2）的學生對話。主要用英文、但句子要簡單；學生說錯時，先自然回應、再用一行 `💡 修正：...` 給更好的說法。每 2–3 輪丟一個追問維持對話。」
  - context 帶：`lang`, `level`, `scenario`（點餐/面試/自我介紹…）。
- **自動備援白吃白喝**：現有 `callAI`/串流的多模型 fallback 直接生效，Claude 額度沒了自動換 Gemini/GPT，對話不中斷。

> 口說發音評分（ASR）不在 MVP；先用 TTS 讓學生「聽」+ 打字對話。v2 再接 Web Speech API 的 SpeechRecognition 做簡單發音回饋。

---

## 7. SRS 單字卡（複用 SM-2）

- 加卡途徑：闖關遇到的生字一鍵加入、對話中不懂的字查翻譯後加入、手動加。
- 複習：`vocab_cards` 撈 `due_at <= now()`，UI 沿用 NotesManager 的「忘記/模糊/記得」三鍵 → 呼叫 `note-srs.ts` 的 `nextSrs` 算下次 `due_at`。
- 卡片正面 term（+TTS 發音）、背面 meaning + example。

---

## 8. 遊戲化 / 動機（全沿用）

- **XP / 等級 / 果實(Z幣)**：完成關卡、複習單字、對話練習都發 XP + 少量果實（沿用 `profiles` + coin_transactions）。
- **每日目標 + streak**：沿用 `user_daily_goals` / 簽到 / `StreakFlame`。
- **排行榜**：新增「單字量榜 / 語言連勝榜」（比照 `leaderboard_lessons` RPC 寫法）。
- **完課動畫 / 學習反應**：沿用 `LearnReactionBar` + micro 慶祝。

---

## 9. 里程碑（建議順序）

1. **M1 — 對話練習先上**（複用最多、最快見價值）：`lang_teacher` persona + `/language-island/practice` + 3–5 個情境。**幾乎零新表**（用現有 chat）。
2. **M2 — 單字 SRS**：`vocab_cards` 表 + `/vocab` 複習 + 加卡入口。
3. **M3 — 闖關課程**：`language_lessons` 表 + A1 10 關 + `/learn/[id]` + XP/進度。
4. **M4 — hub + 首頁模式入口 + 排行榜 + streak 串起來**。
5. **M5 — 內容擴充（A2）+ 第二語言（日文）驗證架構語言無關**。

> M1 就能上線給人玩、驗證「AI 對話練習」的留存，再決定要不要投 M3 的內容重活。

---

## 10. 風險 / 開放問題

- **內容是最大成本**：課程單元要人寫（或 AI 生 + 人校，比照章節 metadata 生成器）。MVP 只做 A1 骨架。
- **AI 對話成本**：對話量若大，靠現有多模型 fallback + 免費/便宜模型分流（`resolve-usage-ai` 的 usage-key 機制）控成本。
- **發音**：MVP 不做評分（只 TTS 播）。要做要接 ASR。
- **跟主站定位的取捨**：語言島是「擴張」還是「分心」？建議 M1 先小成本驗證留存再決定加碼。
- **母語設定**：學習者母語 = 介面語言（沿用 i18n locale）；目標語言使用者自選。

---

## 附：幾乎不用動的東西（直接吃）
AI 對話串流 + 多模型自動備援、SM-2 SRS 演算法、TTS、翻譯器、gamification（XP/果實/streak/每日目標）、i18n + 免費翻譯同步、島嶼 hub 頁骨架、排行榜 RPC 模式、完課動畫/學習反應。→ **新增的主要只有：1 個 persona、3–4 張表、4 個頁面、2–3 支薄 API。**

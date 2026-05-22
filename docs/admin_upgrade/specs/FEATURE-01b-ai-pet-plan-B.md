# FEATURE-01 方案 B 實作計畫 — AI 個性化寵物伴讀

## 0. Metadata

- **版本**：v1.0 詳設
- **狀態**：規劃完成、待開動
- **預估**：~14h 拆 4 個 PR
- **方向**：你已選 B（AI 加持個性化）

## 1. 與既有系統的關係

| 元件 | 角色 | 與寵物的關係 |
|---|---|---|
| **綠寶 / 肥仔 / 菇寶**（AI Tutor） | 即時問答、課程教學 | 寵物**不取代**他們、寵物是「陪你」的、不負責教學 |
| **gamification engine** | XP / Z-coin / 成就發放 | 寵物會反應這些事件、不寫資料 |
| **InteractionTracker** | 站內追蹤 | 寵物會用 sessionStorage 知道 user 在哪 |
| **AuthContext** | 共用 user 狀態 | 寵物只對登入用戶記憶 |

## 2. Schema

```sql
-- 寵物實例（user 1:1）
CREATE TABLE public.pets (
  user_id      UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT '招財',
  species      TEXT NOT NULL DEFAULT 'hamster',  -- hamster / cat / fox / 之後可擴
  level        INT NOT NULL DEFAULT 1,
  affinity     INT NOT NULL DEFAULT 0,           -- 親密度 0-1000
  mood         TEXT NOT NULL DEFAULT 'idle',     -- idle / happy / sleepy / curious / proud
  last_interacted_at TIMESTAMPTZ DEFAULT NOW(),
  -- AI 用的長期記憶（壓縮過、限 2KB）
  memory_summary TEXT DEFAULT '',
  -- 用戶喜好（生日、稱呼、討厭的話題等）
  preferences  JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY pets_own_all ON public.pets FOR ALL USING (auth.uid() = user_id);

-- 寵物對話紀錄（給 AI context 用、輪替保留最近 50 句）
CREATE TABLE public.pet_messages (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL,                       -- user / pet / system
  content   TEXT NOT NULL,
  context   JSONB DEFAULT '{}'::jsonb,           -- 觸發事件：page / lesson / xp_earned
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pet_messages_user ON public.pet_messages(user_id, created_at DESC);

ALTER TABLE public.pet_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_messages_own ON public.pet_messages FOR ALL USING (auth.uid() = user_id);
```

## 3. 元件 / 路由地圖

```text
src/components/pet/
├── Pet.tsx                 # 浮動容器 + state machine + mount logic
├── PetSprite.tsx           # SVG / emoji / 自定圖 角色繪製
├── PetSpeech.tsx           # 對話泡泡、可關
├── PetChatPanel.tsx        # 主動點寵物 → 對話面板
├── pet-events.ts           # window event helper (lesson-complete, xp-earned, route-change)
└── pet-prompts.ts          # System prompt 模板

src/lib/
└── pet-context.ts          # usePet() Context Provider、用 AuthContext.user 為 key

src/app/api/pet/
├── load/route.ts           # GET pet + preferences
├── chat/route.ts           # POST message → AI 回應、扣 quota
├── tick/route.ts           # GET 30 秒自動 "心跳"、根據 mood / last_interacted_at 決定行為
└── feedback/route.ts       # POST 用戶給寵物正/負評、影響親密度

src/app/me/pet/
└── page.tsx                # 寵物設定頁：改名、選 species、開關功能、看 memory_summary
```

## 4. 行為流程

### 4.1 浮動寵物（左下）

```text
┌─────────┐
│  🐹     │ ← 招財、idle 動畫（滑入、貼地、眨眼）
│  ✨     │
└─────────┘
```

點一下：展開對話面板（類似綠寶但更短回應 + 角色化）。

### 4.2 事件 → mood 轉換

| 事件 | mood | 持續 |
|---|---|---|
| `lesson-complete` | cheering | 2s |
| `xp-earned` ≥ 50 | proud | 3s |
| `route-change` | curious | 1s |
| 30 min 無互動 | sleepy | until interact |
| `quiz-failed` | concerned | 4s |
| `streak-broken` | sad | 6s |

事件用 `window.dispatchEvent(new CustomEvent("pet:lesson-complete", { detail: { chapterId, xp } }))`。

### 4.3 對話流程

```text
user clicks pet
    │
    ▼
GET /api/pet/load
    └─ returns pet + last 10 messages + active context (current page)
    │
user types message
    │
    ▼
POST /api/pet/chat { message, context: { page, chapter? } }
    │
    ├─ rate limit check (10/min)
    ├─ quota check (寵物算入 ai_daily_quota 同一池)
    ├─ load chat history + pet memory_summary
    ├─ build system prompt with species personality + user preferences + recent events
    ├─ call streamAI (Claude Haiku 4.5 default — 最便宜)
    ├─ stream response → client
    └─ async: 每 10 條對話、用便宜 model 壓縮成新 memory_summary
```

### 4.4 心跳

每 60 秒前端 ping `/api/pet/tick`：
- server 拉 pet + last_interacted_at
- 計算 mood（過 30 min → sleepy；達 streak 里程碑 → proud）
- 偶爾主動發訊（每 ~15 分一次）：「你還在學 ch5 嗎？」「累了嗎？」
- 回傳 `{ mood, autoMessage? }`

主動訊息控制：每 session 最多 3 條、避免騷擾。

## 5. AI 預算控制

- 寵物對話 quota 來源：**沿用 ai_daily_quota**（跟綠寶共池）
- 寵物用最便宜模型（Claude Haiku 4.5）、減少 cost
- 對話歷史只送最近 10 條 + memory_summary（避免每次都重塞整個歷史、控制 token）
- 主動訊息（auto）也算 quota、避免無限燒
- Admin `/admin/ai/models` 可單獨關掉 `pet` 流量（之後加 flag）

## 6. 拆 4 個 PR

### PR 1：Schema + 基本元件（~3h）
- 跑 migration
- Pet.tsx 浮動容器、PetSprite emoji 版（🐹 + bounce 動畫）
- /me/pet 設定頁
- 不接 AI、只有 mood 切換

### PR 2：事件總線 + 反應（~3h）
- pet-events.ts
- ChapterView / gamification.ts dispatch lesson-complete / xp-earned
- Pet 監聽 → mood 切換 + 對話泡泡（預寫台詞池）
- 仍不接 AI

### PR 3：AI 對話 + 記憶（~5h）
- /api/pet/load + /api/pet/chat
- PetChatPanel UI
- system prompt 模板（species 個性）
- memory_summary 壓縮 background job

### PR 4：心跳 + 主動訊息（~3h）
- /api/pet/tick polling
- auto message rate limit
- Settings：開關「主動互動」、quota 顯示

## 7. 風險

| 風險 | 應對 |
|---|---|
| AI 預算暴增 | 強制 Haiku、quota 共池、admin 可一鍵關 |
| 寵物太煩 | 預設主動 15 分一次、可關、可調 |
| 隱私 | pet_messages RLS own-only、memory_summary 不含敏感資訊 |
| Auth race | 統一用 useAuth() 拿 user_id |
| 多 tab | BroadcastChannel 同步 mood、避免不同 tab 不同步 |

## 8. 動工前確認

- [ ] 你 OK quota 共池（不另開 budget）
- [ ] 你 OK 預設 Claude Haiku
- [ ] Sprite 短期用 emoji、長期再做圖？
- [ ] 寵物物種選擇：先只開 🐹 hamster、之後擴？
- [ ] 主動訊息預設開還關？

確認後即可開 PR 1。

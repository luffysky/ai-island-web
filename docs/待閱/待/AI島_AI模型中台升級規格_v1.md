# AI島_AI模型中台升級規格_v1

**版本**：v1.0  
**日期**：2026-05-30  
**專案**：AI Island（AI島）  
**組織**：SnowRealm-Rebirth  
**文件定位**：既有產品升級規格書，不是從零企劃書  
**核心目標**：免費也能一直聊天，但高成本智慧分級收費，避免 API 成本炸裂。

---

## 目錄

1. AI 島 AI 模型中台核心架構  
2. AI Router 中台架構  
3. 完整 AI API 與模型供應商清單  
4. 免費一直聊天技術方案  
5. AI 導師人格與模型分工  
6. AI 團隊會議室  
7. Z 幣經濟模型  
8. VIP / Subscription 設計  
9. 成本防爆系統  
10. Next.js × Supabase 架構接法  
11. Database Schema  
12. Claude / Codex 實作規格  
13. 法律、資料與產品風險  
14. AI 島 v2–v5 路線圖  
15. 附錄：Router Config、Prompt、API 範例、檢查清單  

---

# Chapter 1｜AI 島 AI 模型中台核心架構

## 1.1 文件目的

本文件不是重新規劃 AI 島。AI 島已經有基本產品、導師概念、Z 幣方向、多 AI 分工、免費聊天與網站基礎。本文件要解決的是下一階段最現實的問題：

> 如何做到「免費也能一直聊天」，但不因 API 成本而死亡？

AI 島不能只是一個 AI 聊天框。它應該是：

> AI 生態系 × AI 導師宇宙 × AI 團隊協作平台。

使用者進入 AI 島，不是只面對一個模型，而是進入一套會自動分配成本、能力與角色的 AI 中台。

## 1.2 核心策略

AI 島不應該限制「陪伴」，而應該限制「昂貴智慧」。

### 免費層

免費層的責任不是回答最聰明，而是讓使用者願意留下來。

適合：

- 日常聊天
- 基礎陪伴
- 簡單教學
- FAQ
- 初階程式解釋
- 簡單文案
- 使用者引導

### Pro 層

Pro 層負責更精準、更深、更長上下文的任務。

適合：

- 專案分析
- 程式 Debug
- 學習規劃
- 中階創作
- 個人化導師
- 中長上下文記憶

### Ultra 層

Ultra 層只給高價值場景使用。

適合：

- AI 團隊會議室
- 多角色協作
- 大型系統架構
- 複雜 Debug
- 長文本分析
- 高品質商業輸出

## 1.3 產品原則

AI 島的免費政策應該是：

> 免費能愛上，付費會上癮。

不是：

> 免費超神，然後平台破產。

核心原則：

1. 永遠保留免費聊天能力。
2. 免費聊天使用低成本或免費模型池。
3. 高成本功能必須消耗 Z 幣、VIP 額度或任務額度。
4. 所有模型呼叫必須經過 Router。
5. 不允許前端直接接任何第三方 API Key。
6. 所有用量必須記錄、分析、限流與降級。
7. 模型服務掛掉時，系統要自動 fallback，不可整站死亡。

---

# Chapter 2｜AI Router 中台架構

## 2.1 Router 是 AI 島的腦幹

AI Router 是 AI 島的核心中台。所有 AI 請求都不應該直接打到 OpenAI、Gemini、Claude、Groq 或 OpenRouter，而是先進入 AI 島自己的 Router。

流程：

```txt
User Message
  ↓
AI Island Frontend
  ↓
/api/ai/chat
  ↓
AI Router
  ↓
Intent Detection
  ↓
Policy Engine
  ↓
Model Pool Selector
  ↓
Provider Adapter
  ↓
LLM Provider
  ↓
Response Normalizer
  ↓
Usage Meter
  ↓
User
```

## 2.2 Router 要解決的問題

Router 要負責：

- 判斷這次請求屬於哪一種任務
- 判斷使用者等級
- 判斷是否要消耗 Z 幣
- 選擇免費模型或付費模型
- 模型掛掉時自動切換
- 記錄 token、成本、延遲、錯誤率
- 高峰期自動降級
- 防止單一使用者濫用
- 保護 API Key
- 統一不同模型的輸出格式

## 2.3 三層模型池

### Free Pool

用於免費一直聊天。

候選供應商：

- Gemini API Free Tier
- Groq Free Tier
- OpenRouter Free Models / openrouter/free
- Hugging Face 免費月額度或低成本推論
- Cloudflare Workers AI 免費額度
- 本地 Ollama / 自架模型

限制：

- 不保證最高品質
- 不保證永遠不限速
- 必須有 fallback
- 不應承擔大型長文本任務

### Smart Pool

用於 Pro 功能。

候選供應商：

- Gemini paid tier
- DeepSeek API
- OpenAI mini / nano / mid-tier models
- Claude Haiku / Sonnet
- Qwen / Mistral / Llama via Together、OpenRouter、Fireworks、Hugging Face

### Ultra Pool

用於高成本高價值任務。

候選供應商：

- Claude Opus / Sonnet 高階模型
- GPT 高階模型
- Gemini Pro 高階模型
- DeepSeek Reasoner / Pro
- 大上下文模型
- 多 Agent 工作流

## 2.4 Intent Detection 任務判斷

Router 先用輕量規則判斷，不要每次都用大模型分類，否則分類本身也會燒錢。

### 任務類型

```ts
type AiIntent =
  | "casual_chat"
  | "emotional_support"
  | "basic_learning"
  | "coding_simple"
  | "coding_debug"
  | "project_architecture"
  | "long_context_analysis"
  | "creative_writing"
  | "business_strategy"
  | "team_meeting"
  | "unsafe_or_sensitive";
```

### 分流規則

| 任務 | 預設層級 | 備註 |
|---|---|---|
| 日常聊天 | Free | 可長聊 |
| 情緒陪伴 | Free/Smart | 危機類需安全流程 |
| 基礎教學 | Free | 例如 HTML、CSS、變數 |
| 簡單程式 | Free/Smart | 看程式長度 |
| Debug | Smart | 若長錯誤 log，升級 |
| 架構設計 | Ultra | 高價值 |
| AI 團隊會議室 | Ultra | 多模型/多輪 |
| 長文分析 | Smart/Ultra | 看 token |
| 商業策略 | Smart/Ultra | 看深度 |
| 風險敏感 | Safety | 特別處理 |

## 2.5 Policy Engine

Policy Engine 決定「能不能用」、「要不要扣 Z 幣」、「要不要降級」。

輸入：

- userId
- plan
- zCoinBalance
- dailyUsage
- monthlyUsage
- intent
- estimatedTokens
- systemLoad
- providerStatus

輸出：

```ts
type RoutingDecision = {
  allow: boolean;
  tier: "free" | "smart" | "ultra" | "blocked";
  modelPool: string[];
  chargeZCoin: number;
  reason: string;
  fallbackPool: string[];
};
```

## 2.6 Fallback 機制

不可只接一個模型。任何供應商都可能：

- 限流
- 維護
- 變慢
- 漲價
- 停模型
- 回覆品質不穩

建議順序：

```txt
Primary Model
  ↓ failure / timeout
Secondary Model
  ↓ failure / timeout
Fallback Free Model
  ↓ failure
System Message: 目前 AI 島較忙，先切換成基礎模式陪你聊。
```

## 2.7 Timeout 與 Retry

建議：

- Free Pool timeout：12 秒
- Smart Pool timeout：20 秒
- Ultra Pool timeout：45 秒
- Retry：最多 1 次
- 不要無限重試
- 重試必須換 provider，不要打同一個掛掉的 provider

## 2.8 Response Normalizer

不同 API 回傳格式不同，前端不能直接吃供應商格式。

統一成：

```ts
type AiResponse = {
  content: string;
  model: string;
  provider: string;
  tier: "free" | "smart" | "ultra";
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs: number;
  fallbackUsed: boolean;
  safetyFlags?: string[];
};
```

## 2.9 Router Config 範例

```json
{
  "defaultTier": "free",
  "freePool": [
    "openrouter/free",
    "gemini/free-flash",
    "groq/llama-free",
    "cloudflare/workers-ai",
    "ollama/local-small"
  ],
  "smartPool": [
    "deepseek/chat",
    "gemini/flash-paid",
    "openai/mini",
    "claude/haiku",
    "qwen/paid"
  ],
  "ultraPool": [
    "claude/sonnet-or-opus",
    "openai/high-reasoning",
    "gemini/pro",
    "deepseek/reasoner"
  ],
  "timeouts": {
    "free": 12000,
    "smart": 20000,
    "ultra": 45000
  },
  "fallbackMessage": "目前 AI 島較忙，先切換成基礎模式陪你聊。"
}
```

---

# Chapter 3｜完整 AI API 與模型供應商清單

> 重要提醒：AI API 價格與免費額度變動很快。以下定位為 2026-05-30 的架構決策參考，正式上線前需重新核對官方文件。

## 3.1 總表

| 供應商 | 是否有免費/試用 | 是否適合免費一直聊 | 強項 | 弱點 | AI 島建議 |
|---|---:|---:|---|---|---|
| OpenAI API | 通常偏付費 | 不適合當免費長聊主力 | 綜合、工具、生態 | 成本較高 | Pro/Ultra |
| Anthropic Claude API | 偏付費 | 不適合免費長聊 | 長文、推理、程式 | 成本較高 | Pro/Ultra |
| Google Gemini API | 有 Free Tier | 適合 Free Pool 主力之一 | 免費額度、多模態 | 額度與政策會變 | Free/Smart |
| GroqCloud | 有 Free Tier | 適合 Free Pool，但有限流 | 超快、開源模型 | 免費限流 | Free/Smart |
| OpenRouter | 有 Free Models | 適合 Free Pool | 多模型、fallback、免費模型 | 免費模型品質不固定 | Free/Router 備援 |
| DeepSeek API | 低成本 | 不算免費，但適合大量 Smart | 便宜、程式、推理 | 法規/資料治理需注意 | Smart 主力 |
| Cloudflare Workers AI | 有免費配置/低成本 | 適合邊緣基礎任務 | Edge、低成本、整合 | 模型選擇受限 | Free/工具層 |
| Hugging Face Inference | 有小額免費額度 | 不適合大量長聊主力 | 模型多、可試驗 | 免費額度小 | 實驗/備援 |
| Together AI | 免費 credits + 付費 | 不適合永久免費主力 | 開源模型多 | credits 用完付費 | Smart/開源模型 |
| Fireworks AI | 免費 credits + 付費 | 不適合永久免費主力 | 快速推論、Agent | 免費非長期 | Smart/Agent |
| Cerebras | 有 Free Trial / 付費方案 | 可試驗，不宜依賴免費 | 超快推論 | 額度/方案限制 | Coding/Agent |
| Mistral API / Studio | 有免費產品層/付費 API | 視 API 額度而定 | 歐洲供應商、開源/企業 | 價格需逐模型核對 | Smart/企業備援 |
| Ollama / 自架模型 | 本機免費 | 最接近無限 | 成本可控、資料可控 | 要硬體與維運 | 長期 Free Pool |

## 3.2 OpenAI API

定位：高品質 Pro/Ultra，不適合當「免費一直聊」主力。

建議用途：

- 高品質程式
- 工具使用
- 多模態
- 複雜推理
- 最終審稿
- 付費會員高級能力

AI 島策略：

- 不要讓免費使用者無限制打 OpenAI 高階模型。
- 可設為 VIP / Z 幣功能。
- 可把便宜模型放 Smart Pool，昂貴模型放 Ultra Pool。
- 所有呼叫都要記錄成本。

## 3.3 Anthropic Claude API

定位：高品質長文、推理、程式與分析。

建議用途：

- 架構評審
- 長文分析
- 產品規格
- 複雜程式碼審查
- AI 團隊會議室中的「架構師」

AI 島策略：

- 不要放免費長聊。
- 適合 Pro/Ultra。
- 高價值任務才呼叫。

## 3.4 Google Gemini API

定位：Free Pool 主力候選。

建議用途：

- 免費聊天
- 基礎導師
- 多模態初步理解
- 輕量教學
- 免費島民日常互動

AI 島策略：

- 優先放 Free Pool。
- 需設定每日/每分鐘內部限流。
- 免費層掛掉時 fallback 到 OpenRouter Free 或 Groq。

## 3.5 GroqCloud

定位：高速 Free/Smart 候選。

建議用途：

- 快速聊天
- 即時教學
- 短回覆
- 低延遲互動
- 程式片段解釋

AI 島策略：

- 非常適合提高「回覆速度感」。
- 免費層有 rate limits，不能當唯一來源。
- 建議搭配 OpenRouter/Gemini fallback。

## 3.6 OpenRouter

定位：多模型入口與免費模型池。

建議用途：

- Free Pool 聚合
- 付費模型 fallback
- 快速切換模型
- 測試模型品質

AI 島策略：

- 可使用 openrouter/free 作為免費模型池之一。
- 但不要把所有免費聊天都壓在 OpenRouter。
- 免費模型品質可能波動，要做評分與黑名單。

## 3.7 DeepSeek API

定位：低成本 Smart Pool 主力候選。

建議用途：

- 大量程式輔助
- 一般推理
- 摘要
- 程式碼解釋
- 低成本 Pro

AI 島策略：

- 適合大量任務，不一定免費，但成本友善。
- 法規、資料存放、敏感資料需注意。
- 不建議處理高度敏感個資。

## 3.8 Cloudflare Workers AI

定位：低成本 Edge AI。

建議用途：

- 分類
- 摘要
- moderation 前處理
- FAQ
- 輕量聊天
- embedding / rerank 類任務

AI 島策略：

- 若 AI 島之後更多放 Cloudflare 生態，可作為低成本前置層。
- 適合做輕量任務，不一定適合承擔全部聊天體驗。

## 3.9 Hugging Face Inference

定位：模型實驗室與備援。

建議用途：

- 測模型
- 小量實驗
- 非核心功能
- 特殊開源模型

AI 島策略：

- 免費額度通常不足以大量長聊。
- 適合當模型市場，不是免費主力。

## 3.10 Together AI / Fireworks AI / Cerebras

定位：開源模型高速推論與 Agent 場景。

建議用途：

- Agent
- Coding
- 大量開源模型實驗
- 高吞吐工作流
- 多模型對比

AI 島策略：

- 適合 Smart Pool 或特殊任務。
- credits 用完就是付費，不能宣稱永久免費。
- 可作為「模型競技場」或「導師人格測試」來源。

## 3.11 Ollama / 自架模型

定位：真正接近免費無限的長期方案。

建議用途：

- 長時間陪伴聊天
- 內部測試
- 離線導師
- 隱私敏感任務
- 免費層保底模型

AI 島策略：

- 短期：本機開發、測試。
- 中期：租 GPU 或小型推論服務。
- 長期：熱門免費導師可逐步自架，降低 API 成本。

限制：

- 需要硬體。
- 需要維運。
- 品質可能低於商用前沿模型。
- 需要模型更新與評測流程。

---

# Chapter 4｜免費一直聊天技術方案

## 4.1 產品口號

AI 島可以對使用者說：

> 在 AI 島，沒錢也可以一直聊天。  
> 付費買的是更強的智慧，不是基本陪伴權。

這句有產品殺傷力。

但系統上要加一句工程師聽得懂的話：

> 免費一直聊天只能建立在模型分級、成本控制、上下文壓縮、降級與限流之上。

## 4.2 免費聊天不是無限制燒 Token

免費聊天要限制的不是訊息數，而是：

- 單次輸入長度
- 單次輸出長度
- 上下文長度
- 附件數量
- 高成本工具
- 高級模型
- 多 Agent 協作

## 4.3 免費層建議限制

| 項目 | 免費層建議 |
|---|---|
| 聊天次數 | 不硬性限制 |
| 單次輸入 | 例如 1,000–2,000 字內 |
| 單次輸出 | 短中回覆優先 |
| 上下文 | 最近 N 輪 + 摘要 |
| 檔案分析 | 不開放或限小檔 |
| 多 AI 協作 | 不開放 |
| 高級程式 Debug | 消耗 Z 幣 |
| 長期記憶 | 基礎版 |
| 圖片/影音分析 | 付費或 Z 幣 |

## 4.4 Conversation Compression

免費長聊最大問題不是一次聊天，而是上下文越滾越長。

解法：

1. 只保留最近 6–10 輪完整訊息。
2. 更早內容壓成摘要。
3. 摘要分成：
   - user_profile_summary
   - conversation_summary
   - task_state
   - emotional_state
4. 每隔 N 輪更新一次摘要。
5. 摘要用便宜模型生成。

## 4.5 Prompt Cache

常見問題不要每次都重算。

例如：

- HTML 是什麼？
- CSS 怎麼連？
- API key 怎麼設？
- AI 島功能介紹
- 常見錯誤說明

可做：

```txt
normalized_question_hash → cached_answer
```

若相似度高，直接回 cache 或用 cache + 小模型改寫。

## 4.6 Short Reply Mode

免費層預設短回覆，不要每次都長篇大論。

免費層 system prompt：

```txt
你是 AI 島免費導師。請用清楚、簡短、友善的方式回答。
除非使用者要求詳細教學，否則避免長篇輸出。
如果問題需要高級模型，請說明可以使用 Z 幣升級成深度分析。
```

## 4.7 高峰期動態降級

高峰期策略：

- Ultra 暫停非 VIP
- Smart 降到便宜模型
- Free 回覆縮短
- 排隊機制
- 顯示「基礎模式」但不讓使用者無法聊天

使用者看到：

> AI 島現在有點忙，我先用基礎模式陪你聊。

比看到：

> 今日額度已滿。

好太多。

---

# Chapter 5｜AI 導師人格與模型分工

## 5.1 角色不是都要用同一個模型

AI 島的導師角色應該依任務成本分配模型。

| 角色 | 主要任務 | 預設模型層 |
|---|---|---|
| 雪凜 | 入門教學、陪伴 | Free/Smart |
| 工程師導師 | 程式碼、Debug | Smart/Ultra |
| PM 導師 | 產品拆解、Roadmap | Smart |
| UX 導師 | 使用者體驗、流程 | Smart |
| 文案導師 | 文案、社群、腳本 | Free/Smart |
| 架構師 | 系統設計、資安、擴展 | Ultra |
| 心情陪伴 AI | 日常陪伴 | Free |
| 任務管家 | 排程、提醒、任務拆解 | Free/Smart |

## 5.2 導師人格分離

每個導師應該拆成：

- persona prompt
- capability config
- model policy
- safety policy
- monetization policy

範例：

```json
{
  "id": "mentor_engineer",
  "name": "工程師導師",
  "defaultTier": "smart",
  "allowedIntents": ["coding_simple", "coding_debug", "project_architecture"],
  "freeCapabilities": ["basic_explain", "small_snippet"],
  "paidCapabilities": ["deep_debug", "architecture_review", "multi_file_analysis"],
  "fallbackRole": "basic_coding_tutor"
}
```

## 5.3 免費導師設計

免費導師要讓人覺得有用，但不能把 Pro 價值全送掉。

免費導師適合：

- 解釋概念
- 提供第一步
- 幫忙拆任務
- 鼓勵行動
- 指出方向
- 輕量範例

不適合免費：

- 代寫大型專案
- 長期陪跑完整產品
- 多檔案 Debug
- 深度架構評審
- 商業策略完整報告

## 5.4 導師升級提示

不要硬推銷，使用自然升級語氣：

> 這題我可以先用基礎模式幫你抓方向。  
> 如果你要我進一步做完整架構拆解，可以使用 Z 幣開啟深度模式。

---

# Chapter 6｜AI 團隊會議室

## 6.1 定位

AI 團隊會議室是 AI 島最有差異化的付費功能之一。

不是單一 AI 回答，而是多個 AI 角色分工討論：

- PM
- 前端工程師
- 後端工程師
- UX
- 文案
- 架構師
- QA
- 成本控制官

## 6.2 為什麼不能免費無限

AI 團隊會議室本質上會呼叫多次模型：

```txt
1 個使用者問題
→ 5 個角色各自分析
→ 主持人整合
→ 可能再互相反駁
→ 最終輸出
```

一次會變成 6–12 次模型呼叫。不能免費無限。

## 6.3 建議收費方式

| 模式 | 收費 |
|---|---|
| 小型會議：3 角色 | 少量 Z 幣 |
| 標準會議：5 角色 | 中量 Z 幣 |
| 深度會議：8 角色 + 反駁 | 高量 Z 幣 |
| VIP 每月額度 | 每月 N 次 |
| Team 方案 | 多人共用額度 |

## 6.4 會議流程

```txt
User 問題
  ↓
Meeting Host 分析任務
  ↓
選擇角色
  ↓
各角色生成觀點
  ↓
角色互相挑戰
  ↓
Host 整合
  ↓
輸出結論、風險、下一步
```

## 6.5 會議輸出格式

建議固定：

1. 結論
2. 各角色觀點
3. 衝突點
4. 最佳決策
5. 風險
6. 下一步任務
7. 可交給 Codex / Claude 的指令

---

# Chapter 7｜Z 幣經濟模型

## 7.1 Z 幣定位

Z 幣不是單純遊戲幣。它是 AI 島的「高成本能力緩衝層」。

目的：

- 避免 API 成本無限制外流
- 讓免費使用者也有機會體驗高級功能
- 建立任務與成就感
- 降低付費阻力

## 7.2 免費聊天不扣 Z 幣

原則：

| 行為 | 扣 Z 幣 |
|---|---:|
| 日常聊天 | 否 |
| 基礎教學 | 否 |
| 簡單問答 | 否 |
| 深度 Debug | 是 |
| 長文分析 | 是 |
| AI 團隊會議室 | 是 |
| 高級架構設計 | 是 |
| 多檔案分析 | 是 |
| 生成完整規格書 | 是 |

## 7.3 Z 幣取得方式

- 每日簽到
- 完成學習任務
- 看廣告
- 分享邀請
- 完成專案里程碑
- VIP 每月配額
- 直接購買

## 7.4 Z 幣消耗示例

| 功能 | 消耗 |
|---|---:|
| 深度回答 | 5 |
| 程式 Debug | 10 |
| 長文摘要 | 10 |
| 小型 AI 會議 | 20 |
| 標準 AI 會議 | 50 |
| 架構師審查 | 80 |
| 專案規格生成 | 100+ |

實際數字需依成本測試調整。

## 7.5 不要讓 Z 幣變懲罰

錯誤設計：

> 聊天聊到一半突然扣光。

正確設計：

> 這題可以用免費模式回答，也可以花 10 Z 幣開啟深度模式。

---

# Chapter 8｜VIP / Subscription 設計

## 8.1 方案設計

| 方案 | 對象 | 核心價值 |
|---|---|---|
| Free 島民 | 新使用者 | 免費一直聊天 |
| Pro 島民 | 學習者/創作者 | 更強模型 + 更多 Z 幣 |
| Creator | 創作者/接案者 | 文案、規格、專案輸出 |
| Developer | 工程學習者 | Debug、架構、Code Review |
| Team | 小團隊 | AI 團隊會議室與多人額度 |
| Academy | 教學場景 | 課程、班級、導師管理 |

## 8.2 免費與付費差異

免費不是殘缺版，而是基礎陪伴版。

| 功能 | Free | Pro |
|---|---|---|
| 一直聊天 | 有 | 有 |
| 回覆品質 | 基礎 | 更強 |
| 長期記憶 | 簡版 | 進階 |
| AI 導師 | Lite | Pro |
| Debug | 小段 | 深度 |
| AI 會議室 | 試用/無 | 有 |
| Z 幣 | 少量取得 | 每月配額 |
| 高峰期優先 | 無 | 有 |
| 多檔案分析 | 無 | 有 |

## 8.3 最推薦初期方案

初期不要太多方案，避免使用者看不懂。

建議先：

1. Free
2. Pro
3. Creator / Developer 二選一
4. Team 之後再上

---

# Chapter 9｜成本防爆系統

## 9.1 成本防爆是生存系統

AI 島如果有人開始用，第一個敵人不是競品，是帳單。

防爆系統包含：

- daily budget cap
- monthly budget cap
- per-user cap
- per-feature cap
- provider cap
- emergency downgrade
- abuse detection

## 9.2 Usage Meter

每次模型呼叫都要記錄：

- user_id
- session_id
- provider
- model
- tier
- intent
- input_tokens
- output_tokens
- estimated_cost_usd
- latency_ms
- fallback_used
- error_code
- created_at

## 9.3 Budget Guard

設定全站預算：

```json
{
  "monthlyBudgetUsd": 300,
  "dailyBudgetUsd": 15,
  "freeTierDailyBudgetUsd": 5,
  "ultraTierDailyBudgetUsd": 8,
  "emergencyModeThreshold": 0.8
}
```

當今日預算使用 80%：

- Free 回覆縮短
- Smart 降級
- Ultra 限 VIP
- 暫停高成本功能

## 9.4 Abuse Detection

偵測：

- 短時間大量請求
- 重複貼超長文本
- 大量空泛問題
- 自動化腳本
- 共享帳號
- prompt injection
- 試圖竊取 system prompt

處理：

- 降速
- CAPTCHA
- 暫停高級功能
- 要求登入
- 封鎖 API 濫用

## 9.5 成本估算公式

粗估：

```txt
月成本 = DAU × 每人每日訊息數 × 平均每次成本 × 30
```

如果平均每次免費聊天成本控制到 $0.00005：

```txt
1000 DAU × 20 則 × $0.00005 × 30 = $30/月
```

如果全用高級模型，平均每次 $0.005：

```txt
1000 DAU × 20 則 × $0.005 × 30 = $3000/月
```

差 100 倍。這就是 Router 的價值。

---

# Chapter 10｜Next.js × Supabase 架構接法

## 10.1 建議架構

```txt
Next.js Frontend
  ↓
Next.js API Routes / Route Handlers
  ↓
AI Router Service
  ↓
Provider Adapters
  ↓
External AI APIs
  ↓
Supabase Logs / Usage / Memory
```

## 10.2 API 路由

建議：

```txt
src/app/api/ai/chat/route.ts
src/app/api/ai/meeting/route.ts
src/app/api/ai/usage/route.ts
src/app/api/ai/models/route.ts
src/app/api/ai/memory/route.ts
```

## 10.3 Service 結構

```txt
src/services/ai/
  router.ts
  policyEngine.ts
  intentDetector.ts
  costGuard.ts
  usageMeter.ts
  memoryManager.ts
  responseNormalizer.ts
  providers/
    openaiProvider.ts
    anthropicProvider.ts
    geminiProvider.ts
    groqProvider.ts
    openrouterProvider.ts
    deepseekProvider.ts
    cloudflareProvider.ts
    ollamaProvider.ts
  config/
    modelRegistry.ts
    routingRules.ts
```

## 10.4 API Key 安全

絕對禁止：

- API Key 放前端
- API Key 放 localStorage
- API Key 回傳給 browser
- 使用者可選模型時直接傳 provider model id 不驗證

必須：

- 全部放 server env
- 後端驗證模型使用權限
- 記錄所有呼叫
- 對外只暴露 AI 島自己的 API

---

# Chapter 11｜Database Schema

## 11.1 ai_chat_sessions

```sql
create table ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text,
  mode text default 'free',
  mentor_id text,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 11.2 ai_messages

```sql
create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_chat_sessions(id) on delete cascade,
  user_id uuid references users(id),
  role text check (role in ('user', 'assistant', 'system')),
  content text not null,
  provider text,
  model text,
  tier text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric,
  created_at timestamptz default now()
);
```

## 11.3 ai_usage_logs

```sql
create table ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  session_id uuid references ai_chat_sessions(id),
  intent text,
  provider text,
  model text,
  tier text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  estimated_cost_usd numeric default 0,
  latency_ms integer,
  fallback_used boolean default false,
  success boolean default true,
  error_message text,
  created_at timestamptz default now()
);
```

## 11.4 ai_memory

```sql
create table ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  memory_type text,
  content text not null,
  importance integer default 1,
  source_session_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 11.5 z_coin_transactions

```sql
create table z_coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  amount integer not null,
  type text check (type in ('earn', 'spend', 'refund', 'admin')),
  reason text,
  related_feature text,
  created_at timestamptz default now()
);
```

## 11.6 ai_model_registry

```sql
create table ai_model_registry (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_id text not null,
  display_name text,
  tier text,
  is_enabled boolean default true,
  supports_tools boolean default false,
  supports_vision boolean default false,
  supports_json boolean default false,
  max_context_tokens integer,
  cost_input_per_million numeric,
  cost_output_per_million numeric,
  notes text,
  created_at timestamptz default now(),
  unique(provider, model_id)
);
```

---

# Chapter 12｜Claude / Codex 實作規格

## 12.1 給 Codex 的總任務

```txt
請在現有 Next.js 專案中建立 AI Router 中台。
不要改動既有 UI。
請新增 /src/services/ai 架構，並建立 /api/ai/chat route。
所有第三方 API Key 僅能在 server-side 使用。
請實作 provider adapter、routing rules、usage logging、fallback、cost guard。
先完成可用 MVP，不要一次實作所有供應商。
第一階段請支援：OpenRouter、Gemini、Groq、DeepSeek。
```

## 12.2 第一階段開發目標

MVP 只做：

- chat route
- OpenRouter adapter
- Gemini adapter
- Groq adapter
- DeepSeek adapter
- basic intent detector
- fallback
- usage log
- free/smart/ultra routing
- Z 幣扣點預留

## 12.3 不要一開始做的事

先不要做：

- 完整 AI 會議室
- 多檔案分析
- 複雜 billing
- 完整後台
- 自架 Ollama production
- 進階向量資料庫
- 太複雜的 agent framework

理由：

> 先讓模型中台跑起來，比完美架構重要。

## 12.4 Provider Interface

```ts
export type AiProviderRequest = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiProviderResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  raw?: unknown;
};

export interface AiProvider {
  id: string;
  generate(req: AiProviderRequest): Promise<AiProviderResponse>;
}
```

## 12.5 Router Function

```ts
export async function routeAiRequest(input: {
  userId: string;
  messages: AiProviderRequest["messages"];
  mentorId?: string;
  requestedMode?: "free" | "smart" | "ultra";
}) {
  const intent = detectIntent(input.messages);
  const decision = await policyEngine({ userId: input.userId, intent });

  const providers = getProviderChain(decision);

  for (const provider of providers) {
    try {
      const started = Date.now();
      const result = await provider.generate({ messages: input.messages });
      await logUsage({ result, latencyMs: Date.now() - started, intent });
      return normalizeResponse(result);
    } catch (error) {
      await logProviderError(provider.id, error);
      continue;
    }
  }

  return {
    content: "目前 AI 島有點忙，我先用基礎模式陪你聊。你可以稍後再試一次深度模式。",
    provider: "system",
    model: "fallback",
    tier: "free"
  };
}
```

---

# Chapter 13｜法律、資料與產品風險

## 13.1 不能亂碰的資料

AI 島未來若處理使用者聊天、學習狀態、情緒紀錄，就要注意：

- 個資
- 未成年資料
- 敏感健康資訊
- 情緒依賴
- 使用者上傳檔案
- 第三方 API 資料傳輸
- AI 幻覺造成誤導

## 13.2 產品聲明

AI 島應在適當位置聲明：

- AI 回覆可能不準確
- 不提供醫療、法律、金融最終建議
- 情緒陪伴不是心理治療
- 危機狀況應尋求真人或專業單位
- 使用者不要輸入高度敏感資料
- 平台可能使用第三方模型服務處理內容

## 13.3 未成年與教學場景

若 AI 島有教學用途，未來可能接觸未成年。

建議：

- 避免收集不必要個資
- 家長/教師版本另外設計
- 對不當內容加強 moderation
- 聊天紀錄可刪除
- 建立檢舉機制

## 13.4 免費模型風險

免費模型常見風險：

- 回答品質波動
- 安全過濾不足
- 供應商突然限流
- 免費模型突然下架
- 隱私政策不同
- 輸出不穩定

所以：

> 免費模型只能是模型池，不可成為單點依賴。

---

# Chapter 14｜AI 島 v2–v5 路線圖

## v1｜模型中台 MVP

目標：

- 免費聊天可用
- Router 可用
- 3–4 個 provider
- usage log
- fallback
- 基礎 Z 幣
- 基礎導師

## v2｜商業化版本

目標：

- Pro 方案
- Z 幣購買
- AI 導師升級
- 成本後台
- 模型品質評分
- 使用者分群

## v3｜AI 團隊會議室

目標：

- 多 AI 角色協作
- 會議模板
- 專案模式
- Codex/Claude 任務輸出
- 角色互相反駁

## v4｜AI 島作業系統

目標：

- 任務系統
- 課程系統
- 成就系統
- AI 記憶
- 個人學習地圖
- 多專案工作區

## v5｜SnowRealm AI 生態

目標：

- AI 島與 SnowRealm 其他產品串接
- AI 寵物
- AI 居民
- Rainbow Nation
- 多產品共用 Z 幣
- 跨產品記憶與成長系統

---

# 附錄 A｜Router Config 完整範例

```json
{
  "version": "1.0",
  "defaultMode": "free",
  "providers": {
    "openrouter": {
      "enabled": true,
      "baseUrl": "https://openrouter.ai/api/v1",
      "models": {
        "free": ["openrouter/free"],
        "smart": ["deepseek/deepseek-chat", "qwen/qwen-plus"],
        "ultra": ["anthropic/claude-sonnet", "openai/gpt-high"]
      }
    },
    "gemini": {
      "enabled": true,
      "models": {
        "free": ["gemini-flash-free"],
        "smart": ["gemini-flash-paid"],
        "ultra": ["gemini-pro"]
      }
    },
    "groq": {
      "enabled": true,
      "models": {
        "free": ["llama-free", "gemma-free"],
        "smart": ["llama-large"]
      }
    },
    "deepseek": {
      "enabled": true,
      "models": {
        "smart": ["deepseek-chat"],
        "ultra": ["deepseek-reasoner"]
      }
    }
  },
  "routingRules": [
    {
      "intent": "casual_chat",
      "tier": "free",
      "maxInputChars": 2000,
      "maxOutputTokens": 500
    },
    {
      "intent": "coding_debug",
      "tier": "smart",
      "zCoinCost": 10,
      "maxInputChars": 12000
    },
    {
      "intent": "team_meeting",
      "tier": "ultra",
      "zCoinCost": 50,
      "requiresVip": true
    }
  ],
  "emergencyMode": {
    "enabled": false,
    "freeMaxOutputTokens": 250,
    "disableUltraForFreeUsers": true
  }
}
```

---

# 附錄 B｜免費聊天 System Prompt

```txt
你是 AI 島的免費導師。
你的任務是陪伴、引導、基礎教學與簡單解答。
請用繁體中文回答，語氣清楚、溫暖、直接。
免費模式下請避免過長輸出。
如果使用者要求深度分析、大型程式、長文本、多角色討論，請先提供簡短方向，並提示可以使用 Z 幣開啟深度模式。
不要假裝你使用的是最高級模型。
不要承諾醫療、法律、金融等高風險結論。
```

---

# 附錄 C｜深度模式提示文案

```txt
這題我可以先用基礎模式幫你抓方向。
如果你要我做完整拆解、深度推理或多 AI 會議，可以使用 Z 幣開啟深度模式。
```

---

# 附錄 D｜工程實作優先順序

## 第一週

- 建立 /api/ai/chat
- 建立 provider interface
- 接 OpenRouter
- 接 Gemini
- 建 usage log
- 做 fallback

## 第二週

- 接 Groq
- 接 DeepSeek
- 加 intent detector
- 加 cost guard
- 加 free/smart/ultra mode

## 第三週

- Z 幣扣點
- 導師設定
- 簡單後台 usage dashboard
- 高峰期降級

## 第四週

- AI 團隊會議室 MVP
- Pro 方案
- 模型品質評分
- 成本報表

---

# 附錄 E｜最重要的決策

AI 島不要賣「聊天次數」。

AI 島要賣：

> 更強的智慧、更好的導師、更深的陪跑、更完整的 AI 團隊。

免費聊天是入口。

付費智慧是商業模式。

Router 是生存系統。

Z 幣是成本緩衝。

AI 團隊會議室是差異化武器。

---

# 附錄 F｜資料來源核對摘要

本文件在 2026-05-30 依下列官方或接近官方資料重新核對方向：

- OpenAI API Pricing：官方 API 價格頁。
- Anthropic Claude API Pricing：官方 Claude API docs。
- Google Gemini API Pricing / Models：Google AI for Developers 官方文件。
- Groq Rate Limits：Groq 官方文件與社群 FAQ。
- OpenRouter Pricing / Free Models Router：OpenRouter 官方頁面。
- Cloudflare Workers AI Pricing：Cloudflare 官方文件。
- DeepSeek API Pricing：DeepSeek 官方 API docs。
- Hugging Face Inference Providers Pricing：Hugging Face 官方文件。
- Together AI Pricing：Together AI 官方價格頁。
- Fireworks AI Pricing：Fireworks 官方價格頁。
- Cerebras Pricing / Inference：Cerebras 官方頁面。

正式上線前，請重新核對每個 provider 的：
API model id、價格、免費額度、rate limit、資料使用政策、商業使用限制。

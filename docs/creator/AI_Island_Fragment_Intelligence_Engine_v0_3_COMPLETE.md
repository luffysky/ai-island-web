
# AI Island Whitepaper
# Fragment Intelligence Engine (FIE)
## Version 0.3 Draft

# Chapter 0 Manifesto（宣言）

## 為什麼需要這份白皮書

AI 已經能夠快速產生文字、圖片、音樂與程式碼。

然而，大多數 AI 創作工具仍然遵循相同的模式：

```
Prompt
↓
Generation
↓
Result
```

這個流程擅長回答問題，卻不擅長理解創作者。

當使用者輸入幾個關鍵字時，模型通常會依照訓練資料中的共現關係（Co-occurrence）組合內容，因此容易產生模板化作品。

例如：

```
高中
夏天
我們
宜蘭
```

很容易得到：

- 青春
- 陽光
- 稻田
- 夢想
- 未來

這些詞都合理。

但它們並沒有回答真正重要的問題。

**為什麼是宜蘭？**

**為什麼是高中？**

**「我們」是誰？**

**夏天只是季節，還是故事的轉折點？**

AI 知道哪些詞容易一起出現。

卻不知道它們為什麼會一起出現。

---

## AI 島想解決的問題

AI 島並不想做一個「更會寫歌」的網站。

也不想做另一個 ChatGPT。

AI 島真正想建立的是：

> 一個能理解創作者思考方式的創作作業系統。

創作者每天留下大量碎片：

- 一句對話
- 一張照片
- 一首歌
- 一個夢
- 一個地點
- 一段回憶
- 一種味道
- 一個突然想到的畫面

今天的大多數工具把它們視為素材。

AI 島則把它們視為「記憶」。

記憶不是資料。

記憶彼此存在關聯。

理解這些關聯，才是真正的創作起點。

---

## 碎片不是 Prompt

Prompt 是命令。

碎片不是。

Prompt 的目的是要求 AI 完成一件事。

碎片則是在描述一段曾經存在過的人生。

因此，同樣是：

```
高中
夏天
我們
宜蘭
```

AI 島不會立刻生成歌詞。

它會先開始推理。

例如：

- 高中是哪一年？
- 為什麼去了宜蘭？
- 「我們」是朋友、戀人還是家人？
- 這段回憶最後是快樂還是遺憾？
- 如果缺少資訊，最合理的推測有哪些？

AI 不直接回答。

AI 先思考。

---

## Fragment Intelligence

Fragment Intelligence 並不是新的生成模型。

它是一層理解能力。

新的流程變成：

```
Fragment
↓
Understanding
↓
Reasoning
↓
Creative Decision
↓
Generation
```

生成只是最後一步。

理解才是第一步。

---

## AI 的角色

AI 島不希望 AI 成為創作者。

AI 的角色更接近：

- 編劇夥伴
- 世界觀整理者
- 記憶連結者
- 靈感推理者

AI 可以提出五條可能故事。

真正決定故事的人仍然是創作者。

---

## 案例

碎片：

```
高中
夏天
我們
宜蘭
```

傳統生成：

> 夏天陽光灑落，
> 我們奔跑在宜蘭稻田，
> 青春永遠不會結束。

FIE 的第一步不是寫。

而是推理：

可能一：

高中畢業旅行。

可能二：

第一次一起旅行。

可能三：

多年後重返宜蘭。

可能四：

畢業前最後一次相聚。

推理完成後，再交由創作者選擇方向。

這代表 AI 並沒有取代創作，而是擴展創作者的可能性。

---

## 設計原則

1. 理解優先於生成。
2. 推理優先於回答。
3. 碎片不是 Prompt，而是線索。
4. 同一組碎片應產生多條合理敘事。
5. AI 提供可能性，不決定唯一答案。
6. 創作者保有最終決策權。
7. 每次創作都應反饋 Creator DNA。

---

## Manifesto

我們相信：

創作，不是從一個 Prompt 開始。

而是從一段記憶開始。

AI 的價值，不只是把文字排列得更漂亮。

而是幫助創作者重新理解那些曾經散落在人生各處的碎片。

當碎片開始彼此連結。

故事便開始誕生。

因此，

**碎片不是用來生成內容。**

**碎片，是用來推理故事。**

而 AI 島存在的目的，就是陪伴創作者完成這段推理旅程。

---

## Open Questions

- Creator DNA 應如何影響推理結果？
- 是否應保留所有推理路徑，而非只保留最佳答案？
- 推理結果是否應具備可信度分數（Confidence）？
- Fragment 是否需要版本演化機制？

---

# Progress

Completed:
- ✅ Chapter 0 Manifesto（第一版完整版）

Overall Progress：10%


---

# Chapter 1 現有系統狀態（Current System Analysis）

## Why

在提出新的架構之前，必須先理解目前已經完成了什麼。

FIE 並不是從零開始設計。

它建立在 Creator Island 已有的系統之上。

因此，本章的目的不是介紹功能，而是分析目前各模組在整個創作生命週期中扮演的角色。

---

## Creator Island 已有能力

目前 Creator Island 已經形成一個完整的創作循環。

```
生活
↓
Fragment
↓
Create
↓
Works
↓
Studio / Market
↓
Growth
```

這代表 AI 島已經不是單一 AI 工具，而是創作者工作流程的平台。

---

## 各模組定位

### Fragment

目前定位：

> 收集、分類、保存創作素材。

未來定位：

> 創作者的記憶入口。

碎片不是素材庫，而是創作者人生經驗的最小單位。

---

### Create

目前定位：

AI 生成入口。

未來定位：

創作決策中心。

Create 應該先經過推理，再開始生成，而不是直接要求模型輸出內容。

---

### Works

目前定位：

作品管理。

未來定位：

創作演化紀錄。

作品除了內容，也應保存：

- 使用哪些碎片
- 推理路徑
- 修改歷程
- Creator DNA 變化

---

### Studio

目前定位：

多人共同創作。

未來定位：

多人共同推理。

AI 不只協助編輯文字，也協助建立共同世界觀。

---

### Market

目前定位：

作品展示。

未來定位：

靈感流通平台。

交易的不一定是作品，也可以是：

- 碎片
- 世界觀
- 設定
- 劇情種子
- 人物設定

---

### Growth

目前定位：

創作統計。

未來定位：

Creator DNA。

Growth 應回答：

「這位創作者正在成為怎樣的人？」

而不是：

「他寫了幾篇文章？」

---

## 現況評估

目前 AI 島已經完成約七成的創作基礎設施。

真正缺少的是：

```
Fragment
↓
Reasoning Layer
↓
Creative Decision
```

目前 Fragment 與 Create 之間仍缺乏理解層。

因此 AI 可以生成，

卻尚未真正理解創作者。

---

## Summary

AI 島目前最大的價值，不是功能數量。

而是已經建立完整的創作者工作流程。

下一階段的重點不是增加更多功能。

而是在現有流程中加入一層真正的「推理能力」。

---

## Open Questions

- Fragment 是否需要自動建立關聯？
- Growth 是否應參與推理？
- Studio 是否應共享推理圖譜？
- Market 是否能推薦可組合的碎片？

---

# Progress Update

Completed

- ✅ Chapter 0 Manifesto
- ✅ Chapter 1 現有系統狀態（第一版）

Overall Progress：14%


---

# Chapter 2 目前最大瓶頸（Current Bottlenecks）

## Why

一個系統的下一步，不應建立在想像，而應建立在瓶頸分析。

AI 島目前最大的限制，不是模型能力，也不是生成速度。

真正的限制，是 AI 尚未真正理解創作者留下的碎片。

---

## Problem 1：碎片仍偏向「收藏」

目前 Fragment 已能保存：

- 想法
- 對話
- 歌詞
- 靈感
- 地點
- 人物

但 AI 對這些碎片的理解仍停留在「存在」。

它知道有這些碎片。

卻不知道它們彼此有什麼關係。

因此：

```
Fragment
↓

Storage
```

而不是：

```
Fragment
↓

Understanding
```

---

## Problem 2：生成快於理解

目前創作流程仍接近：

```
Fragment
↓
Create
↓
作品
```

AI 很快開始生成。

但真正應該先發生的是：

- 找主題
- 找主角
- 找時間軸
- 找衝突
- 找缺失資訊

生成只是最後一步。

---

## Problem 3：Co-occurrence（共現）

案例：

```
高中
夏天
我們
宜蘭
```

目前 AI 容易得到：

```
青春
陽光
稻田
夢想
```

原因不是理解。

而是大量語料中，高中容易接青春、夏天容易接陽光。

因此作品合理，但容易失去個人特色。

---

## Problem 4：沒有推理紀錄

目前生成完成後，AI 不知道：

- 為什麼這樣寫？
- 還有哪些可能？
- 哪條故事沒有被採用？

推理過程消失了。

AI 島應保留 Reasoning Trace，讓創作者可以回頭檢視每一次創作決策。

---

## Problem 5：Creator DNA 參與不足

Growth 已開始建立創作者 DNA。

但目前它更像分析結果。

未來它應該反向參與推理。

例如：

同一組碎片，

不同創作者，

應得到不同的故事建議。

Creator DNA 不只是統計，而是推理上下文。

---

## Design Principle

AI 島下一階段不增加更多 AI。

而是增加更多理解。

從：

```
Generate First
```

變成：

```
Understand First
```

---

## Summary

Fragment System 已經成熟。

真正需要演進的是：

Fragment → Reasoning → Decision → Generation。

Reasoning Layer 是目前整個 Creator Island 最重要、也是最缺少的一塊。

---

## Open Questions

- Reasoning Trace 要保存多久？
- Creator DNA 權重如何計算？
- 是否允許 AI 主動提出需要補充的碎片？
- 如何避免 AI 過度推測？

---

# Progress Update

Completed

- ✅ Chapter 0 Manifesto
- ✅ Chapter 1 現有系統狀態
- ✅ Chapter 2 目前最大瓶頸（第一版）

Overall Progress：18%


---

# Chapter 3 Reasoning Layer（推理層）

## Why

Reasoning Layer 是整個 FIE 最核心的能力。

它不是另一個 AI Model。

也不是另一個 LLM。

它是一層介於「碎片」與「生成」之間的理解層。

如果 Fragment 是創作者留下的記憶，

Generation 是最後的作品，

那麼 Reasoning Layer 就是 AI 理解這些記憶的過程。

沒有這一層，AI 只能生成。

有了這一層，AI 才開始理解。

---

## 為什麼不能直接交給 LLM？

LLM 很擅長生成。

但生成不代表理解。

例如：

```
高中
夏天
我們
宜蘭
```

LLM 很容易直接開始寫歌。

Reasoning Layer 則會先停下來。

它會問：

- 哪個碎片最重要？
- 哪些碎片只是背景？
- 是否存在時間順序？
- 是否存在人物關係？
- 是否缺少關鍵事件？
- 是否有多種合理故事？

這些問題不是生成，而是分析。

---

## Reasoning Layer 的職責

Reasoning Layer 不輸出作品。

它輸出的是：

- Fragment Summary
- Fragment Weight
- Story Candidates
- Missing Fragment
- Timeline
- Relationship Graph
- Theme
- Emotion Curve
- Confidence

Generation Engine 再依據這些結果創作。

---

## 推理流程

```
Fragment Collection
        │
        ▼
Fragment Analysis
        │
        ▼
Fragment Graph
        │
        ▼
Reasoning
        │
        ├── Timeline
        ├── Relationship
        ├── Theme
        ├── Emotion
        ├── Missing Fragment
        │
        ▼
Creative Decision
        │
        ▼
Generation
```

Reasoning Layer 的任務不是找唯一答案。

而是建立「可能性空間」。

---

## 多重推理

對同一組碎片：

```
高中
夏天
我們
宜蘭
```

Reasoning Layer 應輸出：

Candidate A：
青春成長（87%）

Candidate B：
初戀（79%）

Candidate C：
多年後重逢（66%）

Candidate D：
友情（61%）

Generation Engine 再依照創作者選擇生成。

---

## 與 Creator DNA 的關係

Reasoning Layer 不應孤立工作。

它需要 Creator DNA 作為上下文。

例如：

創作者 A 常寫青春。

創作者 B 常寫懸疑。

即使碎片相同，

Reasoning Layer 也應產生不同排序。

因此：

Reasoning = Fragment + Creator DNA + World Knowledge

---

## 設計原則

1. 推理與生成分離。
2. 推理結果可檢視。
3. 推理結果可修改。
4. 推理結果可重複使用。
5. 同一組碎片允許多種合理推理。

---

## Summary

Reasoning Layer 並不是替代 LLM。

它是讓 LLM 在創作前，先學會思考。

Fragment 負責保存記憶。

Reasoning Layer 負責理解記憶。

Generation Engine 負責創作作品。

三者共同構成 AI 島的核心架構。

---

## Open Questions

- Reasoning 是否拆成多個 Agent？
- 是否保留完整 Reasoning Trace？
- 是否允許使用者手動修改推理結果？
- Reasoning 是否可以快取重複使用？

---

# Progress Update

Completed

- ✅ Chapter 0 Manifesto
- ✅ Chapter 1 現有系統狀態
- ✅ Chapter 2 目前最大瓶頸
- ✅ Chapter 3 Reasoning Layer（第一版）

Overall Progress：23%


---

# Chapter 4 Fragment Intelligence（碎片智能）

## Why

Fragment Intelligence 是 FIE 的核心，不是因為它能「生成更多內容」，而是因為它能「理解更多關係」。

如果 Fragment 是資料，Reasoning Layer 是推理，那 Fragment Intelligence 就是 AI 對碎片的理解能力。

沒有 Fragment Intelligence，碎片只是靜態資料。

有了 Fragment Intelligence，碎片才開始產生意義。

---

## Problem

目前大多數 AI 對碎片的理解方式，是把每個碎片視為獨立資訊。

例如：

```
高中
夏天
我們
宜蘭
```

模型會分別聯想到：

高中 → 青春

夏天 → 陽光

宜蘭 → 稻田

我們 → 回憶

但真正重要的是：

這四個碎片彼此的關係。

Fragment Intelligence 的目標不是增加聯想，而是增加關聯。

---

## Fragment 不應是資料列

一般資料庫：

```
Fragment
├── id
├── title
├── content
└── tags
```

FIE 中，每個 Fragment 更像是一個節點（Node）。

每個節點都持續與其他節點建立新的連線。

因此：

Fragment 不只是被搜尋。

Fragment 會主動參與推理。

---

## Fragment Intelligence 的能力

每個 Fragment 應具備：

- Context（上下文）
- Weight（重要性）
- Relationship（關聯）
- Evolution（演化）
- Confidence（可信度）
- Creator Relevance（創作者相關性）

這些能力共同形成 Fragment Intelligence。

---

## 核心原則

Fragment Intelligence 不回答：

> 這個碎片是什麼？

它回答：

> 這個碎片與哪些碎片有關？

以及：

> 為什麼有關？

---

## Summary

Fragment Intelligence 並不是新的 AI 模型。

它是一套理解碎片的能力。

Reasoning Layer 建立在 Fragment Intelligence 之上。

Generation Engine 建立在 Reasoning Layer 之上。

因此：

```
Fragment
↓
Fragment Intelligence
↓
Reasoning Layer
↓
Generation
```

而不是：

```
Fragment
↓
Generation
```

---

## Open Questions

- Fragment 關聯是否需要時間權重？
- 關聯是否應由 AI 與使用者共同建立？
- Fragment 是否應具備生命週期狀態？

---

# Progress Update

Completed

- ✅ TASK-001 Chapter 0 Manifesto
- ✅ TASK-002 Chapter 1 Current System
- ✅ TASK-003 Chapter 2 Current Bottlenecks
- ✅ TASK-004 Chapter 3 Reasoning Layer
- ✅ TASK-005 Chapter 4 Fragment Intelligence（第一版）

Overall Progress：28%


---

# Chapter 5 Fragment Representation（碎片表示模型）

## Why

AI 能不能推理，不取決於模型有多大，而取決於碎片如何被表示（Representation）。

如果 Fragment 只有文字內容：

```
宜蘭
```

AI 很難知道它代表的是：

- 一次旅行
- 一段回憶
- 一個故事背景
- 一位創作者的重要意象

因此，推理前必須先建立完整的 Fragment Representation。

---

## Problem

目前大部分系統把 Fragment 儲存為：

```json
{
  "content": "宜蘭",
  "tags": ["旅行"]
}
```

這足以搜尋。

卻不足以推理。

因為 AI 不知道：

- 重要程度
- 情緒
- 與其他碎片的關係
- 是否反覆出現在創作者作品中

---

## Fragment Representation

每個 Fragment 應至少包含：

- Content：內容
- Type：人物、事件、地點、物件、情緒…
- Context：上下文
- Weight：重要性
- Emotion：情緒
- Relation：關聯節點
- Time Hint：時間提示
- Confidence：AI 理解信心
- Creator Weight：對此創作者的重要程度

這些欄位不是為了顯示，而是提供推理使用。

---

## Weight 與 Importance

Weight 並不是熱門程度。

而是：

> 這個碎片在目前推理中的重要性。

例如：

```
高中 0.95
我們 0.91
宜蘭 0.74
夏天 0.42
```

代表目前故事真正圍繞：

> 高中的我們。

而不是夏天。

Weight 應該隨著不同故事重新計算。

---

## Fragment Graph

Representation 建立完成後，每個 Fragment 都會成為 Graph 的一個節點。

```
高中
 ├── 制服
 ├── 畢業
 └── 宜蘭（畢旅）

宜蘭
 ├── 海邊
 ├── 火車
 └── 夏天
```

Graph 不儲存故事。

Graph 儲存可能形成故事的關聯。

---

## Design Principle

Representation 不應描述「碎片是什麼」。

而應描述：

> AI 應如何理解這個碎片。

---

## Summary

Fragment Representation 是 Fragment 與 Reasoning Layer 之間的橋樑。

沒有 Representation，推理只能依賴 Prompt。

有了 Representation，AI 才能開始真正理解 Fragment。

---

## Open Questions

- Representation 是否允許使用者自訂欄位？
- Weight 是否由 AI 動態計算？
- Graph 是否需要版本管理？

---

# Progress Update

Completed

- ✅ TASK-001 Chapter 0 Manifesto
- ✅ TASK-002 Chapter 1 Current System
- ✅ TASK-003 Chapter 2 Current Bottlenecks
- ✅ TASK-004 Chapter 3 Reasoning Layer
- ✅ TASK-005 Chapter 4 Fragment Intelligence
- ✅ TASK-006 Chapter 5 Fragment Representation（第一版）

Overall Progress：34%


---

# Chapter 6 Reasoning Pipeline（推理流程）

## Why

Fragment Intelligence 定義了「AI 如何理解碎片」。

Reasoning Pipeline 則定義：

> AI 應依照什麼順序理解碎片。

推理不是一次完成。

它是一連串逐步縮小可能性的過程。

---

## Design Goal

Pipeline 不直接輸出作品。

Pipeline 的輸出永遠是：

- 推理結果
- 推理依據
- 多個候選方向

作品只是下一個階段的輸入。

---

## Pipeline

```
Fragment Collection
        │
        ▼
Fragment Representation
        │
        ▼
Relationship Analysis
        │
        ▼
Weight Calculation
        │
        ▼
Missing Fragment Detection
        │
        ▼
Candidate Generation
        │
        ▼
Creator Context Alignment
        │
        ▼
Reasoning Result
        │
        ▼
Generation
```

---

## Step 1：Relationship Analysis

第一步不是找故事。

而是建立：

- 人物
- 地點
- 時間
- 情緒
- 事件

彼此之間的關聯。

沒有關聯，就沒有故事。

---

## Step 2：Weight Calculation

AI 判斷：

哪些 Fragment 是主線。

哪些只是背景。

Weight 應依照目前推理動態改變。

而不是永久固定。

---

## Step 3：Missing Fragment

AI 主動回答：

故事還缺什麼？

例如：

```
高中
夏天
宜蘭
```

可能缺：

- 主角
- 衝突
- 關鍵事件

這不是要求使用者一定補充。

而是讓 AI 知道目前推理的不確定性。

---

## Step 4：Candidate Generation

Reasoning 不產生唯一答案。

而是：

```
Candidate A
Candidate B
Candidate C
```

每個 Candidate 都應保留：

- 推理理由
- 信心分數
- 使用 Fragment
- 缺失 Fragment

---

## Step 5：Creator Context Alignment

最後一步不是生成。

而是根據 Creator DNA 重新排序 Candidate。

同一組 Fragment，

不同創作者，

可能得到不同排序。

---

## Pipeline Output

Reasoning Pipeline 最終輸出：

- Fragment Summary
- Graph
- Timeline
- Theme
- Emotion Curve
- Candidate List
- Confidence
- Missing Fragment
- Reasoning Trace

Generation Engine 不再重新分析，

而是直接使用這些推理結果創作。

---

## Summary

Reasoning Pipeline 的目標不是讓 AI 更快寫。

而是讓 AI 在生成之前，先建立一套可以被理解、被檢查、被修改的推理流程。

推理成為獨立能力。

生成只是其中一個應用。

---

## Open Questions

- Pipeline 是否允許部分步驟跳過？
- Candidate 數量應固定還是動態？
- Reasoning Trace 是否永久保存？

---

# Progress Update

Completed

- ✅ TASK-001 Chapter 0 Manifesto
- ✅ TASK-002 Chapter 1 Current System
- ✅ TASK-003 Chapter 2 Current Bottlenecks
- ✅ TASK-004 Chapter 3 Reasoning Layer
- ✅ TASK-005 Chapter 4 Fragment Intelligence
- ✅ TASK-006 Chapter 5 Fragment Representation
- ✅ TASK-007 Chapter 6 Reasoning Pipeline（第一版）

Overall Progress：40%


---

# Chapter 7 Multiple Narratives（多重敘事）

## Why

創作並不存在唯一正確答案。

同一組 Fragment，可以合理推理出不同故事。

Reasoning Layer 的工作不是挑出唯一答案，而是建立多個具有合理性的敘事候選。

---

## Problem

目前多數 AI 的生成流程為：

```
Prompt
↓
Best Answer
```

但創作不需要 Best Answer。

創作需要：

```
Possible Answers
```

因為創作者真正尋找的是靈感，而不是標準答案。

---

## Narrative Candidates

輸入：

```
高中
夏天
我們
宜蘭
```

Reasoning Layer 可以輸出：

Candidate A
- 青春成長
- Confidence：0.88

Candidate B
- 初戀
- Confidence：0.81

Candidate C
- 畢業旅行
- Confidence：0.76

Candidate D
- 多年後重返舊地
- Confidence：0.69

這些候選並非互斥，而是不同推理方向。

---

## Candidate 組成

每個 Candidate 至少包含：

- Title
- Summary
- Theme
- Timeline
- Fragment Usage
- Missing Fragment
- Confidence
- Reasoning Trace

因此 Candidate 是一個可再次編輯的中間成果，而不是最終作品。

---

## Creator Decision

AI 不直接決定故事。

創作者可以：

- 選擇其中一個
- 合併兩個 Candidate
- 修改 Candidate
- 全部捨棄重新推理

AI 提供可能性。

創作者保留創造力。

---

## Summary

Multiple Narratives 是 Fragment Intelligence 與一般 AI 工具最大的差異之一。

AI 不再追求唯一答案。

而是建立一個可探索的創作空間。

---

## Open Questions

- Candidate 是否允許遞迴推理？
- 是否應保存所有 Candidate？
- Candidate 是否可跨作品重複使用？

---

# Progress Update

Completed

- ✅ TASK-001 Chapter 0 Manifesto
- ✅ TASK-002 Chapter 1 Current System
- ✅ TASK-003 Chapter 2 Current Bottlenecks
- ✅ TASK-004 Chapter 3 Reasoning Layer
- ✅ TASK-005 Chapter 4 Fragment Intelligence
- ✅ TASK-006 Chapter 5 Fragment Representation
- ✅ TASK-007 Chapter 6 Reasoning Pipeline
- ✅ TASK-008 Chapter 7 Multiple Narratives（第一版）

Overall Progress：46%


---

# Chapter 8 Creator Context（創作者上下文）

## Why

同樣一組 Fragment，不同創作者，不應得到完全相同的推理結果。

Reasoning 不應只依賴 Fragment。

還必須理解：

> 這些 Fragment 是誰留下的。

這就是 Creator Context 存在的原因。

---

## Fragment 並非脫離創作者存在

Fragment 本身沒有絕對意義。

例如：

```
凌晨三點
```

對不同創作者可能代表：

- 熬夜寫程式
- 失眠
- 深夜便利商店
- 靈感爆發
- 戀愛回憶

如果忽略創作者背景，

Reasoning 將退化成一般語意搜尋。

---

## Creator Context 的組成

Creator Context 並不是個人資料。

它描述的是創作習慣。

包含：

- 常見主題
- 常見情緒
- 常見意象
- 常見敘事方式
- 常用 Fragment
- 創作節奏
- 長期偏好

Creator Context 是推理上下文，而不是使用者檔案。

---

## Creator DNA

Creator DNA 是 Creator Context 的長期累積。

例如：

某位創作者經常出現：

```
凌晨三點
奶茶
捷運
腳尖
已讀
```

AI 不應只知道這些字。

而應理解：

這些 Fragment 經常共同形成：

- 都市感
- 等待
- 青春
- 遺憾
- 溫柔敘事

Creator DNA 提供的是推理方向，而不是創作限制。

---

## 避免回音室效應

如果 AI 永遠依照 Creator DNA 排序，

創作者會越寫越像自己。

因此 Creator Context 應該同時提供：

- Familiar（熟悉）
- Adjacent（相鄰）
- Exploratory（探索）

三種推理模式。

讓 AI 在理解創作者的同時，

仍保留新的可能性。

---

## Summary

Creator Context 不應限制創作者。

它的目的不是預測創作者會寫什麼。

而是理解：

什麼樣的推理，最符合這位創作者目前的創作狀態。

---

## Open Questions

- Creator DNA 是否應隨時間衰減？
- 是否允許建立多個 Creator Persona？
- Exploration 比例如何決定？

---

# Progress Update

Completed

- ✅ TASK-001 Chapter 0 Manifesto
- ✅ TASK-002 Chapter 1 Current System
- ✅ TASK-003 Chapter 2 Current Bottlenecks
- ✅ TASK-004 Chapter 3 Reasoning Layer
- ✅ TASK-005 Chapter 4 Fragment Intelligence
- ✅ TASK-006 Chapter 5 Fragment Representation
- ✅ TASK-007 Chapter 6 Reasoning Pipeline
- ✅ TASK-008 Chapter 7 Multiple Narratives
- ✅ TASK-009 Chapter 8 Creator Context（第一版）

Overall Progress：52%


---

# Chapter 9 Case Study（案例研究）

## Why

理論只能證明設計方向。

真正驗證 Fragment Intelligence 的方式，是讓同一組 Fragment 經過完整推理流程。

本章以：

```
高中
夏天
我們
宜蘭
```

作為案例。

---

## Stage 1：Raw Fragment

輸入只有四個 Fragment。

```
高中
夏天
我們
宜蘭
```

此時 AI 不應立即生成。

因為資訊不足。

---

## Stage 2：Representation

AI 建立 Representation。

| Fragment | Type | 初步理解 |
|----------|------|----------|
| 高中 | Time | 人生階段 |
| 夏天 | Time | 季節、暑假 |
| 我們 | People | 群體關係 |
| 宜蘭 | Place | 地點 |

這一步仍未形成故事。

---

## Stage 3：Hypothesis

Reasoning Layer 開始提出假設。

Hypothesis A

高中畢業旅行。

Hypothesis B

第一次戀愛旅行。

Hypothesis C

多年後重返舊地。

Hypothesis D

好友最後一次相聚。

重點不是選答案。

而是建立可能性。

---

## Stage 4：Evidence

AI 開始檢查：

哪些 Fragment 支持這個假設？

例如：

Hypothesis A：

支持：

- 高中
- 夏天
- 宜蘭

不足：

- 缺少事件
- 缺少人物關係

因此：

Confidence：

0.73

Hypothesis C：

支持：

- 宜蘭
- 我們

不足：

- 缺少時間跨度

Confidence：

0.59

---

## Stage 5：Missing Fragment

AI 主動提出：

若補充：

- 一句對話
- 一件物品
- 一段衝突

Confidence 可以提高。

因此 Missing Fragment 並不是錯誤。

而是推理尚未完成。

---

## Stage 6：Candidate Ranking

AI 排序：

1. 畢業旅行（0.73）
2. 初戀（0.69）
3. 重返舊地（0.59）
4. 友情（0.55）

排序依據公開。

創作者可重新調整。

---

## Stage 7：Generation

直到這一步，

AI 才開始生成歌詞、小說、劇本或其他作品。

Generation 不再直接依賴 Fragment。

而是依賴：

Reasoning Result。

---

## Summary

同樣四個 Fragment。

傳統 AI：

直接寫歌。

FIE：

Representation
↓

Hypothesis
↓

Evidence
↓

Missing Fragment
↓

Candidate Ranking
↓

Generation

AI 不只是生成。

AI 正在推理。

---

## Open Questions

- Evidence 是否可引用創作者歷史 Fragment？
- Confidence 是否應由多個模型共同計算？
- Hypothesis 是否可遞迴展開？

---

# Progress Update

Completed

- ✅ TASK-001 Chapter 0 Manifesto
- ✅ TASK-002 Chapter 1 Current System
- ✅ TASK-003 Chapter 2 Current Bottlenecks
- ✅ TASK-004 Chapter 3 Reasoning Layer
- ✅ TASK-005 Chapter 4 Fragment Intelligence
- ✅ TASK-006 Chapter 5 Fragment Representation
- ✅ TASK-007 Chapter 6 Reasoning Pipeline
- ✅ TASK-008 Chapter 7 Multiple Narratives
- ✅ TASK-009 Chapter 8 Creator Context
- ✅ TASK-010 Chapter 9 Case Study（第一版）

Overall Progress：60%


---

# Chapter 10 Implementation（實作方向）

## Why

FIE 必須能夠落地，而不是停留在概念。

因此，本章定義的是最小可行實作（MVP），目標不是一次完成所有能力，而是建立一套可逐步演進的推理框架。

---

## MVP 流程

```
使用者選擇 Fragment
        │
        ▼
Representation
        │
        ▼
Reasoning
        │
        ▼
Candidate
        │
        ▼
Creator Context
        │
        ▼
Generation
```

每個階段都可獨立替換、升級或重新訓練。

---

## 核心資料流

輸入：

- Fragment IDs
- Creator Context
- Generation Mode

輸出：

- Candidate List
- Reasoning Trace
- Confidence
- Missing Fragment
- Final Prompt（提供 Generation Engine）

Generation Engine 不直接接觸原始 Fragment，而是接收推理結果。

---

## MVP 原則

第一版先做到：

- 可建立 Fragment Representation
- 可建立 Candidate
- 可人工選擇 Candidate
- 可產生 Generation Prompt

其餘能力逐步加入。

---

## Summary

Implementation 不追求一步到位。

而是建立一套可演進、可驗證、可替換的推理架構。

---

## Open Questions

- 是否支援多模型共同推理？
- 是否允許第三方 Reasoning Plugin？

---

# Chapter 11 Future（未來方向）

## 長期目標

FIE 不只是歌詞推理。

未來可支援：

- 小說
- 劇本
- 品牌企劃
- 遊戲世界觀
- 影片腳本
- 知識整理

共同點不是生成類型。

共同點是：

> 都建立在 Fragment → Reasoning → Generation。

---

## 長期演進

第一階段：

理解 Fragment。

第二階段：

理解創作者。

第三階段：

理解長期世界觀。

第四階段：

協助創作者共同建立持續演化的創作宇宙。

---

## Final Manifesto

Fragment 不只是靈感。

它是記憶留下的證據。

Reasoning 不只是分析。

它是 AI 嘗試理解創作者思考方式的過程。

Generation 不再是起點。

而是推理完成後，自然而然的結果。

當 AI 能理解 Fragment。

它才能真正陪伴創作者。

---

# Progress Update

Completed

- ✅ TASK-001 Manifesto
- ✅ TASK-002 Current System
- ✅ TASK-003 Current Bottlenecks
- ✅ TASK-004 Reasoning Layer
- ✅ TASK-005 Fragment Intelligence
- ✅ TASK-006 Fragment Representation
- ✅ TASK-007 Reasoning Pipeline
- ✅ TASK-008 Multiple Narratives
- ✅ TASK-009 Creator Context
- ✅ TASK-010 Case Study
- ✅ TASK-011 Implementation
- ✅ TASK-012 Future

Overall Progress：100%（第一版完成，下一輪進入全面擴寫）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-001 Chapter 0 Manifesto（Frozen Edition）

## Background

大型語言模型的誕生，大幅降低了創作門檻。

今天，只需要一句 Prompt，就能生成文章、歌詞、小說、程式碼與圖片。

然而，生成能力提升，不代表理解能力同步提升。

現有 AI 更像是一位知識豐富的續寫者，而不是理解創作者思考過程的共同作者。

因此，AI 島提出一個不同的假設：

**真正限制 AI 創作品質的，不是模型生成能力，而是生成之前缺少理解。**

---

## Observation

觀察大量 AI 創作流程，可以發現它們幾乎都遵循：

Prompt
↓

Generation

這代表：

使用者所有想法，都必須壓縮成一次 Prompt。

但創作者真正的思考方式並不是如此。

創作者通常會：

- 蒐集靈感
- 留下片段
- 建立聯想
- 嘗試不同假設
- 最後才開始創作

也就是：

創作者先思考。

AI 先生成。

這就是雙方最大的落差。

---

## Core Hypothesis

FIE 提出的核心假設如下：

> 如果 AI 能理解 Fragment 之間的關係，而不是直接續寫文字，創作品質將更接近人類創作流程。

因此，本白皮書並不是研究新的生成模型。

而是研究：

**如何建立生成之前的理解能力。**

---

## Design Principle

FIE 建立四個不可違反的原則。

### Principle 1

生成不是第一步。

理解才是第一步。

### Principle 2

Fragment 不是 Prompt。

Fragment 是等待推理的證據。

### Principle 3

AI 不應直接決定故事。

AI 應提出多個合理假設。

### Principle 4

創作者保有最終決策權。

Reasoning 永遠服務於創作者。

---

## The FIE Formula

本白皮書提出核心公式：

Story

=

Fragment

+

Representation

+

Reasoning

+

Creator Context

缺少其中任何一項，都只能得到內容生成，而不是創作推理。

其中：

Fragment 提供素材。

Representation 建立可理解資料。

Reasoning 建立假設。

Creator Context 提供創作者觀點。

Generation 則只是最後輸出。

---

## Counter Example

若直接生成：

Fragment

↓

Generation

AI 很容易得到合理但空泛的內容。

例如：

高中、夏天、宜蘭。

容易得到：

青春、陽光、夢想。

這些內容沒有錯。

但缺乏推理。

因此也缺乏創作者個性。

---

## FIE Philosophy

FIE 不追求：

最快生成。

FIE 追求：

最合理理解。

當 AI 理解得越完整，

生成便越自然。

因此：

推理不是生成的附屬功能。

生成反而只是推理完成後的一個輸出方式。

---

## Summary

本章建立整份白皮書最重要的一個觀念：

Prompt 並不是創作真正的起點。

Fragment 才是。

真正的創作流程應為：

Fragment

↓

Representation

↓

Reasoning

↓

Generation

這也是後續所有章節共同建立與證明的核心架構。

================================================================================
Progress Update

Expansion Sprint

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen Edition）

## Background

近年大型語言模型的能力快速提升，但多數創作工具仍採用相同流程：

Prompt
↓

LLM

↓

Generation

生成品質越來越高，但作品仍容易出現「看起來很好，卻記不住」的情況。

原因並非模型不夠大，而是推理流程過短。

---

## The Real Problem

目前的 AI 並不知道：

- 為什麼使用者提供這些 Fragment？
- 哪一個 Fragment 才是真正主題？
- 哪些只是背景？
- 哪些 Fragment 存在因果？
- 哪些 Fragment 只是巧合？

模型只能根據統計機率完成下一個 Token。

這是一種語言推理，不是故事推理。

---

## Co-occurrence Is Not Understanding

例如：

```
高中
夏天
宜蘭
```

模型通常得到：

青春

↓

陽光

↓

稻田

原因並非理解。

而是大量語料共同出現。

FIE 將這種能力稱為：

**Co-occurrence Completion（共現補全）**

它可以完成文字。

但不能完成故事。

---

## Compression Problem

Prompt 是高度壓縮的資訊。

創作者腦中可能存在：

- 回憶
- 情緒
- 人物
- 對話
- 世界觀
- 時間跨度

最後卻只能輸入一句 Prompt。

AI 接收到的是壓縮結果，而不是思考過程。

因此大量創作資訊在生成前便已遺失。

---

## Fragment First Thinking

FIE 提出另一種流程：

生活

↓

Fragment

↓

Representation

↓

Reasoning

↓

Generation

Prompt 不再是起點。

Prompt 只是推理完成後的其中一種表示方式。

---

## Design Implications

若問題來自理解不足，

下一代創作系統應優先投資：

- Fragment 結構
- 關聯分析
- 假設建立
- 證據驗證
- Creator Context

而不是一味增加 Prompt 長度。

---

## Summary

本章建立一個重要結論：

目前 AI 的限制，不是生成能力。

而是缺少生成前的理解能力。

FIE 的存在，就是填補這段空白。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-003 Chapter 2 Fragment Philosophy（Frozen Edition）

## Background

Fragment 並不是 AI 島發明的新資料型態。

真正新的地方在於：

**FIE 不把 Fragment 視為 Prompt，而是視為推理的基本單位。**

Prompt 的目的是要求模型完成任務。

Fragment 的目的則是保存一段尚未完成的思考。

因此兩者本質不同。

---

## What Is A Fragment?

Fragment 可以是一切尚未形成完整作品的資訊。

例如：

- 一句對話
- 一個畫面
- 一個地點
- 一段旋律
- 一種味道
- 一個人物
- 一種情緒
- 一個問題
- 一個夢境

Fragment 不要求完整。

它保留的是「可能性」。

---

## Fragment Is Evidence

FIE 將 Fragment 定義為：

> Fragment 是創作者留下的創作證據（Creative Evidence）。

Evidence 並不直接說明故事。

Evidence 用來支持故事。

因此：

Fragment 的價值不是內容本身。

而是它未來能支持哪些推理。

---

## Fragment Is Atomic

每個 Fragment 都應保持足夠小。

例如：

❌ 高中畢業旅行那天大家一起去宜蘭看海。

這其實包含：

- 高中
- 畢業旅行
- 宜蘭
- 海邊
- 我們

較好的表示方式是拆成多個 Fragment，再由 Reasoning Layer 建立關聯。

這使同一個 Fragment 能重複參與不同故事。

---

## Fragment Is Context Free

建立 Fragment 時，不需要先決定用途。

今天留下：

```
桂花香
```

一年後它可能成為：

- 小說伏筆
- 歌詞意象
- 品牌故事
- 電影鏡頭

Fragment 不屬於任何作品。

作品只是 Fragment 的一次組合。

---

## Fragment Network

當 Fragment 持續累積，

真正重要的已不再是單一 Fragment。

而是 Fragment Network。

```
桂花
│
├── 老照片
├── 停車場
├── 秋天
└── 外婆
```

故事不是存在某個 Fragment。

故事存在於關聯。

---

## Trade-offs

Fragment 越小：

優點：

- 可重複利用
- 推理彈性高
- 關聯更多

缺點：

- 初期推理成本提高
- Representation 更重要
- Graph 更複雜

因此 FIE 選擇：

增加推理成本，

換取長期創作能力。

---

## Summary

Prompt 是一次性的。

Fragment 是可累積的。

Prompt 描述需求。

Fragment 保存思考。

Prompt 結束於一次生成。

Fragment 則可能陪伴創作者數年，持續形成新的作品。

這也是 FIE 選擇 Fragment 作為整個推理系統基礎單位的原因。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-004 Chapter 3 Reasoning Layer（Frozen Edition）

## Background

Fragment 解決的是「保存」。

Representation 解決的是「描述」。

真正決定作品品質的，是 Reasoning。

Reasoning 並不是生成前的附屬流程，而是 FIE 最核心的能力。

沒有 Reasoning，Fragment 永遠只是資料。

---

## Why Reasoning Exists

傳統 AI 的流程是：

```
Prompt
↓
Generation
```

FIE 的流程則是：

```
Fragment
↓
Representation
↓
Reasoning
↓
Generation
```

差異不在最後的 Generation。

而在 Generation 前是否真正理解 Fragment。

---

## Reasoning Is Inference

本白皮書定義：

> Reasoning 是根據 Fragment 建立假設（Hypothesis）、驗證假設（Evidence）、淘汰假設，最後形成可創作候選（Candidate）的過程。

因此 Reasoning 不是聯想。

也不是關鍵字匹配。

而是一種 Inference Process。

---

## Four Stages of Reasoning

### Stage 1：Observation

觀察所有 Fragment。

不做任何故事假設。

只建立事實。

例如：

- 高中（人生階段）
- 夏天（時間）
- 宜蘭（地點）
- 我們（群體）

---

### Stage 2：Hypothesis

開始提出多種可能。

例如：

- 畢業旅行
- 初戀
- 校外教學
- 多年後重返

此階段允許大量可能性。

---

### Stage 3：Evidence

逐一驗證：

哪些 Fragment 支持？

哪些 Fragment 衝突？

哪些資訊缺失？

每個假設都必須能解釋現有 Fragment。

---

### Stage 4：Candidate

保留最合理的推理。

但不刪除其他可能。

Reasoning Layer 的輸出不是答案。

而是一組可供創作者探索的方向。

---

## Reasoning Principles

Reasoning 必須遵守：

1. 可追蹤（Traceable）
2. 可解釋（Explainable）
3. 可修改（Editable）
4. 可重算（Reproducible）
5. 非唯一答案（Non-deterministic Narrative）

---

## Reasoning Trace

每次推理都應保存：

- 使用哪些 Fragment
- 建立哪些假設
- 淘汰哪些假設
- 保留哪些 Candidate
- 為什麼得到目前排序

Trace 是 FIE 與一般生成工具最大的差異之一。

---

## Failure Cases

Reasoning 也可能失敗。

例如：

- Fragment 過少
- Fragment 互相矛盾
- Creator Context 不足

此時系統應回傳：

「目前無法形成高可信度推理。」

而不是強行生成故事。

---

## Engineering Trade-offs

加入 Reasoning Layer 後：

優點：

- 可解釋
- 可擴充
- 可重用
- 可分析

代價：

- 延長推理時間
- 增加資料結構
- 增加計算成本

FIE 選擇犧牲部分速度，換取創作深度。

---

## Summary

Reasoning Layer 是 FIE 的核心，不是因為它會生成故事，而是因為它決定故事如何誕生。

Generation 是輸出。

Reasoning 才是創作。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）
✅ EXP-004 Chapter 3 Reasoning Layer（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-005 Chapter 4 Fragment Intelligence（Frozen Edition）

## Background

Fragment 是資料。

Reasoning 是推理。

兩者之間仍缺少一層能力：

> AI 如何理解 Fragment？

這層能力即為 Fragment Intelligence。

它不是新的模型，而是一套持續建立 Fragment 意義的機制。

---

## Intelligence vs Storage

一般筆記系統負責：

```
Collect
↓

Store
↓

Search
```

FIE 則增加：

```
Collect
↓

Understand
↓

Connect
↓

Reason
```

Fragment Intelligence 的目標不是找到 Fragment，而是理解 Fragment。

---

## Five Core Abilities

### 1. Context Awareness

每個 Fragment 都必須具備上下文。

例如：

```
奶茶
```

可能代表：

- 早餐店
- 深夜加班
- 某個人
- 某段回憶

Context 決定 Fragment 的真正意義。

---

### 2. Relationship Discovery

AI 必須持續發現：

哪些 Fragment 經常共同出現？

哪些 Fragment 存在因果？

哪些 Fragment 互相矛盾？

這些關聯會持續演化。

---

### 3. Dynamic Weight

Weight 並非固定屬性。

同一 Fragment 在不同故事中的重要程度不同。

Weight 必須由推理動態決定，而非寫死。

---

### 4. Evolution

Fragment 不應永久保持相同狀態。

新的 Fragment 出現後：

舊 Fragment 的意義可能改變。

因此 Intelligence 必須持續重新理解。

---

### 5. Explainability

每一次關聯建立都必須回答：

為什麼？

例如：

```
桂花

↓

老照片
```

系統必須能指出：

因為兩者共同出現在三段回憶，而非黑盒排序。

---

## Fragment Intelligence Loop

```
Collect
↓

Represent
↓

Understand
↓

Connect
↓

Reason
↓

Generate
↓

Feedback
↓

Update Intelligence
```

Generation 並不是終點。

每次創作都應反饋 Fragment Intelligence。

---

## Engineering Principles

Fragment Intelligence 應具備：

- Incremental Learning
- Explainable Relations
- Reusable Knowledge
- Long-term Memory
- Low Coupling

如此才能長期累積，而不是每次重新開始。

---

## Summary

Fragment Intelligence 並不是 AI 的另一個功能。

它是整個 FIE 的知識核心。

Reasoning 建立於 Fragment Intelligence。

Generation 建立於 Reasoning。

因此 FIE 真正累積的不是 Prompt，而是理解能力。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）
✅ EXP-004 Chapter 3 Reasoning Layer（Frozen）
✅ EXP-005 Chapter 4 Fragment Intelligence（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-006 Chapter 5 Fragment Representation（Frozen Edition）

## Background

Reasoning 不直接閱讀原始 Fragment。

Reasoning 閱讀的是 Fragment Representation。

Representation 的目的不是儲存資料，而是將 Fragment 轉換成 AI 可以推理的語意結構。

因此，Representation 是 FIE 最重要的橋樑。

---

## Why Representation Matters

假設 Fragment：

```
宜蘭
```

如果只有一段文字：

AI 不知道它代表：

- 地點
- 回憶
- 畢旅
- 初戀
- 故鄉

Representation 則補足這些資訊，使 Fragment 從字串變成可推理物件。

---

## Representation Layers

每個 Fragment 應至少包含五層資訊：

### Layer 1：Literal

原始內容。

例如：

```
宜蘭
```

---

### Layer 2：Semantic

語意分類。

- 地點
- 人物
- 事件
- 物件
- 情緒
- 時間

---

### Layer 3：Context

上下文。

例如：

- 高中畢旅
- 家庭旅行
- 現居城市

同一個 Fragment 可存在多個 Context。

---

### Layer 4：Relations

與其他 Fragment 的連結。

例如：

```
宜蘭
├── 夏天
├── 高中
├── 我們
└── 海邊
```

Representation 保存的是關聯，不是故事。

---

### Layer 5：Inference Metadata

供推理使用的資訊：

- Weight
- Confidence
- Creator Relevance
- Last Updated
- Evidence Count

這些欄位不直接顯示給使用者，而是提供 Reasoning Layer 判斷。

---

## Representation Is Dynamic

Representation 並非固定資料。

每次新增 Fragment：

```
海邊
```

都有可能重新影響：

```
宜蘭
```

因此 Representation 是持續演化的，而不是一次建立永久使用。

---

## Design Principles

Fragment Representation 應遵守：

- Machine-readable
- Human-understandable
- Extensible
- Explainable
- Context-aware

任何新增欄位都應提升推理能力，而非增加資料複雜度。

---

## Engineering Trade-offs

Representation 越完整：

優點：

- 推理品質提升
- Candidate 更穩定
- 可重複利用

缺點：

- 建立成本提高
- 更新成本增加
- 關聯維護更複雜

FIE 選擇增加 Representation 成本，換取長期推理能力。

---

## Summary

Fragment 本身只是創作者留下的證據。

Representation 則是 AI 理解這份證據的方式。

沒有 Representation，Fragment 只是文字。

有了 Representation，Fragment 才能進入推理流程。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）
✅ EXP-004 Chapter 3 Reasoning Layer（Frozen）
✅ EXP-005 Chapter 4 Fragment Intelligence（Frozen）
✅ EXP-006 Chapter 5 Fragment Representation（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-007 Chapter 6 Reasoning Pipeline（Frozen Edition）

## Background

Reasoning Pipeline 定義的不是 AI 會生成什麼，而是 AI 應如何思考。

在 FIE 中，每一個推理結果都必須來自一條可追蹤、可重現、可驗證的流程，而不是一次性的模型輸出。

Pipeline 的存在，是為了將「理解」拆解成一系列可觀察的步驟。

---

## Design Goal

Reasoning Pipeline 必須滿足四個目標：

- 將 Fragment 轉換為可推理資訊。
- 建立多個假設，而非唯一答案。
- 保存每一步推理依據。
- 將推理結果交給 Generation，而非直接生成作品。

Pipeline 不創作。

Pipeline 建立創作基礎。

---

## Pipeline Architecture

```
Fragment Collection
        │
        ▼
Representation
        │
        ▼
Observation
        │
        ▼
Hypothesis Generation
        │
        ▼
Evidence Validation
        │
        ▼
Missing Fragment Detection
        │
        ▼
Candidate Ranking
        │
        ▼
Creator Context Alignment
        │
        ▼
Generation
```

每一步都應能獨立分析、測試與替換。

---

## Stage 1：Observation

Observation 的目標只有一個：

建立事實。

例如：

```
高中
夏天
我們
宜蘭
```

Observation 不應直接推測：

「這是畢業旅行。」

它只能建立：

- 時間
- 地點
- 人物
- 關係未知

推理必須晚於觀察。

---

## Stage 2：Hypothesis Generation

Observation 完成後，系統開始建立假設。

例如：

- 畢業旅行
- 初戀
- 社團活動
- 多年後重返

此階段追求的是覆蓋率，而不是正確率。

過早淘汰假設，容易讓創意收斂。

---

## Stage 3：Evidence Validation

每個 Hypothesis 都需要回答：

- 哪些 Fragment 支持？
- 哪些 Fragment 缺失？
- 哪些 Fragment 矛盾？

Validation 的目的不是找到真相，而是提高推理可信度。

---

## Stage 4：Missing Fragment Detection

當證據不足時，系統應主動指出：

目前還需要哪些資訊？

例如：

```
高中
夏天
宜蘭
```

可能缺少：

- 人物
- 衝突
- 結局

Missing Fragment 能引導創作者補充，而不是讓 AI 自行幻想。

---

## Stage 5：Candidate Ranking

Validation 後，每個 Candidate 都會得到：

- Confidence
- Evidence Count
- Missing Count
- Creator Relevance

排序不是選出唯一答案，而是建立探索順序。

---

## Stage 6：Creator Context Alignment

最後依據 Creator Context 重新排序。

相同 Fragment，

不同創作者，

Candidate 順序可以不同。

這代表 FIE 學習的是創作習慣，而不是固定模板。

---

## Pipeline Characteristics

Reasoning Pipeline 應具備：

- Deterministic Steps
- Explainable Decisions
- Reproducible Results
- Incremental Updates
- Replaceable Components

如此才能長期演進，而不依賴單一模型。

---

## Summary

Pipeline 的價值不是增加步驟。

而是將 AI 的思考過程拆解成可理解、可驗證、可持續優化的架構。

在 FIE 中，真正可累積的不是 Prompt，而是推理流程本身。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）
✅ EXP-004 Chapter 3 Reasoning Layer（Frozen）
✅ EXP-005 Chapter 4 Fragment Intelligence（Frozen）
✅ EXP-006 Chapter 5 Fragment Representation（Frozen）
✅ EXP-007 Chapter 6 Reasoning Pipeline（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-008 Chapter 7 Multiple Narratives（Frozen Edition）

## Background

傳統生成式 AI 通常追求「最佳答案」。

然而創作並不存在唯一答案。

同一組 Fragment，可以形成數十種合理故事。

因此，FIE 不將推理視為「找答案」，而是「建立可能性空間」。

---

## Divergent Thinking

創作者真正的創作流程通常是：

```
一個想法
↓
很多可能
↓
刪除
↓
修改
↓
重組
↓
作品
```

Reasoning Layer 應模擬這種發散思考，而非一次收斂。

---

## Candidate Space

輸入：

```
高中
夏天
我們
宜蘭
```

系統不應只得到：

> 畢業旅行

而應同時建立：

- Candidate A：畢業旅行
- Candidate B：青春初戀
- Candidate C：最後一次相聚
- Candidate D：多年後返鄉
- Candidate E：平行時空重逢

每個 Candidate 都是一條可繼續推理的路徑。

---

## Candidate Structure

每個 Candidate 至少包含：

- Hypothesis
- Supporting Evidence
- Missing Fragment
- Timeline
- Emotion Curve
- Theme
- Confidence
- Creator Fitness

因此 Candidate 是「半成品故事」，不是最終作品。

---

## Candidate Evolution

Candidate 不應固定。

當新增 Fragment：

```
畢業紀念冊
```

原本第五名的 Candidate，

可能變成第一名。

因此 Candidate 必須支援持續演化，而非一次排序。

---

## Creative Freedom

AI 的責任：

建立更多合理可能。

創作者的責任：

決定哪個世界值得繼續探索。

FIE 不追求取代創作者。

FIE 擴大創作者的選擇空間。

---

## Engineering Principles

Multiple Narratives 應具備：

- Parallel Reasoning
- Independent Candidates
- Editable Branches
- Mergeable Results
- Traceable Decisions

不同 Candidate 可以彼此合併，也可以完全分離。

---

## Summary

多重敘事不是生成多篇文章。

而是保留多條推理路徑。

真正的創作價值，不在於 AI 找到唯一答案，而在於 AI 幫助創作者看見更多原本可能忽略的故事。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）
✅ EXP-004 Chapter 3 Reasoning Layer（Frozen）
✅ EXP-005 Chapter 4 Fragment Intelligence（Frozen）
✅ EXP-006 Chapter 5 Fragment Representation（Frozen）
✅ EXP-007 Chapter 6 Reasoning Pipeline（Frozen）
✅ EXP-008 Chapter 7 Multiple Narratives（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-009 Chapter 8 Creator Context（Frozen Edition）

## Background

Fragment 並不是漂浮在真空中的資料。

同一個 Fragment，放在不同創作者身上，可能會產生完全不同的推理結果。

例如：

```
凌晨三點
```

對某些創作者來說，它可能代表失眠。

對某些創作者來說，它可能代表寫程式、趕稿、便利商店、深夜告白，或一段已讀不回的記憶。

因此，FIE 不能只理解 Fragment 本身。

它還必須理解：

> 這些 Fragment 是誰留下的？

這就是 Creator Context 的必要性。

---

## Why Creator Context Exists

若沒有 Creator Context，FIE 的推理會退化成一般語意推測。

例如輸入：

```
高中
夏天
我們
宜蘭
```

系統可能根據大眾語料推理出：

- 畢業旅行
- 青春回憶
- 友情
- 初戀

這些推理合理，但不一定符合創作者。

如果創作者長期作品中常出現：

```
已讀
腳尖
凌晨三點
捷運站
奶茶
```

那同樣的 Fragment 也許更適合推理成：

> 多年後想起一段沒有說出口的喜歡。

而不是單純的畢業旅行。

Creator Context 的功能，就是讓 FIE 從「大眾合理」走向「對此創作者合理」。

---

## Creator Context Is Not Personal Data

Creator Context 不等於個人資料。

它不應主要關心：

- 年齡
- 性別
- 職業
- 地址
- 真實身份

FIE 真正需要的是創作上下文：

- 常見主題
- 常見情緒
- 常見意象
- 常見敘事節奏
- 常見人物關係
- 常見結局傾向
- 常用 Fragment 群組
- 創作者常接受或否決的 Candidate

Creator Context 描述的是：

> 創作者如何創作。

而不是：

> 創作者是誰。

這個區分非常重要，因為 FIE 的目標不是建立個人監控檔案，而是建立可被創作者控制、可被解釋、可被修正的創作上下文。

---

## Creator DNA

當 Creator Context 長期累積後，會形成 Creator DNA。

Creator DNA 不是單一標籤，而是一組創作傾向。

例如某位創作者經常使用：

```
早餐店奶茶
捷運站
已讀
凌晨三點
腳尖
宜蘭
夏天
```

FIE 不應只記住這些字詞。

它應該逐漸理解這些 Fragment 之間可能形成的創作傾向：

- 都市日常
- 暗戀
- 等待
- 錯過
- 溫柔但帶刺的情緒
- 微小物件承載巨大情感
- 日常場景中的心理轉折

Creator DNA 的價值不是限制創作者，而是讓 AI 更快進入創作者的語境。

---

## Creator Context In Reasoning

Creator Context 參與推理的方式，不是直接改寫故事。

它應該影響：

- Candidate 排序
- Theme 偏好
- Emotion Curve
- Missing Fragment 建議
- Generation Tone
- Exploration Level

例如：

同一組 Fragment：

```
高中
夏天
我們
宜蘭
```

在不同 Creator Context 下，排序可能不同。

### Creator A：青春校園取向

1. 畢業旅行
2. 友情
3. 初戀
4. 多年後重逢

### Creator B：都市遺憾取向

1. 多年後重返宜蘭
2. 沒說出口的初戀
3. 畢業前最後一次見面
4. 友情

### Creator C：懸疑奇幻取向

1. 那年夏天有一個人被大家遺忘
2. 宜蘭旅行後時間線改變
3. 高中同學多年後收到同一張照片
4. 畢業旅行

這表示 Creator Context 不創造 Fragment。

它改變 Fragment 被推理的方向。

---

## Three Reasoning Modes

為了避免 Creator DNA 讓創作者越寫越窄，FIE 應提供三種推理模式。

### 1. Familiar Mode

依照創作者既有風格推理。

適合：

- 維持品牌一致性
- 系列作品
- 熟悉風格延伸
- 商業作品穩定輸出

風險：

容易產生創作舒適圈。

---

### 2. Adjacent Mode

在創作者熟悉風格附近探索。

例如一位常寫青春遺憾的創作者，可以被引導到：

- 青春懸疑
- 青春奇幻
- 多年後重逢
- 校園群像

Adjacent Mode 是最適合長期創作成長的模式，因為它不會完全離開創作者的核心，也不會讓創作停在原地。

---

### 3. Exploratory Mode

刻意遠離創作者慣性。

適合：

- 突破卡關
- 嘗試新題材
- 建立新世界觀
- 避免 AI 把使用者困在過去風格裡

風險：

輸出可能較不符合創作者當下期待。

因此 Exploratory Mode 必須清楚標示，而不能偽裝成「最推薦」。

---

## Avoiding The Creative Echo Chamber

若 AI 長期只依照 Creator DNA 推理，會產生創作回音室效應。

也就是：

AI 越懂創作者，越可能只給創作者已經會寫的東西。

這看似貼心，其實危險。

因為創作不是只重複自己。

創作也需要偏離、冒險與更新。

因此 Creator Context 應該同時保存兩種力量：

- Consistency：保持創作者辨識度
- Expansion：推動創作者往外探索

FIE 不能只是「更懂你」。

它也應該適時問：

> 你要不要試試另一條路？

---

## Creator Feedback Loop

Creator Context 不應只靠 AI 推測。

它必須從創作者的實際選擇中更新。

例如：

- 使用者選了哪個 Candidate？
- 哪個 Candidate 被刪掉？
- 哪個 Missing Fragment 被補上？
- 生成後使用者修改了哪些句子？
- 哪些作品被保存？
- 哪些作品被發布？
- 哪些風格被反覆使用？

這些行為比單次 Prompt 更能反映創作者真正偏好。

因此 Creator Context 的更新來源應包含：

```
Fragment Usage
↓
Candidate Selection
↓
Manual Edits
↓
Saved Works
↓
Published Works
↓
Feedback
↓
Creator DNA Update
```

---

## Privacy And Control

Creator Context 涉及長期創作記憶，因此必須以創作者控制為前提。

基本原則：

1. 創作者可以查看 Creator Context。
2. 創作者可以修改錯誤推理。
3. 創作者可以刪除不想保留的記憶。
4. 創作者可以關閉特定 Context 對推理的影響。
5. 系統必須區分創作偏好與敏感個人資訊。

Creator Context 的目標是協助創作，不是收集人生。

---

## Engineering Notes

最小可行版本中，Creator Context 可以先由以下資料形成：

```json
{
  "creatorId": "creator_001",
  "commonThemes": ["青春", "遺憾", "都市日常"],
  "commonImages": ["奶茶", "捷運站", "凌晨三點"],
  "preferredNarrativeModes": ["回憶", "內心獨白", "慢節奏"],
  "candidatePreferences": {
    "familiar": 0.5,
    "adjacent": 0.35,
    "exploratory": 0.15
  },
  "negativePatterns": ["過度雞湯", "模板化青春"]
}
```

這個資料結構不需要一開始完美。

重點是讓 Reasoning Layer 能參考創作者脈絡，而不是每次都像第一次見面。

---

## Summary

Creator Context 讓 FIE 從一般推理系統，變成真正能陪伴創作者的系統。

Fragment 回答：

> 有哪些線索？

Reasoning 回答：

> 這些線索可以形成哪些故事？

Creator Context 回答：

> 對這位創作者而言，哪些故事更值得探索？

因此 Creator Context 不是附加功能。

它是 FIE 能否長期成長的關鍵。

================================================================================
Expansion Progress

Completed

✅ EXP-001 Chapter 0 Manifesto（Frozen）
✅ EXP-002 Chapter 1 Why Current AI Is Shallow（Frozen）
✅ EXP-003 Chapter 2 Fragment Philosophy（Frozen）
✅ EXP-004 Chapter 3 Reasoning Layer（Frozen）
✅ EXP-005 Chapter 4 Fragment Intelligence（Frozen）
✅ EXP-006 Chapter 5 Fragment Representation（Frozen）
✅ EXP-007 Chapter 6 Reasoning Pipeline（Frozen）
✅ EXP-008 Chapter 7 Multiple Narratives（Frozen）
✅ EXP-009 Chapter 8 Creator Context（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-010 Chapter 9 Case Study（Frozen Edition）

## Background

理論能說明方向，但無法驗證設計是否合理。

因此 FIE 必須透過實際案例展示：

同一組 Fragment 如何一步步被推理，而不是直接生成。

本章使用最簡單的四個 Fragment：

```
高中
夏天
我們
宜蘭
```

刻意保持資訊不足，以驗證 FIE 如何處理不完整記憶。

---

## Traditional AI

傳統流程：

```
Prompt
↓
LLM
↓
歌詞
```

常見輸出：

- 青春
- 陽光
- 稻田
- 未來

文字流暢，但沒有回答：

- 為什麼去宜蘭？
- 「我們」是誰？
- 夏天的重要性是什麼？

---

## FIE Pipeline

```
Raw Fragment
      ↓
Representation
      ↓
Observation
      ↓
Hypothesis
      ↓
Evidence
      ↓
Missing Fragment
      ↓
Candidate Ranking
      ↓
Creator Context
      ↓
Generation
```

Generation 被放到最後，而不是第一步。

---

## Step 1：Observation

只建立事實：

| Fragment | Observation |
|-----------|-------------|
| 高中 | 人生階段 |
| 夏天 | 時間 |
| 我們 | 至少兩人以上 |
| 宜蘭 | 地點 |

沒有任何故事推測。

---

## Step 2：Hypothesis Generation

建立多條推理：

A. 畢業旅行

B. 初戀旅行

C. 校外教學

D. 多年後重返舊地

E. 平行時空回憶

此時沒有「正確答案」。

---

## Step 3：Evidence Validation

Hypothesis A

Evidence：

- 高中 ✔
- 夏天 ✔
- 宜蘭 ✔

Missing：

- 事件
- 人物關係

Confidence：0.73

Hypothesis D

Evidence：

- 宜蘭 ✔
- 我們 ✔

Missing：

- 時間跨度

Confidence：0.61

---

## Step 4：Missing Fragment Detection

系統不幻想缺失資訊。

而是提出：

目前若新增：

- 一張照片
- 一句對話
- 一件物品

即可大幅提高推理可信度。

---

## Step 5：Creator Context

若 Creator DNA 偏好青春遺憾：

Candidate 排序：

1. 沒說出口的初戀
2. 畢業旅行
3. 多年後重逢

若 Creator DNA 偏好奇幻：

1. 平行時空
2. 時間循環
3. 青春成長

同樣 Fragment，

不同 Creator，

不同推理。

---

## Step 6：Generation

直到此時，

Generation Engine 才根據 Candidate 生成作品。

因此生成的是：

**被推理過的故事。**

不是隨機補全文字。

---

## Comparison

| 傳統 AI | FIE |
|---------|-----|
| 立即生成 | 先理解 |
| 單一路徑 | 多 Candidate |
| 黑盒 | 可追蹤 |
| Prompt 驅動 | Fragment 驅動 |
| 一次完成 | 持續演化 |

---

## Summary

Case Study 證明：

Fragment 並不是直接變成作品。

真正的流程是：

Fragment

↓

理解

↓

推理

↓

候選故事

↓

創作者決策

↓

作品

因此 FIE 建立的是創作思考流程，而不是另一個生成器。

================================================================================
Expansion Progress

Completed

✅ EXP-001
✅ EXP-002
✅ EXP-003
✅ EXP-004
✅ EXP-005
✅ EXP-006
✅ EXP-007
✅ EXP-008
✅ EXP-009
✅ EXP-010 Chapter 9 Case Study（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-011 Chapter 10 Implementation（Frozen Edition）

## Background

前面的章節定義了 Fragment、Representation、Reasoning 與 Creator Context。

本章回答另一個問題：

> 如果今天開始開發 FIE，工程上應該如何落地？

Implementation 的目的不是限制實作方式，而是定義核心架構，使不同模型、不同資料庫、不同前端都能共用相同的推理流程。

---

## Architectural Principles

FIE 採用模組化架構，而不是單一大型 Prompt。

```
Fragment Layer
      │
Representation Layer
      │
Reasoning Layer
      │
Candidate Layer
      │
Generation Layer
```

每一層都可以獨立替換，不影響其他模組。

---

## Core Components

### Fragment Store

負責保存 Fragment 與版本。

不參與推理。

---

### Representation Engine

將 Fragment 建立成可推理結構。

輸出：

- Semantic
- Context
- Relations
- Metadata

---

### Reasoning Engine

負責：

- Observation
- Hypothesis
- Evidence
- Ranking

輸出 Candidate。

---

### Creator Context Engine

管理：

- Creator DNA
- Candidate 偏好
- Exploration Mode
- 長期創作上下文

---

### Generation Engine

最後一步。

它不分析 Fragment。

它只根據 Candidate 與 Reasoning Result 生成作品。

---

## Data Flow

```
User
 ↓
Fragment Store
 ↓
Representation
 ↓
Reasoning
 ↓
Candidate
 ↓
Creator Context Alignment
 ↓
Generation
 ↓
Feedback
 ↓
Update Context
```

Feedback 應重新影響後續推理，而非只改善本次生成。

---

## Extensibility

每個 Engine 都應支援替換。

例如：

- 不同 LLM
- 不同 Embedding
- 不同 Graph Database
- 不同 Ranking Strategy

FIE 關心的是流程，而不是特定模型。

---

## Engineering Guidelines

Implementation 應遵守：

- Low Coupling
- High Cohesion
- Explainable Outputs
- Incremental Updates
- Versionable Reasoning
- Testable Components

推理必須可以被單元測試，而不是只能人工驗證。

---

## MVP Roadmap

Phase 1：

- Fragment Store
- Representation
- Candidate

Phase 2：

- Reasoning Trace
- Creator Context

Phase 3：

- Dynamic Learning
- Feedback Loop
- Multiple Reasoning Strategies

---

## Summary

FIE 不是一個模型。

它是一套可持續演進的推理架構。

模型可以更新。

Prompt 可以改變。

但 Fragment → Representation → Reasoning 的核心流程保持一致。

================================================================================
Expansion Progress

Completed

✅ EXP-001
✅ EXP-002
✅ EXP-003
✅ EXP-004
✅ EXP-005
✅ EXP-006
✅ EXP-007
✅ EXP-008
✅ EXP-009
✅ EXP-010
✅ EXP-011 Chapter 10 Implementation（Frozen）


================================================================================
EXPANSION SPRINT
================================================================================

# EXP-012 Chapter 11 Future（Frozen Edition）

## Background

FIE 的目標從來不是建立另一個歌詞生成器。

它真正想建立的是一種新的 AI 創作模式。

當 AI 能理解 Fragment、建立推理、保留候選故事並持續學習創作者之後，創作將不再只是一次性的生成，而是一個可以持續演化的過程。

---

## Beyond Content Generation

今日多數 AI 著重於：

```
Input
↓
Output
```

FIE 則希望建立：

```
Experience
↓
Fragment
↓
Knowledge
↓
Reasoning
↓
Creation
↓
Experience
```

創作形成一個循環，而不是終點。

---

## Future Evolution

### Phase 1：Fragment Intelligence

建立 Fragment、Representation 與基本推理能力。

### Phase 2：Creator Intelligence

理解創作者的長期創作脈絡與偏好。

### Phase 3：World Intelligence

理解角色、設定、世界觀與跨作品關聯。

### Phase 4：Collaborative Intelligence

AI 不再只是工具，而是共同推理的夥伴。

它提出假設、指出矛盾、提醒伏筆，而不是單純續寫文字。

---

## Cross-domain Possibilities

FIE 不局限於文學創作。

同樣的推理流程可應用於：

- 歌詞
- 小說
- 劇本
- 遊戲世界觀
- 品牌企劃
- 教材設計
- 產品規劃
- 研究筆記
- 知識管理

共同核心不是內容，而是 Fragment 與 Reasoning。

---

## Human In The Loop

FIE 不追求完全自動化。

創作者始終保留：

- 建立 Fragment
- 選擇 Candidate
- 修改推理
- 否決 AI
- 建立新的方向

AI 負責擴大可能性。

人類負責決定價值。

---

## Long-term Vision

理想狀態下，FIE 不會只記得作品。

它會逐漸理解：

- 創作者如何思考
- 為何做出某個選擇
- 哪些故事曾經被放棄
- 哪些 Fragment 持續影響不同作品

因此，AI 累積的不只是資料，而是創作歷程。

---

## Final Manifesto

Fragment 是靈感留下的證據。

Representation 是 AI 理解證據的方法。

Reasoning 是 AI 建立假設、驗證假設與探索可能性的能力。

Generation 則只是推理完成後的一種輸出形式。

FIE 不希望 AI 更快寫完作品。

FIE 希望 AI 更深刻地理解創作者。

真正值得累積的，不是 Prompt。

而是理解。

================================================================================

Expansion Sprint Complete

Completed

✅ EXP-001 Manifesto
✅ EXP-002 Why Current AI Is Shallow
✅ EXP-003 Fragment Philosophy
✅ EXP-004 Reasoning Layer
✅ EXP-005 Fragment Intelligence
✅ EXP-006 Fragment Representation
✅ EXP-007 Reasoning Pipeline
✅ EXP-008 Multiple Narratives
✅ EXP-009 Creator Context
✅ EXP-010 Case Study
✅ EXP-011 Implementation
✅ EXP-012 Future

Overall Progress：100%

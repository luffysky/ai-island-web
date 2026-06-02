# AI島後台新功能：給我一個點子

## 功能定位

「給我一個點子」不是普通筆記功能，而是 AI 島後台的靈感碎片收集與重組系統。

使用者可以把任何零散內容丟進來，例如：

* 一句想法
* 一段回憶
* 一個專案概念
* 一首歌詞
* 一個人物
* 一段對話
* 一個網址備註
* 一個未完成念頭

系統會將這些內容視為「碎片」，透過 AI 分析標籤、情緒、主題、關聯性，最後幫使用者重組成新的點子。

核心概念：

> 使用者負責收集碎片，AI 負責發現連結。

---

## 第一階段 MVP

先完成後台可用版本，不要做太複雜。

### 1. 碎片新增

建立一個頁面：

`/admin/idea-fragments`

功能：

* 新增碎片
* 查看碎片列表
* 編輯碎片
* 刪除碎片
* 搜尋碎片
* 篩選標籤

碎片欄位：

```ts
type IdeaFragment = {
  id: string
  title: string
  content: string
  tags: string[]
  mood?: string
  category?: string
  createdAt: string
  updatedAt: string
}
```

---

### 2. AI 分析碎片

新增一個按鈕：

「分析碎片」

AI 需要回傳：

```json
{
  "summary": "這個碎片的簡短摘要",
  "tags": ["青春", "創作", "咖啡", "回憶"],
  "mood": "懷舊",
  "category": "人生回憶",
  "potentialUses": ["小說素材", "品牌故事", "社群貼文"]
}
```

---

### 3. 給我一個點子

建立主按鈕：

「給我一個點子」

點擊後，系統從已儲存碎片中挑選相關內容，請 AI 產生新點子。

輸出格式：

```ts
type GeneratedIdea = {
  title: string
  summary: string
  sourceFragments: string[]
  whyItWorks: string
  nextSteps: string[]
  ideaType: "產品" | "故事" | "行銷" | "功能" | "品牌" | "歌曲" | "課程"
}
```

---

## AI Prompt 邏輯

請 AI 根據碎片產生 3～5 個新點子。

要求：

* 不要只做摘要
* 要找出碎片之間的潛在關聯
* 要能指出這個點子為什麼成立
* 要給出下一步行動
* 語氣要像創意顧問，不要像筆記軟體

Prompt 範例：

```txt
你是一個創意重組引擎。

以下是使用者長期收集的人生碎片、專案想法與靈感紀錄。

請你不要單純摘要，而是找出它們之間可能存在的深層關聯，並重組成新的產品、故事、品牌、課程或功能點子。

請輸出 3 個具體點子，每個點子包含：

1. 點子名稱
2. 點子摘要
3. 使用到哪些碎片
4. 為什麼這些碎片可以組合在一起
5. 下一步可以怎麼做

碎片如下：
{{fragments}}
```

---

## UI 建議

頁面名稱：

# 給我一個點子

副標：

> 把散落的人生碎片，變成下一個可能。

主要區塊：

1. 新增碎片
2. 碎片列表
3. AI 分析結果
4. 點子生成區

按鈕文字：

* 新增碎片
* 分析碎片
* 給我一個點子
* 儲存這個點子
* 轉成任務
* 轉成文章草稿

---

## 資料表建議

如果目前使用 Supabase，可建立兩張表。

### idea_fragments

```sql
create table idea_fragments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  tags text[] default '{}',
  mood text,
  category text,
  ai_summary text,
  potential_uses text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### generated_ideas

```sql
create table generated_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  idea_type text,
  source_fragment_ids uuid[] default '{}',
  why_it_works text,
  next_steps text[] default '{}',
  created_at timestamptz default now()
);
```

---

## 後續延伸

第二階段可加入：

* 碎片關聯圖
* 時間軸
* 標籤雲
* 每日自動推薦一個點子
* 將點子轉成任務
* 將點子轉成文章
* 將點子轉成產品企劃
* 將點子接到 AI 島任務系統
* 與「足跡流光」整合成視覺化人生星圖

---

## 核心體驗

這個功能不是讓使用者「記筆記」。

而是讓使用者感覺：

> 原來我以前隨手記下的東西，現在可以長成一個新點子。

所以請實作時保留一點生命感、創作感與探索感，不要做成冷冰冰的 CRUD 後台。

# AI 島 章節視覺生成規格書

## 設計原則

- **世界觀**：肥仔（衝鋒粉色小豬戰士）+ 菇寶（紫色蘑菇法師）+ 綠寶（綠色史萊姆 AI 精靈、戴金王冠）
- **畫風**：3D Q 版可愛、寶可夢 + 數碼寶貝 + 史萊姆等級風格
- **色調**：星空藍 + 霓虹光、有夜晚的奇幻感、發光元素
- **比例**：直式 1024×1536（適合手機分享）或 3:4

## 6 個 Stage 主視覺（每個 stage 一張、共 6 張）

複製下面 prompt 進 ChatGPT 4o 圖像 / DALL-E / Midjourney。

---

### Stage 1 — 基礎之地 🏛️（Ch01-08）
> 主題：HTML / CSS / JS / RWD 前端基礎

**Prompt**：
```
A vibrant 3D chibi RPG game scene titled "基礎之地 / Foundation Land".
A small village floating on a sunny grassland island, with stone tablets showing "HTML" "CSS" "JS" symbols.
Three chibi mascots stand in the foreground: a pink pig warrior with a wooden sword (肥仔),
a purple mushroom wizard with a magic staff (菇寶), and a green slime with a golden crown (綠寶).
Soft morning light, fresh green-cyan color palette, magical particles floating.
Pokemon-style cute illustration, isometric view, 1024x1536 portrait.
Include the title text "Stage 1 · 基礎之地" at the top in glowing fantasy font.
```

---

### Stage 2 — 互動王國 🏰（Ch09-15）
> 主題：React / Next.js / Tailwind / 狀態管理

**Prompt**：
```
A 3D chibi RPG castle scene titled "互動王國 / Interactive Kingdom".
A magnificent crystal castle floating in sky, with React-atom holograms and Next.js logos as banners.
The three mascots (pink pig warrior 肥仔, purple mushroom wizard 菇寶, green crowned slime 綠寶)
exploring the castle gates. Cyan-to-purple gradient sky, neon UI elements floating around.
Cute chibi pokemon style, isometric portrait 1024x1536.
Title "Stage 2 · 互動王國" glowing at top.
```

---

### Stage 3 — 後端深淵 ⚙️（Ch16-25）
> 主題：Node / API / Auth / 資安 / 測試

**Prompt**：
```
A 3D chibi RPG scene titled "後端深淵 / Backend Abyss".
A deep mysterious cave with glowing server racks, REST API doors, and JWT shields as decorations.
The three mascots (pink pig warrior 肥仔, purple mushroom wizard 菇寶, green crowned slime 綠寶)
brave the dungeon with torchlight. Purple-to-pink magical glow, cyber-fantasy aesthetic.
Cute chibi style, dramatic lighting, isometric portrait 1024x1536.
Title "Stage 3 · 後端深淵" glowing at top in eerie purple font.
```

---

### Stage 4 — 多語大陸 🌍（Ch26-38）
> 主題：Python / Go / Rust / DB / DevOps

**Prompt**：
```
A 3D chibi RPG world map titled "多語大陸 / Polyglot Continent".
A vast continent showing multiple kingdoms representing programming languages
(Python snake palace, Go gopher village, Rust mech tower, Docker container ship).
The three mascots (pink pig warrior 肥仔, purple mushroom wizard 菇寶, green crowned slime 綠寶)
traveling on a glowing path. Pink-to-orange sunset palette, exotic adventure feel.
Cute chibi pokemon style, isometric portrait 1024x1536.
Title "Stage 4 · 多語大陸" at top in adventurous font.
```

---

### Stage 5 — 商業港口 💼（Ch39-50）
> 主題：LINE Bot / 電商 / SaaS / 商業整合

**Prompt**：
```
A 3D chibi RPG harbor scene titled "商業港口 / Business Harbor".
A bustling port with merchant ships flying LINE Bot, e-commerce, and SaaS banners.
Trading post with golden coins, treasure chests, and contracts floating.
The three mascots (pink pig warrior 肥仔, purple mushroom wizard 菇寶, green crowned slime 綠寶)
as merchants at the dock. Orange-to-yellow sunset, prosperous warm feel.
Cute chibi pokemon style, isometric portrait 1024x1536.
Title "Stage 5 · 商業港口" at top in luxurious gold font.
```

---

### Stage 6 — AI 紀元 🤖（Ch51-60）
> 主題：AI / Prompt / Agent / RAG / MCP

**Prompt**：
```
A 3D chibi futuristic temple titled "AI 紀元 / AI Era".
A glowing crystal AI temple in the cyber sky, with holographic neural networks and AI symbols.
The three mascots (pink pig warrior 肥仔, purple mushroom wizard 菇寶, green crowned slime 綠寶)
in advanced gear, manipulating AI holograms. The green slime (綠寶) now glows brighter as the AI master.
Gold-to-emerald futuristic palette, transcendent atmosphere.
Cute chibi pokemon style, isometric portrait 1024x1536.
Title "Stage 6 · AI 紀元" at top in epic glowing font.
```

---

## 額外建議生成（選用）

### 等級徽章組（共 6 個 PNG、透明背景）

```
Set of 6 RPG game level badges for "AI Island" learning platform, isometric chibi style.
Each badge represents a different rank:
1. Novice (鐵製簡單盾牌 with sword icon, gray-silver)
2. Tool Adventurer (青銅盾牌 with wrench, bronze-blue)
3. AI Collaborator (silver shield with chat bubble, silver-cyan)
4. AI Commander (gold shield with crown, gold)
5. AI Architect (platinum shield with gears, platinum-purple)
6. AI Master (legendary shield with crystal star, rainbow-glowing)
Transparent PNG, each badge 512x512, consistent style across all 6.
```

### 5 大副本 Boss 圖（共 5 張、用於課程封面）

```
Set of 5 RPG boss creatures for AI learning game, chibi villain style:
1. 空洞文案怪 (Empty Copy Monster): wispy ghost shaped like a blank scroll
2. 模糊指令魔 (Vague Prompt Devil): foggy floating wraith holding broken commands
3. 剪輯混亂獸 (Edit Chaos Beast): tangled film-reel creature
4. 重複勞動怪 (Repetition Slime): grey clone-army slime monster
5. BUG 混沌蟲 (Bug Chaos Worm): glitchy pixel worm with red error eyes
Each on dark gradient background, 1024x1024 each, dramatic lighting, cute-scary balance.
```

---

## 使用方式

1. **拿 prompt 進 ChatGPT-5 (4o 圖像)** 或 **Midjourney v7**
2. 每張 prompt 跑 1-2 次、挑你最喜歡的
3. 命名為 `stage-1.png` ~ `stage-6.png`、放到 `public/mascot/stages/`
4. 我已準備好 `<ChapterMap>` 用、屆時換檔名即可顯示

## 不建議 60 章每章一張

- **成本太高**：MJ 一張 NT$0.5-1、60 張 = NT$30-60、品質不一致
- **視覺重複**：60 章內容差不多、圖一定會重複感
- **載入慢**：圖檔大、影響網站速度
- **6 個 Stage 圖足夠**：章節卡片用 stage 圖當背景、加章節標題 overlay 已經夠好看

如果真的要每章一張、建議：**只生 Stage 6（AI 章節）的子圖**、因為這是 AI Island 的主打、其他章節用 stage 共用圖即可。

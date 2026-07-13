# AI 島首頁改版 — 主視覺生成清單（index-img.md）

> 用途：首頁（Hybrid 版：俐落高級 Hero + 下方品牌樂趣）需要的所有圖，附生成提示詞。
> 你拿去餵 GPT / DALL·E / Midjourney 生，生完丟進 `public/mascot/`（或 `public/home/`），我再接到程式。
> 產圖順序建議照 **Tier 1 → 4**，先有 Hero 跟三夥伴就能上線。

---

## 🎯 三條鐵則（決定「高級 vs 俗」的關鍵）

1. **圖裡不准有任何文字**（不要中文標題、不要「LEVEL 1」、不要 UI 方框、不要 logo）。
   文字/卡片/標籤一律由網頁 HTML 疊上去 → 排版乾淨、之後改字不用重生圖。
   *（現在的圖之所以顯俗，就是標題跟霓虹框都燒進圖裡了。）*
2. **去背優先**：角色、模式小圖都輸出 **透明背景 PNG**；橫幅類可含深色背景。
3. **色調統一**：環境光只用品牌三色 —
   **霓虹綠 `#50fa7b`、天藍 `#8be9fd`、薰衣草紫 `#bd93f9`**，底是深藍黑 `#0a0e14`。
   角色本身保留自己的顏色（粉紅豬 / 紫菇 / 綠史萊姆），但別再加其他雜色霓虹。

---

## 🎨 共用風格區塊（STYLE BLOCK — 每張提示詞都貼在最前面）

```
Modern semi-3D game key-art, soft cel-shaded, smooth gradients, gentle subsurface glow,
Pixar-lite quality, crisp and clean, generous negative space, premium and uncluttered.
Palette: deep navy-black background (#0a0e14) with neon rim light in mint-green (#50fa7b),
sky-cyan (#8be9fd) and lavender-purple (#bd93f9). Subtle circuit / hologram motifs,
soft volumetric light, tropical-island-in-a-digital-sea vibe.
NOT flat vector, NOT photorealistic, NOT busy, NO rainbow neon overload.
```

## 🚫 共用負面提示（NEGATIVE — 每張都加）

```
no text, no letters, no words, no chinese characters, no captions, no labels,
no UI panels, no dialog boxes, no watermark, no logo, no signature,
no clutter, no busy background, no harsh rainbow neon, no jpeg artifacts, no low-res, no blur
```

## 👥 角色設定表（保持一致，別畫走樣）

| 角色 | 造型 | 個性 | 專屬色 |
|---|---|---|---|
| **肥仔 Fatzai** | Q版粉紅豬勇者，友善大眼，手持木大劍，棕色皮革冒險者護甲＋腰帶，胸口圓形徽章，深藍披風 | 衝鋒隊長·勇往直前 | 暖橘紅（角色色） |
| **菇寶 Gubao** | Q版蘑菇法師，紫色圓帽帶淡紫圓點，奶油色臉與身體，笑眼，一手全息平板（資料圖表）一手木尺法杖，紫色法袍 | 策略智囊·冷靜分析 | 紫 `#bd93f9` |
| **綠寶 Lvbao** | Q版綠色史萊姆精靈，半透明發光果凍身，閃亮大眼粉頰，小金皇冠鑲藍寶石，頭頂一根發光觸角，身旁飄浮迷你全息面板 | AI 精靈·創造無限 | 綠 `#50fa7b` |

---

# Tier 1 — 必要（先生這 4 張就能上線）

### 1. `hero-key.png` — Hero 主視覺
- **位置**：首頁最上方 Hero 右側 / 背景主圖
- **尺寸**：1600 × 1000（16:10 橫式），去背或深色透明背景皆可
- **提示詞**：
```
[STYLE BLOCK]
Three chibi mascots standing together on a small floating tropical island in a digital sea:
a pink pig knight holding a wooden greatsword (brown leather armor, blue cape),
a purple polka-dot mushroom mage holding a glowing holographic tablet and a wooden ruler-wand,
and a crowned translucent green slime sprite with a tiny gold crown and a glowing antenna.
Behind them a softly glowing portal / archway of light. Palm trees made of light,
gentle circuit patterns on the ground, floating holographic panels, deep navy starry sky.
Heroic friendly mood, cinematic soft rim light, lots of clean space around the group.
[NEGATIVE]
```

### 2. `char-fatzai.png` — 肥仔 單角色（去背）
- **位置**：吉祥物介紹區 · 卡片一
- **尺寸**：900 × 1200（3:4 直式），**透明背景 PNG**
- **提示詞**：
```
[STYLE BLOCK]
A single chibi pink pig knight mascot, full body, friendly determined expression,
holding a wooden greatsword resting on shoulder, brown leather adventurer armor with belts,
round emblem medallion on chest, dark blue cape, small brave pose.
Soft warm-orange rim glow. Centered, isolated on transparent background, clean studio lighting.
[NEGATIVE]
```

### 3. `char-gubao.png` — 菇寶 單角色（去背）
- **位置**：吉祥物介紹區 · 卡片二
- **尺寸**：900 × 1200（3:4 直式），**透明背景 PNG**
- **提示詞**：
```
[STYLE BLOCK]
A single chibi mushroom mage mascot, full body, cheerful calm smile,
purple cap with light-lavender polka dots, cream face and body,
one hand holding a glowing cyan holographic tablet with data charts,
other hand holding a wooden ruler as a wand, purple mage robe with belt.
Soft lavender-purple rim glow. Centered, isolated on transparent background.
[NEGATIVE]
```

### 4. `char-lvbao.png` — 綠寶 單角色（去背）
- **位置**：吉祥物介紹區 · 卡片三
- **尺寸**：900 × 1200（3:4 直式），**透明背景 PNG**
- **提示詞**：
```
[STYLE BLOCK]
A single chibi green slime sprite mascot, full body, translucent glowing green jelly body,
big sparkly eyes, rosy cheeks, a small gold crown with blue gems, a glowing antenna on top,
two or three tiny floating holographic mini-panels beside it. Playful clever mood.
Soft mint-green rim glow. Centered, isolated on transparent background.
[NEGATIVE]
```

---

# Tier 2 — 模式入口小圖（5 張，可選）

> 這 5 格若想更有品牌感就生這批；不生的話我先用 Lucide 線性圖示（也很乾淨）。
> 全部 **1:1 正方、去背、單一主體、對應一個品牌色**。

- **尺寸**：512 × 512，透明背景 PNG

### 5. `mode-learn.png` — 章節/學習（綠）
```
[STYLE BLOCK]
A single glowing open book with soft green code symbols floating out of it,
minimal, iconic, mint-green (#50fa7b) glow. Isolated on transparent background.
[NEGATIVE]
```
### 6. `mode-quest.png` — 程式副本/遊戲（翠綠）
```
[STYLE BLOCK]
A crossed wooden sword and a small round shield in front of a glowing pixel-style dungeon gate,
minimal iconic, emerald glow. Isolated on transparent background.
[NEGATIVE]
```
### 7. `mode-agent.png` — 分身島/AI 代理（紫）
```
[STYLE BLOCK]
A cute small friendly robot / AI clone orb with a soft face, lavender-purple (#bd93f9) glow,
minimal iconic. Isolated on transparent background.
[NEGATIVE]
```
### 8. `mode-opportunity.png` — 機會島/雷達（天藍）
```
[STYLE BLOCK]
A glowing compass merged with a radar sweep and a small trophy spark,
minimal iconic, sky-cyan (#8be9fd) glow. Isolated on transparent background.
[NEGATIVE]
```
### 9. `mode-island.png` — 3D 沉浸島嶼（綠青）
```
[STYLE BLOCK]
A tiny floating tropical island with one palm tree of light and a glowing shoreline,
minimal iconic, mint-green to cyan gradient glow. Isolated on transparent background.
[NEGATIVE]
```

---

# Tier 3 — 敘事區塊橫幅（text-free，HTML 疊字）

### 10. `stage-map.png` — 關卡地圖（StageMap）
- **位置**：關卡地圖區背景（我在上面疊 LEVEL 1–6 節點與文字）
- **尺寸**：1600 × 900（16:9 橫式），深色背景可
- **提示詞**：
```
[STYLE BLOCK]
A winding glowing path connecting six empty circular node platforms, snaking across a chain of
small floating islands in a digital sea, left-to-right journey layout, gentle depth,
soft green-cyan-purple lights marking the nodes. Leave the node circles empty (no numbers).
Wide clean composition with room for labels.
[NEGATIVE]
```

### 11. `dungeon-banner.png` — 任務副本（MissionDungeons）
- **尺寸**：1600 × 700，深色背景可
- **提示詞**：
```
[STYLE BLOCK]
A row of glowing dungeon portal gates / cave entrances floating in a digital void,
each softly lit in green, cyan or purple, mysterious inviting mood, evenly spaced,
clean empty space above for a title.
[NEGATIVE]
```

### 12. `boss-banner.png` — 陷阱魔王（TrapBosses）
- **尺寸**：1600 × 700，深色背景可
- **提示詞**：
```
[STYLE BLOCK]
A lineup of a few cute cartoon "trap monster" mini-bosses (representing beginner coding pitfalls),
friendly-menacing chibi style, each with subtle green/cyan/purple glow, spaced evenly on a dark
platform, playful not scary. Clean empty space for labels.
[NEGATIVE]
```

---

# Tier 4 — 分享 / SEO（例外：這張可含文字）

### 13. `og-home.png` — 社群分享卡（Open Graph）
- **位置**：分享到 LINE/FB/X 時的預覽縮圖（`<meta og:image>`）
- **尺寸**：**1200 × 630**（固定），深色背景
- **例外**：這張**可以**放少量文字（標題「AI 島」+ 一句 slogan），因為它就是縮圖。
- **提示詞**：
```
[STYLE BLOCK]
Hero composition: the three chibi mascots (pink pig knight, purple mushroom mage, crowned green
slime) on a floating tropical AI island with a portal of light behind them, left third kept clean
and darker for a title overlay. Cinematic, premium, social-share thumbnail.
(Optional baked title "AI 島" allowed here only.)
[NEGATIVE except allow the words "AI 島"]
```

---

## 📁 檔案落點與命名
- 角色 / 主視覺 / 橫幅 → `public/mascot/`（沿用現有資料夾，更新 `public/mascot/README.md` 對照表）
- 模式小圖 → 建議新資料夾 `public/home/mode-*.png`
- OG 圖 → `public/og-home.png`
- **命名一律照「圖片實際內容」**（README 有這條鐵則），生好告訴我檔名，我接到對應元件。

## ✅ 產完給我時附這些資訊
1. 檔名 + 對應這份清單的編號
2. 是否去背（透明 PNG）
3. 實際尺寸
> 我會負責：壓縮、接進元件、RWD、亮/暗色模式對比、alt 文字。

---

### 目前現有可重用的圖（不一定要重生）
`cover-hero.png`、`mascot-trio.png`、`adventure-map.png`、`mission-dungeons.png`、`trap-bosses.png`
— 這些「能先當 placeholder」，但都**燒了文字**、風格偏舊，建議照上面重生成 text-free 版替換。
```
```

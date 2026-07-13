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

# 🧭 方向決定（0714）：Hero 走「AI 島概念主視覺、角色退配角」
> - **Hero 不放角色** → 改成「漂浮 AI 島」概念圖（島＋神經核心＋電路光）。
>   **目前 Hero 已內建一版純 SVG/CSS 畫的概念主視覺（免圖檔、已上線）**；
>   下面 `hero-key.png` 是「想要更精緻的插畫版」時才生的**升級選項**，不急。
> - **3 隻吉祥物保留**，但移到首頁下方「夥伴介紹」區 + 寵物系統（所以 char 去背圖仍要生）。
> - 全站要不要收斂成 1 隻＝之後的獨立 rebrand，不在這次。

---

# 🌍 世界觀優先（World-first）— 首頁＝一座可往下探索的 AI 島

> 核心理念：**整個首頁是「同一座島」的不同區域**，使用者往下滑＝一步步走進 AI 島（天色從黃昏漸入夜）。
> 不是一張張互不相關的插畫。**生圖順序＝世界 → 玩法 → 角色**（角色排最後，因為世界立好就不用角色撐場）。

## 🎬 生成順序（照這個，別跳）
1. ✅ **Hero（世界）** — 黃昏漂浮 AI 島（已完成，`hero-island.png`）
2. 🗺 **Stage Map（關卡地圖）** — 一張真正的世界地圖，島1→島6 的旅程
3. 🚪 **Mission Dungeon（副本入口）** — 幾個不同 Portal（Python/React/SQL/Docker…）
4. 👹 **Trap Boss（陷阱魔王）** — Boss Collection（API Key 怪 / Null 怪 / 無限迴圈 / Merge 衝突 / SQL Injection）
5. 🐷🍄🟢 **三夥伴** — 這時才生（去背角色卡，給夥伴區＋寵物）
6. 🎨 **五個模式小圖**（可選，Lucide 也行）
7. 🌌 **AI 島夜景**（新增，見下）— 情感高潮 + CTA 收尾

## 🧭 一致性鐵則（最大風險，務必遵守）
- **Hero 這張＝世界聖經 / 錨點**。後面每一張都要看起來像**同一座島**：同調色、同畫風（電影感奇幻寫實）、同光線邏輯、同地貌（漂浮島＋瀑布＋水晶尖塔＋發光電路）。
- 生每張時：**把 `hero-island.png` 當參考圖（img2img / reference）或沿用相同 seed**，別讓每張各長各的。
- 天色隨區塊往下推移：**Hero 黃昏 → 副本 入夜 → Boss 深夜 → 夜景 星河全亮**。

## 🖥️ 全部仍是 text-free + HTML 疊層（尤其地圖）
- 圖**只給場景/底圖**，「島名、LEVEL、副本名、Boss 名、模式標題」一律**不畫進圖**、由網頁 HTML 疊。
- **Stage Map 特別重要**：text-free 底圖 → 我用 HTML 疊**互動節點**＝一張**活的進度地圖**（反映真實解鎖/目前章節/完成度、島可點擊直接進該章）。副本入口、Boss 收藏同理（可 hover、可點）。
- 這一步＝「插畫」升級成「產品」。

## 🌌（新增）`night-scene.png` — AI 島夜景（CTA 收尾）
- **位置**：首頁最下方「開始你的 AI 旅程」CTA 區背景
- **尺寸**：1920 × 1080（16:9 橫式），深色，text-free
- **提示詞**：
```
[STYLE BLOCK]
The SAME floating AI island as the hero image, but now at deep night: the sky is a rich starry
galaxy / milky way, every window and crystal spire glows, the central portal blazes with light,
waterfalls shimmer with bioluminescence, floating lanterns and drifting light particles.
The whole world feels alive and awake. Keep the lower-center calmer/darker for a CTA overlay.
Anchor to the hero island's shape and palette (same world, night version).
[NEGATIVE], no text, no UI, no characters
```

---

# 各張分鏡提示詞（內容仍有效；**順序以上面 World-first 為準，角色排最後**）

# Tier 1 — 角色去背（給「夥伴介紹」區＋寵物，World-first 中排第 5 才生）

### 1.（選配）`hero-key.png` — Hero 概念主視覺（無角色，插畫升級版）
- **位置**：Hero 右側，用來取代目前的 SVG 版（想要更有質感再生）
- **尺寸**：1400 × 1400（1:1 正方）或 1600×1000，**透明背景 PNG**
- **提示詞**：
```
[STYLE BLOCK]
A single floating tropical island hovering in a digital sea, NO characters, no creatures.
The island's grassy top glows mint-green, its underside tapers into softly glowing circuit-root
lines. Above the island floats a glowing "AI core": a small cyan orb connected by thin lines to
a few smaller nodes, forming a gentle neural/constellation network. One palm tree made of light,
faint holographic UI cards and code brackets orbiting around, concentric orbit rings,
deep navy background. Elegant, premium, minimal, iconic, plenty of empty space.
[NEGATIVE], no characters, no animals, no mascots, no faces
```

### 2. `char-fatzai.png` — 肥仔 單角色（去背）
- **位置**：首頁下方「夥伴介紹」區 · 卡片一（＋寵物系統）
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

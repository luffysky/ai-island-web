# FEATURE-01 AI 寵物伴讀

## 0. Metadata

- **版本**：v1.0 設計草案
- **狀態**：等董事長挑方向
- **動機**：使用者要求「AI 寵物伴讀」、跟綠寶/肥仔/菇寶三角色互補

## 1. 定位

- **不是 AI 導師**（綠寶/肥仔/菇寶 已負責知識問答）
- **是「陪你學」的角色**：常駐桌面、會跟學習進度產生情感連結、做出反應
- 類似 Duolingo Owl × Animal Crossing × 桌寵
- 對標 SnowRealm 既有招財 🐹

## 2. 三個落地方案（你挑）

### 方案 A：浮動桌寵（最小 MVP）

桌面右下角浮一隻 🐹 招財：
- **狀態反應**：
  - 你完成 lesson → 它跳舞、灑 confetti
  - 連續登入 → 越來越開心
  - 30 分鐘沒互動 → 打哈欠
  - Quiz 全對 → 比讚
- **點它**會說一句台詞（從預寫的 200+ 條池抽）
- **跨頁面常駐**（除 /admin、/login、/auth/callback）
- **不消耗 AI quota**（純客戶端、預設台詞）

**工時**：~6h（角色 sprite + state machine + lit pool + 浮動容器）

### 方案 B：個性化伴讀（AI 加持）

桌寵 + 真實 AI 互動：
- 寵物的每日問候、提醒、稱讚都用綠寶 API 即時產出
- 寵物會記得你的學習狀態（上次 ch5 卡很久、今天回來了）
- 跟你的章節進度連動：「你今天打算學什麼？要不要從 ch7 開始？」
- **消耗 AI quota**（要 budget 控制）

**工時**：~14h（A 基礎 + AI 整合 + 記憶 schema）

### 方案 C：寵物養成系統（重度遊戲化）

整套寵物經濟：
- 完成 lesson 給「寵物食物」、餵食提升親密度
- 親密度解鎖新台詞、新動作、新配件
- 商店：用 Z-coin 買皮膚、帽子、特效
- 寵物可進化（蛋 → 小 → 中 → 大）、進化條件跟學習進度綁
- 跨用戶可以「拜訪朋友的島」看朋友的寵物

**工時**：~3 週（schema + 商店 + 養成系統 + 跨用戶機制）

## 3. 我建議

**先做 A、確認團隊喜歡桌寵這個方向**，再考慮 B/C。

A 的最小可行版本：
1. 角色 sprite：用招財現有素材或 lucide-react / emoji 過渡
2. 狀態 enum：`idle | happy | sleepy | cheering | thinking`
3. 觸發點：
   - 路徑變化（pathname change）→ 改 state
   - 完成 lesson event（`window.dispatchEvent`）→ cheering 1.8s
   - 30 min 沒互動 → sleepy
4. 台詞池：JSON、依角色 + 狀態 + 章節分類
5. 浮動容器：`fixed bottom-24 right-6 z-40`、不擋 AI tutor + admin toolbar
6. 開關：`/settings` 內 toggle、預設開、可關

## 4. 技術細節（方案 A）

```text
src/components/pet/
├── Pet.tsx                  # 浮動容器 + state machine
├── PetSprite.tsx            # 角色繪製（emoji / sprite）
├── PetSpeech.tsx            # 對話泡泡
├── pet-lines.ts             # 台詞池（JSON）
└── pet-events.ts            # window event helpers

src/lib/
└── pet-state.ts             # localStorage 親密度、上次互動、最愛章節
```

**事件整合**：
- `ChapterView.handleComplete` → `window.dispatchEvent(new CustomEvent('lesson-complete', { detail: { xp } }))`
- `Pet.tsx` listen → state = 'cheering'
- `gamification.ts.celebrateXp` 也觸發

## 5. 與其他系統的關係

- **與綠寶**：完全分離。綠寶是 AI、寵物是 UI 飾品（方案 A）
- **與 AI tutor 浮動鈕**：寵物放左下、AI tutor 在右下、admin toolbar 在左下偏上 — 三方位不衝突
- **與 cookie banner**：寵物只在 cookie 同意後出現

## 6. 你要選哪個方案？

- A → 我做 ~6h、之後再升級
- B → ~14h、要先確認 AI quota policy（寵物對話算 admin 預算還是用戶 quota？）
- C → ~3 週、需要藝術資源（sprite / 動畫）配合

預設我做 A、你說 B 或 C 才動更大。

# 素材 / 資源使用政策（開源・免費・可商用）

AI 島是 Zeabur 部署 + 嚴格 CSP + 離線 PWA。**外部 CDN 素材會被 CSP 擋、也不利離線**，所以規則：

## 規則
1. **一律本地打包**：素材下載進 `public/`（或 `npm` 套件），不吃外部 CDN。
2. **授權只收**：CC0 / Public Domain / MIT / Apache-2.0 / OFL（字型）。**不用** CC-BY-NC、不明授權、需付費。
3. **註明出處**：用到第三方素材就在本檔「已用素材」記一筆（名稱 / 來源 / 授權）。
4. **合成優先**：能用程式生成就生成（WebAudio 音效、CSS/SVG 動畫）→ 零授權風險、零檔案、離線可用。

## 已驗證可用的免費來源（挑 CC0/免署名優先）
| 類型 | 來源 | 授權 |
|---|---|---|
| 遊戲美術 / sprite / tileset | **Kenney.nl** | CC0 |
| 像素 / roguelike tiles | Kenney「1-Bit Pack」「Tiny Dungeon」 | CC0 |
| 動畫 (Lottie JSON) | LottieFiles（篩 Free/CC0）、`/admin/lottie-settings` 已可換 | 挑 CC0 |
| 插畫 | unDraw、Open Doodles | 免費商用（unDraw 免署名）|
| 音效 / BGM | Mixkit、Pixabay、Kenney Audio | 免費商用（Kenney=CC0）|
| 圖示 | lucide-react（已用）、Tabler Icons | MIT / ISC |
| 字型 | Google Fonts（**下載 woff2 進 public，不吃 CDN**）、OFL | OFL / Apache |

## 已用素材
- **Code Quest 音效**：WebAudio 合成（`src/app/quest/[id]/QuestPlay.tsx` `sfx()`）——程式生成、無檔案、無授權問題。
- **漂流瓶海面 / 碎片宇宙**：純 CSS/SVG 自繪——無第三方素材。
- 圖示：lucide-react（MIT）。

## 之後想升級視覺時（建議）
- Code Quest 換成 **Kenney CC0 tileset + robot sprite**（打包進 `public/quest/`）→ 從 emoji 升級成像素/卡通遊戲畫面。
- 載入動畫 / 空狀態換 **Lottie CC0**。
- 首頁 / 空狀態插畫用 **unDraw**（可調品牌色）。

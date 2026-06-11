# /public/mascot — 主視覺圖清單

> ⚠️ 命名一律「依圖片實際內容」、不要憑感覺亂放。
> 改檔名 / 換圖前先看這份對照表、並同步更新引用它的元件。

這批是「**AI 島進化之路**」系列海報（P2–P10 直式）＋封面／結論／夥伴介紹。
**內容都是「成為 AI 工具高玩」**（ChatGPT / Midjourney 等），**不是**本站真正的程式教學（HTML/CSS/JS/React/Python/ML…）。日後首頁主視覺建議補上真正貼合課程的圖（見最下方）。

## 檔名 ↔ 內容 ↔ 用在哪

| 檔名 | 圖片實際內容 | 頁碼 | 首頁使用元件 |
|---|---|---|---|
| `cover-hero.png` | 封面「AI 島 高玩養成地圖」三夥伴在傳送門（直式） | 封面 | `home/Hero.tsx`（右側主圖） |
| `mascot-trio.png` | 「AI 島核心夥伴」肥仔／菇寶／綠寶（橫式） | 介紹 | `home/MascotIntro.tsx` |
| `adventure-map.png` | 「你的 AI 冒險地圖」6 大關卡 LEVEL 1–6 | P2 | `home/StageMap.tsx` |
| `skill-tree.png` | 「AI 技能樹全解鎖」6 大技能領域 | P3 | — |
| `ai-arsenal.png` | 「打造你的 AI 專屬武器庫」6 大武器類型 | P4 | — |
| `trap-bosses.png` | 「新手最容易踩的坑」五大陷阱魔王 | P5 | `home/TrapBosses.tsx` |
| `team-build.png` | 「AI 團隊組建系統」6 核心角色卡 | P6 | — |
| `mission-dungeons.png` | 「AI 任務副本系統」6 大副本 | P7 | `home/MissionDungeons.tsx`、`data/dungeons.ts`（heroImg） |
| `mindset-temple.png` | 「真正高手的思維神殿」6 大思維 | P8 | — |
| `master-awakening.png` | 「AI 高玩覺醒」5 大核心思維 | P9 | — |
| `ultimate-awakening.png` | 「AI 高玩終極覺醒」終極心法 | P10 | — |
| `conclusion.png` | 「最終結論 — 你已踏上 AI 島高玩的旅程」 | 結論 | — |
| `level-journey-map.png` | 「AI 島玩家升級地圖」蜿蜒路徑 LEVEL 1–6 | 路徑圖 | — |

`skill-tree` / `ai-arsenal` / `team-build` / `mindset-temple` / `master-awakening` /
`ultimate-awakening` / `conclusion` / `level-journey-map` 目前未掛在首頁、可自由取用
（例如做課程封面、落地頁、分享卡）。

## 之前發生什麼

檔名與內容對不上、首頁 5 區有 4 區（Hero／夥伴介紹／任務副本／陷阱魔王）顯示到錯的圖。
已依「圖片實際內容」重新命名並重新佈線。新增／替換圖時請維持本表一致。

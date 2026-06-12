# Daily Works — 2026-06-12

董事長林董（Luffy Lin）。雪鑰值班。
主題：**首頁主視覺圖正名（檔名對不上內容→重排+重佈線）→ 新增首頁圖規格 H 部份 → ch26 教學圖一張張看內容對位佈線（15 張）**。

---

## 🖼️ 首頁 mascot 主視覺圖 — 依實際內容重新命名 + 修正佈線
- 起因：`public/mascot/` 13 張海報之前沒看內容亂放、檔名與圖對不上、**首頁 5 區有 4 區顯示到錯的圖**。
- 一張張看過內容後重新命名（封面 / AI 島進化之路 P2–P10 / 結論 / 夥伴介紹）：
  - Hero 主圖：原顯示「最終結論」→ 改 `cover-hero.png`（真封面）。
  - 核心夥伴：原顯示「升級路徑地圖」→ 改 `mascot-trio.png`（肥仔/菇寶/綠寶）。
  - 任務副本：原顯示「思維神殿」→ `mission-dungeons.png` 換成真正 P7 任務副本。
  - 陷阱魔王：原顯示「AI 高玩覺醒」→ 改 `trap-bosses.png`（五大陷阱魔王）。
  - 技術地圖：`upgrade-map` → `adventure-map`（你的 AI 冒險地圖、6 大關卡）。
- 新增 `public/mascot/README.md` 對照表（檔名↔內容↔頁碼↔使用元件）、避免再亂放。
- 透過暫存資料夾做兩段式改名、避開十多個檔互換名稱的覆蓋衝突。

## 🏠 LESSON_IMAGE_SPEC 新增 H 部份 — 首頁「真正符合本站」主視覺
- 點出問題：現有 13 張海報全是「成為 AI 工具高玩」、不是本站真正教的 79 章扎實程式 → 首頁像「AI 工具推薦站」。
- 列 7 張該補的主視覺（放 `public/mascot/site/`、與舊海報分開）：技術路線圖 / 綠寶 AI 導師 / 遊戲化成長 / VS Code 實戰 / 篇章封面 / 真難點 Boss / 零基礎→接案路徑。
- 每張附寬版 paste-ready prompt（沿用 G-0 模板、單版不分深淺）、要求畫真程式碼/VS Code/XP 條、不塞 AI 工具 logo；`zero-to-job` 照「不掛保證」原則寫。

## 🎨 ch26 教學圖佈線（共 15 張、分批推）
> 流程一致：**先一張張看圖內容 → 依主題對到正確 lesson（圖檔流水號 ≠ lesson 號）→ 插在對應 `###` 段落**。只寫 dark 路徑、light 由 `LessonImage` 自動推導。改 JSON 用 load→改 content→dump（已驗證 round-trip 與原檔逐字相同）。

- **第一批（10–14 + 25–27、共 8 張）**：
  - 10 四大資料型別 → 26.3｜11 四大容器 + 25 索引取值 + 26 切片 → 26.4（List 段）｜12 List Comprehension → 26.4｜13 *args/**kwargs/lambda → 26.6｜14 with open() → 26.8｜27 for 迴圈 → 26.5。
  - 25/26/27（原本沒在 md）補進 G-1 表；comprehension 那列順手從 26.5 改 26.4。
- **第二批（15–18、共 4 張）**：
  - 15 例外處理 try/except/else/finally → 26.9｜16 OOP class→繼承→dataclass → 26.10｜17 Decorator → 26.11｜18 Generator(yield) → 26.11。
- **第三批（19–21、共 3 張）**：
  - 19 Type Hint 入門 → 26.12｜20 FastAPI 請求流程 → 26.25｜21 Pydantic v2 驗證 → 26.26。
- G-1 表 10–21 + 25–27 全標 ✅。

---

# 📋 待辦 / 提醒
- **ch26 剩餘圖**：G-1 表 22（async/DI）、23（SQLAlchemy/Alembic）、24（部署 ASGI）尚未生；林董仍在做、做好丟我我繼續對位佈線。
- **ch27–30 + 28a/28b 概念圖**：仍待生（見 G-2~G-5 + `docs/ch28ab_image_prompts.md`）。
- **首頁 H 部份 7 張**：待生圖、生好丟 `public/mascot/site/`、我把 StageMap/TrapBosses 換新圖並掛新區塊。

---

## 📦 本日 commit
`89a5eb6` mascot 圖正名 + 首頁佈線修正 ·
`c266895` 圖規格新增 H 部份（首頁主視覺 + prompt） ·
`d29b273` ch26 佈線 8 圖（10–14 / 25–27） ·
`383add3` ch26 佈線 4 圖（15–18 例外/OOP/decorator/generator） ·
`ca2dd4b` ch26 佈線 3 圖（19–21 type hint / FastAPI / Pydantic）。

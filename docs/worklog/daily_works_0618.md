# Daily Works — 2026-06-18

董事長林董（Luffy Lin）。雪鑰值班。
主題：**ch26 換圖 → Discord owner 白名單 → 學習進度系統大改（最遠到達 + 上次位置 + 捲動深度/停留/掌握 + 已完成章節複習 + 跨裝置 DB 同步）**。

---

## 🖼️ ch26 換圖（v2/v3）
- `ch26.25_index_access` v1→**v2**、`ch26.26_slicing` v2→**v3**（ch26.json 只引 `_dark_vN`、light 版由 `LessonImage` 自動換名）。
- LESSON_IMAGE_SPEC G-1 同步標 v2/v3；刪舊圖；已 `import_chapters_to_db.mjs ch26` 同步進 DB（換圖即時生效、不需部署）。
- commit `f6eada9`。

## 🔒 Discord bot owner 被擋（環境變數、非程式）
- `discord-interactions/route.ts` 的 `ownerAllowed()` 讀 `DISCORD_OWNER_USER_IDS` 白名單；`.env.local` 填的是 `1508577557354643528`，但林董真實 user_id 是 `288332635976237057`、對不上 → 被擋。
- 已把真 id 加進 `.env.local`；正式機要在 **Zeabur Variables** 補同一條再 Restart（已由林董處理完）。

## 📚 學習進度系統大改（綠寶回饋 + 全做）
綠寶（Nami）回饋：「跳到上次看的段落」應以**最遠到達**為準、不是目前停留位置（回頭複習會把進度蓋掉）。林董要全做 #1–#6。

### 資料模型（跨裝置）
- 新 migration `learning_progress_detail_migration.sql`（已跑、46/0）：
  - `reading_position`（每 user 每章）：`current_*`（上次停留）+ `furthest_*`（最遠到達），RLS own-only。
  - `lesson_engagement`（每 user 每課）：`scroll_depth`(0..1) / `dwell_ms` / `quiz_passed` / `playground_run`，RLS own-only。
  - 不加 `chapter_id BETWEEN 1 AND 60` CHECK（章節已到 79+）。
- API `GET/POST /api/me/learning-state`：身分靠 session cookie；POST 合併——furthest 只在 index 前進時更新、scroll/dwell 取 max、布林 OR。

### 前台（`reading-position.ts` 重寫成 learning-state）
- **#1 current + furthest**：`saveReadingPos` current 永遠更新、furthest 只在 `lessonIndex` 前進時寫（回頭複習不倒退）；舊 localStorage 格式自動遷移。
- **#2 捲動深度%**：`ChapterView` rAF+700ms throttle 算可見卡讀過比例、記最大值。
- **#3 掌握度**：`MiniQuizCard` 答對 / `PlaygroundCard` 跑過 → `recordEngagement` 訊號；`lessonMastery()` 推「已掌握 / 已讀完 / 讀過一些」，`LessonCard` 顯示徽章。
- **#4 停留時間**：`ChapterView` 以「目前最上方 lesson」為準累計 `dwell_ms`、切換/隱藏時結算。
- **#5 接續學習進度**：橫幅與綠寶都以 furthest 為主、標「上次學習最後的地方」；在複習前面時另給「↩ 回到上次閱讀的位置」。
- **#6 跨裝置同步**：localStorage 為離線快取，登入呼叫 `hydrateFromServer()` 跟 DB 雙向合併；改動 debounce 3s POST、切頁/關頁用 `sendBeacon` 補送。

### 綠寶面板
- 兩顆按鈕：「📍 接續學習進度（上次學習最後的地方）」+「↩ 從上次閱讀的地方繼續」（兩者不同節才出現）。
- **已完成章節下拉**：`lesson_progress ∩ /api/nav`，展開列出該章已完成的節 → 點了跳去複習。

### 順修
- 顯示 bug「LESSON LESSON 26.0」：`lesson.number` 已含「LESSON」又前綴 → 新增共用 `formatLessonNumber()`、ChapterView + AITutorWidget 去重（commit `18351b3`）。

## 🔍 推前檢查
- `tsc --noEmit` 0 錯；`npm run build` 綠。
- `audit-db-columns.mjs`：✅ 無欄位接錯；新表 `reading_position`/`lesson_engagement` 已認得為正規 public 表；`/api/me/learning-state` 接得上、255 route 全有 export。

---

# 📋 待辦 / 提醒
- 學習進度系統是 **code 修正**，要等 image build + Zeabur restart 才生效；DB 表已先建好。
- GDPR `user_settings` 既有空心、仍待定奪（建表 or 刪那行）。
- 之後可考慮把 `lesson_engagement` 的掌握度餵進章節進度條 / 推薦複習。

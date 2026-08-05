# 可編輯 Widget 首頁 — 移植計畫（port from SnowRealmSpace）

> 狀態：**規格 / 尚未動工**。此文件是把 Space 的「首頁自由拖拉編輯 widget」系統移植進 AI 島的完整實作藍圖。
> 決策紀錄：2026-08-06 使用者選「先只寫計畫 doc」。開工時照本文 Phase 順序做。
> 參考來源：Space repo `D:\SnowRealmRebirth\SnowRealmSpace`（已完整探勘，檔案路徑見附錄）。

---

## 0. 一句話

在 AI 島新增一個 **`/home` 個人可編輯儀表板**：使用者可以「編輯版面」→ 從目錄加入 widget → 拖拉/縮放/設定 → 存 DB、跨裝置同步。引擎照抄 Space（**無外部拖拉套件、只靠 zod**），把 Space 的「per-space 多租戶」改成 AI 島的 **per-user（`auth.uid()`）**。

## 1. 為什麼可以低成本移植

Space 的 widget 引擎**幾乎零外部依賴**（唯一依賴 `zod`，AI 島已有 `^3.23`）。拖拉/縮放/碰撞/鍵盤操作全是手寫純函式，可直接照抄：

| 直接照抄（幾乎不改） | 檔案（Space） |
|---|---|
| 格線數學（碰撞 `resolveCollisions`／重力 `compactLayout`／驗證／`deriveTabletFromDesktop`／`reorderByOne`） | `packages/widget-engine/src/grid.ts` |
| zod schema → 設定表單欄位自動生成 | `packages/widget-engine/src/config-fields.ts`（靠 zod v3 `_def`，AI 島 zod v3 ✓） |
| 拖拉/縮放/鍵盤操作的格線表面 | `apps/web/components/widgets/WidgetGrid.tsx` |
| 單一 widget 錯誤隔離（壞掉不拖垮整頁、連壞 3 次自停） | `apps/web/components/widgets/WidgetBoundary.tsx` |

**要重寫/改的**：租戶模型（space→user）、API context（拿掉 `X-Space-Id` header 改 `auth.uid()`）、widget 註冊表內容、feature flag、資料端點對接。

## 2. 架構總覽（AI 島版）

```
src/lib/widgets/
  grid.ts            ← 照抄 Space grid.ts（格線數學，純函式）
  config-fields.ts   ← 照抄 Space（zod → 表單欄位）
  registry.ts        ← 【重寫】WIDGET_REGISTRY：每個 widget 的 metadata + zod configSchema + 預設尺寸/config
  types.ts           ← WidgetDefinition / WidgetInstance / Position / WidgetProps
  presets.ts         ← LAYOUT_PRESETS（預設版面：daily/focus/minimal…）+ defaultLayoutItems()

src/components/widgets/
  registry.tsx       ← 【重寫】id → lazy(() => import('./impl/XxxWidget')) 元件對照 + <WidgetRenderer> + hasImplementation()
  WidgetGrid.tsx     ← 照抄（拖拉/縮放/鍵盤/mobile 上下移）
  WidgetBoundary.tsx ← 照抄（錯誤邊界）
  impl/*.tsx         ← 各 widget 實作（一檔一個）

src/app/home/
  page.tsx           ← server：讀 active layout + instances、首訪自動建預設、算可用目錄 → <HomeGrid>
  HomeGrid.tsx       ← client：editing 狀態、加入目錄、版面管理、樂觀更新 commit
  WidgetSettings.tsx ← client：從 zod schema 自動生成的設定 modal

src/app/api/
  layouts/route.ts                    GET 全部 / POST 建新（可帶 preset）
  layouts/[id]/route.ts               PATCH（改名 / activate）/ DELETE（軟刪、不可刪最後一個）
  layouts/[id]/reset/route.ts         POST 重置成預設
  layouts/[id]/widgets/route.ts       POST 加一個 widget instance（自動排到底 + 重力壓實）
  layouts/[id]/widgets/bulk/route.ts  PATCH 批次存位置（server 重新驗證尺寸/重疊、不靜默修正）
  widgets/[id]/route.ts               PATCH（config / hidden / locked）/ DELETE
  widget-definitions/route.ts         GET 目錄（feature-flag 過濾）
```

## 3. DB schema（per-user、照抄 Space 0011 改租戶）

migration `supabase/widget_homepage_migration.sql`（冪等）：

```sql
-- 版面（一個 user 可有多個命名儀表板）
create table if not exists public.widget_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '我的首頁',
  breakpoint_config jsonb not null default '{}'::jsonb,  -- 格線設定（desktop/tablet/mobile 欄數等）
  is_active boolean not null default false,               -- 取代 Space 的 spaces.active_layout_id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- 一個 user 只能有一個 active（partial unique）
create unique index if not exists uq_widget_layouts_active
  on public.widget_layouts(user_id) where is_active and deleted_at is null;

-- 已放置的 widget（一列一個）
create table if not exists public.widget_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layout_id uuid not null references public.widget_layouts(id) on delete cascade,
  widget_type text not null,                 -- 對應 TS WIDGET_REGISTRY 的 id（不做 DB FK、註冊表以 TS 為準）
  position jsonb not null default '{}'::jsonb,-- { desktop:{x,y,w,h}, tablet:{x,y,w,h}, mobile:{order} }
  config jsonb not null default '{}'::jsonb,  -- 該 widget 的 zod config + 自由鍵（bg/bgAnimate/bgOpacity…）
  hidden boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_widget_instances_layout on public.widget_instances(layout_id);

-- RLS：自己的才能讀寫
alter table public.widget_layouts enable row level security;
alter table public.widget_instances enable row level security;
create policy widget_layouts_owner on public.widget_layouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy widget_instances_owner on public.widget_instances for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> **不移植 `widget_definitions` 表**：Space 那張只是 FK target、`config_schema` 還寫成 `{}`（真 schema 在 TS）。AI 島直接以 TS `WIDGET_REGISTRY` 為唯一真相、`widget_instances.widget_type` 存字串即可，省一張表 + 一支同步腳本。

**Position JSON**（三斷點各自獨立、改一個不動另一個）：
```json
{ "desktop": {"x":0,"y":0,"w":6,"h":3},
  "tablet":  {"x":0,"y":0,"w":4,"h":3},
  "mobile":  {"order": 12} }
```
格線常數（照抄 `grid.ts`）：desktop 12 欄 / tablet 8 欄 / mobile 單欄只用 `order`；rowHeight 80、gap 16。

## 4. Widget 註冊表 + 分批清單

`WidgetDefinition`（照 Space）：`{ id, name, category, description, defaultSize, minSize, maxSize, configSchema(zod), defaultConfig, permissions?, featureFlag?, refreshPolicy }`。設定表單由 `configSchema` 自動生成（`config-fields.ts` 內省 zod：boolean/number/enum/string/date）。

### Phase A（MVP）— 免後端 widget（只靠 `widget_instances.config` + 瀏覽器）
這些**零資料端點依賴**、掉進來就能動，先做這批把引擎跑通：

| widget | 說明 | config 重點 |
|---|---|---|
| `datetime` | 時鐘 + 日期 | 12/24hr、顯示秒 |
| `world_clock` | 世界時鐘 | 時區清單 |
| `mini_calendar` | 迷你月曆 | 週起始日 |
| `countdown` | 倒數計時 | 目標日期、標題 |
| `anniversary` | 紀念日/累計天數 | 起始日、標題 |
| `todo_list` | 待辦（狀態存 config.items） | title、items[] |
| `habit_tracker` | 習慣打卡（checkins 存 config） | 習慣名、頻率 |
| `dice` | 擲骰/隨機 | 面數、顆數 |
| `breathing` | 呼吸引導動畫 | 節奏 |
| `daily_words` | 每日 AI 單字（可先用內建 365 池、無需 API） | — |
| `fortune` | 今日運勢（可接既有 `/api/cron/fortune-daily` 或內建） | — |
| `theme_switcher` | 主題/色盤切換（重用現成 ThemeToggle 邏輯） | — |
| `background_control` | 背景切換（重用現成 `/background` + `ai_bg`） | — |

> `theme_switcher`/`background_control` 在 AI 島**已有現成系統**（ThemeToggle、`/background`、`ai_bg` cookie、335 場景目錄），widget 只是包一層薄殼。

### Phase B（全套）— 需串資料端點的 widget
接 AI 島既有 API：
| widget | 接的端點（已存在或需補） |
|---|---|
| `weather` / `weather_datetime` | `/api/geolocation` + 天氣端點（/daily 天氣卡已有邏輯可抽） |
| `creative_streak`（連續學習） | streak（profiles.streak_days / `/api/me/*`） |
| `goal_tracker`（今日任務/目標） | `/api/me/learning-plan`、每日目標 |
| `daily_card`（Morning Brief） | `/api/cron/daily-brief` / `/api/agent/daily-brief` |
| `agent_message` | /agent 系統 |
| `mood_checkin` | 需補心情表 |
| `photo_frame` | 需 storage bucket + AssetPicker（已有 `backgrounds` bucket 可仿） |

> Space 27 個 widget 內有幾個是 Space 專屬（figma/canva/current_project/recent_designs/shared_messages）→ AI 島不需要，換成 AI 島語境的（章節進度、Leetcode、Z幣、寵物…）。

## 5. 編輯體驗（照抄 Space 行為）

- **編輯版面** 按鈕切 `editing` 布林 → 顯示：加入目錄（依 category 分組、未實作的 disable）、版面管理（建立/改名/刪除/重置/切換/從 preset 建）、每格齒輪設定、拖拉手把 `⠿`、縮放手把 `◢`。
- **拖拉/縮放**：`pointerdown` 設 DragState → `pointermove` 在 rAF 內算、吸附格線 → **`pointerup` 才打一次 API**。全程樂觀更新、失敗回滾。
- **鍵盤（WCAG 2.2）**：方向鍵移動、Shift+方向鍵縮放、Esc 還原、`aria-live` 播報。
- **手機**：不拖拉、改上下移排序（`mobile.order`）。
- **設定 modal**：`WidgetSettings.tsx` 用 `editableConfigFields(zodSchema)` 自動長出表單；特殊鍵（背景 `bg/bgAnimate/bgOpacity`）→ 接 AI 島現成背景場景選擇器。

## 6. Render pipeline

- `src/app/home/page.tsx`（server, `force-dynamic`）：`auth.getUser` → 讀該 user 的 active layout（`widget_layouts` where is_active）+ `widget_instances` → 首訪自動建預設版面（service role）→ 依 feature flag 算 `available` 目錄 → 傳 `initialWidgets` 給 `<HomeGrid>`。
- `<WidgetRenderer>`（client）：查 definition + `lazy` 元件 → 包 `<WidgetBoundary>` + `<Suspense>` → 選擇性疊 `<ProceduralScene>` 當 widget 背景（重用 `src/components/background/ProceduralScene.tsx`）。widget 只收 `{ userId, instanceId, config }`，**自己 client-side fetch 自己的資料**（datetime/dice 等純瀏覽器則不用）。

## 7. API（6 條，照抄 Space 改 auth）

全部 `force-dynamic`、用 `createSupabaseServer` + `auth.getUser`（401 if none）、回 `{data}`/`{error}`。**拿掉 Space 的 `X-Space-Id` header 慣例**，改用 `auth.uid()`。清單見 §2。重點：
- `layouts/[id]/widgets/bulk` PATCH：server **重新驗證尺寸 + 重疊、不靜默修正**（照 Space，防前端塞壞資料）。
- `activate`：把該 layout `is_active=true`、其餘設 false（靠 partial unique index 保證單一 active）。

## 8. 相依套件

- **只需 `zod`**（已有 `^3.23`）。**不裝** react-grid-layout / gridstack / dnd-kit / framer-motion / 任何圖表庫。
- 動畫/lottie 若某 widget 要 → 用 AI 島現成的 `dotlottie-wc`（CDN）或內建 CSS。

## 9. 整合點（AI 島特有）

- **入口**：TopNav 頭像下拉 + me 側邊欄「個人化」加「我的首頁 /home」；或把 `/home` 設成登入後可選首頁。
- **重用現成**：背景場景目錄（335 個，`src/lib/background/scenes.ts`）、`ProceduralScene`、主題引擎、`ai_bg`/`ai_theme`、`.menu-surface`。
- **`/home` vs `/daily`**：`/daily` 是固定內容的每日情報；`/home` 是使用者自由排列的個人儀表板。兩者並存（`/home` 為新增、不動 `/daily`）。

## 10. 建議 Phase 順序（開工時）

1. **P1 引擎地基**：migration（§3）+ 照抄 `grid.ts`/`config-fields.ts`/`WidgetGrid.tsx`/`WidgetBoundary.tsx` + `types.ts`。
2. **P2 註冊表 + 3 個最簡 widget**（`datetime`/`dice`/`countdown`）+ `registry.tsx` + `<WidgetRenderer>`。先讓「加入→拖拉→存 DB→重整還在」跑通。
3. **P3 編輯器**：`HomeGrid.tsx`（editing/加入目錄/版面管理/樂觀更新）+ `WidgetSettings.tsx`（zod 自動表單）+ 6 條 API。
4. **P4 補滿 Phase A widget**（§4 MVP 清單）。
5. **P5（全套）Phase B data-backed widget**（§4）+ Space 專屬換成 AI 島語境。

**驗收鐵規則**（每階段）：`tsc` / `vitest` / `next build` 綠、RWD 桌機手機都不破、RLS 只能動自己的、API↔欄位↔前端接對（無假殼）。

---

## 附錄：Space 關鍵檔案（移植對照）

- 引擎：`packages/widget-engine/src/{registry.ts,grid.ts,config-fields.ts}`
- 元件對照 + renderer：`apps/web/components/widgets/registry.tsx`
- 格線表面 / 錯誤邊界：`apps/web/components/widgets/{WidgetGrid.tsx,WidgetBoundary.tsx}`
- widget 實作：`apps/web/components/widgets/impl/*.tsx`
- 頁面 / 編輯器 / 設定：`apps/web/app/(space)/home/{page.tsx,HomeGrid.tsx,WidgetSettings.tsx}`
- 位置寫入：`apps/web/lib/api/widget-position.ts`
- API：`apps/web/app/api/{layouts,widgets,widget-definitions}/**`
- DB：`supabase/migrations/0011_layouts_widgets.sql`（+ `0062_widget_category_extend.sql`）
- 目前 27 個實作 widget（`WIDGET_REGISTRY` keys）：daily_card, surprise_box, agent_message, current_project, recent_designs, quick_note, theme_switcher, background_control, timeline_preview, focus_timer, weather, mood_checkin, goal_tracker, creative_streak, datetime, weather_datetime, anniversary, countdown, mini_calendar, world_clock, daily_words, todo_list, habit_tracker, photo_frame, breathing, dice, fortune

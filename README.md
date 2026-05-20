# 🏝️ AI 島 v2.0：Next.js + 遊戲化 + 會員 + 後台

把 AI 島從靜態 HTML 升級成完整 Next.js 應用 — 含會員系統、遊戲化引擎、後台管理、活資料 JSON 內容層。

## ✨ 這次完成的功能

### 🎯 V1 遊戲化（全做）
- XP / 等級系統（公式：`level = floor(sqrt(xp/100)) + 1`、上限 Lv 60）
- 連勝（streak）系統 + 自動更新 trigger
- 成就系統（25 個內建、common / rare / epic / legendary 4 階稀有度）
- Z-coin 經濟（註冊送 100、完成 quiz 賺）
- 5 hearts 系統（boss 戰用、答錯扣）
- Boss Battle UI（每章一隻 boss、HP bar、答對攻擊）
- Confetti / Level up modal 慶祝特效

### 🚀 V2 社群（基礎）
- 排行榜（leaderboard view + 即時更新）
- 6 大職業路線（前端 / 全端 / AI / 資料 / 接案 / Indie）
- 朋友動態（schema 已備、UI 待補）
- 每日任務（daily_quests 表已建）

### 🎬 V3 進階（schema 完整、UI 多數待補）
- 60 章節 boss 全設計（boss_name + emoji + HP + description）
- 故事 / 章節劇情可塞 markdown
- VRM 角色（雪凜 / 凜空）整合接口備好

### 🛠️ 會員系統
- Email + 密碼註冊登入
- OAuth（Google / GitHub）
- Profile 表（username / display_name / avatar / bio / xp / coins）
- 角色制（member / editor / admin）
- 完整 RLS 政策

### 👑 後台 Admin
- 站台總覽（使用者數 / 完成 lesson 數 / Quiz 嘗試 / 成就數）
- 使用者管理（角色變更 / 封鎖）
- 章節管理（編輯入口）
- 數據分析（熱門章節 / 熱門成就）
- 事件記錄

### 📚 內容
- 60 章節 JSON 化（活資料、可後台編輯）
- 31 章已發布、總共 **569+ lessons**
- Ch17 SQL：**28 lessons 高品質範本**（含 simple-intro / advanced / tips / quiz / summary / FAQ）

---

## 🚀 Quick Start

```bash
# 1. 安裝
npm install

# 2. 環境變數
cp .env.example .env.local
# 填入 Supabase URL / keys

# 3. 建 Supabase schema
# 開 Supabase Studio → SQL Editor → 貼 supabase/schema.sql 跑

# 4. 開發
npm run dev
# http://localhost:3000
```

## 📁 檔案結構

```
ai-island-next/
├── package.json          # Next.js 15 + React 19 + Supabase + Tailwind v4
├── tsconfig.json
├── next.config.mjs
├── .env.example
├── supabase/
│   └── schema.sql        # 完整 schema + RLS + trigger + 25 成就
├── scripts/
│   ├── build-chapters-meta.py    # 產生 60 章 meta
│   ├── build-ch17.py             # Ch17 高品質 28 lessons
│   └── import-existing-chapters.py # 匯入 v1 內容
└── src/
    ├── app/
    │   ├── layout.tsx            # 全站 layout + TopNav
    │   ├── page.tsx              # 首頁（hero + 60 章地圖）
    │   ├── globals.css           # Tailwind v4 + 主題
    │   ├── auth/callback/        # OAuth 回呼
    │   ├── login/                # 登入
    │   ├── signup/               # 註冊
    │   ├── dashboard/            # 個人面板
    │   ├── chapters/[id]/        # 章節閱讀頁
    │   ├── chapters/             # 章節列表
    │   ├── leaderboard/          # 排行榜
    │   ├── career/[id]/          # 職業路線詳情
    │   └── admin/                # 後台
    │       ├── layout.tsx
    │       ├── page.tsx          # 總覽
    │       ├── users/            # 使用者管理
    │       ├── chapters/         # 章節編輯
    │       └── analytics/        # 數據分析
    ├── components/
    │   ├── layout/TopNav.tsx
    │   ├── home/
    │   │   ├── Hero.tsx
    │   │   ├── ChapterMap.tsx
    │   │   └── CareerPathSection.tsx
    │   ├── chapter/
    │   │   ├── ChapterView.tsx
    │   │   ├── LessonCard.tsx
    │   │   └── BossBattle.tsx
    │   ├── dashboard/DashboardView.tsx
    │   └── gamification/
    │       ├── AchievementToast.tsx
    │       └── LevelUpModal.tsx
    ├── lib/
    │   ├── types.ts              # Chapter/Lesson/UserProfile + 6 職業
    │   ├── supabase.ts           # browser/server/admin client
    │   ├── gamification.ts       # 中央遊戲化引擎
    │   ├── content.ts            # JSON 內容讀取
    │   └── utils.ts              # cn / 顏色 / 標籤
    └── data/
        └── chapters/             # 60 章 JSON
            ├── ch01.json
            ├── ... (60 files)
            └── ch60.json
```

---

## 🎯 部署到 Vercel

```bash
# 1. 推上 GitHub
git init && git add -A && git commit -m "feat: AI 島 v2"
git push

# 2. Vercel.com → Import → 連 GitHub repo
# 3. 設環境變數（複製 .env.example 對應的）
# 4. Deploy
```

## 🛠️ 後續工作（下次對話）

### 內容
- [ ] Ch1-10 補到每章 25+ lessons（已有 16-25、補 5-10 lessons / 章）
- [ ] 撰寫剩 29 章 placeholder
- [ ] Ch26 Python 已 32 lessons、其他章節都對齊 25+

### V2 完整
- [ ] 朋友 / 公會 UI
- [ ] 每日任務自動產生 cron
- [ ] 技能樹視覺化（React Flow）

### V3 進階
- [ ] 故事模式劇情系統（YAML loader）
- [ ] VRM 雪凜 / 凜空 浮動陪讀（Three.js）
- [ ] PVP 1v1 quiz 對決（Socket.IO）
- [ ] Z-coin 商店（皮膚 / 提示卡 / 心恢復）

### 內容編輯器
- [ ] 後台 markdown 編輯器（CodeMirror / Monaco）
- [ ] 直接編輯 JSON → 寫回 Supabase content table

---

## 📊 統計

- **60 章節** 全 schema 完整
- **569+ lessons** 已活資料化
- **25 個成就** 已設計 + 入庫
- **6 個職業路線** 已規劃
- **31 章已發布**、29 章 coming-soon

---

由 SnowRealm 生態製作 · 招財 🐹 守護

-- Agent 平台 Phase 3 — 技能商店 / 使用者自建 Agent。對齊 docs/agent_platform_plan.md §11 Phase 3。
-- 一個「技能」= 預設目標框架(prompt) + 允許工具集 + 最大步數。內建(is_builtin, user_id null)或使用者自建。

create table if not exists public.agent_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,   -- null = 內建
  slug text,                                                   -- 內建唯一識別
  name text not null,
  description text,
  emoji text not null default '🤖',
  goal_template text not null default '',                      -- 附加給 planner 的任務框架/守則
  allowed_tools jsonb not null default '[]',                   -- 限制可用工具（空陣列 = 全部）
  max_steps int not null default 12,
  is_builtin bool not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_agent_skills_slug on public.agent_skills(slug) where is_builtin;
create index if not exists idx_agent_skills_user on public.agent_skills(user_id);

alter table public.agent_tasks add column if not exists skill_id uuid references public.agent_skills(id) on delete set null;

alter table public.agent_skills enable row level security;
drop policy if exists "skills read" on public.agent_skills;
create policy "skills read" on public.agent_skills for select using (is_builtin or auth.uid() = user_id);

-- 內建技能（依 slug 冪等 upsert）
insert into public.agent_skills (slug, name, description, emoji, goal_template, allowed_tools, max_steps, is_builtin) values
 ('term-tutor', '術語小老師', '解釋程式術語／黑話，查我們的辭典＋補充', '📖',
  '你是耐心的程式術語老師。先查 AI 島辭典，若不足再抓可靠網頁補充，最後用白話＋生活比喻解釋給新手聽。', '["dictionary.lookup","web.fetch"]', 8, true),
 ('web-digest', '網頁摘要員', '給網址，抓下來幫你摘要重點', '🌐',
  '你是網頁摘要助手。抓使用者給的網址，整理成 3–5 點重點＋一句總結，繁體中文。', '["web.fetch"]', 6, true),
 ('project-tester', '專案測試員', '在你電腦上跑測試、回報結果與錯誤（需桌面助手）', '🧪',
  '你是測試工程助手。到指定專案跑測試指令（如 npm test / pytest），看輸出，若失敗就摘要錯誤原因與可能修法。跑指令前一定先取得使用者確認。', '["system.run_command","filesystem.read","filesystem.list"]', 12, true),
 ('repo-doctor', '專案健檢師', 'git 狀態＋建置／測試健檢，給改善建議（需桌面助手）', '🩺',
  '你是專案健檢助手。看 git 狀態與專案結構，必要時跑 build/test，回報健康度與待改善點。任何會改動或執行的動作先確認。', '["system.run_command","filesystem.list","filesystem.read"]', 15, true),
 ('file-scout', '檔案巡檢員', '列出／讀取本機資料夾內容並回報（需桌面助手）', '📁',
  '你是檔案巡檢助手。列出使用者指定資料夾、必要時讀取檔案內容，整理成清單／摘要回報。唯讀為主，不亂改。', '["filesystem.list","filesystem.read"]', 10, true)
on conflict (slug) where is_builtin do update set
  name = excluded.name, description = excluded.description, emoji = excluded.emoji,
  goal_template = excluded.goal_template, allowed_tools = excluded.allowed_tools, max_steps = excluded.max_steps;

-- work_type 已是自由文字：創作引擎類型(novel/short_story/poem/copy)、編織中文 label(散文/詩/短篇小說…)、
-- 甚至含子類括號(「短篇小說（懸疑）」)。原本的 CHECK 白名單會擋掉這些 → 移除限制，保留 text。
ALTER TABLE public.ci_works DROP CONSTRAINT IF EXISTS ci_works_work_type_check;

-- Creator Island — ci_fragments 加 subtitle（碎片副標題，可編輯）。冪等。
ALTER TABLE public.ci_fragments ADD COLUMN IF NOT EXISTS subtitle TEXT;

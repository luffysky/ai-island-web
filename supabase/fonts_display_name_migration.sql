-- 字體中文名（Phase 5e）：後台與主題選字下拉顯示「這是什麼字體」的中文說明。
-- family 是 CSS 名（Noto Sans TC / Huninn…），display_name 是給人看的中文（思源黑體 / jf open 粉圓）。
-- 冪等、純新增。
alter table public.fonts add column if not exists display_name text;
comment on column public.fonts.display_name is '中文顯示名（給後台/選字 UI 看，如「思源黑體」「jf open 粉圓」）。null → fallback family。';

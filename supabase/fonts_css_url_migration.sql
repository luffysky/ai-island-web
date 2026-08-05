-- 字體 catalog（Phase 5d）：外部 webfont 支援。
-- Google Fonts 等有的字體不用自己找檔/上傳——存一條 CSS2 API URL、前台用 <link> 載，
-- 由供應商做 CJK 子集 + CDN 供檔。css_url 為 null 時走原本的自架 file_manifest。
-- 冪等、重跑安全。

alter table public.fonts add column if not exists css_url text;

comment on column public.fonts.css_url is
  '外部 webfont stylesheet URL（如 Google Fonts CSS2 API）。有值 → 前台用 <link> 載、忽略 file_manifest。';

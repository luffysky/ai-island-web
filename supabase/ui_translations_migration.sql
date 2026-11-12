-- 介面上還寫死在程式裡的中文，在英日韓頁面由 AutoTranslate 自動翻譯，結果存這裡全站共用。
-- 同一段文字每個語言只翻一次。簡體不用存：瀏覽器用 OpenCC 直接轉。
create table if not exists public.ui_translations (
  source_hash text not null,      -- sha256(原文) 前 32 碼
  locale      text not null,      -- en / ja / ko
  source      text not null,
  translated  text not null,
  created_at  timestamptz not null default now(),
  primary key (source_hash, locale)
);
alter table public.ui_translations enable row level security;
-- 只走 service-role（/api/i18n/ui）；不給 public policy

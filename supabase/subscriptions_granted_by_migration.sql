-- 訂閱補欄位：手動授予者（TG/Stripe webhook upsert 會寫、之前漏建）
alter table public.subscriptions add column if not exists granted_by uuid;

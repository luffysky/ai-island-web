-- 創作者提現（果實 → 真錢）：先做「人工撥款對帳」(method='manual')；
-- 之後接 Stripe Connect / 綠界藍新分潤時沿用同一張表，只換 method + 撥款實作。
create table if not exists public.ci_payouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  fruit_amount int  not null check (fruit_amount > 0),     -- 這次提領扣掉的果實
  ntd_amount   int  not null default 0,                    -- 估算/實際撥款金額(NTD)
  fee_ntd      int  not null default 0,                    -- 平台抽成/手續費(NTD)
  method       text not null default 'manual',             -- manual / stripe_connect / ecpay / newebpay
  account_name text,                                       -- 收款人姓名
  bank_name    text,                                       -- 銀行/分行
  bank_account text,                                       -- 帳號(service-role 才讀；前端顯示遮罩)
  status       text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_note   text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null
);
create index if not exists idx_ci_payouts_status on public.ci_payouts(status, requested_at);
create index if not exists idx_ci_payouts_user   on public.ci_payouts(user_id, requested_at desc);

alter table public.ci_payouts enable row level security;
-- 建立/撥款都走 service-role(API 層授權)；使用者只能「讀自己的」提領紀錄
drop policy if exists ci_payouts_own_read on public.ci_payouts;
create policy ci_payouts_own_read on public.ci_payouts for select using (user_id = auth.uid());

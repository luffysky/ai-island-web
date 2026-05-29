-- Stripe 訂閱付款 schema
-- 3 張表：stripe_customers / stripe_subscriptions / webhook_events
-- 訂閱成功 webhook → 自動 update subscriptions（既有表）+ 觸發 Discord role assign

-- 1) Stripe customer mapping（一個 user_id 對一個 Stripe customer_id）
create table if not exists stripe_customers (
  user_id uuid primary key references profiles(id) on delete cascade,
  stripe_customer_id text unique not null,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists stripe_customers_customer_idx on stripe_customers (stripe_customer_id);

-- 2) Stripe subscription detail（webhook 寫入、UI 從這查狀態）
create table if not exists stripe_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid references profiles(id) on delete set null,
  stripe_customer_id text not null,
  status text not null,                      -- active / past_due / canceled / trialing / incomplete
  price_id text,                              -- Stripe price object id
  plan text,                                  -- monthly / yearly / single
  amount_cents int,
  currency text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,                     -- 排程取消時間
  canceled_at timestamptz,
  trial_end timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists stripe_subs_user_idx on stripe_subscriptions (user_id);
create index if not exists stripe_subs_status_idx on stripe_subscriptions (status);
create index if not exists stripe_subs_period_end_idx on stripe_subscriptions (current_period_end);

-- 3) Webhook event log（idempotency + audit）
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                       -- 'stripe' / 'newebpay' / 'discord'
  event_id text not null,                     -- Stripe 的 evt_xxx、newebpay 的 trade_no
  event_type text,
  raw jsonb,
  processed_at timestamptz,
  error text,
  created_at timestamptz default now()
);

create unique index if not exists webhook_events_dedup_idx on webhook_events (source, event_id);
create index if not exists webhook_events_created_idx on webhook_events (created_at desc);

-- RLS：全部 service_role only（不開 user 政策）
alter table stripe_customers enable row level security;
alter table stripe_subscriptions enable row level security;
alter table webhook_events enable row level security;

-- user 可查自己的訂閱狀態（給 /me/subscriptions 之類用）
drop policy if exists "user reads own stripe sub" on stripe_subscriptions;
create policy "user reads own stripe sub" on stripe_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "user reads own stripe customer" on stripe_customers;
create policy "user reads own stripe customer" on stripe_customers for select using (auth.uid() = user_id);

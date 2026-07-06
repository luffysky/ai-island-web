-- 可販售筆記（知識變現）：把一組筆記打包成商品，用 Z 幣買賣（平台抽成 0%）
create table if not exists public.note_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  price_z int not null check (price_z >= 0 and price_z <= 100000),
  note_ids uuid[] not null default '{}',
  sales int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_note_products_seller on public.note_products(seller_id);
create index if not exists idx_note_products_active on public.note_products(is_active, created_at desc);

create table if not exists public.note_product_purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.note_products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  price_z int not null,
  created_at timestamptz not null default now(),
  unique(product_id, buyer_id)
);
create index if not exists idx_note_purchases_buyer on public.note_product_purchases(buyer_id);

alter table public.note_products enable row level security;
alter table public.note_product_purchases enable row level security;

drop policy if exists note_products_read on public.note_products;
create policy note_products_read on public.note_products for select using (is_active = true or seller_id = auth.uid());
drop policy if exists note_products_own on public.note_products;
create policy note_products_own on public.note_products for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists note_purchases_read on public.note_product_purchases;
create policy note_purchases_read on public.note_product_purchases for select
  using (buyer_id = auth.uid() or exists (select 1 from public.note_products p where p.id = product_id and p.seller_id = auth.uid()));

-- 購買 RPC（原子）：扣買方 z_coin → 加賣方 z_coin → 記交易 → sales+1。抽成 0%。
create or replace function public.buy_note_product(p_product uuid, p_buyer uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_price int; v_active boolean; v_bal int;
begin
  select seller_id, price_z, is_active into v_seller, v_price, v_active from public.note_products where id = p_product for update;
  if v_seller is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not v_active then return jsonb_build_object('ok', false, 'error', 'inactive'); end if;
  if v_seller = p_buyer then return jsonb_build_object('ok', false, 'error', 'own_product'); end if;
  if exists (select 1 from public.note_product_purchases where product_id = p_product and buyer_id = p_buyer) then
    return jsonb_build_object('ok', true, 'already_owned', true);
  end if;
  select z_coin into v_bal from public.profiles where id = p_buyer for update;
  if v_bal is null or v_bal < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_funds', 'balance', coalesce(v_bal,0), 'need', v_price);
  end if;
  update public.profiles set z_coin = z_coin - v_price where id = p_buyer;
  insert into public.coin_transactions(user_id, amount, balance_after, reason, meta)
    values (p_buyer, -v_price, v_bal - v_price, 'note_product_purchase', jsonb_build_object('product', p_product));
  if v_price > 0 then
    update public.profiles set z_coin = z_coin + v_price where id = v_seller;
    insert into public.coin_transactions(user_id, amount, balance_after, reason, meta)
      select v_seller, v_price, z_coin, 'note_product_sale', jsonb_build_object('product', p_product, 'buyer', p_buyer) from public.profiles where id = v_seller;
  end if;
  insert into public.note_product_purchases(product_id, buyer_id, price_z) values (p_product, p_buyer, v_price);
  update public.note_products set sales = sales + 1 where id = p_product;
  return jsonb_build_object('ok', true, 'spent', v_price);
end; $$;
revoke all on function public.buy_note_product(uuid, uuid) from public;
grant execute on function public.buy_note_product(uuid, uuid) to service_role;

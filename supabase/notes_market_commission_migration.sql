-- 筆記市集抽成：平台抽 10%、作者拿 90%（原本是 0 抽成、作者拿全額）。
-- 買方仍付全額 price_z；作者實收 floor(price_z * 0.9)；差額 10% = 平台費（不入任何帳＝平台在 Z 幣經濟中的收入）。
-- 冪等：create or replace，可安全重跑。
create or replace function public.buy_note_product(p_product uuid, p_buyer uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_price int; v_active boolean; v_bal int; v_cut int;
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
    v_cut := floor(v_price * 0.9);   -- 作者拿 9 成、平台抽 1 成
    if v_cut > 0 then
      update public.profiles set z_coin = z_coin + v_cut where id = v_seller;
      insert into public.coin_transactions(user_id, amount, balance_after, reason, meta)
        select v_seller, v_cut, z_coin, 'note_product_sale', jsonb_build_object('product', p_product, 'buyer', p_buyer, 'gross', v_price, 'fee_pct', 10) from public.profiles where id = v_seller;
    end if;
  end if;
  insert into public.note_product_purchases(product_id, buyer_id, price_z) values (p_product, p_buyer, v_price);
  update public.note_products set sales = sales + 1 where id = p_product;
  return jsonb_build_object('ok', true, 'spent', v_price, 'seller_got', coalesce(v_cut, 0));
end; $$;
revoke all on function public.buy_note_product(uuid, uuid) from public;
grant execute on function public.buy_note_product(uuid, uuid) to service_role;

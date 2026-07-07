-- 筆記市集：購買後把整包筆記「複製一份」進買家的「我的筆記」（可自己編輯）。
-- - 複製保留 chapter_id / lesson_id / title / content / category / color（便利貼色與章節關聯都帶著走）。
-- - is_public = false（自己的私人副本）、標 tag 'from:<product>' 方便追蹤 + 冪等（不重複複製）。
-- - 已購買者再打也會「補發」缺的副本（idempotent），不會重扣幣。
-- 沿用 90/10 分潤與各種防呆；只加最後的複製動作。
CREATE OR REPLACE FUNCTION public.buy_note_product(p_product uuid, p_buyer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_seller uuid; v_price int; v_active boolean; v_bal int; v_cut int; v_copied int;
begin
  select seller_id, price_z, is_active into v_seller, v_price, v_active from public.note_products where id = p_product for update;
  if v_seller is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not v_active then return jsonb_build_object('ok', false, 'error', 'inactive'); end if;
  if v_seller = p_buyer then return jsonb_build_object('ok', false, 'error', 'own_product'); end if;

  -- 已買過 → 不重扣幣，但「補發」還沒複製到的筆記（冪等）
  if exists (select 1 from public.note_product_purchases where product_id = p_product and buyer_id = p_buyer) then
    insert into public.notes (user_id, chapter_id, lesson_id, title, content, category, tags, color, is_public)
    select p_buyer, n.chapter_id, n.lesson_id, n.title, n.content, n.category,
           coalesce(n.tags, '{}'::text[]) || array['購買', 'from:' || p_product::text], n.color, false
    from public.notes n
    join public.note_products np on np.id = p_product
    where n.id = any(np.note_ids)
      and not exists (select 1 from public.notes m where m.user_id = p_buyer and ('from:' || p_product::text) = any(m.tags) and m.title is not distinct from n.title);
    get diagnostics v_copied = row_count;
    return jsonb_build_object('ok', true, 'already_owned', true, 'copied', v_copied);
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

  -- 複製整包筆記進買家的「我的筆記」（保留章節關聯與便利貼色）
  insert into public.notes (user_id, chapter_id, lesson_id, title, content, category, tags, color, is_public)
  select p_buyer, n.chapter_id, n.lesson_id, n.title, n.content, n.category,
         coalesce(n.tags, '{}'::text[]) || array['購買', 'from:' || p_product::text], n.color, false
  from public.notes n
  join public.note_products np on np.id = p_product
  where n.id = any(np.note_ids);
  get diagnostics v_copied = row_count;

  return jsonb_build_object('ok', true, 'spent', v_price, 'seller_got', coalesce(v_cut, 0), 'copied', v_copied);
end; $function$;

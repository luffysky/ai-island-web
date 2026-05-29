-- 4 隻寵物 Lottie URL slot — 林董要求把 emoji 換成 Lottie 動畫
-- 林董：去 /admin/lottie-settings 填 4 個 URL、即時生效、不用改 code
-- 沒填的會自動 fallback 回 emoji（無感降級）

insert into app_settings (key, value, description) values
  ('pet_lottie_hamster_url', 'null'::jsonb, '🐹 倉鼠寵物 Lottie URL (.lottie / .json)、建議 hamster running / kawaii hamster'),
  ('pet_lottie_cat_url',     'null'::jsonb, '🐱 貓寵物 Lottie URL、建議 anime cat / kawaii cat'),
  ('pet_lottie_dog_url',     'null'::jsonb, '🐶 狗寵物 Lottie URL、建議 shiba inu / kawaii dog'),
  ('pet_lottie_rabbit_url',  'null'::jsonb, '🐰 兔子寵物 Lottie URL、建議 bunny hopping / kawaii rabbit')
on conflict (key) do nothing;

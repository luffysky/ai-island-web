-- Additive: user_api_keys.metadata jsonb
-- 存 BYOK 額外資訊：
--   masked   → key 遮罩顯示（sk-ant...abcd），列表用、不解密原文
--   base_url → 自訂 / OpenAI 相容端點的 base URL（僅 provider=custom）
--   model    → 自訂端點的模型名（僅 provider=custom）
-- 標準 provider 只用 masked、其餘欄位忽略。
alter table user_api_keys
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- TRUE multi-key：允許同一 user 對同一 provider 存多把 key（各自 label）。
-- 舊的 UNIQUE (user_id, provider) 會擋掉、必須移除（POST 已改成 insert 新 row、不再 upsert）。
alter table user_api_keys
  drop constraint if exists user_api_keys_user_id_provider_key;

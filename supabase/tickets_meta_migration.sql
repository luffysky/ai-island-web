-- ============================================================
-- Tickets meta + body 欄位補丁
-- 為什麼：
--   - 原 schema：tickets 沒 meta、ticket_messages 用 sender_id/sender_type/content
--   - 程式碼期待：tickets.meta (放 LINE 來源 / lineUserId)、ticket_messages.body / is_staff / meta
--   - 不對齊 → LINE webhook insert 失敗、ticket 沒進 DB、CRM 空
--
-- 此 migration：
--   1. tickets ADD COLUMN meta JSONB
--   2. ticket_messages ADD COLUMN meta JSONB
--   3. ticket_messages ADD COLUMN body TEXT (alias to content、做 backfill)
--   4. ticket_messages ADD COLUMN is_staff BOOLEAN (從 sender_type 推導)
--   5. ticket_messages ADD COLUMN author_id UUID (alias to sender_id)
--   6. ticket_messages ADD COLUMN author_type TEXT (alias to sender_type)
-- ============================================================

-- tickets.meta
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- ticket_messages: 補欄位
ALTER TABLE public.ticket_messages
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS author_type TEXT;

-- 把舊資料的 content / sender_* 同步到新欄位
UPDATE public.ticket_messages
SET body = content
WHERE body IS NULL AND content IS NOT NULL;

UPDATE public.ticket_messages
SET author_id = sender_id
WHERE author_id IS NULL AND sender_id IS NOT NULL;

UPDATE public.ticket_messages
SET author_type = sender_type
WHERE author_type IS NULL AND sender_type IS NOT NULL;

UPDATE public.ticket_messages
SET is_staff = (sender_type IN ('admin', 'staff', 'teacher', 'assistant'))
WHERE sender_type IS NOT NULL;

-- 為了讓 NOT NULL content 不擋未來的 insert（既有 code 寫 body 不寫 content）
-- 改成允許 null、但用 trigger 自動 sync
ALTER TABLE public.ticket_messages
  ALTER COLUMN content DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_ticket_message_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- body <-> content
  IF NEW.body IS NULL AND NEW.content IS NOT NULL THEN
    NEW.body := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.body IS NOT NULL THEN
    NEW.content := NEW.body;
  END IF;

  -- author_* <-> sender_*
  IF NEW.author_id IS NULL AND NEW.sender_id IS NOT NULL THEN
    NEW.author_id := NEW.sender_id;
  ELSIF NEW.sender_id IS NULL AND NEW.author_id IS NOT NULL THEN
    NEW.sender_id := NEW.author_id;
  END IF;

  IF NEW.author_type IS NULL AND NEW.sender_type IS NOT NULL THEN
    NEW.author_type := NEW.sender_type;
  ELSIF NEW.sender_type IS NULL AND NEW.author_type IS NOT NULL THEN
    NEW.sender_type := NEW.author_type;
  END IF;

  -- is_staff 推導
  IF NEW.is_staff IS NULL THEN
    NEW.is_staff := (COALESCE(NEW.author_type, NEW.sender_type) IN ('admin', 'staff', 'teacher', 'assistant'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_ticket_message_fields_trigger ON public.ticket_messages;
CREATE TRIGGER sync_ticket_message_fields_trigger
  BEFORE INSERT OR UPDATE ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.sync_ticket_message_fields();

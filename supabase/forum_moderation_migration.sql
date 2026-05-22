-- Forum moderation fields. Threads already had is_pinned / is_featured /
-- is_locked. Add is_hidden + moderated_by + moderated_at for both threads
-- and replies so we can soft-delete and track who acted.

ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

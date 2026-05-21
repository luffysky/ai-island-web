-- Allow SideNav free-form notes that are not attached to a chapter/lesson.
ALTER TABLE public.notes
  ALTER COLUMN chapter_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON public.notes(user_id, updated_at DESC);

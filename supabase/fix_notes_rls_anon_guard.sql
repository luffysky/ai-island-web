-- 修：notes 的協作者 RLS 政策呼叫 is_note_collaborator / is_note_editor，
-- 但 secdef_function_grants_migration.sql 已 REVOKE anon 的 EXECUTE。
-- 結果：未登入 / session 未水合 時讀 notes 會直接
--   ERROR：permission denied for function is_note_collaborator
-- 連帶讓側邊欄「筆記」整個讀不到（同一查詢硬錯誤、owner 政策也救不了）。
--
-- 為什麼 CASE 包不住：Postgres 對「政策內引用的函式」會檢查角色的 EXECUTE
-- 權限，不因 CASE 短路而跳過。所以 anon 只要這條政策還引用該函式就會錯。
--
-- 正解：把「協作者」政策限定 TO authenticated。
--   - anon：根本不套用這兩條政策 → 不引用 definer 函式 → 不再硬錯，
--           只會走 notes_select（is_public OR 自己的）→ 安全回空。
--   - authenticated：照常套用（該角色有 EXECUTE）、協作分享功能不變。
--   - 保留 secdef 收緊（anon 仍無 EXECUTE）、不重開 Supabase 警告。

drop policy if exists notes_select_shared on public.notes;
create policy notes_select_shared on public.notes
  for select to authenticated using (
    public.is_note_collaborator(id, auth.uid())
  );

drop policy if exists notes_update_shared on public.notes;
create policy notes_update_shared on public.notes
  for update to authenticated using (
    public.is_note_editor(id, auth.uid())
  ) with check (
    public.is_note_editor(id, auth.uid())
  );

-- 驗證：anon 讀 notes 應「回空、不報錯」；登入者照常讀到自己 + public + 被分享的。

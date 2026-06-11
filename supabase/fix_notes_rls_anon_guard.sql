-- 修：notes 的協作者 RLS 政策呼叫 is_note_collaborator / is_note_editor，
-- 但 secdef_function_grants_migration.sql 已 REVOKE anon 的 EXECUTE。
-- 結果：任何「未登入 / session 尚未水合」的情境讀 notes 會直接
--   ERROR：permission denied for function is_note_collaborator
-- 連帶讓側邊欄「筆記」整個讀不到（owner 政策也救不了、因為是硬錯誤）。
--
-- 修法：用 CASE 包住、auth.uid() 為 null（anon）時直接回 false、
--       「不呼叫」definer 函式 → 不觸發 EXECUTE 權限檢查 → 不再硬錯。
--       登入者（authenticated 有 EXECUTE）行為完全不變、協作分享照常。
--       anon 仍「無法執行該函式」（保留 secdef 收緊、不重開 Supabase 警告）。

-- SELECT：協作者可讀（登入才評估函式）
drop policy if exists notes_select_shared on public.notes;
create policy notes_select_shared on public.notes for select using (
  case
    when auth.uid() is null then false
    else public.is_note_collaborator(notes.id, auth.uid())
  end
);

-- UPDATE：editor 角色可改（登入才評估函式）
drop policy if exists notes_update_shared on public.notes;
create policy notes_update_shared on public.notes for update using (
  case
    when auth.uid() is null then false
    else public.is_note_editor(notes.id, auth.uid())
  end
) with check (
  case
    when auth.uid() is null then false
    else public.is_note_editor(notes.id, auth.uid())
  end
);

-- 驗證（套用後）：用 anon 讀 notes 應「回空、不報錯」；登入者照常讀到自己 + 被分享的。

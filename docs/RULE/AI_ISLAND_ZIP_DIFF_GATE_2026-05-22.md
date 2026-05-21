# AI Island Zip Diff Gate Report

日期: 2026-05-22
Gate Owner: 玄樞
Zip: `ai_island_v3.zip`

## A. 盤點摘要

本次對 zip 做只讀內容級盤點，沒有解壓覆蓋目前專案。

比對結果：

- zip 內檔案：299
- 同名但內容不同：13
- zip-only：60
- local-only：3

Auth/session 基線檔案已逐一雜湊確認，zip 與當前 repo 相同：

- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/app/auth/callback/CallbackHashHandler.tsx`
- `src/app/auth/line/callback/route.ts`
- `src/app/api/auth/ensure-profile/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/lib/supabase-browser.ts`
- `src/lib/supabase-server.ts`
- `src/lib/supabase-admin.ts`
- `src/lib/supabase.ts`

判定：zip 沒有帶舊版登入 bug；登入修復基線與目前 repo 一致。

## B. 同名差異檔內容判定

### 1. `package.json` / `package-lock.json`

zip 新增 TipTap 編輯器依賴：

- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/pm`
- `@tiptap/extension-*`
- `lowlight`

用途：部落格 / 討論區 rich text editor。

Gate: `NEEDS REVIEW`

原因：需配合 blog/forum editor 一起移植，不能只改 package。

### 2. `src/app/admin/users/UserRow.tsx`

zip 新增 AI 無限額度 UI：

- `ai_unlimited` 狀態
- `Sparkles` icon
- 呼叫 `/api/admin/users/ai-unlimited`

Gate: `NEEDS REVIEW`

原因：依賴 `profiles.ai_unlimited*` migration、admin API、audit log。

### 3. `src/app/api/ai/chat/route.ts`

zip 新增：

- `import { hasAiUnlimited } from "@/lib/ai-privilege"`
- admin 或 `ai_unlimited` 使用者跳過 `consume_ai_quota`

Gate: `NEEDS REVIEW`

原因：這是 quota/billing 行為變更，必須連同 `ai_unlimited_migration.sql`、admin UI、audit route 一起 gate。

### 4. `src/app/api/og/chapter/[id]/route.tsx`

zip 有內容差異，屬 OG 圖產生邏輯調整。

Gate: `READY TO PORT` after visual/build check

原因：不涉及 auth/RLS，但需要確認 OG route build 與圖片輸出。

### 5. `src/app/courses/[slug]/page.tsx`

zip 有副本頁 metadata / dungeon 內容調整。

Gate: `READY TO PORT` after page check

原因：主要是內容/SEO 層，不涉及 DB。

### 6. `src/app/me/layout.tsx`

zip 新增「我的部落格」入口：

- `PenLine`
- `/me/blog`

Gate: `READY TO PORT` only after blog pages exist

原因：單獨搬會產生 dead link。

### 7. `src/app/sitemap.ts`

zip 新增 blog/forum URL 到 sitemap。

Gate: `READY TO PORT` only after routes exist

原因：單獨搬會把不存在 route 放進 sitemap。

### 8. `src/components/chapter/ChapterView.tsx`

zip 新增：

- `XpToast`
- 完成 lesson 後顯示 XP toast
- 已完成 lesson 不重複播放獎勵動畫

Gate: `READY TO PORT`

原因：只改前端動畫，不改 DB 記帳語意；但需同時新增 `XpToast.tsx`。

### 9. `src/components/dashboard/DashboardView.tsx`

zip 新增：

- `DailyCheckin`
- dashboard 顯示每日簽到卡

Gate: `NEEDS REVIEW`

原因：依賴 `checkin_migration.sql` 的 `do_checkin` / `get_checkin_status` RPC。

### 10. `src/components/layout/TopNav.tsx`

zip 新增：

- `/forum` 導航入口

Gate: `READY TO PORT` only after forum routes exist

原因：單獨搬會產生 dead link。

### 11. `src/lib/gamification.ts`

zip 修改：

- `celebrateXp()` 從「50 XP 以上才 confetti」改成任何 XP 都有小動畫。

Gate: `READY TO PORT`

原因：純前端慶祝效果，不改 XP 寫入。

## C. Zip-only 檔案內容分組

### Blog API / Pages / Components

API routes:

- `src/app/api/blog/[userSlug]/[articleSlug]/comments/route.ts`
- `src/app/api/blog/[userSlug]/[articleSlug]/reactions/route.ts`
- `src/app/api/blog/[userSlug]/subscribe/route.ts`
- `src/app/api/blog/ai-write/route.ts`
- `src/app/api/blog/articles/[id]/route.ts`
- `src/app/api/blog/articles/route.ts`
- `src/app/api/blog/comment-like/route.ts`
- `src/app/api/blog/search/route.ts`
- `src/app/api/blog/series/route.ts`
- `src/app/api/blog/settings/route.ts`
- `src/app/api/blog/unsubscribe/route.ts`

Pages:

- `src/app/blogs/[userSlug]/[articleSlug]/page.tsx`
- `src/app/blogs/[userSlug]/feed.xml/route.ts`
- `src/app/blogs/[userSlug]/page.tsx`
- `src/app/blogs/page.tsx`
- `src/app/blogs/unsubscribe/page.tsx`
- `src/app/me/blog/edit/[id]/page.tsx`
- `src/app/me/blog/new/page.tsx`
- `src/app/me/blog/page.tsx`
- `src/app/me/blog/settings/page.tsx`

Components/libs:

- `src/components/blog/AiWriteHelper.tsx`
- `src/components/blog/ArticleEditorForm.tsx`
- `src/components/blog/BlogEditor.tsx`
- `src/components/blog/BlogViewTracker.tsx`
- `src/components/blog/CommentSection.tsx`
- `src/components/blog/LikeButton.tsx`
- `src/components/blog/ReactionBar.tsx`
- `src/components/blog/SubscribeForm.tsx`
- `src/lib/blog-resolve.ts`
- `src/lib/blog-types.ts`

Dependencies:

- `supabase/blog_migration.sql`
- `supabase/comment_likes_migration.sql`
- TipTap packages

Content findings:

- Article/thread content is TipTap HTML.
- Public article page renders with `dangerouslySetInnerHTML`.
- Blog comments validate length but allow public insert in DB policy.
- Blog reactions use browser fingerprint, not auth.
- Blog subscribers can be inserted publicly.
- `blog_migration.sql` includes public insert policies and public reaction delete policy:
  - `blog_comments_insert FOR INSERT WITH CHECK (true)`
  - `blog_reactions_insert FOR INSERT WITH CHECK (true)`
  - `blog_reactions_delete FOR DELETE USING (true)`
  - `blog_subscribers_insert FOR INSERT WITH CHECK (true)`

Gate: `NEEDS REVIEW`

Required before port:

1. Add HTML sanitization for TipTap output or sanitize before rendering.
2. Add rate limit / spam protection for comments, reactions, subscribe.
3. Revisit `blog_reactions_delete FOR DELETE USING (true)`.
4. Confirm anonymous comments/subscribers are intended.
5. Apply migrations before route/UI import.

### Forum API / Pages / Components

API routes:

- `src/app/api/forum/boards/route.ts`
- `src/app/api/forum/reply-like/route.ts`
- `src/app/api/forum/search/route.ts`
- `src/app/api/forum/threads/[id]/reactions/route.ts`
- `src/app/api/forum/threads/[id]/replies/route.ts`
- `src/app/api/forum/threads/[id]/route.ts`
- `src/app/api/forum/threads/route.ts`
- `src/app/api/forum/user/[userId]/route.ts`

Pages:

- `src/app/forum/[boardSlug]/page.tsx`
- `src/app/forum/new/page.tsx`
- `src/app/forum/page.tsx`
- `src/app/forum/thread/[id]/page.tsx`
- `src/app/forum/user/[userId]/page.tsx`

Components/libs:

- `src/components/forum/ForumSearch.tsx`
- `src/components/forum/ThreadList.tsx`
- `src/components/forum/ThreadReactionBar.tsx`
- `src/components/forum/ThreadReplies.tsx`
- `src/components/forum/ThreadViewTracker.tsx`
- `src/lib/forum-types.ts`
- `src/lib/forum-xp.ts`

Dependencies:

- `supabase/forum_migration.sql`
- `supabase/comment_likes_migration.sql`
- TipTap packages

Content findings:

- Forum thread content is TipTap HTML.
- Thread page renders with `dangerouslySetInnerHTML`.
- Thread/reply creation requires auth.
- Forum XP is awarded server-side through `awardForumXp()`.
- Admin actions can feature threads and accept answers, affecting XP.
- Board `post_role` is checked before creating thread.

Gate: `NEEDS REVIEW`

Required before port:

1. Add/scope HTML sanitization.
2. Verify XP dedupe logic using `xp_events.meta` contains query.
3. Confirm admin/editor permissions for featured/answer changes.
4. Apply forum/comment-like migrations before importing routes.

### Daily Check-in / XP Toast

Files:

- `src/components/gamification/DailyCheckin.tsx`
- `src/components/gamification/XpToast.tsx`
- `supabase/checkin_migration.sql`

Content findings:

- `DailyCheckin` calls RPC:
  - `get_checkin_status`
  - `do_checkin`
- `checkin_migration.sql` creates `daily_checkins`.
- Direct insert is not opened; check-in writes through `SECURITY DEFINER` RPC.
- RPC writes `xp_events` and updates `profiles.xp`.

Gate:

- `XpToast`: `READY TO PORT`
- `DailyCheckin`: `NEEDS REVIEW`

Reason: `DailyCheckin` is safe-looking but depends on RPC migration and XP accounting.

### AI Unlimited

Files:

- `src/lib/ai-privilege.ts`
- `src/app/api/admin/users/ai-unlimited/route.ts`
- `supabase/ai_unlimited_migration.sql`
- diff in `src/app/api/ai/chat/route.ts`
- diff in `src/app/admin/users/UserRow.tsx`

Content findings:

- Adds columns:
  - `profiles.ai_unlimited`
  - `profiles.ai_unlimited_at`
  - `profiles.ai_unlimited_by`
- `hasAiUnlimited()` treats admin as unlimited.
- chat route skips `consume_ai_quota` when unlimited.
- admin route writes audit log.

Gate: `NEEDS REVIEW`

Required before port:

1. Confirm business rule: admin always unlimited.
2. Confirm audit table exists in target DB.
3. Add admin UI only after migration.
4. Verify no client route can toggle this without admin role.

## D. Local-only

- `.env.local`
- `scripts/__pycache__/_supplement_helper.cpython-312.pyc`
- `scripts/__pycache__/import-existing-chapters.cpython-312.pyc`

Gate: ignore. These should not be overwritten or moved from zip.

## E. 總判定

`NOT READY` for whole-zip port.

可分 round：

1. `Round 1`: `XpToast` + `ChapterView` animation + `gamification.celebrateXp`
2. `Round 2`: `checkin_migration.sql` + `DailyCheckin` + dashboard wiring
3. `Round 3`: forum schema/API/pages/components as one feature gate
4. `Round 4`: blog schema/API/pages/components/package deps as one feature gate
5. `Round 5`: AI unlimited migration/API/admin UI/chat route

禁止事項：

- 不可整包覆蓋。
- 不可先搬 `package.json` 再讓 app 引入尚未審核的 blog/forum routes。
- 不可先開 `/forum`、`/blogs` 導航而不搬對應 route。
- 不可搬 `dangerouslySetInnerHTML` 相關頁面而不先處理 HTML 安全策略。


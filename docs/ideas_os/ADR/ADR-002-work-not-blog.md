# ADR-002: Work ≠ Blog (Works table; blog is a publish target)

- Status: Accepted
- Date: 2026-06-28
- Deciders: 林董 (Platform Owner)
- Related: 00_LOCKED_DECISIONS.md #11 · 01_vision/06 Decision 14 · ARCHITECTURE.md §11

## Context

ai-island-web already has a blog system, and `/admin/idea-fragments` can already convert an idea into a blog draft. It would be tempting to make a Creator Island "Work" just a blog post.

But a Work is broader than an article: it can be a song, story, script, product plan, course, worldbuilding doc, etc. A Work needs lineage, fragment references, versions, and `workspace_id` ownership — none of which the blog table models.

## Decision

**Works live in a new `works` table (workspace-owned).** The blog is a **publishing target**, not the canonical Work store.

- A Work has `work_type` (article / song / story / script / product_plan / course / …).
- When `work_type = article` **and** the user chooses to publish, the Work syncs/converts to a **blog draft**. Publishing is an explicit action, not automatic.
- The Work remains the source of truth; the blog post is a derived published artifact.

## Consequences

- Works keep lineage to source fragments and other assets regardless of output medium.
- The blog stays the public publishing channel; no schema change to blog required.
- Need a Work→blog-draft sync/convert path (can reuse the existing idea→blog-draft conversion logic).
- A published article has two records (Work + blog post) linked by reference — keep them consistent on edit/unpublish.

## Alternatives considered

- **Work = blog post (shared table)** — rejected: blog can't carry lineage/versions/non-article types; couples Creator Island to a publish channel.
- **No blog integration** — rejected: users expect to publish articles to the existing site.

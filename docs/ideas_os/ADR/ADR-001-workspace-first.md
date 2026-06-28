# ADR-001: Workspace-first ownership

- Status: Accepted
- Date: 2026-06-28
- Deciders: 林董 (Platform Owner)
- Related: 00_LOCKED_DECISIONS.md #2, #3 · 01_vision/06 Decision 3,4 · ARCHITECTURE.md §4–5 · 01_vision/05 Principle 1,2

## Context

ai-island-web's existing systems (profiles, xp, lesson_progress, blog, course data) are all `user_id`-based and single-user.

Ideas OS / Creator Island must support personal use **and** Studio (team) collaboration from day one. If new durable assets are bound to `user_id`, adding teams later forces painful migrations.

## Decision

**New Ideas OS durable assets are owned by `workspace_id`.** Existing `user_id` systems are left untouched.

- Owned by `workspace_id`: fragments, works, packages, workflows, assets, workspace memories, marketplace listings, agent_runs, workspace wallet records.
- May stay `user_id`: profile, personal memory, personal wallet (existing Z 幣), personal UI prefs, login identity.
- A user's **Personal Workspace is lazy-created** on first `/creator-island` access (never in the signup flow). See ADR-008.

## Consequences

- Team/Studio features (roles, invites, owner transfer, shared wallet) work without schema rewrites later.
- Every new table needs a `workspace_id` FK + workspace-scoped RLS.
- Existing platform tables are **not** retrofitted — no destabilization of the live site.
- Code must resolve "current workspace" context per request (a workspace switcher exists in v1).

## Alternatives considered

- **user_id ownership + migrate later** — rejected: guaranteed painful migration once teams arrive.
- **Retrofit existing tables to workspace_id now** — rejected: high risk to a working production platform for no immediate gain.

# Architecture Decision Records (ADR)

> Full history of major Ideas OS / Creator Island decisions. **One file per decision. Never rewrite an accepted ADR.**
> When a decision changes, add a *new* ADR that supersedes the old one, then update `../00_LOCKED_DECISIONS.md` to point at the new version.

## How this works

- `../00_LOCKED_DECISIONS.md` = the **currently-effective** registry (what's true right now).
- `ADR/` = the **history** (what we decided, when, why, and what it replaced).
- An ADR is immutable once `Status: Accepted`. To change it, write a new ADR with `Supersedes: ADR-XXX` and mark the old one `Status: Superseded by ADR-YYY`.

## ADR format

```md
# ADR-NNN: Title

- Status: Proposed | Accepted | Superseded by ADR-XXX
- Date: YYYY-MM-DD
- Deciders: 林董 (Platform Owner)
- Related: 00_LOCKED_DECISIONS.md #N · 01_vision/06 Decision N · ARCHITECTURE.md §N

## Context
## Decision
## Consequences
## Alternatives considered
```

## Index

| ADR | Title | Status |
|---|---|---|
| [ADR-001](ADR-001-workspace-first.md) | Workspace-first ownership | Accepted |
| [ADR-002](ADR-002-work-not-blog.md) | Work ≠ Blog (Works table, blog is publish target) | Accepted |
| [ADR-003](ADR-003-zcoin-existing-economy.md) | Z Coin reuses existing platform economy | Accepted |
| [ADR-004](ADR-004-dust-separate-resource.md) | Dust is a separate creative resource, not money | Accepted |
| [ADR-005](ADR-005-ai-agents-are-resources.md) | AI agents are resources, not members | Accepted (refined by ADR-015) |
| [ADR-015](ADR-015-agent-blueprint-vs-runtime.md) | Agent Blueprint (Asset) vs Agent Runtime (Resource) | Accepted |

### Captured in 00_LOCKED_DECISIONS.md, full ADR pending (write when revisited)
These locked decisions live in `../00_LOCKED_DECISIONS.md`; promote each to a full ADR when it is next discussed or changed:

- ADR-006 — AI key reuse + Model Router / Cost Manager / `agent_runs` layer
- ADR-007 — Workspace roles (Owner/Manager/Contributor/Viewer) separate from platform roles
- ADR-008 — Personal Workspace lazy-create on first `/creator-island` access
- ADR-009 — Creator Island route `/creator-island` + `feature_creator_island_enabled` flag
- ADR-010 — Preserve `/admin/idea-fragments`; share logic via Creator Engine Shared Services
- ADR-011 — Marketplace phase 1: Z Coin internal economy only (no real-money payout)
- ADR-012 — n8n optional automation layer, not a core dependency
- ADR-013 — Language convention: English code/db/API, Traditional Chinese UI
- ADR-014 — Workflows are assets

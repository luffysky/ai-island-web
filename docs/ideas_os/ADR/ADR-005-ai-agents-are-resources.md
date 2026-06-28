# ADR-005: AI agents are resources, not members

- Status: Accepted
- Date: 2026-06-28
- Deciders: 林董 (Platform Owner)
- Related: 00_LOCKED_DECISIONS.md #9, #10 · 01_vision/06 Decision 9 · 01_vision/04 Article 7 · CORE_CONCEPTS.md §19–21 · ARCHITECTURE.md §14

## Context

A workspace has human members (with roles) and uses AI heavily. If AI agents were stored as workspace "members," it would blur human responsibility, ownership, and accountability, and pollute member/permission logic.

## Decision

**AI agents are workspace *resources*, not members.** Humans are responsible actors; AI agents are tools.

- Agents are specialized roles: Incubator(孵化) / Synthesizer(凝聚) / Evolutionist(演化) / Transcreator(轉譯) / Composer(編織) / Archivist(回收) / Judge(評審) / Coach(教練).
- An AI **resource** attached to a workspace carries: provider, model, API-key reference, role, priority, budget, allowed agents, usage limits, logs.
- Agents reach models via the **Model Router → Cost Manager → existing `ai_models`/`ai_api_keys`/`user_api_keys`** chain (see 00_LOCKED_DECISIONS.md). Do not rebuild key storage.
- Every agent task writes an **`agent_runs`** trace: agent_type, workspace_id, user_id, input, output, model, tokens, cost, created assets, errors — in addition to existing usage tables (`ai_usage_daily` / `ai_model_usage`).
- Agents should use **structured output + validation** (input/output schema, retry, fallback) — not blind plain text.

## Consequences

- `workspace_members` stays human-only; AI lives in separate `workspace_ai_resources` / `workspace_ai_settings` tables (names TBD in 06_ai_system / 13_database).
- AI involvement is always traceable (supports lineage `source_type` = ai_generated / ai_assisted, and marketplace trust).
- Clear separation enables per-workspace AI budgets and policy without touching member roles.

## Alternatives considered

- **Agents as members with a special role** — rejected: confuses accountability, ownership, and permission models; AI is not a responsible actor.

## Refinement (2026-06-28) → see ADR-015

This ADR's core stands: a **running agent is a Resource, not a member**. ADR-015 refines it by splitting design from execution: the **Agent Blueprint/Template** (definition) may FUTURE become an **Asset** (versionable/forkable/sellable), while the **running Agent Instance** is always a Runtime Resource (and never an Asset). See `ADR-015-agent-blueprint-vs-runtime.md`.

# ADR-015: Agent Blueprint (Asset) vs Agent Runtime (Resource)

- Status: Accepted
- Date: 2026-06-28
- Deciders: 林董 (Platform Owner)
- Refines: ADR-005 (does not supersede — ADR-005's "running agents are resources, not members" still holds)
- Related: 00_LOCKED_DECISIONS.md D11 · 05_ASSET_SYSTEM.md · 07_AI_SYSTEM.md

## Context

Question raised: can an AI Agent be an Asset (so it can be versioned, forked, sold in a marketplace)? Making the *agent* an asset wholesale conflates several concepts: does a running agent have an owner? a version? are its run logs assets? is its memory an asset? one agent may run across ten workspaces simultaneously — which asset is that? This muddies ownership, versioning, and runtime.

## Decision

Split the agent into **two layers** (like Docker image vs container, or source code vs running process):

```txt
Agent Blueprint / Template (ASSET)
        │ instantiate
        ▼
Running Agent Instance (RUNTIME RESOURCE — never an Asset, never a member)
        │ executes
        ▼
agent_runs (execution log)
```

- **Agent Blueprint (Asset, FUTURE):** a versionable, forkable, sellable definition. Contains: prompt, tool config, memory policy, allowed models, cost policy, output schema, retry policy, temperature, variables. Supports Version / Fork / Remix / Import / Export / Marketplace — it satisfies the full asset abstraction (`05`).
- **Running Agent Instance (Resource, NOW):** the thing that actually executes in a workspace. Ephemeral runtime; carries workspace, model, memory injected, cost, status. **Never an Asset, never a workspace member.**
- **agent_runs:** the immutable execution trace (already defined in `07`/`13`).

The canonical statement (replaces the loose "agents are resources" phrasing):
> **AI Agent Runtime is always a Resource — not a workspace member, not an Asset.**
> **Agent Blueprint / Template may (future) be an Asset — supporting Version, Fork, Marketplace, Import, Export, Remix.**

## Consequences

- v1 unchanged: agents are a fixed registry of runtime resources (the 8 agents in `07`); no Blueprint-as-Asset yet.
- Future Agent Marketplace sells **Blueprints** (installable/customizable/upgradeable), not running AI — clean ownership/versioning/licensing via the existing asset + marketplace model (`05`/`10`).
- Ownership/version/run-log/memory questions resolve cleanly: Blueprint has owner+version; Instance is runtime; runs are logs; memory stays scoped (`08`).
- When built, `agent_prompts` (and a future `agent_blueprints` table) become the Blueprint store; instantiation produces a runtime config that emits `agent_runs`.

## Alternatives considered

- **Agent-as-Asset wholesale** — rejected: conflates runtime/ownership/version; a cross-workspace running agent has no single owning asset.
- **Agent never an Asset (even future)** — rejected: blocks a future Agent Marketplace and reusable custom agents; the Blueprint layer captures the value without the runtime confusion.

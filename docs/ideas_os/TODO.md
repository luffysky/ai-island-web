# Ideas OS / Creator Island — Implementation TODO

> Execution tracker derived from the 18-doc spec. **The docs are the spec; this file is the build checklist.** Each task cites its authoritative doc + real repo paths + acceptance criteria.
> Status: 🟡 DRAFT — finalize once all 18 docs are Codex-PASS. Convention: `[ ]` todo, `[x]` done, ~~strikethrough~~ keep-but-done.

---

## How to use this

1. Read `00_LOCKED_DECISIONS.md` + `ADR/` before any task. Don't re-decide settled things.
2. Work **top-down by milestone**; don't start a task before its dependencies (see `17` dependency graph).
3. Per task: implement → `npm run lint && npm run build` → `/code-review` the diff → tests → check the box.
4. Schema is authoritative in `13_DATABASE.md`; endpoints in `14_API.md`; UI in `16_UI_UX.md`. If reality diverges, update the doc (or add an ADR) — never silently diverge.
5. Everything ships behind `feature_creator_island_enabled`; enable owner-only first.

## Definition of Done (every task)
- [ ] Matches the cited doc (no invented schema/route/token).
- [ ] New durable tables: `workspace_id` + RLS (mirror `idea_fragments_migration.sql`); personal-scoped exceptions per `13`.
- [ ] Server-side authz + zod validation; lists paginate (no unbounded `select('*')`).
- [ ] AI only via the AI Layer; cost-bearing paths through Cost Manager; writes `agent_runs`.
- [ ] `npm run lint` + `npm run build` clean; `audit-db-columns.mjs` passes for new tables.
- [ ] Existing systems untouched (regression: `/admin/idea-fragments`, blog, chapters, Z 幣).

---

## Pre-flight (before M0)
- [ ] Confirm all 18 docs Codex-PASS; freeze spec.
- [ ] Delete `_archive/` once 01_vision content is confirmed absorbed into `01_IDEAS_OS_SPEC.md`.
- [ ] Extend `isFeatureEnabled` union in `src/lib/app-settings.ts`: add `"creator_island"` (currently `blog|forum|pet|island`). Ref `16`/`02`.

---

## M0 — Foundation (workspaces, roles, flag)  → doc `04`, `13`, `14`
- [ ] Migration `supabase/creator_island_workspace_migration.sql`: `workspaces`, `workspace_members` (partial-unique owner), `workspace_invitations` (code_hash), `workspace_wallet`(+`_tx`), `workspace_ai_settings` — RLS + idempotent. Ref `13` Workspace.
- [ ] RPCs `supabase/creator_island_rpcs_migration.sql`: `transfer_workspace_owner` (last-owner-safe), `debit_wallet`. Ref `13` §RPCs.
- [ ] `src/lib/creator-engine/workspace.ts`: active-workspace resolve + **lazy-create Personal Workspace** on first access; role checks. Ref `04`, ADR-008.
- [ ] Feature flag: extend `app-settings` + add toggle in `/admin/settings`. Ref `15`.
- [ ] Route shell `src/app/creator-island/` (gated): auth → lazy-create → empty dashboard. Ref `02`.
- [ ] API: `/api/creator-island/workspaces*`, `/workspaces/active`, members, invitations, `transfer`. Ref `14` Workspace.
- **Exit:** create studio, invite (hashed code), switch workspace, transfer owner; flag toggles homepage entry.

## M1 — Assets (fragments, works, lineage)  → doc `05`, `13`, `14`
- [ ] Migration `supabase/creator_island_assets_migration.sql`: `fragments`, `works`, `work_fragments`, `asset_relations` (+ polymorphic validation trigger), `asset_versions`, `packages`, `collections`. Ref `13` Assets.
- [ ] `src/lib/creator-engine/fragments.ts` + `lineage.ts`: **extract shared logic from `/admin/idea-fragments`** without changing admin behavior (regression-gated). Ref `03`, `05`, ADR-010.
- [ ] API: `/fragments*`, `/works*` (+ `/archive`, `/publish`), `/assets/{id}/lineage`, `/packages`. Ref `14` Assets.
- [ ] UI: Fragment Library + Work Library + basic Work Editor. Ref `16`.
- **Exit:** capture/list/search fragments; compose a work (composition in `work_fragments`); archive→recycle; lineage via `asset_relations`. `/admin/idea-fragments` still green.

## M2 — AI loop (router, cost, agent_runs + 凝聚/演化/編織)  → doc `06`, `07`, `13`, `14`
- [ ] Migration `supabase/creator_island_ai_migration.sql`: `agent_runs` (+ optional `agent_prompts`). Ref `13` AI.
- [ ] `src/lib/creator-engine/ai/{router,cost,agents}.ts`: Model Router (wraps exported `callAI`/`streamAI`), Cost Manager (reserve→`debit_wallet`; personal vs workspace Z 幣; downgrade/402), 3 agents with **Zod-validated** output. Ref `07`, `06`.
- [ ] **E11 Composer song mode:** for `work_type=song`, Composer also outputs `{lyricsSectioned, sunoPrompt, mvPrompt}` (stored in the Work; no new table). Ref `06`/`07`, `ENHANCEMENTS.md`.
- [ ] API: `/ai/{synthesize,evolve,compose}`, `/ai/runs`, `/ai/settings`, `/eggs/open`. Ref `14`.
- [ ] Usage parity: write `agent_runs` **and** existing `ai_usage_daily`/`ai_model_usage` (`logAiUsage`). Ref `07`.
- **Exit:** 3 actions produce validated, costed (Z 幣), traced assets with provenance + lineage; budget 402/downgrade works; input preserved on failure.

## M3 — Shell (dashboard, editor, studio UI, homepage entry)  → doc `02`, `16`, `ENHANCEMENTS.md`
- [ ] Homepage 3rd entry in `src/components/home/Hero.tsx` (grid 2→3) + flag from `src/app/page.tsx`. Ref `16`.
- [ ] **E1 first-run guided mini-loop** (一句話→種子→演化→編織→存 mini Work; existing actions only) + **E2 pre-seed** Personal Workspace from `idea_fragments`/chapter/leetcode. Ref `ENHANCEMENTS.md`, `02`.
- [ ] **E10 no-token-trap:** core loop free + daily free Dust; Z 幣 only for premium/bulk/commercial (Cost Manager default = free/cheap path). Ref `06`/`10`.
- [ ] Dashboard (IA per `02`), Creation Tools UI (cost/preview/save options), Work Editor (autosave, input-preserving).
- [ ] Workspace switcher (persistent) + Studio management UI (members/roles/invite/transfer). Ref `04`, `16`.
- [ ] All screens: loading/empty/error states; 繁中 + glossary; real theme tokens (`bg-bg-card`…). Ref `16`.
- **Exit:** full Capture→Compose→Archive loop usable end-to-end behind the flag.

## M4 — Memory + skeletons  → doc `08`, `10`, `11`, `12`, `13`
- [ ] Migration `creator_island_memory_migration.sql` (+ `_dust_migration.sql`): `memories`, `memory_usage`, `dust_ledger`. Ref `13`.
- [ ] Memory service: personal + workspace memory (candidate/confirm/edit/delete), relevance retrieval + bounded injection into prompts, `memory_usage` log. Ref `08`.
- [ ] Fragment Egg (Dust) basic loop. Ref `06`, ADR-004.
- [ ] Skeleton pages + **reserved** schema: Marketplace / Community / Growth (即將推出, non-interactive). Migrations may be deferred; pages honest. Ref `10`/`11`/`12`/`16`.
- **Exit:** memory improves prompts (current-intent overrides); skeletons honest; Dust never touches `coin_transactions`.

## M5 — Hardening + launch  → doc `17`
- [ ] Tests: unit (creator-engine), integration (RLS per table, role gates, atomic RPCs), provenance/lineage, economy paths. Ref `17` testing checklist.
- [ ] Extend `scripts/smoke-test.mjs` with `/creator-island` routes; `npm run test:smoke` green.
- [ ] A11y (keyboard + screen-reader on core flows); perf (pagination, caches).
- [ ] `/security-review` the diff (wallets, transfers, RLS).
- [ ] Release: `db:apply` migrations → GHCR image (`docker.yml`) → Zeabur restart → `/api/version` check → enable flag owner → beta → all. Ref `17` release checklist.
- **Exit:** all green; beta launch; rollback = flip flag off (no redeploy).

---

## Out of scope for v1 (Phase 2 / later — do NOT build now)
- Real-money marketplace payout (KYC/payment/tax), `purchase_listing`/`refund_transaction` production economy → marketplace **Phase 1 (post-MVP)** then Phase 2.
- Full Community (fork/remix/challenges/exchange/reputation), Growth coach/DNA/skill-tree.
- Workflow visual editor + scheduling + n8n nodes (engine schema reserved in M-later).
- Remaining agents: 孵化/回收/文化轉譯/評審/教練.
- Other islands (Learning/Business/Research).

## Cross-cutting guardrails (apply to every milestone)
- `workspace_id` ownership; existing `user_id` systems untouched (ADR-001).
- Z 幣 = existing `coin_transactions` + `profiles.z_coin`; Dust separate (ADR-003/004).
- AI keys reuse `ai_models`/`ai_api_keys`/`user_api_keys`; agents are resources (ADR-005/006).
- Work ≠ Blog (ADR-002); `/admin/idea-fragments` preserved (ADR-010).
- English code/db/API; 繁中 UI (ADR-013).

> Source of truth: see the cited `NN_*.md`. Decision changes = new ADR + update `00_LOCKED_DECISIONS.md`.

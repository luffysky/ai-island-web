# ADR-003: Z Coin reuses the existing platform economy

- Status: Accepted
- Date: 2026-06-28
- Deciders: 林董 (Platform Owner)
- Related: 00_LOCKED_DECISIONS.md #7, Wallet model · 01_vision/06 Decision 10 · CORE_CONCEPTS.md §32

## Context

ai-island-web already has a Z 幣 economy: `point_transactions` / ledger bound to `user_id`. Ideas OS introduces wallets (personal + workspace). Creating a second, separate Z Coin balance would split the economy and confuse users.

## Decision

**Ideas OS Z Coin IS the existing platform Z 幣. Do not create a separate balance.**

```txt
Z Coin           = existing platform Z 幣 (unit of currency)
Personal Wallet  = user_id Z 幣 (existing point_transactions / ledger)
Workspace Wallet = workspace_id shared Z 幣 allowance/ledger (new wrapper, SAME Z 幣 unit)
```

- Personal spending debits the user's own Z 幣.
- Workspace spending debits the workspace's shared allowance.
- Workspace wallet may start as a separate ledger, but the **unit is the same Z 幣**.
- Dust is **not** part of this — see ADR-004.

## Consequences

- One economy, one unit; no FX/conversion between two Z balances.
- Need a workspace-wallet ledger and a funding mechanism (how workspace allowance is topped up — to be specified in 10_marketplace / 13_database).
- Cost Manager (see 00_LOCKED_DECISIONS.md AI chain) chooses personal vs workspace wallet as the payment source per spend.

## Alternatives considered

- **Separate Ideas OS Z Coin** — rejected: duplicated economy, user confusion, reconciliation burden.
- **Workspace wallet as a different currency** — rejected: violates single-unit principle.

## Open (track, non-blocking)

- Workspace wallet: dedicated table vs tagging existing ledger rows with `workspace_id`. (Decide in 13_database.)

## Erratum (2026-06-28)

Factual correction — the **decision is unchanged**, only a table name was wrong at authoring time.
The existing Z 幣 economy is **`profiles.z_coin`** (balance) + **`coin_transactions`** (ledger: `amount` / `balance_after` / `reason` / `meta`), verified in `supabase/schema.sql`. There is **no** `point_transactions` table. Wherever this ADR says `point_transactions`, read `coin_transactions` / `profiles.z_coin`. The currently-effective registry `00_LOCKED_DECISIONS.md` (D7) already uses the correct names.

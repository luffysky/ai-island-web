# ADR-004: Dust is a separate creative resource, not money

- Status: Accepted
- Date: 2026-06-28
- Deciders: 林董 (Platform Owner)
- Related: 00_LOCKED_DECISIONS.md #8 · 01_vision/06 Decision 11 · 01_vision/04 Article 11 · CORE_CONCEPTS.md §33

## Context

Ideas OS has playful creative-loop mechanics (Fragment Eggs, rerolls, evolution boosts, duplicate-fragment handling). These need a "resource," but tying them to Z 幣 (real economic currency, see ADR-003) would turn creative play into a financial ledger and risk gambling/token-trap dynamics (see 01_vision/07 Non-goals 6, 7).

## Decision

**Dust is a creative resource, separate from Z Coin. It is never money and never interchangeable with Z 幣.**

- Earned from: duplicate fragments, creative activity, recycling, events.
- Spent on: extra fragment eggs, evolution boosts, special creative modes, quality upgrades, fusion/reroll.
- Dust has **no** monetary value, **no** payout, **no** conversion to Z 幣.

## Consequences

- Dust gets its own balance/ledger, kept fully separate from `point_transactions`.
- Marketplace and payouts (ADR-011) never touch Dust.
- Cost Manager treats Dust spends and Z 幣 spends as distinct paths.

## Alternatives considered

- **One unified currency for both** — rejected: blends creative play with real economy; gambling/token-sink risk; violates Constitution Article 11.

## Erratum (2026-06-28)

Factual correction (decision unchanged): the Z 幣 ledger Dust must stay separate from is **`coin_transactions`** (+ `profiles.z_coin`), not `point_transactions` (which does not exist). See `00_LOCKED_DECISIONS.md` D8.

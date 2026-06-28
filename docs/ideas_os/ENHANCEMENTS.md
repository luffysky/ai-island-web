# Ideas OS / Creator Island — Enhancement Backlog

> Owner-approved enhancement ideas (林董, 2026-06-28). These do **not** change the frozen v0 MVP scope (`TODO.md` M0–M3 + minimal M4/M5) — except two items explicitly marked **MVP-onboarding / launch** that reuse existing MVP features without adding new scope.
> Each item: priority · where it slots · what existing asset it reuses · target spec doc.

---

## Classification key
- **MVP-onboarding/launch** = uses only features already in MVP; it's sequencing/content, not new scope.
- **NOW-rule** = a design guardrail that applies from day one (not a feature).
- **Phase 2** = post-MVP feature; reserve data model now, build later.

---

## 🥇 P1 — Solve the "empty island" (magic in the first 5 minutes)

### E1. First-run: 「一句話 → 一首歌」 guided flow  — **MVP-onboarding**
A guided first session: user enters one line → 孵化 seed → 演化 → 編織 into a tiny Work — delivering the aha **before any accumulation exists**.
- Reuses: the 3 MVP AI actions (凝聚/演化/編織) + Work save. **No new feature** — it's onboarding sequencing.
- Target: `02_CREATOR_ISLAND_PRD.md` (First-time Experience) + `16_UI_UX.md` (onboarding) + `17` M3.
- Note: v1 may use 演化/編織 only if 孵化(Incubator) isn't built; the point is a complete mini-loop on first visit.

### E2. Pre-seed the island  — **launch task**
Seed new/Personal workspaces (or a public showcase) with sample fragments/templates drawn from existing `idea_fragments`, chapter content, and leetcode, so the island isn't empty on day one (also warms marketplace/community supply later).
- Reuses: existing `idea_fragments`, chapter/leetcode data.
- Target: `17_IMPLEMENTATION_GUIDE.md` (launch/M5) + `02` onboarding. Phase-2 extension: a curated public "starter pack" in marketplace.

## 🥈 P2 — Make the compounding visible & felt

### E3. Creation lineage view (創作家譜)  — **Phase 2** (v1 ships text links only)
A visual graph: "this Work grew from these 8 fragments" / "this fragment spawned 5 works". Turns the invisible moat into an emotional experience.
- Reuses: `asset_relations` data (already produced in MVP) — only a view is missing.
- Target: `05_ASSET_SYSTEM.md` Future + `16_UI_UX.md` Future. (v1 = "用到碎片" links per `16`; full graph = Phase 2.)

### E4. Proactive recall: 「你半年前寫過…」  — **Phase 2**
While creating, proactively surface relevant older fragments via embeddings — directly hits the core pain ("a year later I know I thought of it but can't find it").
- Reuses: pgvector embeddings + memory retrieval (`08`).
- Target: `08_MEMORY_SYSTEM.md` Future + `06_CREATION_ENGINE.md`.

## 🥉 P3 — Daily hooks from what's already built

### E5. Surprising pairs as a daily hook  — **Phase 2 (engine already exists)**
Pipe the existing mid-similarity "意外配對" engine (`idea-ai.ts` `fetchSurprisingPairs` / `idea_surprising_pairs` RPC) into the daily Fragment Egg / 每日推薦 — a unique, ready-made retention loop.
- Reuses: existing admin surprising-pairs engine.
- Target: `06_CREATION_ENGINE.md` (Fragment Egg) — already referenced; promote to a daily surface in Phase 2.

### E6. Lower capture friction: voice / photo → fragment  — **Phase 2**
Mobile quick-capture: voice note → transcribe → fragment; photo → fragment. Capture friction decides whether the asset graph ever fills.
- Reuses: existing R2 upload; add transcription.
- Target: `16_UI_UX.md` Future (mobile) + `05` capture.

## 💡 P4 — Differentiators (Phase 2)

### E7. Workflow by "record", not "build"
Don't make users wire node graphs. Let them create normally, then offer "把剛剛這串動作存成工作流？" — passively capture process. ~10× lower barrier than a visual editor.
- Target: `09_WORKFLOW_ENGINE.md` Future (precedes the visual editor).

### E8. Cultural Transcreation as a marketing wedge (pull earlier)
繁中 → 日系 / 韓系 / English-indie. Underserved; a strong differentiator. Consider pulling the Transcreator agent earlier than the other future agents.
- Target: `06`/`07` (Transcreator) — flag as the first future agent to build.

### E9. Creator DNA as a shareable card
A beautiful "creative fingerprint" card (imagery / tone / strengths) — both growth feedback and an organic acquisition/share loop.
- Reuses: `creator_dna` (`12`).
- Target: `12_GROWTH_ENGINE.md` Future.

## 🎵 P1 — Music / Suno + MV prompt  — **MVP (Composer song output mode)**

### E11. Music prompt engine (Suno + MV) as a Composer output mode
For `work_type=song`, the **Composer (編織)** agent outputs not just lyrics but a complete music package: sectioned lyrics (Verse/Pre-Chorus/Chorus/Bridge/Outro), a **Suno-style style prompt**, and an **MV prompt**. Validated by the user's own test (seed 「我墊著腳尖走在妳的世界」 → evolve 20 fragments → lyrics → song structure → Suno prompt). This makes the flagship music use case end-to-end inside MVP — **not a new subsystem**, just an output mode of the Composer.
- Reuses: the MVP Composer agent (`06`/`07`); output stored in the Work (`works.body`/metadata), no new table.
- Output schema (song mode): `{title, lyricsSectioned, sunoPrompt, mvPrompt, usedFragmentIds[]}`.
- Target: `06_CREATION_ENGINE.md` (Compose action) + `07_AI_SYSTEM.md` (Composer contract) + `TODO.md` M2. Phase-2 extensions: cover-art prompt, style library, Suno/Prompt Pack for marketplace.

## ⚖️ Design principle (applies NOW)

### E10. Don't become a token trap  — **NOW-rule**
Core loop stays **free** + daily free **Dust**; charge Z 幣 only for premium models / bulk generation / commercial-grade output. Otherwise every click hurts and accumulation dies (this is our own stated non-goal — `01_vision/07` Non-goals 6/7, archived; restated here).
- Target: locked as a rule in `10_MARKETPLACE.md` (economy) + honored by Cost Manager (`07`) + creation actions (`06`).

---

## Roadmap placement summary

| Item | Tier | When | Reuses |
|---|---|---|---|
| E1 First-run mini-loop | P1 | **MVP (onboarding)** | 3 AI actions |
| E2 Pre-seed island | P1 | **MVP (launch)** | idea_fragments/chapters/leetcode |
| E11 Music/Suno+MV prompt | P1 | **MVP (Composer song mode)** | Composer agent |
| E10 No-token-trap economy | — | **NOW (rule)** | Dust + Cost Manager |
| E3 Lineage view | P2 | Phase 2 | asset_relations |
| E4 Proactive recall | P2 | Phase 2 | pgvector + memory |
| E5 Surprising-pairs daily | P3 | Phase 2 | idea-ai engine |
| E6 Voice/photo capture | P3 | Phase 2 | R2 + transcription |
| E7 Workflow record | P4 | Phase 2 | workflow engine |
| E8 Transcreation wedge | P4 | Phase 2 (first future agent) | Transcreator |
| E9 Creator DNA card | P4 | Phase 2 | creator_dna |

> MVP scope stays frozen. E1/E2 reuse existing MVP features (no new scope); E10 is a guardrail; E3–E9 are Phase 2 (data models already reserved in the specs).

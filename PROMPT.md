# Implementation Prompt — Carcassonne

## Task

Implement a complete, playable game of base-game **Carcassonne** (with farmers) as a browser-based **hot-seat** multiplayer app for 2–5 players. Build it to be genuinely playable from start to finish. This is not a mock, a prototype, or a partial slice.

## Sources of Truth

- **`RULES.md`** — the game rules. Authoritative for all gameplay.
- **`DESIGN.md`** — the architecture and design. Follow its structure, boundaries, and invariants. Where `DESIGN.md` and `RULES.md` conflict on a *rule*, `RULES.md` wins.
- **`tiles.json`** — the canonical 72-tile deck (24 types, A–X). Load this as the tile dataset; do not invent your own deck. Its `_schema` block documents the format.

Read both files in full before writing any code.

## Stack (required)

- TypeScript, strict mode.
- React for the UI.
- Vite for dev/build, Vitest for tests.
- Conventional, well-maintained dependencies are fine. No exotic or unmaintained packages.
- Render tiles programmatically (CSS/SVG). No external image assets.

## Working Agreement

- Branch from `main` into `opencode/<model>` and do all work on that branch.
- Maintain a `PROGRESS.md` checklist at the repo root: your plan, what is done, what is next, and any decisions or open questions. Update it as you work and re-read it to reorient.
- Commit at every meaningful milestone with clear messages. The commit history should read as a record of how you built the project. Commit locally; do not assume you have push or PR credentials.
- Run `tsc`, `vitest`, and `vite build` frequently. A red build or a failing test is a stop-and-fix, not something to defer.

## Approach

- Build the pure game engine first (no DOM, no React) and test it thoroughly **before** building any UI. The engine owns all rules; the UI only renders state and forwards intent.
- Prioritize the hard modules called out in `DESIGN.md`: feature merging and completion, follower legality across merged features, majority/tie scoring, and especially end-game farmer/field scoring. These are where correctness usually breaks.
- Use a single seeded RNG for the deck shuffle so games are reproducible.

## Definition of Done

- `tsc` is clean under strict, `vitest` passes, `vite build` succeeds.
- A person can open the app and play a full 2–5 player hot-seat game to completion: tile placement, optional follower placement, immediate scoring during play, and full end-game scoring (incomplete features plus farmers), ending with a declared winner and correct tie handling.
- Every rule in `RULES.md` is implemented. Nothing is stubbed, faked, or simplified. Farmer/field scoring in particular must be fully working.
- Engine logic is covered by Vitest tests, including the specific scenarios listed in the testing section of `DESIGN.md`.

## Guardrails

- Do not simplify this into a toy, a CRUD scaffold, or a subset of the rules.
- Do not stub scoring and do not skip farmers.
- If you hit a genuine ambiguity in the rules, record your interpretation in `PROGRESS.md` and proceed. Do not stall waiting for input.
- Keep going until the Definition of Done is fully met.

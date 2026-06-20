# Carcassonne (hot-seat)

A complete, playable implementation of base-game **Carcassonne** with farmers/field
scoring, for 2–5 players in a single browser (pass-and-play). TypeScript + React + Vite,
with a pure, fully unit-tested game engine.

## Quick start

```bash
npm install
npm run dev      # play locally (Vite dev server)
npm test         # run the engine + UI tests (Vitest)
npm run build    # type-check (tsc strict) + production build
```

## How to play

1. Pick 2–5 players and a seed, then **Start game**.
2. On your turn the drawn tile is shown in the right panel. **Rotate** it, then click a
   highlighted square on the board to place it (placements must match adjacent edges).
3. Optionally place one follower on a glowing spot of the tile you just placed:
   - city → **knight**, road → **thief**, monastery → **monk**, field → **farmer**.
   - You can't place on a feature that already holds any follower (after merges).
4. Completed roads/cities/monasteries score immediately and return their followers.
5. When the deck runs out, end-game scoring runs (incomplete features + farmers) and a
   winner is declared, with ties handled per the rules.

## Architecture

Strict engine/UI split (see `DESIGN.md`):

- `src/engine/` — pure game engine, no DOM/React. Deterministic given a seed.
  - `tiles.ts` loads the canonical 72-tile deck from `tiles.json`, handles rotation.
  - `board.ts` placement validation and legal-placement enumeration.
  - `features.ts` union-find feature graph: city/road/field merges, completion,
    field→city border tracking for farmers.
  - `scoring.ts` majority/tie resolution and point formulas.
  - `game.ts` turn flow, immediate scoring, end-game + final scoring.
- `src/ui/` — React + programmatic SVG rendering. Holds no rules logic.

The engine is exhaustively tested in `tests/` (placement, merges, completion, follower
legality including merge-then-block, majority/tie, pennants, farmer/field scoring with
tied farmers and multi-city fields, and a fixed-seed full-game smoke test).

Rules source of truth: `RULES.md`. Tile data: `tiles.json`.

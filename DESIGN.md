# Carcassonne — High-Level Design

## Purpose & Scope

Build a complete, playable implementation of base-game Carcassonne (per `RULES.md`) with farmers / field scoring included, supporting 2–5 player **hot-seat** play in a single browser.

This document is the **architectural design**. It defines structure, boundaries, the domain model, invariants, and the hard modules. It intentionally does **not** prescribe algorithms or code; *how* to implement each module is left to the implementer.

Source of truth for rules is `RULES.md`. Where this document and `RULES.md` disagree on a rule, **`RULES.md` wins**.

## Goals

- Faithful base-game rules, farmers included.
- A deterministic, fully unit-testable game engine that is independent of the UI.
- Hot-seat multiplayer: 2–5 players, one browser, pass-and-play.
- Separation of concerns clean enough that rule correctness can be verified without rendering anything.

## Non-Goals

- No AI / computer opponent.
- No expansions, no river tiles.
- No network play, no accounts, no persistence beyond a running session.
- No art assets or animation beyond programmatic tile rendering.

## Tech Stack & Constraints

- **TypeScript, strict mode.** Non-negotiable. The compiler is a primary correctness signal, and it matters most during a long autonomous build.
- **React** for the UI.
- **Vite** for dev/build, **Vitest** for tests.
- Conventional, well-maintained dependencies are allowed. Avoid exotic or unmaintained packages.
- Tiles rendered programmatically (CSS/SVG). No external image assets.

## Architectural Principle: Engine / UI Split

The single most important decision. Two layers, strictly separated:

1. **Game engine (pure, no DOM, no React).** Owns all rules and state. Deterministic given a seed. Exposes a typed API of the shape "given a `GameState` and an action, validate and return the next `GameState` (or a rejection)." No I/O, no rendering, no randomness except through an injected seeded RNG. This layer is exhaustively unit-tested in isolation.
2. **UI layer (React).** Renders `GameState`, captures player intent (place tile, rotate, place follower), calls the engine, reflects results. Holds **no** rules logic.

Rationale: the rules are the hard part and the thing actually under test. A pure engine is testable, debuggable, and easy to re-anchor against during a long run.

## Coordinate System & Tiles

- Infinite square grid; integer `(x, y)` coordinates; start tile at `(0, 0)`.
- Each tile has four edges (N, E, S, W), each carrying a feature type (city / road / field). Tiles also carry internal connectivity (which edges/segments join inside the tile), an optional monastery (center), and an optional pennant/banner (on some city tiles).
- Tiles may be rotated in 90° increments; rotation permutes edges and internal connectivity together.
- **Placement legality:** a new tile must share at least one edge with an existing tile, and every shared edge must match feature type (city–city, road–road, field–field). Corner-only adjacency is not a connection.

## Domain Model (shapes, not code)

The entities the engine needs, described at the level of responsibility:

- **TileType** — static definition: edge features (N/E/S/W), internal segment connectivity, `hasMonastery`, `hasPennant`, and the count of copies in the deck.
- **PlacedTile** — a TileType + rotation + `(x, y)`.
- **Feature** — the connected structures spanning tiles: Road, City, Monastery, Field. Each tracks the tiles/edges it covers, the followers on it, and whether it is complete.
- **Follower (meeple)** — owner, role (thief / knight / monk / farmer), and the feature it occupies.
- **Player** — id, color, score, remaining supply (starts at 7).
- **GameState** — board (placed tiles by coordinate), the feature graph, the seeded draw order, current player, phase, scores, and a game-over flag.

## Hard Module 1 — Feature Graph & Completion

- As tiles are placed, feature segments on matching edges must **merge** into single logical features spanning multiple tiles (connected components). A single placement can merge two previously separate features into one (for example joining two city fragments).
- **Road complete** when both ends terminate (crossroad/junction, city, monastery, or a closed loop).
- **City complete** when fully enclosed with no open edges.
- **Monastery complete** when all 8 surrounding positions are occupied.
- Completion is evaluated immediately after each placement; only **newly** completed features score.
- A connected-components model over tile-edge nodes is the natural fit, but the representation is the implementer's call. Whatever is chosen must handle mid-game merges correctly. **This is the most failure-prone area; prioritize tests here.**

## Hard Module 2 — Follower Placement Legality

- One follower per turn, drawn from supply, placed only on the just-placed tile.
- A follower may **not** be placed on a feature (road/city/field) that — after this placement and any resulting merges — already holds a follower of **any** color. The occupancy check is over the **entire merged feature**, not just the local tile. The merge-then-block case is easy to get subtly wrong; test it explicitly.

## Hard Module 3 — Scoring (during play)

- Completed features score immediately per `RULES.md`: road = 1/tile; city = 2/tile + 2/pennant; monastery = 9. Followers return to supply after scoring.
- **Majority / tie:** on a shared feature, the player with the most followers takes all the points; on a tie, every tied player scores the full amount. Test 1-v-1 and 2-v-1.
- Turn order matters: complete → optionally place follower → score → return. A follower can be placed, score, and return in the same turn.

## Hard Module 4 — Farmers & Field Scoring (the gnarly one)

- Fields are not scored during play. Farmers lie flat and are never returned until final scoring.
- A **field** is a connected area of field segments bounded by roads, cities, and the board edge. Within-tile field topology (which border positions connect, and which city segments each field borders) is **given** by the `fields` array in `tiles.json` using the 8-position model. The engine's job is to merge field regions **across** adjacent tiles (two abutting field positions on a shared edge connect) and to track, per merged field, the set of completed cities it borders.
- At game end, for each field, the player(s) with the most farmers score **3 points per completed city the field touches**. "Touches" means the field borders that city. Only **completed** cities count. Ties split full. One city may be counted by multiple fields.
- This is the module most likely to be skipped, stubbed, or simplified. It must be fully implemented and tested. **Treat any absence or simplification of farm scoring as a failed build.**

## End-Game & Final Scoring

- The game ends when the last tile is placed and that turn resolves.
- Final scoring: incomplete roads/monasteries 1/tile; incomplete cities 1/tile + 1/pennant; then farmers as above. Return followers after each step.

## Tile Dataset

`RULES.md` specifies 72 land tiles but does not enumerate the canonical distribution. That distribution is provided as **`tiles.json`** in the repo root, and every run must load it rather than hand-rolling its own deck. This pins deck composition across all runs so it is not a source of cross-model variance.

What `tiles.json` defines per tile type: the four edge terrains (city/road/field), the city segments (each with a stable id and pennant flag), the road segments, the cloister flag, the field regions, and the count. Its `_schema` block documents the conventions. The 24 types (ids A–X) sum to 72 tiles including the start tile (one copy of tile `D`).

Field regions use an **8-position model**: each tile border is split into 8 positions (two per edge, divided where a road would cross), and each tile's `fields` array groups those positions into regions and records which city segments each region borders. That city-border adjacency is what farmer scoring consumes. The engine reads this directly rather than deriving field topology from geometry.

Acceptance invariants: the loaded deck totals 72; the start tile (`D`) is placed at the origin and the remaining 71 are shuffled; rotation is applied consistently to edges, city segments, road segments, and field positions together.

## Determinism

- All randomness (the deck shuffle) flows through a single **seeded RNG**. Same seed → same draw order. Expose the seed at new-game time for reproducible runs and tests.

## UI / UX Requirements (hot-seat)

- Pannable / zoomable board, start tile centered.
- The current player's drawn tile is shown with a rotate control; legal placements are indicated; illegal placements are rejected with feedback.
- After placing, prompt for an optional follower on a legal segment of the new tile (role implied by segment type), or allow skip.
- Persistent score panel: all players, current scores, supply remaining. Clear current-player indicator.
- Immediate visual feedback when a feature completes and scores.
- End-game: trigger final scoring and show a per-player breakdown by category (including farms), then declare the winner with tie handling.
- Plain, functional presentation is fine. Clarity over polish.

## Testing Strategy & Definition of Done

Engine unit tests (Vitest) covering at least:

- Placement legality: edge matching, adjacency, rejection of illegal placements.
- Feature merge across tiles; completion detection for road, city, monastery.
- Follower legality including the merge-then-block case.
- Scoring including pennants and majority/tie.
- Farm scoring including a shared field with tied farmers and a field touching multiple completed cities.
- A full-game smoke test: a fixed seed plays to completion with no illegal states and final scores computed.

**Definition of done:**

- `tsc` clean under strict; `vitest` green; `vite build` succeeds.
- A person can play a full 2–5 player hot-seat game in the browser start to finish, including end-game farm scoring and a declared winner.
- No feature stubbed or simplified; farmers fully implemented.

## Suggested Build Order

1. Types + load tile dataset from `tiles.json` + seeded RNG.
2. Board + placement validation (edge matching).
3. Feature graph + merge + completion detection.
4. Follower placement + legality.
5. Immediate scoring + majority/tie + return.
6. End-game + final scoring + farms.
7. React UI over the finished engine.
8. Full-game tests + polish.

Engine is fully tested before any UI work begins.

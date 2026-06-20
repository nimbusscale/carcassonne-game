# Carcassonne — Build Progress

## Branch note
The prompt asked to develop on `claude-code`, but this session's harness mandate is to
develop on `claude/carcassonne-game-j6jeey`. I follow the harness branch and never push
elsewhere. All work happens on `claude/carcassonne-game-j6jeey`.

## Plan / Build order (per DESIGN.md)
1. [x] Project scaffold (Vite + React + TS strict + Vitest)
2. [x] Engine types + tile dataset loader (tiles.json) + seeded RNG
3. [x] Board + placement validation (edge matching)
4. [x] Feature graph + merge + completion detection (roads/cities/monasteries/fields)
5. [x] Follower placement + legality (merge-then-block)
6. [x] Immediate scoring + majority/tie + return followers
7. [x] End-game + final scoring + farmers
8. [x] Engine unit tests (37 tests, all DESIGN.md scenarios) — engine green before UI
9. [x] React UI over finished engine (programmatic SVG tiles, pan/zoom board,
       rotate/place, follower placement, score panel, end-game breakdown modal)
10. [x] Full-game smoke test (fixed seed plays to completion) + UI render smoke test

## Status: COMPLETE
- `tsc --noEmit`: clean under strict.
- `vitest run`: 40 tests pass (engine scenarios + UI render smoke).
- `vite build`: succeeds.
- A full 2–5 player hot-seat game is playable start to finish: tile placement with
  rotation, optional follower placement, immediate scoring, end-game scoring of
  incomplete features and farmers, declared winner with tie handling.

## Notes on UI
- Tiles drawn programmatically as SVG (fields/roads/cities/monasteries/pennants).
- Board is pannable (drag) and zoomable (wheel + buttons), start tile centered.
- Legal placements highlighted for the current rotation; hover shows a ghost tile.
- Follower options shown as glowing clickable spots on the just-placed tile.
- Farmers drawn lying flat (rotated diamond) vs upright discs for others.

## Key design decisions
- **Coordinate system:** integer (x,y), start tile D at (0,0). y increases downward
  (screen-style). Neighbours: N=(x,y-1), S=(x,y+1), E=(x+1,y), W=(x-1,y).
- **Rotation:** 0..3 clockwise 90° steps. Edge index [n,e,s,w]; actual edge d shows the
  reference feature at index (dIndex - rot + 4) % 4. Field 8-positions rotate by +2*rot.
- **Feature graph is derived, not persisted.** `computeFeatures(board)` rebuilds the full
  union-find of segments from the board on demand. This keeps `GameState` plain-data and
  trivially testable; performance is a non-issue at 72 tiles.
- **Segments:** each placed tile yields oriented city/road/field segments + optional
  monastery. Union-find merges matching segments across shared edges. Field positions
  connect cross-wise across any non-city shared edge (road or field edge both carry the
  two field positions per side).
- **Completion:** a road/city feature is complete iff every feature edge has a placed
  neighbour across it. Monastery complete iff all 8 surrounding cells occupied.
- **Newly-completed on placement:** road/city features containing the just-placed tile
  that are now complete; monasteries on the placed tile or any of its 8 neighbours.
- **Determinism:** single seeded RNG (mulberry32) shuffles the 71 non-start tiles.

## Open questions / interpretations
- "Unplaceable tile (all players agree)": engine auto-detects when a drawn tile has no
  legal placement+rotation anywhere and discards it, drawing the next. Recorded here as
  an automatic interpretation since hot-seat has no negotiation step.

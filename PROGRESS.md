# Carcassonne — Build Progress

## Branch note
The prompt asked to develop on `claude-code`, but this session's harness mandate is to
develop on `claude/carcassonne-game-j6jeey`. I follow the harness branch and never push
elsewhere. All work happens on `claude/carcassonne-game-j6jeey`.

## Plan / Build order (per DESIGN.md)
1. [x] Project scaffold (Vite + React + TS strict + Vitest)
2. [ ] Engine types + tile dataset loader (tiles.json) + seeded RNG
3. [ ] Board + placement validation (edge matching)
4. [ ] Feature graph + merge + completion detection (roads/cities/monasteries/fields)
5. [ ] Follower placement + legality (merge-then-block)
6. [ ] Immediate scoring + majority/tie + return followers
7. [ ] End-game + final scoring + farmers
8. [ ] Engine unit tests (all DESIGN.md scenarios) — engine fully green before UI
9. [ ] React UI over finished engine
10. [ ] Full-game smoke test + polish

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

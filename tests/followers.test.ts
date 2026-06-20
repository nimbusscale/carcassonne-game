import { describe, expect, it } from 'vitest';
import { placeFollower, placeTile, skipFollower } from '../src/engine/game';
import { board, follower, makeState, players } from './helpers';

describe('follower legality — merge-then-block', () => {
  // Two city fragments, each already holding a knight, about to be joined by a middle tile.
  function setup() {
    const b = board(['E', 1, -1, 0], ['E', 3, 1, 0]); // city-e (left), city-w (right)
    // p0 and p1 already have a knight on the board, so their supply is 6.
    const ps = players(3);
    ps[0]!.supply = 6;
    ps[1]!.supply = 6;
    return makeState({
      board: b,
      players: ps,
      deck: ['F'],
      drawnTile: 'F',
      currentPlayerIndex: 2,
      followers: [
        follower('p0', 'knight', -1, 0, 'c0'),
        follower('p1', 'knight', 1, 0, 'c0'),
      ],
    });
  }

  it('blocks a knight on the just-placed tile when the merged city is already occupied', () => {
    const state = setup();
    const placed = placeTile(state, { x: 0, y: 0, rotation: 0 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    // The merged city already has knights, so c0 must not be a legal follower spot.
    const cityOption = placed.state.followerOptions.find((o) => o.segId === 'c0');
    expect(cityOption).toBeUndefined();
    // Attempting it anyway is rejected.
    const bad = placeFollower(placed.state, 'c0');
    expect(bad.ok).toBe(false);
  });

  it('scores the completed merged city as a tie when resolved', () => {
    const state = setup();
    const placed = placeTile(state, { x: 0, y: 0, rotation: 0 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const resolved = skipFollower(placed.state);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const s = resolved.state;
    // 3-tile city + 1 pennant = 8 to each tied knight.
    expect(s.players.find((p) => p.id === 'p0')!.score).toBe(8);
    expect(s.players.find((p) => p.id === 'p1')!.score).toBe(8);
    // Followers returned to supply after scoring.
    expect(s.players.find((p) => p.id === 'p0')!.supply).toBe(7);
    expect(s.players.find((p) => p.id === 'p1')!.supply).toBe(7);
    expect(s.followers.length).toBe(0);
  });
});

describe('follower placement basics', () => {
  it('places a follower only on a free segment of the just-placed tile', () => {
    const state = makeState({
      board: board(['D', 0, 0, 0]),
      players: players(2),
      deck: ['E'],
      drawnTile: 'E',
    });
    // Place E facing the start tile's south field edge.
    const placed = placeTile(state, { x: 0, y: 1, rotation: 2 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    // E rot2 has city on s; placing a knight on it is legal here.
    const opt = placed.state.followerOptions.find((o) => o.role === 'knight');
    expect(opt).toBeDefined();
    const withMeeple = placeFollower(placed.state, opt!.segId);
    expect(withMeeple.ok).toBe(true);
    if (!withMeeple.ok) return;
    expect(withMeeple.state.players[0]!.supply).toBe(6);
  });
});

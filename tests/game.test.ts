import { describe, expect, it } from 'vitest';
import {
  legalPlacementsFor,
  newGame,
  placeFollower,
  placeTile,
  skipFollower,
  tilesRemaining,
} from '../src/engine/game';
import type { GameState } from '../src/engine/types';

/** Plays a full game with a fixed strategy: place the first legal spot, place a follower
 *  on the first option when available, otherwise skip. Returns the final state. */
function playToCompletion(state: GameState, placeFollowers: boolean): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== 'gameOver') {
    guard++;
    if (guard > 500) throw new Error('Game did not terminate');

    if (s.phase === 'placeTile') {
      const placements = legalPlacementsFor(s);
      expect(placements.length).toBeGreaterThan(0); // never stuck with a placeable tile
      const res = placeTile(s, placements[0]!);
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error(res.reason);
      s = res.state;
    } else if (s.phase === 'placeFollower') {
      if (placeFollowers && s.followerOptions.length > 0) {
        const res = placeFollower(s, s.followerOptions[0]!.segId);
        expect(res.ok).toBe(true);
        if (!res.ok) throw new Error(res.reason);
        s = res.state;
      } else {
        const res = skipFollower(s);
        expect(res.ok).toBe(true);
        if (!res.ok) throw new Error(res.reason);
        s = res.state;
      }
    }
  }
  return s;
}

describe('full-game smoke test', () => {
  it('plays a 3-player game to completion with valid final scoring', () => {
    const start = newGame({
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      seed: 20260620,
    });
    expect(tilesRemaining(start)).toBe(71);

    const final = playToCompletion(start, true);

    expect(final.phase).toBe('gameOver');
    expect(final.finalBreakdown).not.toBeNull();
    expect(final.drawnTile).toBeNull();
    expect(tilesRemaining(final)).toBe(0);

    const fb = final.finalBreakdown!;
    expect(fb.winnerIds.length).toBeGreaterThanOrEqual(1);

    // Winner(s) hold the maximum score.
    const maxScore = Math.max(...final.players.map((p) => p.score));
    for (const id of fb.winnerIds) {
      expect(final.players.find((p) => p.id === id)!.score).toBe(maxScore);
    }

    // Breakdown totals match the score track.
    for (const p of final.players) {
      expect(fb.byPlayer[p.id]!.total).toBe(p.score);
    }

    // Sanity: the board grew and scores are non-negative.
    expect(Object.keys(final.board).length).toBeGreaterThan(10);
    for (const p of final.players) expect(p.score).toBeGreaterThanOrEqual(0);
  });

  it('is reproducible for a fixed seed', () => {
    const a = playToCompletion(
      newGame({ players: [{ name: 'A' }, { name: 'B' }], seed: 999 }),
      true,
    );
    const b = playToCompletion(
      newGame({ players: [{ name: 'A' }, { name: 'B' }], seed: 999 }),
      true,
    );
    expect(a.players.map((p) => p.score)).toEqual(b.players.map((p) => p.score));
    expect(Object.keys(a.board).length).toBe(Object.keys(b.board).length);
  });

  it('produces farm points somewhere across seeds (farmers are scored)', () => {
    let sawFarmPoints = false;
    for (const seed of [1, 2, 3, 7, 11, 42, 100, 2026]) {
      const final = playToCompletion(
        newGame({ players: [{ name: 'A' }, { name: 'B' }], seed }),
        true,
      );
      const farmTotal = Object.values(final.finalBreakdown!.byPlayer).reduce(
        (a, c) => a + c.fields,
        0,
      );
      if (farmTotal > 0) {
        sawFarmPoints = true;
        break;
      }
    }
    expect(sawFarmPoints).toBe(true);
  });
});

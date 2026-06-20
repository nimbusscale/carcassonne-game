import { describe, expect, it } from 'vitest';
import { computeFeatures, followersOnRoot } from '../src/engine/features';
import {
  computeMajority,
  scoreCity,
  scoreMonastery,
  scoreRoad,
} from '../src/engine/scoring';
import { board, follower } from './helpers';

describe('majority / tie', () => {
  it('1-v-1 tie: both players score', () => {
    const r = computeMajority([
      follower('p0', 'knight', 0, 0, 'c0'),
      follower('p1', 'knight', 0, 0, 'c0'),
    ]);
    expect(r.maxCount).toBe(1);
    expect(new Set(r.scorerIds)).toEqual(new Set(['p0', 'p1']));
  });

  it('2-v-1: only the majority scores', () => {
    const r = computeMajority([
      follower('p0', 'knight', 0, 0, 'c0'),
      follower('p0', 'knight', 0, 0, 'c0'),
      follower('p1', 'knight', 0, 0, 'c0'),
    ]);
    expect(r.maxCount).toBe(2);
    expect(r.scorerIds).toEqual(['p0']);
  });
});

describe('city scoring with pennants', () => {
  // E(city-e) | F(city e-w, pennant) | E(city-w), completed: 3 tiles + 1 pennant.
  const b = board(['E', 1, -1, 0], ['F', 0, 0, 0], ['E', 3, 1, 0]);
  const f = computeFeatures(b);
  const city = [...f.cities.values()][0]!;

  it('scores 2/tile + 2/pennant during play', () => {
    const occ = [follower('p0', 'knight', 0, 0, 'c0')];
    const res = scoreCity(city, occ, false);
    expect(res.event.points).toBe(3 * 2 + 1 * 2); // 8
    expect(res.event.scorerIds).toEqual(['p0']);
  });

  it('scores 1/tile + 1/pennant at game end', () => {
    const occ = [follower('p0', 'knight', 0, 0, 'c0')];
    const res = scoreCity(city, occ, true);
    expect(res.event.points).toBe(3 * 1 + 1 * 1); // 4
  });

  it('tie on a shared city: both knights score full points', () => {
    const occ = [
      follower('p0', 'knight', -1, 0, 'c0'),
      follower('p1', 'knight', 1, 0, 'c0'),
    ];
    const res = scoreCity(city, occ, false);
    expect(res.event.points).toBe(8);
    expect(new Set(res.event.scorerIds)).toEqual(new Set(['p0', 'p1']));
    expect(res.followerIds.length).toBe(2);
  });
});

describe('road scoring', () => {
  it('scores 1 point per tile', () => {
    const b = board(['D', 0, 0, 0], ['A', 1, 1, 0], ['A', 3, -1, 0]);
    const f = computeFeatures(b);
    const road = [...f.roads.values()][0]!;
    const occ = [follower('p0', 'thief', 0, 0, 'r0')];
    const res = scoreRoad(road, occ, false);
    expect(res.event.points).toBe(3);
  });
});

describe('monastery scoring', () => {
  const b = board(
    ['B', 0, 0, 0],
    ['B', 0, -1, -1], ['B', 0, 0, -1], ['B', 0, 1, -1],
    ['B', 0, -1, 0], ['B', 0, 1, 0],
    ['B', 0, -1, 1], ['B', 0, 0, 1], ['B', 0, 1, 1],
  );
  const f = computeFeatures(b);
  const mon = f.monasteries.find((m) => m.tileKey === '0,0')!;

  it('scores 9 when completed', () => {
    const occ = [follower('p0', 'monk', 0, 0, 'm')];
    expect(scoreMonastery(mon, occ, false).event.points).toBe(9);
  });

  it('scores 1 per present tile at game end', () => {
    const occ = [follower('p0', 'monk', 0, 0, 'm')];
    expect(scoreMonastery(mon, occ, true).event.points).toBe(9); // 8 surrounding + self
  });

  it('a monk on its own monastery is found via followersOnRoot only for graph features', () => {
    // sanity: monastery occupancy is tracked separately; followersOnRoot won't see 'm'.
    const occ = followersOnRoot([follower('p0', 'monk', 0, 0, 'm')], f, 'nope');
    expect(occ.length).toBe(0);
  });
});

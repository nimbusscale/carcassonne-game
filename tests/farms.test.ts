import { describe, expect, it } from 'vitest';
import { computeFeatures, followersOnRoot, nodeId } from '../src/engine/features';
import { scoreField } from '../src/engine/scoring';
import { board, follower } from './helpers';

// A vertical strip: completed city #1 (top), shared field, completed city #2 (bottom).
//   (0,-1) E rot2  city-s   <- cap for city #1
//   (0, 0) E rot0  city-n + field
//   (0, 1) E rot2  city-s + field   (field merges with the one above)
//   (0, 2) E rot0  city-n   <- cap for city #2
function strip() {
  return board(
    ['E', 2, 0, -1],
    ['E', 0, 0, 0],
    ['E', 2, 0, 1],
    ['E', 0, 0, 2],
  );
}

function fieldRootAt(b: ReturnType<typeof strip>, tileKey: string, segId: string): string {
  const f = computeFeatures(b);
  return f.nodeToRoot.get(nodeId(tileKey, segId))!;
}

describe('farmer / field scoring', () => {
  it('a field touching two completed cities scores 3 per city', () => {
    const b = strip();
    const f = computeFeatures(b);
    const root = fieldRootAt(b, '0,0', 'f0');
    const field = f.fields.get(root)!;
    const completed = [...field.borderCityRoots].filter(
      (r) => f.cities.get(r)?.complete,
    ).length;
    expect(completed).toBe(2);

    const farmers = [follower('p0', 'farmer', 0, 0, 'f0')];
    const occ = followersOnRoot(farmers, f, root);
    expect(occ.length).toBe(1);
    const res = scoreField(occ, completed)!;
    expect(res.event.points).toBe(6); // 3 * 2 completed cities
    expect(res.event.scorerIds).toEqual(['p0']);
  });

  it('tied farmers in one field both score the full amount', () => {
    const b = strip();
    const f = computeFeatures(b);
    const root = fieldRootAt(b, '0,0', 'f0');
    const farmers = [
      follower('p0', 'farmer', 0, 0, 'f0'),
      follower('p1', 'farmer', 0, 1, 'f0'), // same merged field
    ];
    const occ = followersOnRoot(farmers, f, root);
    expect(occ.length).toBe(2);
    const res = scoreField(occ, 2)!;
    expect(res.event.points).toBe(6);
    expect(new Set(res.event.scorerIds)).toEqual(new Set(['p0', 'p1']));
  });

  it('a field touching only an incomplete city scores nothing for that city', () => {
    // Remove the bottom cap so city #2 is incomplete.
    const b = board(['E', 2, 0, -1], ['E', 0, 0, 0], ['E', 2, 0, 1]);
    const f = computeFeatures(b);
    const root = f.nodeToRoot.get(nodeId('0,0', 'f0'))!;
    const field = f.fields.get(root)!;
    const completed = [...field.borderCityRoots].filter(
      (r) => f.cities.get(r)?.complete,
    ).length;
    expect(completed).toBe(1); // only city #1 is completed
    const res = scoreField([follower('p0', 'farmer', 0, 0, 'f0')], completed)!;
    expect(res.event.points).toBe(3);
  });

  it('a field touching no completed city scores nothing', () => {
    const res = scoreField([follower('p0', 'farmer', 0, 0, 'f0')], 0);
    expect(res).toBeNull();
  });
});

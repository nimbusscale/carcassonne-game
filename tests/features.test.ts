import { describe, expect, it } from 'vitest';
import { computeFeatures } from '../src/engine/features';
import { board } from './helpers';

describe('feature graph — roads', () => {
  it('merges a road across tiles and detects completion', () => {
    // D road runs e-w; cap both ends with A (single road stub).
    const b = board(['D', 0, 0, 0], ['A', 1, 1, 0], ['A', 3, -1, 0]);
    const f = computeFeatures(b);
    expect(f.roads.size).toBe(1);
    const road = [...f.roads.values()][0]!;
    expect(road.tileCount).toBe(3);
    expect(road.complete).toBe(true);
  });

  it('leaves a dangling road incomplete', () => {
    const b = board(['D', 0, 0, 0]); // road open on both ends
    const f = computeFeatures(b);
    const road = [...f.roads.values()][0]!;
    expect(road.complete).toBe(false);
  });
});

describe('feature graph — cities', () => {
  it('detects a closed two-tile city', () => {
    const b = board(['E', 2, 0, 0], ['E', 0, 0, 1]); // city-s meets city-n
    const f = computeFeatures(b);
    expect(f.cities.size).toBe(1);
    const city = [...f.cities.values()][0]!;
    expect(city.tileCount).toBe(2);
    expect(city.complete).toBe(true);
    expect(city.pennants).toBe(0);
  });

  it('merges two city fragments through a middle tile and counts a pennant', () => {
    // E(city-e) | F(city e-w, pennant) | E(city-w)
    const b = board(['E', 1, -1, 0], ['F', 0, 0, 0], ['E', 3, 1, 0]);
    const f = computeFeatures(b);
    expect(f.cities.size).toBe(1);
    const city = [...f.cities.values()][0]!;
    expect(city.tileCount).toBe(3);
    expect(city.pennants).toBe(1);
    expect(city.complete).toBe(true);
  });

  it('keeps two separate cities on one tile (H) unconnected', () => {
    const b = board(['H', 0, 0, 0]); // city on e and city on w, separate
    const f = computeFeatures(b);
    expect(f.cities.size).toBe(2);
  });
});

describe('feature graph — monasteries', () => {
  it('completes a monastery when all 8 neighbours are present', () => {
    const b = board(
      ['B', 0, 0, 0],
      ['B', 0, -1, -1],
      ['B', 0, 0, -1],
      ['B', 0, 1, -1],
      ['B', 0, -1, 0],
      ['B', 0, 1, 0],
      ['B', 0, -1, 1],
      ['B', 0, 0, 1],
      ['B', 0, 1, 1],
    );
    const f = computeFeatures(b);
    const center = f.monasteries.find((m) => m.tileKey === '0,0')!;
    expect(center.surroundingCount).toBe(8);
    expect(center.complete).toBe(true);
  });

  it('leaves a monastery incomplete with a missing neighbour', () => {
    const b = board(['B', 0, 0, 0], ['B', 0, 0, -1]);
    const f = computeFeatures(b);
    const center = f.monasteries.find((m) => m.tileKey === '0,0')!;
    expect(center.surroundingCount).toBe(1);
    expect(center.complete).toBe(false);
  });
});

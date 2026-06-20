import { describe, expect, it } from 'vitest';
import { canPlaceAt, legalPlacements } from '../src/engine/board';
import { board } from './helpers';

describe('placement legality', () => {
  const b = board(['D', 0, 0, 0]); // start tile: n=city, e=road, s=field, w=road

  it('rejects placement on an occupied cell', () => {
    expect(canPlaceAt(b, 'B', 0, 0, 0)).toBe(false);
  });

  it('rejects a placement with no neighbour (corner-only / floating)', () => {
    expect(canPlaceAt(b, 'B', 0, 5, 5)).toBe(false);
    // diagonal-only adjacency is not a connection
    expect(canPlaceAt(b, 'B', 0, 1, 1)).toBe(false);
  });

  it('rejects an edge-mismatch', () => {
    // North of D requires a city on the new tile's south edge. B is all field.
    expect(canPlaceAt(b, 'B', 0, 0, -1)).toBe(false);
    // E reference has city on n; to face south we need rotation 2.
    expect(canPlaceAt(b, 'E', 0, 0, -1)).toBe(false);
    expect(canPlaceAt(b, 'E', 2, 0, -1)).toBe(true);
  });

  it('accepts a matching edge', () => {
    // South of D is field; B (all field) fits.
    expect(canPlaceAt(b, 'B', 0, 0, 1)).toBe(true);
    // East of D is road; a tile presenting a road on its west edge fits.
    expect(canPlaceAt(b, 'U', 1, 1, 0)).toBe(true); // U straight road rotated to e-w
  });

  it('enumerates legal placements around the start tile', () => {
    const placements = legalPlacements(b, 'B');
    // B (all-field) can only attach to D's south (field) edge, in all 4 rotations.
    expect(placements.length).toBe(4);
    for (const p of placements) {
      expect(p.x).toBe(0);
      expect(p.y).toBe(1);
    }
  });
});

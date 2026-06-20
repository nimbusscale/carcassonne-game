import { describe, expect, it } from 'vitest';
import {
  TILE_TYPES,
  buildDeck,
  orient,
  rotateEdge,
  rotatePos,
} from '../src/engine/tiles';

describe('tile dataset', () => {
  it('loads 24 tile types summing to 72 copies', () => {
    const ids = Object.keys(TILE_TYPES);
    expect(ids.length).toBe(24);
    const total = Object.values(TILE_TYPES).reduce((a, t) => a + t.count, 0);
    expect(total).toBe(72);
  });

  it('builds a 71-tile draw deck (start tile removed)', () => {
    const deck = buildDeck(123);
    expect(deck.length).toBe(71);
    // Exactly 3 D tiles remain in the deck (4 total minus the start copy).
    expect(deck.filter((id) => id === 'D').length).toBe(3);
  });

  it('is deterministic for a given seed', () => {
    expect(buildDeck(42)).toEqual(buildDeck(42));
    expect(buildDeck(42)).not.toEqual(buildDeck(43));
  });
});

describe('rotation', () => {
  it('rotates edges clockwise', () => {
    expect(rotateEdge('n', 1)).toBe('e');
    expect(rotateEdge('e', 1)).toBe('s');
    expect(rotateEdge('n', 2)).toBe('s');
    expect(rotateEdge('w', 1)).toBe('n');
  });

  it('rotates field positions by two slots per step', () => {
    expect(rotatePos('NW', 1)).toBe('EN');
    expect(rotatePos('NE', 1)).toBe('ES');
    expect(rotatePos('NW', 2)).toBe('SE');
  });

  it('applies rotation to edges and segments together', () => {
    // D: n=city, e=road, s=field, w=road. Rotate once clockwise.
    const ot = orient('D', 1);
    expect(ot.edges.e).toBe('city'); // n -> e
    expect(ot.edges.s).toBe('road'); // e -> s
    expect(ot.edges.w).toBe('field'); // s -> w
    expect(ot.edges.n).toBe('road'); // w -> n
    expect(ot.cities[0]!.edges).toEqual(['e']);
  });
});

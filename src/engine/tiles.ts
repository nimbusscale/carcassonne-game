// Tile dataset loader + rotation / orientation helpers.
// Loads the canonical 72-tile deck from tiles.json; never invents its own deck.

import tilesData from '../../tiles.json';
import { makeRng, shuffle } from './rng';
import type {
  Edge,
  FieldPos,
  PlacedTile,
  Rotation,
  Terrain,
  TileType,
} from './types';

export const EDGES: Edge[] = ['n', 'e', 's', 'w'];

/** Clockwise order of the 8 field positions, two per edge, from top-left. */
export const FIELD_POS_ORDER: FieldPos[] = [
  'NW',
  'NE',
  'EN',
  'ES',
  'SE',
  'SW',
  'WS',
  'WN',
];

interface RawTile {
  id: string;
  name: string;
  count: number;
  isStart?: boolean;
  edges: Record<Edge, Terrain>;
  cloister: boolean;
  cities: { id: string; edges: Edge[]; pennant: boolean }[];
  roads: Edge[][];
  fields: { positions: FieldPos[]; cities: string[] }[];
}

interface RawData {
  deckSize: number;
  startTile: string;
  tiles: RawTile[];
}

const data = tilesData as unknown as RawData;

export const TILE_TYPES: Record<string, TileType> = {};
for (const t of data.tiles) {
  TILE_TYPES[t.id] = {
    id: t.id,
    name: t.name,
    count: t.count,
    isStart: t.isStart,
    edges: t.edges,
    cloister: t.cloister,
    cities: t.cities.map((c) => ({ id: c.id, edges: c.edges, pennant: c.pennant })),
    roads: t.roads.map((r) => r.slice()),
    fields: t.fields.map((f) => ({ positions: f.positions.slice(), cities: f.cities.slice() })),
  };
}

export const START_TILE_ID = data.startTile;
export const DECK_SIZE = data.deckSize;

export function getTileType(id: string): TileType {
  const t = TILE_TYPES[id];
  if (!t) throw new Error(`Unknown tile type: ${id}`);
  return t;
}

/**
 * Build the shuffled draw deck for a new game.
 * Returns the 71 non-start tiles in draw order (index 0 = next to draw).
 * The start tile (one copy of D) is removed and placed at the origin separately.
 */
export function buildDeck(seed: number): string[] {
  const all: string[] = [];
  for (const t of Object.values(TILE_TYPES)) {
    for (let i = 0; i < t.count; i++) all.push(t.id);
  }
  // Remove exactly one copy of the start tile.
  const startIdx = all.indexOf(START_TILE_ID);
  if (startIdx === -1) throw new Error('Start tile not present in deck');
  all.splice(startIdx, 1);
  return shuffle(all, makeRng(seed));
}

// ---- Rotation helpers ----

export function rotateEdge(edge: Edge, rot: Rotation): Edge {
  const idx = EDGES.indexOf(edge);
  return EDGES[(idx + rot) % 4]!;
}

export function rotatePos(pos: FieldPos, rot: Rotation): FieldPos {
  const idx = FIELD_POS_ORDER.indexOf(pos);
  return FIELD_POS_ORDER[(idx + 2 * rot) % 8]!;
}

export const OPPOSITE: Record<Edge, Edge> = { n: 's', s: 'n', e: 'w', w: 'e' };

export function neighborCoord(x: number, y: number, dir: Edge): [number, number] {
  switch (dir) {
    case 'n':
      return [x, y - 1];
    case 's':
      return [x, y + 1];
    case 'e':
      return [x + 1, y];
    case 'w':
      return [x - 1, y];
  }
}

export function key(x: number, y: number): string {
  return `${x},${y}`;
}

// ---- Oriented tile (rotation applied) ----

export interface OrientedCity {
  segId: string; // c0, c1
  edges: Edge[];
  pennant: boolean;
}
export interface OrientedRoad {
  segId: string; // r0, r1...
  edges: Edge[];
}
export interface OrientedField {
  segId: string; // f0, f1...
  positions: FieldPos[];
  cities: string[]; // city local ids (unchanged by rotation)
}

export interface OrientedTile {
  edges: Record<Edge, Terrain>;
  cities: OrientedCity[];
  roads: OrientedRoad[];
  fields: OrientedField[];
  cloister: boolean;
}

const orientedCache = new Map<string, OrientedTile>();

export function orient(typeId: string, rot: Rotation): OrientedTile {
  const cacheKey = `${typeId}:${rot}`;
  const cached = orientedCache.get(cacheKey);
  if (cached) return cached;

  const t = getTileType(typeId);
  const edges = {} as Record<Edge, Terrain>;
  for (const e of EDGES) {
    edges[rotateEdge(e, rot)] = t.edges[e];
  }
  const cities: OrientedCity[] = t.cities.map((c) => ({
    segId: c.id,
    edges: c.edges.map((e) => rotateEdge(e, rot)),
    pennant: c.pennant,
  }));
  const roads: OrientedRoad[] = t.roads.map((r, i) => ({
    segId: `r${i}`,
    edges: r.map((e) => rotateEdge(e, rot)),
  }));
  const fields: OrientedField[] = t.fields.map((f, i) => ({
    segId: `f${i}`,
    positions: f.positions.map((p) => rotatePos(p, rot)),
    cities: f.cities.slice(),
  }));
  const result: OrientedTile = { edges, cities, roads, fields, cloister: t.cloister };
  orientedCache.set(cacheKey, result);
  return result;
}

export function orientPlaced(pt: PlacedTile): OrientedTile {
  return orient(pt.typeId, pt.rotation);
}

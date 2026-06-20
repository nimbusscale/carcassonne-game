// Core domain types for the Carcassonne engine.
// Pure data only — no DOM, no React, no I/O.

export type Edge = 'n' | 'e' | 's' | 'w';
export type Terrain = 'city' | 'road' | 'field';

/** The 8 field positions, two per edge, in clockwise order from top-left. */
export type FieldPos = 'NW' | 'NE' | 'EN' | 'ES' | 'SE' | 'SW' | 'WS' | 'WN';

export type Rotation = 0 | 1 | 2 | 3;

/** Static city segment as defined in tiles.json. */
export interface CityDef {
  id: string; // c0, c1, ...
  edges: Edge[];
  pennant: boolean;
}

/** Static field region as defined in tiles.json (8-position model). */
export interface FieldDef {
  positions: FieldPos[];
  cities: string[]; // ids of city segments this field borders
}

/** Static tile type definition loaded from tiles.json. */
export interface TileType {
  id: string; // A..X
  name: string;
  count: number;
  isStart?: boolean;
  edges: Record<Edge, Terrain>;
  cloister: boolean;
  cities: CityDef[];
  roads: Edge[][]; // each segment is a list of edges
  fields: FieldDef[];
}

/** A tile placed on the board at (x,y) with a rotation. */
export interface PlacedTile {
  typeId: string;
  rotation: Rotation;
  x: number;
  y: number;
}

export type Role = 'thief' | 'knight' | 'monk' | 'farmer';

/** A follower (meeple) currently on the board. */
export interface Follower {
  id: string;
  playerId: string;
  role: Role;
  x: number;
  y: number;
  /** local segment id on the tile: c0/c1 (city), r0/r1.. (road), f0/f1.. (field), m (monastery) */
  segId: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  supply: number; // followers available (starts at 7)
}

export type Phase = 'placeTile' | 'placeFollower' | 'gameOver';

/** Where a follower may legally be placed on the just-placed tile. */
export interface FollowerOption {
  segId: string;
  role: Role;
}

/** A scoring event produced when a feature scores (during play or final). */
export interface ScoreEvent {
  kind: 'road' | 'city' | 'monastery' | 'field';
  points: number; // points awarded to each scoring player
  scorerIds: string[]; // players who scored (majority / tie)
  tileCount: number;
  detail: string;
  final: boolean; // true if produced during end-game scoring
}

export interface GameState {
  players: Player[];
  /** key "x,y" -> placed tile */
  board: Record<string, PlacedTile>;
  followers: Follower[];
  /** remaining tile type ids in draw order (index 0 = next to draw) */
  deck: string[];
  drawnTile: string | null;
  /** coordinate of the tile placed this turn (phase === 'placeFollower') */
  lastPlaced: { x: number; y: number } | null;
  currentPlayerIndex: number;
  phase: Phase;
  seed: number;
  turn: number;
  /** Scoring events from the most recent resolution (for UI feedback). */
  lastEvents: ScoreEvent[];
  /** Legal follower options for the just-placed tile (phase === 'placeFollower'). */
  followerOptions: FollowerOption[];
  /** Set once the game is over: per-player breakdown by category. */
  finalBreakdown: FinalBreakdown | null;
  log: string[];
  nextFollowerId: number;
}

export interface FinalBreakdown {
  /** playerId -> category -> points */
  byPlayer: Record<string, CategoryScores>;
  winnerIds: string[];
}

export interface CategoryScores {
  duringPlay: number; // points already on the score track before final scoring
  incompleteRoads: number;
  incompleteCities: number;
  incompleteMonasteries: number;
  fields: number;
  total: number;
}

/** Result of an engine action. */
export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

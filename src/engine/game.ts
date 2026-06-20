// Game orchestration: new game, place tile, place/skip follower, scoring resolution,
// end-game + final scoring. All actions are pure: they clone state and return the next.

import { Board, canPlaceAt, hasLegalPlacement, legalPlacements, Placement } from './board';
import {
  computeFeatures,
  Features,
  followersOnMonastery,
  followersOnRoot,
  nodeId,
} from './features';
import {
  buildDeck,
  key,
  neighborCoord,
  orient,
  START_TILE_ID,
} from './tiles';
import {
  ScoreResult,
  scoreCity,
  scoreField,
  scoreMonastery,
  scoreRoad,
} from './scoring';
import type {
  ActionResult,
  CategoryScores,
  FinalBreakdown,
  Follower,
  FollowerOption,
  GameState,
  Player,
  Role,
  Rotation,
  ScoreEvent,
} from './types';

export const PLAYER_COLORS = ['#d62728', '#1f77b4', '#2ca02c', '#ffdf00', '#111111'];
export const PLAYER_COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Black'];
const STARTING_SUPPLY = 7;

export interface NewGameOptions {
  players: { name: string; color?: string }[];
  seed: number;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function roleForSeg(segId: string): Role {
  if (segId === 'm') return 'monk';
  if (segId.startsWith('c')) return 'knight';
  if (segId.startsWith('r')) return 'thief';
  if (segId.startsWith('f')) return 'farmer';
  throw new Error(`Cannot derive role for segment ${segId}`);
}

export function newGame(opts: NewGameOptions): GameState {
  const n = opts.players.length;
  if (n < 2 || n > 5) throw new Error('Carcassonne supports 2 to 5 players');

  const players: Player[] = opts.players.map((p, i) => ({
    id: `p${i}`,
    name: p.name.trim() || PLAYER_COLOR_NAMES[i]!,
    color: p.color ?? PLAYER_COLORS[i]!,
    score: 0,
    supply: STARTING_SUPPLY,
  }));

  const board: Board = {};
  board[key(0, 0)] = { typeId: START_TILE_ID, rotation: 0, x: 0, y: 0 };

  const deck = buildDeck(opts.seed);

  const state: GameState = {
    players,
    board,
    followers: [],
    deck,
    drawnTile: null,
    lastPlaced: null,
    currentPlayerIndex: 0,
    phase: 'placeTile',
    seed: opts.seed,
    turn: 1,
    lastEvents: [],
    followerOptions: [],
    finalBreakdown: null,
    log: [`Game started with ${n} players (seed ${opts.seed}).`],
    nextFollowerId: 0,
  };

  drawNext(state);
  if (!state.drawnTile) {
    // Degenerate: nothing drawable — go straight to final scoring.
    finalizeGame(state);
  }
  return state;
}

/** Draw the next placeable tile, discarding any unplaceable ones. Mutates state. */
function drawNext(state: GameState): void {
  while (state.deck.length > 0) {
    const candidate = state.deck[0]!;
    if (hasLegalPlacement(state.board, candidate)) {
      state.deck.shift();
      state.drawnTile = candidate;
      return;
    }
    // Unplaceable: remove from game and try the next.
    state.deck.shift();
    state.log.push(`Tile ${candidate} could not be placed and was discarded.`);
  }
  state.drawnTile = null;
}

export function legalPlacementsFor(state: GameState): Placement[] {
  if (!state.drawnTile) return [];
  return legalPlacements(state.board, state.drawnTile);
}

/** Place the drawn tile. */
export function placeTile(state: GameState, placement: Placement): ActionResult {
  if (state.phase !== 'placeTile') return { ok: false, reason: 'Not in tile-placement phase.' };
  if (!state.drawnTile) return { ok: false, reason: 'No tile to place.' };
  const { x, y, rotation } = placement;
  if (!canPlaceAt(state.board, state.drawnTile, rotation, x, y)) {
    return { ok: false, reason: 'Illegal placement: edges must match an adjacent tile.' };
  }

  const next = clone(state);
  const typeId = next.drawnTile!;
  next.board[key(x, y)] = { typeId, rotation, x, y };
  next.lastPlaced = { x, y };
  next.drawnTile = null;
  next.lastEvents = [];

  const features = computeFeatures(next.board);
  next.followerOptions = computeFollowerOptions(next, features, x, y, rotation);
  next.phase = 'placeFollower';
  next.log.push(
    `${currentPlayer(next).name} placed tile ${typeId} at (${x}, ${y}).`,
  );
  return { ok: true, state: next };
}

function computeFollowerOptions(
  state: GameState,
  features: Features,
  x: number,
  y: number,
  rotation: Rotation,
): FollowerOption[] {
  const player = currentPlayer(state);
  if (player.supply <= 0) return [];
  const typeId = state.board[key(x, y)]!.typeId;
  const ot = orient(typeId, rotation);
  const tileKey = key(x, y);
  const options: FollowerOption[] = [];

  const isFree = (segId: string): boolean => {
    const root = features.nodeToRoot.get(nodeId(tileKey, segId));
    if (root === undefined) return false;
    return followersOnRoot(state.followers, features, root).length === 0;
  };

  for (const c of ot.cities) if (isFree(c.segId)) options.push({ segId: c.segId, role: 'knight' });
  for (const r of ot.roads) if (isFree(r.segId)) options.push({ segId: r.segId, role: 'thief' });
  for (const f of ot.fields) if (isFree(f.segId)) options.push({ segId: f.segId, role: 'farmer' });
  if (ot.cloister) {
    if (followersOnMonastery(state.followers, tileKey).length === 0) {
      options.push({ segId: 'm', role: 'monk' });
    }
  }
  return options;
}

/** Place a follower on a legal segment of the just-placed tile, then resolve the turn. */
export function placeFollower(state: GameState, segId: string): ActionResult {
  if (state.phase !== 'placeFollower') return { ok: false, reason: 'Not in follower phase.' };
  if (!state.lastPlaced) return { ok: false, reason: 'No tile was placed this turn.' };
  const option = state.followerOptions.find((o) => o.segId === segId);
  if (!option) return { ok: false, reason: 'That segment is not a legal follower spot.' };
  const player = currentPlayer(state);
  if (player.supply <= 0) return { ok: false, reason: 'No followers left in supply.' };

  const next = clone(state);
  const np = currentPlayer(next);
  np.supply -= 1;
  const follower: Follower = {
    id: `m${next.nextFollowerId++}`,
    playerId: np.id,
    role: roleForSeg(segId),
    x: next.lastPlaced!.x,
    y: next.lastPlaced!.y,
    segId,
  };
  next.followers.push(follower);
  next.log.push(`${np.name} placed a ${follower.role}.`);
  resolveTurn(next);
  return { ok: true, state: next };
}

/** Decline to place a follower, then resolve the turn. */
export function skipFollower(state: GameState): ActionResult {
  if (state.phase !== 'placeFollower') return { ok: false, reason: 'Not in follower phase.' };
  const next = clone(state);
  resolveTurn(next);
  return { ok: true, state: next };
}

/** Score newly completed features, return followers, advance player, draw next tile. */
function resolveTurn(state: GameState): void {
  const placed = state.lastPlaced!;
  const events = scoreCompletedFeatures(state, placed.x, placed.y);
  state.lastEvents = events;

  // Advance to next player and draw.
  state.followerOptions = [];
  state.lastPlaced = null;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.turn += 1;
  drawNext(state);
  if (!state.drawnTile) {
    finalizeGame(state);
  } else {
    state.phase = 'placeTile';
  }
}

/** Apply a ScoreResult to player scores, returning followers to supply. */
function applyResult(state: GameState, result: ScoreResult): void {
  for (const [pid, pts] of result.awards) {
    const p = state.players.find((pl) => pl.id === pid)!;
    p.score += pts;
  }
  if (result.followerIds.length > 0) {
    const returning = new Set(result.followerIds);
    for (const f of state.followers) {
      if (returning.has(f.id)) {
        const owner = state.players.find((pl) => pl.id === f.playerId)!;
        owner.supply += 1;
      }
    }
    state.followers = state.followers.filter((f) => !returning.has(f.id));
  }
}

/** Score features completed by the tile just placed at (x,y). Mutates state. */
function scoreCompletedFeatures(state: GameState, x: number, y: number): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  const tileKey = key(x, y);

  // Roads & cities: features that include the just-placed tile and are now complete.
  let features = computeFeatures(state.board);

  for (const feat of features.cities.values()) {
    if (!feat.complete || !feat.tileKeys.has(tileKey)) continue;
    const occ = followersOnRoot(state.followers, features, feat.root);
    if (occ.length === 0) continue;
    const result = scoreCity(feat, occ, false);
    applyResult(state, result);
    events.push(result.event);
  }

  for (const feat of features.roads.values()) {
    if (!feat.complete || !feat.tileKeys.has(tileKey)) continue;
    const occ = followersOnRoot(state.followers, features, feat.root);
    if (occ.length === 0) continue;
    const result = scoreRoad(feat, occ, false);
    applyResult(state, result);
    events.push(result.event);
  }

  // Monasteries: the placed tile or any of its 8 neighbours may have completed.
  // Recompute features after each scoring is unnecessary (monasteries don't merge),
  // but recompute monastery occupancy from the (possibly updated) follower list.
  features = computeFeatures(state.board);
  const candidateMonasteryKeys = new Set<string>([tileKey]);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      candidateMonasteryKeys.add(key(x + dx, y + dy));
    }
  }
  for (const mon of features.monasteries) {
    if (!mon.complete || !candidateMonasteryKeys.has(mon.tileKey)) continue;
    const occ = followersOnMonastery(state.followers, mon.tileKey);
    if (occ.length === 0) continue;
    const result = scoreMonastery(mon, occ, false);
    applyResult(state, result);
    events.push(result.event);
  }

  return events;
}

// ---- End-game / final scoring ----

function finalizeGame(state: GameState): void {
  const features = computeFeatures(state.board);
  const finalEvents: ScoreEvent[] = [];

  const breakdown: Record<string, CategoryScores> = {};
  for (const p of state.players) {
    breakdown[p.id] = {
      duringPlay: p.score,
      incompleteRoads: 0,
      incompleteCities: 0,
      incompleteMonasteries: 0,
      fields: 0,
      total: 0,
    };
  }

  const applyAndRecord = (result: ScoreResult, category: keyof CategoryScores): void => {
    applyResult(state, result);
    for (const [pid, pts] of result.awards) {
      const b = breakdown[pid]!;
      (b[category] as number) += pts;
    }
    finalEvents.push(result.event);
  };

  // Incomplete roads.
  for (const feat of features.roads.values()) {
    if (feat.complete) continue;
    const occ = followersOnRoot(state.followers, features, feat.root);
    if (occ.length === 0) continue;
    applyAndRecord(scoreRoad(feat, occ, true), 'incompleteRoads');
  }

  // Incomplete cities.
  for (const feat of features.cities.values()) {
    if (feat.complete) continue;
    const occ = followersOnRoot(state.followers, features, feat.root);
    if (occ.length === 0) continue;
    applyAndRecord(scoreCity(feat, occ, true), 'incompleteCities');
  }

  // Monasteries that still hold a monk (i.e. incomplete).
  for (const mon of features.monasteries) {
    const occ = followersOnMonastery(state.followers, mon.tileKey);
    if (occ.length === 0) continue;
    applyAndRecord(scoreMonastery(mon, occ, true), 'incompleteMonasteries');
  }

  // Farmers / fields.
  for (const feat of features.fields.values()) {
    const occ = followersOnRoot(state.followers, features, feat.root);
    if (occ.length === 0) continue;
    let completedCities = 0;
    for (const croot of feat.borderCityRoots) {
      const city = features.cities.get(croot);
      if (city && city.complete) completedCities++;
    }
    const result = scoreField(occ, completedCities);
    if (result) applyAndRecord(result, 'fields');
  }

  // Totals + winner.
  for (const p of state.players) {
    breakdown[p.id]!.total = p.score;
  }
  let max = -Infinity;
  for (const p of state.players) if (p.score > max) max = p.score;
  const winnerIds = state.players.filter((p) => p.score === max).map((p) => p.id);

  const fb: FinalBreakdown = { byPlayer: breakdown, winnerIds };
  state.finalBreakdown = fb;
  state.lastEvents = finalEvents;
  state.phase = 'gameOver';
  state.drawnTile = null;
  state.followerOptions = [];
  const winners = winnerIds.map((id) => state.players.find((p) => p.id === id)!.name);
  state.log.push(
    `Game over. ${winners.length > 1 ? 'Tie between' : 'Winner:'} ${winners.join(', ')}.`,
  );
}

// ---- Helpers exposed for UI ----

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex]!;
}

export function tilesRemaining(state: GameState): number {
  return state.deck.length + (state.drawnTile ? 1 : 0);
}

export { computeFeatures, neighborCoord };

import type { Board } from '../src/engine/board';
import type { Follower, GameState, PlacedTile, Player, Rotation } from '../src/engine/types';
import { key } from '../src/engine/tiles';
import { PLAYER_COLORS } from '../src/engine/game';

export type Spec = [typeId: string, rot: Rotation, x: number, y: number];

export function board(...specs: Spec[]): Board {
  const b: Board = {};
  for (const [typeId, rotation, x, y] of specs) {
    const pt: PlacedTile = { typeId, rotation, x, y };
    b[key(x, y)] = pt;
  }
  return b;
}

export function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    color: PLAYER_COLORS[i]!,
    score: 0,
    supply: 7,
  }));
}

/** Build a GameState directly for integration tests (deterministic, no RNG needed). */
export function makeState(opts: {
  board: Board;
  players: Player[];
  deck?: string[];
  drawnTile?: string | null;
  followers?: Follower[];
  currentPlayerIndex?: number;
}): GameState {
  return {
    players: opts.players,
    board: opts.board,
    followers: opts.followers ?? [],
    deck: opts.deck ?? [],
    drawnTile: opts.drawnTile ?? null,
    lastPlaced: null,
    currentPlayerIndex: opts.currentPlayerIndex ?? 0,
    phase: 'placeTile',
    seed: 0,
    turn: 1,
    lastEvents: [],
    followerOptions: [],
    finalBreakdown: null,
    log: [],
    nextFollowerId: 100,
  };
}

let fid = 0;
export function follower(
  playerId: string,
  role: Follower['role'],
  x: number,
  y: number,
  segId: string,
): Follower {
  return { id: `f${fid++}`, playerId, role, x, y, segId };
}

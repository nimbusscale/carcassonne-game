// Board: placement validation and legal-placement enumeration.

import { EDGES, OPPOSITE, key, neighborCoord, orient, orientPlaced } from './tiles';
import type { Edge, FieldPos, PlacedTile, Rotation } from './types';

export type Board = Record<string, PlacedTile>;

/**
 * Field-position pairing across a shared edge in direction `dir`.
 * Returns [myPosition, neighborPosition] pairs that are geometrically adjacent.
 */
export function edgePositionPairs(dir: Edge): [FieldPos, FieldPos][] {
  switch (dir) {
    case 'n':
      return [
        ['NW', 'SW'],
        ['NE', 'SE'],
      ];
    case 's':
      return [
        ['SW', 'NW'],
        ['SE', 'NE'],
      ];
    case 'e':
      return [
        ['EN', 'WN'],
        ['ES', 'WS'],
      ];
    case 'w':
      return [
        ['WN', 'EN'],
        ['WS', 'ES'],
      ];
  }
}

/** Can a tile of `typeId` be placed at (x,y) with `rotation`? */
export function canPlaceAt(
  board: Board,
  typeId: string,
  rotation: Rotation,
  x: number,
  y: number,
): boolean {
  if (board[key(x, y)]) return false; // occupied

  const ot = orient(typeId, rotation);
  let hasNeighbor = false;

  for (const dir of EDGES) {
    const [nx, ny] = neighborCoord(x, y, dir);
    const neighbor = board[key(nx, ny)];
    if (!neighbor) continue;
    hasNeighbor = true;
    const myTerrain = ot.edges[dir];
    const theirTerrain = orientPlaced(neighbor).edges[OPPOSITE[dir]];
    if (myTerrain !== theirTerrain) return false;
  }

  return hasNeighbor;
}

export interface Placement {
  x: number;
  y: number;
  rotation: Rotation;
}

/** All empty cells adjacent to at least one placed tile. */
export function candidateCells(board: Board): [number, number][] {
  const seen = new Set<string>();
  const cells: [number, number][] = [];
  for (const k in board) {
    const t = board[k]!;
    for (const dir of EDGES) {
      const [nx, ny] = neighborCoord(t.x, t.y, dir);
      const nk = key(nx, ny);
      if (board[nk]) continue;
      if (seen.has(nk)) continue;
      seen.add(nk);
      cells.push([nx, ny]);
    }
  }
  return cells;
}

/** Every legal (x, y, rotation) for a tile type given the current board. */
export function legalPlacements(board: Board, typeId: string): Placement[] {
  const out: Placement[] = [];
  const rotations: Rotation[] = [0, 1, 2, 3];
  for (const [x, y] of candidateCells(board)) {
    for (const rot of rotations) {
      if (canPlaceAt(board, typeId, rot, x, y)) out.push({ x, y, rotation: rot });
    }
  }
  return out;
}

/** Is there at least one legal placement for this tile type? */
export function hasLegalPlacement(board: Board, typeId: string): boolean {
  for (const [x, y] of candidateCells(board)) {
    for (const rot of [0, 1, 2, 3] as Rotation[]) {
      if (canPlaceAt(board, typeId, rot, x, y)) return true;
    }
  }
  return false;
}

// Hard Module 1 & 4: feature graph (merge across tiles), completion detection,
// and field/city border tracking for farmer scoring.
//
// The graph is DERIVED from the board on demand via computeFeatures(). A union-find
// over per-tile segments produces connected components = logical features.

import { Board, edgePositionPairs } from './board';
import { EDGES, OPPOSITE, key, neighborCoord, orientPlaced } from './tiles';
import type { Edge, Follower } from './types';

// ---- Disjoint set ----
class DSU {
  private parent = new Map<string, string>();
  find(a: string): string {
    let root = a;
    while (this.parent.get(root) !== undefined && this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // path-compress
    let cur = a;
    while (this.parent.get(cur) !== undefined && this.parent.get(cur) !== cur) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  add(a: string): void {
    if (!this.parent.has(a)) this.parent.set(a, a);
  }
  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  has(a: string): boolean {
    return this.parent.has(a);
  }
}

export function nodeId(tileKey: string, segId: string): string {
  return `${tileKey}|${segId}`;
}

interface SegRef {
  tileKey: string;
  segId: string;
  x: number;
  y: number;
}

export interface CitySeg extends SegRef {
  edges: Edge[];
  pennant: boolean;
}
export interface RoadSeg extends SegRef {
  edges: Edge[];
}
export interface FieldSeg extends SegRef {
  cities: string[]; // local city ids on this tile
}

export interface CityFeature {
  root: string;
  segs: CitySeg[];
  tileKeys: Set<string>;
  tileCount: number;
  pennants: number;
  complete: boolean;
}
export interface RoadFeature {
  root: string;
  segs: RoadSeg[];
  tileKeys: Set<string>;
  tileCount: number;
  complete: boolean;
}
export interface FieldFeature {
  root: string;
  segs: FieldSeg[];
  /** roots of city features this field borders */
  borderCityRoots: Set<string>;
  complete: boolean; // fields are never "complete"; kept false for uniformity
}
export interface MonasteryFeature {
  tileKey: string;
  x: number;
  y: number;
  surroundingCount: number; // present tiles among the 8 neighbours (excludes self)
  complete: boolean;
}

export interface Features {
  cities: Map<string, CityFeature>;
  roads: Map<string, RoadFeature>;
  fields: Map<string, FieldFeature>;
  monasteries: MonasteryFeature[];
  /** node id -> component root (city/road/field nodes only) */
  nodeToRoot: Map<string, string>;
}

const DIAG_OFFSETS: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function computeFeatures(board: Board): Features {
  const dsu = new DSU();

  // 1. Register all city/road/field nodes.
  for (const k in board) {
    const pt = board[k]!;
    const ot = orientPlaced(pt);
    for (const c of ot.cities) dsu.add(nodeId(k, c.segId));
    for (const r of ot.roads) dsu.add(nodeId(k, r.segId));
    for (const f of ot.fields) dsu.add(nodeId(k, f.segId));
  }

  // 2. Union across shared edges.
  for (const k in board) {
    const pt = board[k]!;
    const ot = orientPlaced(pt);
    for (const dir of EDGES) {
      const [nx, ny] = neighborCoord(pt.x, pt.y, dir);
      const nk = key(nx, ny);
      const neighbor = board[nk];
      if (!neighbor) continue;
      const ont = orientPlaced(neighbor);
      const back = OPPOSITE[dir];

      // City merge
      const myCity = ot.cities.find((c) => c.edges.includes(dir));
      const theirCity = ont.cities.find((c) => c.edges.includes(back));
      if (myCity && theirCity) {
        dsu.union(nodeId(k, myCity.segId), nodeId(nk, theirCity.segId));
      }

      // Road merge
      const myRoad = ot.roads.find((r) => r.edges.includes(dir));
      const theirRoad = ont.roads.find((r) => r.edges.includes(back));
      if (myRoad && theirRoad) {
        dsu.union(nodeId(k, myRoad.segId), nodeId(nk, theirRoad.segId));
      }

      // Field merge (cross-wise position pairing; no-op on city edges)
      for (const [myPos, theirPos] of edgePositionPairs(dir)) {
        const myField = ot.fields.find((f) => f.positions.includes(myPos));
        const theirField = ont.fields.find((f) => f.positions.includes(theirPos));
        if (myField && theirField) {
          dsu.union(nodeId(k, myField.segId), nodeId(nk, theirField.segId));
        }
      }
    }
  }

  // 3. Group nodes by root.
  const cities = new Map<string, CityFeature>();
  const roads = new Map<string, RoadFeature>();
  const fields = new Map<string, FieldFeature>();
  const nodeToRoot = new Map<string, string>();

  const neighborExists = (x: number, y: number, dir: Edge): boolean => {
    const [nx, ny] = neighborCoord(x, y, dir);
    return board[key(nx, ny)] !== undefined;
  };

  for (const k in board) {
    const pt = board[k]!;
    const ot = orientPlaced(pt);

    for (const c of ot.cities) {
      const id = nodeId(k, c.segId);
      const root = dsu.find(id);
      nodeToRoot.set(id, root);
      let feat = cities.get(root);
      if (!feat) {
        feat = {
          root,
          segs: [],
          tileKeys: new Set(),
          tileCount: 0,
          pennants: 0,
          complete: true,
        };
        cities.set(root, feat);
      }
      feat.segs.push({ tileKey: k, segId: c.segId, x: pt.x, y: pt.y, edges: c.edges, pennant: c.pennant });
      feat.tileKeys.add(k);
      if (c.pennant) feat.pennants++;
    }

    for (const r of ot.roads) {
      const id = nodeId(k, r.segId);
      const root = dsu.find(id);
      nodeToRoot.set(id, root);
      let feat = roads.get(root);
      if (!feat) {
        feat = { root, segs: [], tileKeys: new Set(), tileCount: 0, complete: true };
        roads.set(root, feat);
      }
      feat.segs.push({ tileKey: k, segId: r.segId, x: pt.x, y: pt.y, edges: r.edges });
      feat.tileKeys.add(k);
    }

    for (const f of ot.fields) {
      const id = nodeId(k, f.segId);
      const root = dsu.find(id);
      nodeToRoot.set(id, root);
      let feat = fields.get(root);
      if (!feat) {
        feat = { root, segs: [], borderCityRoots: new Set(), complete: false };
        fields.set(root, feat);
      }
      feat.segs.push({ tileKey: k, segId: f.segId, x: pt.x, y: pt.y, cities: f.cities });
    }
  }

  // 4. Completion for cities & roads: every feature edge must have a neighbour.
  for (const feat of cities.values()) {
    feat.tileCount = feat.tileKeys.size;
    feat.complete = feat.segs.every((s) => s.edges.every((d) => neighborExists(s.x, s.y, d)));
  }
  for (const feat of roads.values()) {
    feat.tileCount = feat.tileKeys.size;
    feat.complete = feat.segs.every((s) => s.edges.every((d) => neighborExists(s.x, s.y, d)));
  }

  // 5. Field -> bordering city features.
  for (const feat of fields.values()) {
    for (const s of feat.segs) {
      for (const cityLocalId of s.cities) {
        const cnode = nodeId(s.tileKey, cityLocalId);
        const croot = nodeToRoot.get(cnode);
        if (croot) feat.borderCityRoots.add(croot);
      }
    }
  }

  // 6. Monasteries (not merged).
  const monasteries: MonasteryFeature[] = [];
  for (const k in board) {
    const pt = board[k]!;
    if (!orientPlaced(pt).cloister) continue;
    let count = 0;
    for (const [dx, dy] of DIAG_OFFSETS) {
      if (board[key(pt.x + dx, pt.y + dy)]) count++;
    }
    monasteries.push({
      tileKey: k,
      x: pt.x,
      y: pt.y,
      surroundingCount: count,
      complete: count === 8,
    });
  }

  return { cities, roads, fields, monasteries, nodeToRoot };
}

/** Followers sitting on a given component root. */
export function followersOnRoot(
  followers: Follower[],
  features: Features,
  root: string,
): Follower[] {
  const out: Follower[] = [];
  for (const f of followers) {
    const r = features.nodeToRoot.get(nodeId(key(f.x, f.y), f.segId));
    if (r === root) out.push(f);
  }
  return out;
}

/** Followers sitting on a given monastery tile. */
export function followersOnMonastery(followers: Follower[], tileKey: string): Follower[] {
  return followers.filter((f) => f.segId === 'm' && key(f.x, f.y) === tileKey);
}

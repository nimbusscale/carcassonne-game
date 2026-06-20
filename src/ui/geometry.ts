// Rendering geometry: tile-local coordinates (0..100 viewBox) for edges, field
// positions, and follower anchors. Uses oriented (rotated) tile data.

import { orient } from '../engine/tiles';
import type { Edge, FieldPos, Rotation } from '../engine/types';

export const TILE = 100;

export interface Pt {
  x: number;
  y: number;
}

/** Midpoint of an edge, pushed inward by depth d (0 = on the edge, 50 = centre). */
export function edgeInward(edge: Edge, d: number): Pt {
  switch (edge) {
    case 'n':
      return { x: 50, y: d };
    case 's':
      return { x: 50, y: 100 - d };
    case 'e':
      return { x: 100 - d, y: 50 };
    case 'w':
      return { x: d, y: 50 };
  }
}

export const FIELD_POS_COORD: Record<FieldPos, Pt> = {
  NW: { x: 28, y: 10 },
  NE: { x: 72, y: 10 },
  EN: { x: 90, y: 28 },
  ES: { x: 90, y: 72 },
  SE: { x: 72, y: 90 },
  SW: { x: 28, y: 90 },
  WS: { x: 10, y: 72 },
  WN: { x: 10, y: 28 },
};

function centroid(pts: Pt[]): Pt {
  const n = pts.length || 1;
  return {
    x: pts.reduce((a, p) => a + p.x, 0) / n,
    y: pts.reduce((a, p) => a + p.y, 0) / n,
  };
}

/** Anchor point (in 0..100 tile space) where a follower on `segId` is drawn. */
export function segmentAnchor(typeId: string, rotation: Rotation, segId: string): Pt {
  const ot = orient(typeId, rotation);
  if (segId === 'm') return { x: 50, y: 50 };

  const city = ot.cities.find((c) => c.segId === segId);
  if (city) {
    if (city.edges.length === 0) return { x: 50, y: 50 };
    return centroid(city.edges.map((e) => edgeInward(e, 34)));
  }

  const road = ot.roads.find((r) => r.segId === segId);
  if (road) {
    const pts = road.edges.map((e) => edgeInward(e, 26));
    pts.push({ x: 50, y: 50 });
    return centroid(pts);
  }

  const field = ot.fields.find((f) => f.segId === segId);
  if (field) {
    return centroid(field.positions.map((p) => FIELD_POS_COORD[p]));
  }

  return { x: 50, y: 50 };
}

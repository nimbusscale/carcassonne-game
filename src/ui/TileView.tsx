// Programmatic tile rendering (SVG, no image assets).

import { orient } from '../engine/tiles';
import type { Edge, Rotation } from '../engine/types';
import { edgeInward, Pt, segmentAnchor } from './geometry';

const COLORS = {
  field: '#7cb342',
  fieldDark: '#689f38',
  city: '#d7a574',
  cityWall: '#7c5a3a',
  roadCasing: '#5d4037',
  roadSurface: '#f3ede2',
  monasteryWall: '#e8d9b5',
  monasteryRoof: '#9c4a2f',
  monasteryDoor: '#5d4037',
  pennant: '#2f6fb0',
};

function cityEdgePoly(edge: Edge): Pt[] {
  switch (edge) {
    case 'n':
      return [{ x: 8, y: 0 }, { x: 92, y: 0 }, { x: 66, y: 40 }, { x: 34, y: 40 }];
    case 's':
      return [{ x: 8, y: 100 }, { x: 92, y: 100 }, { x: 66, y: 60 }, { x: 34, y: 60 }];
    case 'e':
      return [{ x: 100, y: 8 }, { x: 100, y: 92 }, { x: 60, y: 66 }, { x: 60, y: 34 }];
    case 'w':
      return [{ x: 0, y: 8 }, { x: 0, y: 92 }, { x: 40, y: 66 }, { x: 40, y: 34 }];
  }
}

const HUB: Pt[] = [
  { x: 34, y: 34 },
  { x: 66, y: 34 },
  { x: 66, y: 66 },
  { x: 34, y: 66 },
];

function polyPath(pts: Pt[]): string {
  return 'M' + pts.map((p) => `${p.x} ${p.y}`).join(' L ') + ' Z';
}

export interface TileGraphicsProps {
  typeId: string;
  rotation: Rotation;
}

/** SVG shapes for a tile, drawn in a 0..100 coordinate box. */
export function TileGraphics({ typeId, rotation }: TileGraphicsProps): JSX.Element {
  const ot = orient(typeId, rotation);

  return (
    <g>
      <rect x={0} y={0} width={100} height={100} fill={COLORS.field} />

      {/* Cities */}
      {ot.cities.map((c) => {
        const subs = c.edges.map((e) => polyPath(cityEdgePoly(e)));
        if (c.edges.length > 1) subs.push(polyPath(HUB));
        return (
          <path
            key={`city-${c.segId}`}
            d={subs.join(' ')}
            fill={COLORS.city}
            stroke={COLORS.cityWall}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        );
      })}

      {/* Pennants */}
      {ot.cities.filter((c) => c.pennant).map((c) => {
        const a = segmentAnchor(typeId, rotation, c.segId);
        return <Pennant key={`pen-${c.segId}`} x={a.x} y={a.y} />;
      })}

      {/* Roads */}
      {ot.roads.map((r) => {
        let d: string;
        if (r.edges.length === 2) {
          const p0 = edgeInward(r.edges[0]!, 0);
          const p1 = edgeInward(r.edges[1]!, 0);
          d = `M ${p0.x} ${p0.y} Q 50 50 ${p1.x} ${p1.y}`;
        } else {
          const p0 = edgeInward(r.edges[0]!, 0);
          d = `M ${p0.x} ${p0.y} L 50 50`;
        }
        return (
          <g key={`road-${r.segId}`}>
            <path d={d} fill="none" stroke={COLORS.roadCasing} strokeWidth={13} strokeLinecap="round" />
            <path d={d} fill="none" stroke={COLORS.roadSurface} strokeWidth={7} strokeLinecap="round" />
          </g>
        );
      })}

      {/* Road junction hub */}
      {needsHub(ot.roads.length, ot.roads) && (
        <>
          <circle cx={50} cy={50} r={8} fill={COLORS.roadCasing} />
          <circle cx={50} cy={50} r={4.5} fill={COLORS.roadSurface} />
        </>
      )}

      {/* Monastery */}
      {ot.cloister && <Monastery />}
    </g>
  );
}

function needsHub(count: number, roads: { edges: Edge[] }[]): boolean {
  if (count >= 3) return true;
  // A lone 1-edge road stub also terminates at a central hub.
  return count === 1 && roads[0]!.edges.length === 1;
}

function Pennant({ x, y }: { x: number; y: number }): JSX.Element {
  const w = 9;
  const h = 11;
  const d = `M ${x - w / 2} ${y - h / 2} L ${x + w / 2} ${y - h / 2} L ${x + w / 2} ${y + h / 4} Q ${x} ${y + h} ${x - w / 2} ${y + h / 4} Z`;
  return <path d={d} fill={COLORS.pennant} stroke="#fff" strokeWidth={1} />;
}

function Monastery(): JSX.Element {
  return (
    <g>
      <rect x={38} y={50} width={24} height={22} fill={COLORS.monasteryWall} stroke={COLORS.monasteryDoor} strokeWidth={1.5} />
      <path d="M 34 50 L 50 36 L 66 50 Z" fill={COLORS.monasteryRoof} stroke={COLORS.monasteryDoor} strokeWidth={1.5} strokeLinejoin="round" />
      <rect x={46} y={60} width={8} height={12} fill={COLORS.monasteryDoor} />
    </g>
  );
}

/** Standalone tile preview (its own SVG element). */
export function TilePreview({
  typeId,
  rotation,
  size = 100,
}: {
  typeId: string;
  rotation: Rotation;
  size?: number;
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', borderRadius: 4 }}>
      <TileGraphics typeId={typeId} rotation={rotation} />
      <rect x={0} y={0} width={100} height={100} fill="none" stroke="#3e2c1c" strokeWidth={2} />
    </svg>
  );
}

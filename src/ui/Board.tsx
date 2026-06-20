import { useEffect, useMemo, useRef, useState } from 'react';
import { canPlaceAt, candidateCells } from '../engine/board';
import { key } from '../engine/tiles';
import type { GameState, Rotation } from '../engine/types';
import { segmentAnchor } from './geometry';
import { TileGraphics } from './TileView';

const TILE = 100;

interface BoardProps {
  state: GameState;
  uiRotation: Rotation;
  onPlaceTile: (x: number, y: number) => void;
  onPlaceFollower: (segId: string) => void;
}

export function Board({ state, uiRotation, onPlaceTile, onPlaceFollower }: BoardProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.9 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const centered = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Centre on the start tile once we know the container size.
  useEffect(() => {
    if (centered.current || size.w === 0) return;
    centered.current = true;
    setView((v) => ({ ...v, x: size.w / 2 - 50 * v.scale, y: size.h / 2 - 50 * v.scale }));
  }, [size]);

  const legalCells = useMemo(() => {
    if (state.phase !== 'placeTile' || !state.drawnTile) return [];
    const out: { x: number; y: number }[] = [];
    for (const [cx, cy] of candidateCells(state.board)) {
      if (canPlaceAt(state.board, state.drawnTile, uiRotation, cx, cy)) out.push({ x: cx, y: cy });
    }
    return out;
  }, [state.board, state.drawnTile, state.phase, uiRotation]);

  const followerAnchors = useMemo(() => {
    return state.followers.map((f) => {
      const pt = state.board[key(f.x, f.y)]!;
      const a = segmentAnchor(pt.typeId, pt.rotation, f.segId);
      const player = state.players.find((p) => p.id === f.playerId)!;
      return { f, wx: f.x * TILE + a.x, wy: f.y * TILE + a.y, color: player.color };
    });
  }, [state.followers, state.board, state.players]);

  const placedTileLast = state.lastPlaced;

  // Pointer handlers for pan.
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      panX: view.x,
      panY: view.y,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setView((v) => ({ ...v, x: drag.current.panX + dx, y: drag.current.panY + dy }));
  };
  const onPointerUp = () => {
    drag.current.active = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const scale = Math.min(2.6, Math.max(0.3, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
    });
  };

  const zoom = (dir: number) =>
    setView((v) => {
      const scale = Math.min(2.6, Math.max(0.3, v.scale * (dir > 0 ? 1.2 : 1 / 1.2)));
      const cx = size.w / 2;
      const cy = size.h / 2;
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });

  const recenter = () =>
    setView((v) => ({ ...v, x: size.w / 2 - 50 * v.scale, y: size.h / 2 - 50 * v.scale }));

  const cellClick = (x: number, y: number) => {
    if (drag.current.moved) return;
    onPlaceTile(x, y);
  };

  const followerOptions = state.phase === 'placeFollower' ? state.followerOptions : [];

  return (
    <div className="board-wrap" ref={containerRef}>
      <svg
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        style={{ touchAction: 'none', cursor: drag.current.active ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
          {/* Placed tiles */}
          {Object.values(state.board).map((pt) => {
            const isLast = placedTileLast && placedTileLast.x === pt.x && placedTileLast.y === pt.y;
            return (
              <g key={key(pt.x, pt.y)} transform={`translate(${pt.x * TILE},${pt.y * TILE})`}>
                <TileGraphics typeId={pt.typeId} rotation={pt.rotation} />
                <rect
                  x={0}
                  y={0}
                  width={TILE}
                  height={TILE}
                  fill="none"
                  stroke={isLast ? '#ffd400' : '#3e2c1c'}
                  strokeWidth={isLast ? 4 : 1.5}
                />
              </g>
            );
          })}

          {/* Legal placement targets */}
          {legalCells.map(({ x, y }) => {
            const isHover = hover === key(x, y);
            return (
              <g
                key={`legal-${key(x, y)}`}
                transform={`translate(${x * TILE},${y * TILE})`}
                onClick={() => cellClick(x, y)}
                onPointerEnter={() => setHover(key(x, y))}
                onPointerLeave={() => setHover((h) => (h === key(x, y) ? null : h))}
                style={{ cursor: 'pointer' }}
              >
                {isHover && state.drawnTile && (
                  <g opacity={0.85}>
                    <TileGraphics typeId={state.drawnTile} rotation={uiRotation} />
                  </g>
                )}
                <rect
                  x={2}
                  y={2}
                  width={TILE - 4}
                  height={TILE - 4}
                  fill={isHover ? 'rgba(255,212,0,0.15)' : 'rgba(46,160,67,0.25)'}
                  stroke="#2ea043"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              </g>
            );
          })}

          {/* Existing followers */}
          {followerAnchors.map(({ f, wx, wy, color }) => (
            <Meeple key={f.id} x={wx} y={wy} color={color} role={f.role} />
          ))}

          {/* Follower placement options on the just-placed tile */}
          {state.lastPlaced &&
            followerOptions.map((opt) => {
              const pt = state.board[key(state.lastPlaced!.x, state.lastPlaced!.y)]!;
              const a = segmentAnchor(pt.typeId, pt.rotation, opt.segId);
              const wx = state.lastPlaced!.x * TILE + a.x;
              const wy = state.lastPlaced!.y * TILE + a.y;
              return (
                <g key={`opt-${opt.segId}`} onClick={() => onPlaceFollower(opt.segId)} style={{ cursor: 'pointer' }}>
                  <circle cx={wx} cy={wy} r={13} fill="rgba(255,255,255,0.55)" stroke="#1b5e20" strokeWidth={2}>
                    <animate attributeName="r" values="11;15;11" dur="1.1s" repeatCount="indefinite" />
                  </circle>
                  <text x={wx} y={wy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1b5e20">
                    {roleLetter(opt.role)}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>

      <div className="board-controls">
        <button onClick={() => zoom(1)} title="Zoom in">+</button>
        <button onClick={() => zoom(-1)} title="Zoom out">−</button>
        <button onClick={recenter} title="Recenter">⌂</button>
      </div>
    </div>
  );
}

function roleLetter(role: string): string {
  return role === 'knight' ? 'K' : role === 'thief' ? 'T' : role === 'monk' ? 'M' : 'F';
}

function Meeple({
  x,
  y,
  color,
  role,
}: {
  x: number;
  y: number;
  color: string;
  role: string;
}): JSX.Element {
  // Farmers lie flat → drawn as a rotated diamond; others as upright discs.
  const stroke = color === '#111111' ? '#ddd' : '#1a1a1a';
  if (role === 'farmer') {
    return (
      <g transform={`translate(${x},${y}) rotate(45)`}>
        <rect x={-8} y={-8} width={16} height={16} rx={2} fill={color} stroke={stroke} strokeWidth={1.5} />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={9} fill={color} stroke={stroke} strokeWidth={1.5} />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">
        {roleLetter(role)}
      </text>
    </g>
  );
}

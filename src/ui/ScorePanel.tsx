import { currentPlayer, tilesRemaining } from '../engine/game';
import type { GameState, Rotation } from '../engine/types';
import { TilePreview } from './TileView';

interface Props {
  state: GameState;
  uiRotation: Rotation;
  onRotate: () => void;
  onSkipFollower: () => void;
  message: string | null;
}

export function ScorePanel({ state, uiRotation, onRotate, onSkipFollower, message }: Props): JSX.Element {
  const cur = currentPlayer(state);
  const isOver = state.phase === 'gameOver';

  return (
    <div className="panel">
      <h1>Carcassonne</h1>

      <div className="players">
        {state.players.map((p) => {
          const active = !isOver && p.id === cur.id;
          return (
            <div key={p.id} className={`player-row${active ? ' active' : ''}`}>
              <span className="swatch" style={{ background: p.color }} />
              <span className="pname">{p.name}</span>
              <span className="meeples" title="Followers in supply">
                {'●'.repeat(p.supply)}
                <span className="meeples-empty">{'○'.repeat(7 - p.supply)}</span>
              </span>
              <span className="score">{p.score}</span>
            </div>
          );
        })}
      </div>

      {!isOver && (
        <div className="turn-box">
          <div className="turn-head">
            <span className="swatch" style={{ background: cur.color }} />
            <strong>{cur.name}</strong>
            <span className="tiles-left">{tilesRemaining(state)} tiles left</span>
          </div>

          {state.phase === 'placeTile' && state.drawnTile && (
            <div className="draw-box">
              <TilePreview typeId={state.drawnTile} rotation={uiRotation} size={108} />
              <div className="draw-actions">
                <button onClick={onRotate}>⟳ Rotate</button>
                <p className="hint">Pick a highlighted square to place this tile.</p>
              </div>
            </div>
          )}

          {state.phase === 'placeFollower' && (
            <div className="follower-box">
              <p className="hint">
                {state.followerOptions.length > 0
                  ? 'Click a glowing spot to place a follower, or skip.'
                  : 'No legal follower spot — skip to continue.'}
              </p>
              <button onClick={onSkipFollower}>Skip follower →</button>
            </div>
          )}
        </div>
      )}

      {message && <div className="message">{message}</div>}

      {state.lastEvents.length > 0 && (
        <div className="events">
          <h3>Scored</h3>
          {state.lastEvents.map((e, i) => {
            const who = e.scorerIds
              .map((id) => state.players.find((p) => p.id === id)!.name)
              .join(', ');
            return (
              <div key={i} className="event">
                <span className={`tag tag-${e.kind}`}>{e.kind}</span>
                {e.detail} — <strong>{e.points}</strong> to {who || '—'}
                {e.scorerIds.length > 1 ? ' (tie)' : ''}
              </div>
            );
          })}
        </div>
      )}

      <details className="log">
        <summary>Game log</summary>
        <div className="log-body">
          {state.log.slice(-40).reverse().map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </details>
    </div>
  );
}

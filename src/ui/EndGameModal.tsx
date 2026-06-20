import type { GameState } from '../engine/types';

export function EndGameModal({
  state,
  onNewGame,
}: {
  state: GameState;
  onNewGame: () => void;
}): JSX.Element | null {
  const fb = state.finalBreakdown;
  if (!fb) return null;

  const winners = fb.winnerIds.map((id) => state.players.find((p) => p.id === id)!);
  const ranked = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Game over</h2>
        <p className="winner">
          {winners.length > 1 ? 'Tie: ' : 'Winner: '}
          {winners.map((w) => (
            <span key={w.id} className="winner-name">
              <span className="swatch" style={{ background: w.color }} />
              {w.name}
            </span>
          ))}
          {winners.length > 1 ? ' (play another game to break the tie)' : ''}
        </p>

        <table className="breakdown">
          <thead>
            <tr>
              <th>Player</th>
              <th>During play</th>
              <th>Roads</th>
              <th>Cities</th>
              <th>Monasteries</th>
              <th>Farms</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => {
              const b = fb.byPlayer[p.id]!;
              return (
                <tr key={p.id} className={fb.winnerIds.includes(p.id) ? 'win' : ''}>
                  <td>
                    <span className="swatch" style={{ background: p.color }} />
                    {p.name}
                  </td>
                  <td>{b.duringPlay}</td>
                  <td>{b.incompleteRoads}</td>
                  <td>{b.incompleteCities}</td>
                  <td>{b.incompleteMonasteries}</td>
                  <td>{b.fields}</td>
                  <td className="total">{b.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="final-note">
          "During play" is points already on the track; the other columns are end-game
          scoring for incomplete features and farmers.
        </p>

        <button className="start-btn" onClick={onNewGame}>
          New game
        </button>
      </div>
    </div>
  );
}

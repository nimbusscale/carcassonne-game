import { useState } from 'react';
import { PLAYER_COLOR_NAMES, PLAYER_COLORS } from '../engine/game';

export interface SetupResult {
  players: { name: string; color: string }[];
  seed: number;
}

export function Setup({ onStart }: { onStart: (r: SetupResult) => void }): JSX.Element {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(['', '', '', '', '']);
  const [seed, setSeed] = useState<string>(String(Math.floor(Math.random() * 1_000_000)));

  const start = () => {
    const players = Array.from({ length: count }, (_, i) => ({
      name: names[i]?.trim() || PLAYER_COLOR_NAMES[i]!,
      color: PLAYER_COLORS[i]!,
    }));
    const seedNum = Number.parseInt(seed, 10);
    onStart({ players, seed: Number.isFinite(seedNum) ? seedNum : Date.now() & 0xffffffff });
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <h1>Carcassonne</h1>
        <p className="subtitle">Hot-seat, 2–5 players. Base game with farmers.</p>

        <label className="field">
          <span>Players</span>
          <div className="count-pick">
            {[2, 3, 4, 5].map((n) => (
              <button key={n} className={count === n ? 'sel' : ''} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </label>

        <div className="names">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="name-row">
              <span className="swatch" style={{ background: PLAYER_COLORS[i] }} />
              <input
                value={names[i]}
                placeholder={PLAYER_COLOR_NAMES[i]}
                onChange={(e) =>
                  setNames((ns) => {
                    const copy = ns.slice();
                    copy[i] = e.target.value;
                    return copy;
                  })
                }
              />
            </div>
          ))}
        </div>

        <label className="field">
          <span>Seed</span>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} className="seed-input" />
        </label>

        <button className="start-btn" onClick={start}>
          Start game
        </button>
      </div>
    </div>
  );
}

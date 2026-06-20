import { useState } from 'react';
import { newGame, placeFollower, placeTile, skipFollower } from './engine/game';
import type { GameState, Rotation } from './engine/types';
import { Board } from './ui/Board';
import { EndGameModal } from './ui/EndGameModal';
import { ScorePanel } from './ui/ScorePanel';
import { Setup, SetupResult } from './ui/Setup';

export default function App(): JSX.Element {
  const [game, setGame] = useState<GameState | null>(null);
  const [uiRotation, setUiRotation] = useState<Rotation>(0);
  const [message, setMessage] = useState<string | null>(null);

  const start = (r: SetupResult) => {
    setGame(newGame(r));
    setUiRotation(0);
    setMessage(null);
  };

  if (!game) return <Setup onStart={start} />;

  const handlePlaceTile = (x: number, y: number) => {
    const res = placeTile(game, { x, y, rotation: uiRotation });
    if (res.ok) {
      setGame(res.state);
      setMessage(null);
    } else {
      setMessage(res.reason);
    }
  };

  const handlePlaceFollower = (segId: string) => {
    const res = placeFollower(game, segId);
    if (res.ok) {
      setGame(res.state);
      setUiRotation(0);
      setMessage(null);
    } else {
      setMessage(res.reason);
    }
  };

  const handleSkip = () => {
    const res = skipFollower(game);
    if (res.ok) {
      setGame(res.state);
      setUiRotation(0);
      setMessage(null);
    } else {
      setMessage(res.reason);
    }
  };

  const rotate = () => setUiRotation((r) => ((r + 1) % 4) as Rotation);

  return (
    <div className="app">
      <Board
        state={game}
        uiRotation={uiRotation}
        onPlaceTile={handlePlaceTile}
        onPlaceFollower={handlePlaceFollower}
      />
      <ScorePanel
        state={game}
        uiRotation={uiRotation}
        onRotate={rotate}
        onSkipFollower={handleSkip}
        message={message}
      />
      {game.phase === 'gameOver' && <EndGameModal state={game} onNewGame={() => setGame(null)} />}
    </div>
  );
}

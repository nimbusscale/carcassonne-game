import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TILE_TYPES } from '../src/engine/tiles';
import { legalPlacementsFor, newGame, placeTile } from '../src/engine/game';
import type { Rotation } from '../src/engine/types';
import { Board } from '../src/ui/Board';
import { ScorePanel } from '../src/ui/ScorePanel';
import { Setup } from '../src/ui/Setup';
import { TileGraphics } from '../src/ui/TileView';

describe('UI renders without throwing', () => {
  it('renders the setup screen', () => {
    const html = renderToStaticMarkup(<Setup onStart={() => {}} />);
    expect(html).toContain('Carcassonne');
  });

  it('renders every tile type at every rotation', () => {
    for (const id of Object.keys(TILE_TYPES)) {
      for (let r = 0 as Rotation; r < 4; r = ((r + 1) as Rotation)) {
        const html = renderToStaticMarkup(
          <svg viewBox="0 0 100 100">
            <TileGraphics typeId={id} rotation={r} />
          </svg>,
        );
        expect(html).toContain('<g>');
      }
    }
  });

  it('renders the in-game board and score panel', () => {
    let state = newGame({ players: [{ name: 'A' }, { name: 'B' }], seed: 5 });
    // Place one tile so the board has a follower phase + last-placed highlight.
    const placement = legalPlacementsFor(state)[0]!;
    const res = placeTile(state, placement);
    if (res.ok) state = res.state;

    const board = renderToStaticMarkup(
      <Board state={state} uiRotation={0} onPlaceTile={() => {}} onPlaceFollower={() => {}} />,
    );
    expect(board).toContain('<svg');

    const panel = renderToStaticMarkup(
      <ScorePanel
        state={state}
        uiRotation={0}
        onRotate={() => {}}
        onSkipFollower={() => {}}
        message={null}
      />,
    );
    expect(panel).toContain('Carcassonne');
  });
});

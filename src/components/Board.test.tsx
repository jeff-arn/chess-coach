import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Board } from './Board';

describe('Board', () => {
  it('renders without crashing for a FEN', () => {
    const { container } = render(
      <Board fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the board at the requested width', () => {
    const { container } = render(
      <Board
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        boardWidth={480}
      />,
    );
    // The board's width now comes from the --board-size custom property (the actual
    // `width: var(--board-size)` rule lives in Board.module.css). The original test
    // asserted style.width directly; this asserts the same intent — the requested
    // width reaches the element — via the custom property that carries it. The numeric
    // boardWidth prop is emitted as rem (boardWidth / 16), so 480 (px-equivalent) maps
    // to 30rem; at the default 16px root font size this is the same 480px on screen.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue('--board-size')).toBe('30rem');
  });
});

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
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('480px');
  });
});

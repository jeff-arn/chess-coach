'use client';

import {
  Chessboard,
  type ChessboardOptions,
  type PieceDropHandlerArgs,
} from 'react-chessboard';

// Wraps react-chessboard@5.10.0. v5 takes a single `options` prop and delivers drops as
// { sourceSquare, targetSquare } (with targetSquare nullable for off-board drops); this
// wrapper keeps a stable (fen, onPieceDrop(from, to), boardWidth) API so the underlying
// library stays swappable. There is no boardWidth option in v5 — the board fills its
// container — so size is set via the wrapping div's runtime-dynamic numeric width
// (allowed by nextjs-react.md for genuinely dynamic numeric inline styles).
type BoardProps = {
  fen: string;
  onPieceDrop?: (from: string, to: string) => boolean;
  boardWidth?: number;
};

export function Board({ fen, onPieceDrop, boardWidth = 360 }: BoardProps) {
  // Build options conditionally: under exactOptionalPropertyTypes, an optional key set to
  // `undefined` is rejected, so omit onPieceDrop entirely when no handler is provided.
  const options: ChessboardOptions = {
    position: fen,
    allowDragging: Boolean(onPieceDrop),
    ...(onPieceDrop && {
      onPieceDrop: ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) =>
        targetSquare ? onPieceDrop(sourceSquare, targetSquare) : false,
    }),
  };

  return (
    <div style={{ width: boardWidth }}>
      <Chessboard options={options} />
    </div>
  );
}

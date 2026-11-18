import type { Board, Square } from './types';
import { key } from './types';

const ORTHO: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Cases atteignables par une dame, une tour ou un fou ; triées par rang puis colonne. */
export const slidingMoves = (board: Board, from: Square): Square[] => {
  const piece = board.pieces.get(key(from));
  if (!piece) return [];
  let dirs: ReadonlyArray<readonly [number, number]>;
  if (piece.kind === 'R') dirs = ORTHO;
  else if (piece.kind === 'B') dirs = DIAG;
  else if (piece.kind === 'Q') dirs = [...ORTHO, ...DIAG];
  else return [];

  const out: Square[] = [];
  for (const [df, dr] of dirs) {
    let file = from.file + df;
    let rank = from.rank + dr;
    while (file >= 0 && file < board.width && rank >= 0 && rank < board.height) {
      const s = { file, rank };
      const k = key(s);
      if (board.blocked.has(k)) break;
      const other = board.pieces.get(k);
      if (other) {
        if (other.color !== piece.color) out.push(s);
        break;
      }
      out.push(s);
      file += df;
      rank += dr;
    }
  }
  return out.sort((p, q) => p.rank - q.rank || p.file - q.file);
};

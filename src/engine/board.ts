import type { Board, Color, Kind, Piece } from './types';

const COLORS = 'wb';
const KINDS = 'KQRBNP';

const parsePiece = (code: string): Piece => {
  const color = code.charAt(0);
  const kind = code.charAt(1);
  if (code.length !== 2 || !COLORS.includes(color) || !KINDS.includes(kind)) {
    throw new Error(`pièce invalide : ${code}`);
  }
  return { color: color as Color, kind: kind as Kind };
};

/** Construit un plateau ; layout du type `{"0,0":"wR"}`, blocked du type `["1,3"]`. */
export const fromLayout = (
  width: number,
  height: number,
  layout: Record<string, string>,
  blocked: string[],
): Board => ({
  width,
  height,
  pieces: new Map(Object.entries(layout).map(([k, code]) => [k, parsePiece(code)])),
  blocked: new Set(blocked),
});

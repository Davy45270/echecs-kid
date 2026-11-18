export type Color = 'w' | 'b';
export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export interface Piece { color: Color; kind: Kind }
export interface Square { file: number; rank: number } // 0-based, rank 0 = bas (côté blancs)
export interface Board {
  width: number;
  height: number;
  pieces: ReadonlyMap<string, Piece>;
  blocked: ReadonlySet<string>;
}
export const key = (s: Square): string => `${s.file},${s.rank}`;

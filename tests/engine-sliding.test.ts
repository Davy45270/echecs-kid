import { describe, expect, it } from 'vitest';
import { fromLayout } from '../src/engine/board';
import { slidingMoves } from '../src/engine/sliding';
import { key } from '../src/engine/types';
import type { Board, Square } from '../src/engine/types';

const sq = (file: number, rank: number): Square => ({ file, rank });
const pairs = (list: Square[]) => list.map((s) => [s.file, s.rank]);

describe('slidingMoves', () => {
  it('rook in an empty 4x4 corner (0,0) reaches the 6 squares of its file and rank', () => {
    const board = fromLayout(4, 4, { '0,0': 'wR' }, []);
    expect(pairs(slidingMoves(board, sq(0, 0)))).toEqual([
      [1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [0, 3],
    ]);
  });

  it('rook stops before a friendly piece and on an enemy piece', () => {
    const board = fromLayout(4, 4, { '0,0': 'wR', '0,2': 'wP', '2,0': 'bP' }, []);
    expect(pairs(slidingMoves(board, sq(0, 0)))).toEqual([[1, 0], [2, 0], [0, 1]]);
  });

  it('rook never passes a rock (blocked square)', () => {
    const board = fromLayout(6, 6, { '1,1': 'wR' }, ['1,3']);
    const moves = pairs(slidingMoves(board, sq(1, 1)));
    expect(moves).toContainEqual([1, 2]);
    expect(moves).not.toContainEqual([1, 3]);
    expect(moves).not.toContainEqual([1, 4]);
    expect(moves).not.toContainEqual([1, 5]);
    // 1 vers le haut (1,2), 1 vers le bas (1,0), 1 à gauche (0,1), 4 à droite (2..5,1)
    expect(moves).toHaveLength(7);
  });

  it('bishop stays on its colour on 5x5', () => {
    const board = fromLayout(5, 5, { '2,2': 'wB' }, []);
    const moves = slidingMoves(board, sq(2, 2));
    expect(pairs(moves)).toEqual([
      [0, 0], [4, 0], [1, 1], [3, 1], [1, 3], [3, 3], [0, 4], [4, 4],
    ]);
    expect(moves.every((s) => (s.file + s.rank) % 2 === 0)).toBe(true);
  });

  it('queen = union of rook and bishop', () => {
    // mulberry32, graine fixe
    let a = 20261118;
    const rnd = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (n: number) => Math.floor(rnd() * n);

    // Référence indépendante : marche rayon par rayon sur un plateau décrit en clair.
    const walk = (
      w: number, h: number, mine: string, others: Map<string, string>, rocks: Set<string>,
      from: [number, number], dirs: [number, number][],
    ): Set<string> => {
      const out = new Set<string>();
      for (const [df, dr] of dirs) {
        let f = from[0] + df;
        let r = from[1] + dr;
        while (f >= 0 && f < w && r >= 0 && r < h) {
          const k = `${f},${r}`;
          if (rocks.has(k)) break;
          const o = others.get(k);
          if (o !== undefined) {
            if (o[0] !== mine) out.add(k);
            break;
          }
          out.add(k);
          f += df;
          r += dr;
        }
      }
      return out;
    };
    const ORTHO: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const DIAG: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    for (let i = 0; i < 30; i++) {
      const w = 4 + int(5);
      const h = 4 + int(5);
      const from: [number, number] = [int(w), int(h)];
      const layout: Record<string, string> = {};
      const others = new Map<string, string>();
      const rocks = new Set<string>();
      const free = () => {
        for (;;) {
          const k = `${int(w)},${int(h)}`;
          if (k !== `${from[0]},${from[1]}` && !others.has(k) && !rocks.has(k)) return k;
        }
      };
      for (let n = int(4); n > 0; n--) {
        const k = free();
        const p = (int(2) === 0 ? 'w' : 'b') + 'P';
        layout[k] = p;
        others.set(k, p);
      }
      for (let n = int(3); n > 0; n--) rocks.add(free());
      layout[`${from[0]},${from[1]}`] = 'wQ';

      const expected = new Set([
        ...walk(w, h, 'w', others, rocks, from, ORTHO),
        ...walk(w, h, 'w', others, rocks, from, DIAG),
      ]);
      const board: Board = fromLayout(w, h, layout, [...rocks]);
      const got = slidingMoves(board, sq(from[0], from[1]));
      expect(new Set(got.map(key))).toEqual(expected);
      expect(got).toHaveLength(expected.size);
    }
  });

  it('returns squares sorted by rank then file', () => {
    const board = fromLayout(4, 4, { '1,1': 'wQ' }, []);
    const moves = slidingMoves(board, sq(1, 1));
    const sorted = [...moves].sort((p, q) => p.rank - q.rank || p.file - q.file);
    expect(moves).toEqual(sorted);
  });
});

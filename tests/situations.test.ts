import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { situationsTour, type Situation } from '../src/content/situations';
import { etatInitial, jouer, solution } from '../src/jeu/deplacer';
import { taillesCase } from '../src/ui/plateau';
import { fromLayout } from '../src/engine/board';
import { slidingMoves } from '../src/engine/sliding';
import { key, type Board, type Square } from '../src/engine/types';

const phrases = JSON.parse(readFileSync('public/voix/phrases.json', 'utf8')) as Record<string, string>;
const sq = (k: string): Square => { const [file, rank] = k.split(',').map(Number); return { file: file!, rank: rank! }; };

// Référence indépendante de src/jeu : le plateau après j cibles atteintes, la tour posée sur `tour`.
function plateau(s: Situation, j: number, tour: string): Board {
    const depart = Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!;
    const layout: Record<string, string> = {};
    for (const [k, p] of Object.entries(s.pieces)) if (k !== depart && !s.cibles.slice(0, j).includes(k)) layout[k] = p;
    layout[tour] = 'wR';
    return fromLayout(s.taille[0], s.taille[1], layout, s.rochers);
}
const coups = (s: Situation, j: number, de: string): string[] => slidingMoves(plateau(s, j, de), sq(de)).map(key);

/** Nombre minimal de coups de la tour pour aller de `de` à la cible j (BFS sur le moteur). */
function distance(s: Situation, j: number, de: string): number {
    const cible = s.cibles[j]!;
    let front = [de]; const vus = new Set(front);
    for (let d = 0; front.length; d++) {
        if (front.includes(cible)) return d;
        const suivant: string[] = [];
        for (const p of front) for (const q of coups(s, j, p)) if (!vus.has(q)) { vus.add(q); suivant.push(q); }
        front = suivant;
    }
    return Infinity;
}

/** Pour chaque coup, les cases légales d'où la cible suivante reste atteignable dans le nombre de coups restant. */
function attendus(s: Situation): string[][] {
    const out: string[][] = [];
    let positions = [Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!];
    for (let j = 0; j < s.cibles.length; j++) {
        let reste = distance(s, j, positions[0]!);
        while (reste > 0) {
            const ok = new Set<string>();
            for (const p of positions) for (const q of coups(s, j, p)) if (distance(s, j, q) <= reste - 1) ok.add(q);
            out.push([...ok].sort());
            positions = [...ok];
            reste--;
        }
        positions = [s.cibles[j]!];
    }
    return out;
}

describe('catalogue du palier Tour', () => {
    it('has 6 train and 4 rochers situations with the expected ids, the first one being a discovery', () => {
        expect(situationsTour.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6].map(n => `tour.train.${n}`).concat([1, 2, 3, 4].map(n => `tour.rochers.${n}`)));
        expect(situationsTour.filter(s => s.decouverte).map(s => s.id)).toEqual(['tour.train.1']);
        for (const s of situationsTour) {
            expect(phrases[s.consigne], s.id).toBeTypeOf('string');
            if (s.jeu === 'rochers') { expect(s.taille).toEqual([6, 6]); expect(s.rochers).toHaveLength(1); expect(s.acceptes).toHaveLength(2); }
        }
    });

    it('hand-written accepted squares equal engine moves that reach the next target', () => {
        for (const s of situationsTour) expect(s.acceptes.map(a => [...a].sort()), s.id).toEqual(attendus(s));
    });

    it('every situation is solvable', () => {
        for (const s of situationsTour) {
            let e = etatInitial();
            let pos = Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!;
            for (const vers of solution(s, 0, pos)) {
                const r = jouer(s, e, pos, vers, 0);
                expect(['avance', 'prise', 'finie'], s.id).toContain(r.effet);
                e = r.etat; pos = vers;
            }
            expect(e.finie, s.id).toBe('seule');
        }
    });

    it('no situation needs more than 3 moves', () => {
        for (const s of situationsTour) {
            expect(s.acceptes.length, s.id).toBeLessThanOrEqual(3);
            expect(attendus(s).length, s.id).toBe(s.acceptes.length);
        }
    });

    it('cells are at least 56 px on 360 px wide portrait for boards up to 6x6', () => {
        for (const n of [4, 5, 6]) {
            const c = taillesCase(360, 740, n);
            expect(c, `${n}x${n}`).toBeGreaterThanOrEqual(56);
            expect(c * n, `${n}x${n}`).toBeLessThanOrEqual(360);
        }
        // Grand écran : les cases grandissent sans déborder de la hauteur.
        expect(taillesCase(1280, 800, 4)).toBeGreaterThan(taillesCase(360, 740, 4));
        expect(taillesCase(1280, 800, 6) * 6).toBeLessThan(800);
    });
});

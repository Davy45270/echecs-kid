import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { situationsTour, type Situation } from '../src/content/situations';
import { coupsLegaux, demoDue, depart, etatInitial, jouer, restantes, solution, trajet, trajetProche } from '../src/jeu/deplacer';
import { taillesCase } from '../src/ui/plateau';
import { fromLayout } from '../src/engine/board';
import { slidingMoves } from '../src/engine/sliding';
import { key, type Board, type Square } from '../src/engine/types';

const phrases = JSON.parse(readFileSync('public/voix/phrases.json', 'utf8')) as Record<string, string>;
const sq = (k: string): Square => { const [file, rank] = k.split(',').map(Number); return { file: file!, rank: rank! }; };

// Référence indépendante de src/jeu : le plateau, les cibles `prises` retirées, la tour posée sur `tour`.
function plateau(s: Situation, prises: string[], tour: string): Board {
    const depart = Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!;
    const layout: Record<string, string> = {};
    for (const [k, p] of Object.entries(s.pieces)) if (k !== depart && !prises.includes(k)) layout[k] = p;
    layout[tour] = 'wR';
    return fromLayout(s.taille[0], s.taille[1], layout, s.rochers);
}
const coups = (s: Situation, prises: string[], de: string): string[] => slidingMoves(plateau(s, prises, de), sq(de)).map(key);

/** Nombre minimal de coups de la tour pour aller de `de` à `cible`, les `prises` retirées (BFS sur le moteur). */
function distance(s: Situation, prises: string[], de: string, cible: string): number {
    let front = [de]; const vus = new Set(front);
    for (let d = 0; front.length; d++) {
        if (front.includes(cible)) return d;
        const suivant: string[] = [];
        for (const p of front) for (const q of coups(s, prises, p)) if (!vus.has(q)) { vus.add(q); suivant.push(q); }
        front = suivant;
    }
    return Infinity;
}

const ordres = (xs: string[]): string[][] => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => ordres(xs.filter((_, j) => j !== i)).map(o => [x, ...o]));

/** Longueur minimale d'une partie qui attrape toutes les cibles, sur tous les ordres possibles. */
function minimum(s: Situation): number {
    const depart = Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!;
    return Math.min(...ordres(s.cibles).map(ordre => {
        let total = 0, pos = depart;
        const prises: string[] = [];
        for (const c of ordre) { total += distance(s, prises, pos, c); prises.push(c); pos = c; }
        return total;
    }));
}

/** Rejoue la solution de référence sur le moteur : chaque coup légal, et les cibles attrapées. */
function rejouer(s: Situation): { legale: boolean; prises: string[] } {
    let pos = Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!;
    const prises: string[] = [];
    for (const q of s.acceptes) {
        if (!coups(s, prises, pos).includes(q)) return { legale: false, prises };
        if (s.cibles.includes(q) && !prises.includes(q)) prises.push(q);
        pos = q;
    }
    return { legale: true, prises };
}

describe('catalogue du palier Tour', () => {
    it('has 6 train and 4 rochers situations with the expected ids, the first one being a discovery', () => {
        expect(situationsTour.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6].map(n => `tour.train.${n}`).concat([1, 2, 3, 4].map(n => `tour.rochers.${n}`)));
        expect(situationsTour.filter(s => s.decouverte).map(s => s.id)).toEqual(['tour.train.1']);
        for (const s of situationsTour) {
            expect(phrases[s.consigne], s.id).toBeTypeOf('string');
            // Une pièce adverse à prendre : la consigne le dit (pas « l'étoile »).
            const prendre = s.cibles.some(c => s.pieces[c]?.startsWith('b'));
            if (s.jeu === 'train') expect(s.consigne, s.id).toBe(prendre ? 'prise.consigne' : 'train.consigne');
            if (s.jeu === 'rochers') { expect(s.taille).toEqual([6, 6]); expect(s.rochers).toHaveLength(1); expect(s.acceptes).toHaveLength(2); }
        }
    });

    it('the hand-written reference solution is legal, collects every target and is minimal', () => {
        for (const s of situationsTour) {
            const r = rejouer(s);
            expect(r.legale, s.id).toBe(true);
            expect([...r.prises].sort(), s.id).toEqual([...s.cibles].sort());
            expect(s.acceptes.length, s.id).toBe(minimum(s));
        }
    });

    it('every enemy piece is a target (a captured piece never has to come back)', () => {
        for (const s of situationsTour)
            for (const [k, p] of Object.entries(s.pieces)) if (p.startsWith('b')) expect(s.cibles, `${s.id} ${k}`).toContain(k);
    });

    it('every reachable state is solvable, and finishing means every target was caught', () => {
        for (const s of situationsTour) {
            // Parcours de tous les états (case, cibles attrapées) atteignables par des coups légaux.
            const vus = new Set<string>();
            const pile = [{ pos: depart(s), at: [] as string[] }];
            while (pile.length) {
                const { pos, at } = pile.pop()!;
                const k = `${pos}|${[...at].sort().join(' ')}`;
                if (vus.has(k)) continue;
                vus.add(k);
                if (at.length === s.cibles.length) continue;
                let e = { ...etatInitial(), atteintes: at, prises: at.filter(c => s.pieces[c]?.startsWith('b')) };
                let p = pos;
                for (const q of solution(s, at, pos)) {
                    const r = jouer(s, e, p, q, 0);
                    expect(['avance', 'prise', 'finie'], `${s.id} ${k}`).toContain(r.effet);
                    e = r.etat; p = q;
                }
                expect(e.finie, `${s.id} ${k}`).not.toBeNull();
                expect(trajetProche(s, at, pos).length, `${s.id} ${k}`).toBeGreaterThan(0);
                expect(trajet(s, at, pos).length, `${s.id} ${k}`).toBeGreaterThan(0);
                const depuis = { ...etatInitial(), atteintes: at, prises: at.filter(c => s.pieces[c]?.startsWith('b')) };
                for (const q of coupsLegaux(s, depuis.prises, pos)) {
                    const r = jouer(s, depuis, pos, q, 0);
                    if (r.effet === 'finie') expect(restantes(s, r.etat), `${s.id} ${k}`).toEqual([]);
                    pile.push({ pos: q, at: r.etat.atteintes });
                }
            }
        }
    });

    it('long wandering ends in the demo', () => {
        const s = situationsTour[3]!;
        let e = etatInitial(); let p = depart(s); let pas = 0;
        while (!demoDue(e) && e.finie === null && pas < 100) {
            const q = coupsLegaux(s, e.prises, p).find(x => !restantes(s, e).includes(x))!;
            e = jouer(s, e, p, q, 0).etat; p = q; pas++;
        }
        expect(demoDue(e)).toBe(true);
    });

    it('every situation is solvable', () => {
        for (const s of situationsTour) {
            let e = etatInitial();
            let pos = Object.keys(s.pieces).find(k => s.pieces[k] === 'wR')!;
            for (const vers of solution(s, [], pos)) {
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
            expect(minimum(s), s.id).toBe(s.acceptes.length);
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

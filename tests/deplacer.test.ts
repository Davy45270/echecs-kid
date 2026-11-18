import { describe, expect, it } from 'vitest';
import { situationsTour, type Situation } from '../src/content/situations';
import { demontrer, depart, etatInitial, jouer, pauseDue, raisonRegle, solution, trajet, VERROU_MS, type Etat } from '../src/jeu/deplacer';

const parId = (id: string): Situation => situationsTour.find(s => s.id === id)!;
const train1 = parId('tour.train.1'); // 4x4, tour en 0,0, étoile en 0,3
const train6 = parId('tour.train.6'); // pion blanc en 0,3
const rochers1 = parId('tour.rochers.1'); // rocher en 3,0, étoile en 5,2

describe('jouer', () => {
    it('illegal rook move → erreur-regle, aide 1', () => {
        const r = jouer(train1, etatInitial(), '0,0', '1,1', 1000);
        expect(r.effet).toBe('erreur-regle');
        expect(r.etat).toEqual({ coup: 0, erreurs: 1, aide: 1, verrouJusqua: 1000 + VERROU_MS, finie: null });
        expect(VERROU_MS).toBe(1500);
        expect(raisonRegle(train1, 0, '0,0', '1,1')).toBe('tour.regle');
        // Sur la ligne mais derrière le rocher, ou derrière son propre pion : « la tour ne passe pas par-dessus ».
        expect(jouer(rochers1, etatInitial(), '0,0', '4,0', 0).effet).toBe('erreur-regle');
        expect(raisonRegle(rochers1, 0, '0,0', '4,0')).toBe('tour.passe-pas');
        expect(raisonRegle(train6, 0, '0,0', '0,5')).toBe('tour.passe-pas');
    });

    it('a legal move that is not accepted → erreur-but', () => {
        const r = jouer(train1, etatInitial(), '0,0', '0,1', 0);
        expect(r.effet).toBe('erreur-but');
        expect(r.etat.coup).toBe(0);
        expect(r.etat.aide).toBe(1);
    });

    it('second error → aide 2 (path hint)', () => {
        const e1 = jouer(train1, etatInitial(), '0,0', '1,1', 0).etat;
        const r = jouer(train1, e1, '0,0', '2,2', VERROU_MS);
        expect(r.effet).toBe('erreur-regle');
        expect(r.etat.aide).toBe(2);
        expect(r.etat.erreurs).toBe(2);
        expect(trajet(train1, 0, '0,0')).toEqual(['0,1', '0,2', '0,3']);
        expect(trajet(rochers1, 0, '0,0')).toEqual(['0,1', '0,2', '1,2', '2,2', '3,2', '4,2', '5,2']);
    });

    it("third error → aide 3 (demo), situation can only finish as 'aidee'", () => {
        let e = etatInitial();
        for (let i = 0; i < 3; i++) e = jouer(train1, e, '0,0', '1,1', i * VERROU_MS).etat;
        expect(e.aide).toBe(3);
        expect(e.finie).toBeNull();
        // Même un bon coup joué après la démonstration ne compte pas comme « seule ».
        const r = jouer(train1, e, '0,0', '0,3', 10 * VERROU_MS);
        expect(r.effet).toBe('finie');
        expect(r.etat.finie).toBe('aidee');
        expect(solution(rochers1, 0, '0,0')).toEqual(['0,2', '5,2']);
        const d = demontrer(rochers1, { ...etatInitial(), erreurs: 3, aide: 3 });
        expect(d.finie).toBe('aidee');
        expect(d.coup).toBe(2);
    });

    it('touches during the 1.5 s lock are ignored and not counted', () => {
        const e1 = jouer(train1, etatInitial(), '0,0', '1,1', 1000).etat;
        for (const t of [1000, 1200, 2000, 2499]) {
            const bad = jouer(train1, e1, '0,0', '2,2', t);
            expect(bad.effet).toBe('ignore');
            expect(bad.etat).toEqual(e1);
            // Même le bon coup attend la fin du verrou : pas de double coup.
            expect(jouer(train1, e1, '0,0', '0,3', t).effet).toBe('ignore');
        }
        expect(jouer(train1, e1, '0,0', '0,3', 2500).effet).toBe('finie');
    });

    it('selecting another own piece is not an error', () => {
        const e = etatInitial();
        const versPion = jouer(train6, e, '0,0', '0,3', 0);
        expect(versPion.effet).toBe('ignore');
        expect(versPion.etat).toEqual(e);
        const depuisPion = jouer(train6, e, '0,3', '1,3', 0);
        expect(depuisPion.effet).toBe('ignore');
        expect(depuisPion.etat).toEqual(e);
        expect(jouer(train6, e, '0,0', '0,0', 0).effet).toBe('ignore');
    });

    it('capturing an enemy target → prise, then the next target', () => {
        const s = parId('tour.train.5');
        const r = jouer(s, etatInitial(), '1,0', '1,4', 0);
        expect(r.effet).toBe('prise');
        expect(jouer(s, r.etat, '1,4', '4,4', 0)).toEqual({ etat: { ...r.etat, coup: 2, finie: 'seule' }, effet: 'finie' });
        // Avant la prise, la tour ne passe pas par-dessus le pion noir.
        expect(raisonRegle(s, 0, '1,0', '1,5')).toBe('tour.passe-pas');
    });

    it('a robot touching random squares always finishes within 3 errors + demo', () => {
        for (let graine = 1; graine <= 200; graine++) {
            // mulberry32 : graine explicite, reproductible.
            let x = graine;
            const hasard = (n: number): number => {
                x = (x + 0x6d2b79f5) | 0;
                let z = Math.imul(x ^ (x >>> 15), 1 | x);
                z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
                return Math.floor((((z ^ (z >>> 14)) >>> 0) / 4294967296) * n);
            };
            const s = situationsTour[hasard(situationsTour.length)]!;
            let e: Etat = etatInitial();
            let pos = depart(s);
            let t = 0;
            for (let pas = 0; pas < 200 && e.finie === null; pas++) {
                if (e.aide === 3) { e = demontrer(s, e); break; }
                const vers = `${hasard(s.taille[0])},${hasard(s.taille[1])}`;
                t += hasard(2000);
                const r = jouer(s, e, pos, vers, t);
                if (r.effet === 'avance' || r.effet === 'prise' || r.effet === 'finie') pos = vers;
                e = r.etat;
            }
            expect(e.finie, `graine ${graine}`).not.toBeNull();
            expect(e.erreurs, `graine ${graine}`).toBeLessThanOrEqual(3);
            if (e.erreurs > 0) expect(e.finie).toBe('aidee');
        }
    });

    it("finishing without any error is 'seule'", () => {
        let e = etatInitial();
        let pos = depart(rochers1);
        for (const vers of ['0,2', '5,2']) { e = jouer(rochers1, e, pos, vers, 0).etat; pos = vers; }
        expect(e).toEqual({ coup: 2, erreurs: 0, aide: 0, verrouJusqua: 0, finie: 'seule' });
    });
});

describe('pause', () => {
    it('is due after 10 situations or 10 minutes', () => {
        expect(pauseDue(9, 0, 9 * 60_000)).toBe(false);
        expect(pauseDue(10, 0, 1000)).toBe(true);
        expect(pauseDue(1, 0, 10 * 60_000)).toBe(true);
    });
});

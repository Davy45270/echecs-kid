import { describe, expect, it } from 'vitest';
import { situationsTour, type Situation } from '../src/content/situations';
import {
    coupsLegaux, demoDue, demontrer, depart, ERRANCE_DEMO, ERRANCE_TRAJET, etatInitial, jouer, pauseDue, plateauCourant, raisonRegle, restantes, solution,
    trajet, trajetProche, VERROU_MS, type Etat
} from '../src/jeu/deplacer';

const parId = (id: string): Situation => situationsTour.find(s => s.id === id)!;
const train1 = parId('tour.train.1'); // 4x4, tour en 0,0, étoile en 0,3
const train2 = parId('tour.train.2'); // 4x4, étoiles en 3,0 et 3,3
const train4 = parId('tour.train.4'); // 6x6, étoiles en 0,5, 5,5, 5,2
const train5 = parId('tour.train.5'); // tour en 1,0, pion noir en 1,4, étoile en 4,4
const train6 = parId('tour.train.6'); // pion blanc en 0,3
const rochers1 = parId('tour.rochers.1'); // rocher en 3,0, étoile en 5,2

/** Joue une suite de cases d'arrivée depuis la case de départ, sans verrou (horloge large). */
function suite(s: Situation, cases: string[], e: Etat = etatInitial(), depuis = depart(s)): { etat: Etat; effets: string[]; pos: string } {
    const effets: string[] = [];
    let pos = depuis;
    let t = 0;
    for (const vers of cases) {
        t += 10 * VERROU_MS;
        const r = jouer(s, e, pos, vers, t);
        effets.push(r.effet);
        e = r.etat;
        if (r.effet === 'avance' || r.effet === 'prise' || r.effet === 'finie') pos = vers;
    }
    return { etat: e, effets, pos };
}

describe('jouer', () => {
    it('illegal rook move → erreur-regle, aide 1', () => {
        const r = jouer(train1, etatInitial(), '0,0', '1,1', 1000);
        expect(r.effet).toBe('erreur-regle');
        expect(r.etat).toEqual({ ...etatInitial(), erreurs: 1, aide: 1, aideeUneFois: true, verrouJusqua: 1000 + VERROU_MS });
        expect(VERROU_MS).toBe(1500);
        expect(raisonRegle(train1, [], '0,0', '1,1')).toBe('tour.regle');
        // Sur la ligne mais derrière le rocher, ou derrière son propre pion : « la tour ne passe pas par-dessus ».
        expect(jouer(rochers1, etatInitial(), '0,0', '4,0', 0).effet).toBe('erreur-regle');
        expect(raisonRegle(rochers1, [], '0,0', '4,0')).toBe('tour.passe-pas');
        expect(raisonRegle(train6, [], '0,0', '0,5')).toBe('tour.passe-pas');
    });

    it('a legal detour is accepted', () => {
        // Un coup légal n'est jamais une erreur : 0,4 n'est pas sur la solution de référence (0,2 puis 5,2).
        const r = jouer(rochers1, etatInitial(), '0,0', '0,4', 0);
        expect(r.effet).toBe('avance');
        expect(r.etat).toEqual({ ...etatInitial(), coup: 1, errance: 1 });
        const { etat, effets } = suite(rochers1, ['0,4', '5,4', '5,2']);
        expect(effets).toEqual(['avance', 'avance', 'finie']);
        expect(etat.finie).toBe('seule');
        expect(etat.erreurs).toBe(0);
    });

    it('stars can be collected in any order', () => {
        // Référence : 3,0 puis 3,3 ; ici 3,3 d'abord (par 0,3), puis 3,0.
        const a = suite(train2, ['0,3', '3,3', '3,0']);
        expect(a.effets).toEqual(['avance', 'avance', 'finie']);
        expect(a.etat.finie).toBe('seule');
        // Trois étoiles dans l'ordre inverse de la référence.
        const b = suite(train4, ['5,0', '5,2', '5,5', '0,5']);
        expect(b.effets).toEqual(['avance', 'avance', 'avance', 'finie']);
        expect(b.etat.atteintes).toEqual(['5,2', '5,5', '0,5']);
        expect(b.etat.finie).toBe('seule');
        // Une pièce adverse cible se prend dans n'importe quel ordre aussi : l'étoile d'abord, puis le pion.
        const c = suite(train5, ['4,0', '4,4', '1,4']);
        expect(c.effets).toEqual(['avance', 'avance', 'finie']);
        expect(c.etat.finie).toBe('seule');
        // Et le pion d'abord : la prise est annoncée.
        expect(suite(train5, ['1,4', '4,4']).effets).toEqual(['prise', 'finie']);
    });

    it('three wandering moves light the path without counting an error', () => {
        expect(ERRANCE_TRAJET).toBe(3);
        const { etat, pos } = suite(train1, ['1,0', '1,1', '2,1']);
        expect(pos).toBe('2,1');
        expect(etat.errance).toBe(3);
        expect(etat.erreurs).toBe(0);
        expect(etat.aide).toBe(0);
        expect(etat.aideeUneFois).toBe(true);
        expect(demoDue(etat)).toBe(false);
        // Le trajet part de la position courante (BFS sur le moteur), pas de la solution de référence.
        expect(trajetProche(train1, etat.atteintes, '2,1')).toEqual(['1,1', '0,1', '0,2', '0,3']);
        const fin = jouer(train1, etat, '2,1', '0,1', 0);
        expect(fin.effet).toBe('avance');
        const r = jouer(train1, fin.etat, '0,1', '0,3', 0);
        expect(r.effet).toBe('finie');
        expect(r.etat.finie).toBe('aidee');
    });

    it('six wandering moves call the demo, which starts from the current position', () => {
        expect(ERRANCE_DEMO).toBe(6);
        const { etat, pos } = suite(train1, ['1,0', '1,1', '2,1', '2,0', '3,0', '3,1']);
        expect(etat.errance).toBe(6);
        expect(demoDue(etat)).toBe(true);
        const demo = solution(train1, etat.atteintes, pos);
        expect(demo).toHaveLength(2);
        expect(demo.at(-1)).toBe('0,3');
        // La démonstration se rejoue légalement depuis la position courante.
        expect(suite(train1, demo, etat, pos).effets.at(-1)).toBe('finie');
        const d = demontrer(train1, etat);
        expect(d.finie).toBe('aidee');
        expect(restantes(train1, d)).toEqual([]);
    });

    it('errors reset after a collected target', () => {
        let e = jouer(train2, etatInitial(), '0,0', '1,1', 0).etat;
        e = jouer(train2, e, '0,0', '2,2', VERROU_MS).etat;
        expect(e.erreurs).toBe(2);
        expect(e.aide).toBe(2);
        const r = jouer(train2, e, '0,0', '3,0', 2 * VERROU_MS);
        expect(r.effet).toBe('avance');
        expect(r.etat).toMatchObject({ erreurs: 0, aide: 0, errance: 0, aideeUneFois: true, atteintes: ['3,0'] });
        // Une nouvelle erreur repart de l'aide 1, pas de la démonstration.
        const r2 = jouer(train2, r.etat, '3,0', '2,1', 10 * VERROU_MS);
        expect(r2.effet).toBe('erreur-regle');
        expect(r2.etat.aide).toBe(1);
        const fin = jouer(train2, r2.etat, '3,0', '3,3', 20 * VERROU_MS);
        expect(fin.effet).toBe('finie');
        expect(fin.etat.finie).toBe('aidee');
    });

    it('second error → aide 2 (path hint)', () => {
        const e1 = jouer(train1, etatInitial(), '0,0', '1,1', 0).etat;
        const r = jouer(train1, e1, '0,0', '2,2', VERROU_MS);
        expect(r.effet).toBe('erreur-regle');
        expect(r.etat.aide).toBe(2);
        expect(r.etat.erreurs).toBe(2);
        expect(trajet(train1, [], '0,0')).toEqual(['0,1', '0,2', '0,3']);
        // Sur la solution de référence : son tracé.
        expect(trajet(rochers1, [], '0,0')).toEqual(['0,1', '0,2', '1,2', '2,2', '3,2', '4,2', '5,2']);
        // Hors de la référence : la cible la plus proche depuis la position courante.
        expect(trajet(rochers1, [], '0,4')).toEqual(trajetProche(rochers1, [], '0,4'));
        expect(trajetProche(rochers1, [], '0,4').at(-1)).toBe('5,2');
    });

    it("third error → aide 3 (demo from the current position), situation can only finish as 'aidee'", () => {
        let e = etatInitial();
        for (let i = 0; i < 3; i++) e = jouer(train1, e, '0,0', '1,1', i * VERROU_MS).etat;
        expect(e.aide).toBe(3);
        expect(demoDue(e)).toBe(true);
        expect(e.finie).toBeNull();
        // Même un bon coup joué après la démonstration ne compte pas comme « seule ».
        const r = jouer(train1, e, '0,0', '0,3', 10 * VERROU_MS);
        expect(r.effet).toBe('finie');
        expect(r.etat.finie).toBe('aidee');
        expect(solution(rochers1, [], '0,0')).toEqual(['0,2', '5,2']);
        // Depuis un détour, la démonstration part de la tour, pas de la case de départ.
        const depuis04 = solution(rochers1, [], '0,4');
        expect(depuis04).toHaveLength(2);
        expect(depuis04.at(-1)).toBe('5,2');
        // Une cible déjà prise n'est plus à démontrer.
        expect(solution(train5, ['1,4'], '1,4')).toEqual(['4,4']);
        const d = demontrer(rochers1, { ...etatInitial(), erreurs: 3, aide: 3 });
        expect(d.finie).toBe('aidee');
        expect(d.atteintes).toEqual(['5,2']);
    });

    it('the demo starts with the lit path: nearest target first', () => {
        for (const s of situationsTour) {
            for (const p of [depart(s), ...coupsLegaux(s, [], depart(s))]) {
                if (s.cibles.includes(p)) continue;
                const demo = solution(s, [], p);
                const premiere = demo.findIndex(q => s.cibles.includes(q));
                const eclaire = trajet(s, [], p);
                expect(eclaire.at(-1), `${s.id} ${p}`).toBe(demo[premiere]);
                for (const q of demo.slice(0, premiere + 1)) expect(eclaire, `${s.id} ${p}`).toContain(q);
            }
        }
    });

    it('a captured piece that is not a target never comes back', () => {
        const s: Situation = { ...train2, id: 'essai', pieces: { '0,0': 'wR', '0,2': 'bP' }, cibles: ['3,3'], acceptes: ['3,0', '3,3'] };
        const r = jouer(s, etatInitial(), '0,0', '0,2', 0);
        expect(r.effet).toBe('avance');
        expect(r.etat.prises).toEqual(['0,2']);
        expect(r.etat.atteintes).toEqual([]);
        // La tour repart : le pion pris n'est plus sur le plateau.
        const plus = jouer(s, r.etat, '0,2', '0,0', 0);
        expect(plateauCourant(s, plus.etat.prises, '0,0').pieces.has('0,2')).toBe(false);
        expect(jouer(s, plus.etat, '0,0', '0,3', 0).effet).toBe('avance');
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

    it('dropping on an own piece says passe-pas without error', () => {
        const e = etatInitial();
        const r = jouer(train6, e, '0,0', '0,3', 0);
        expect(r.effet).toBe('passe-pas');
        expect(r.etat).toEqual(e);
        // Pas de verrou : le coup suivant est joué aussitôt.
        expect(jouer(train6, r.etat, '0,0', '4,0', 0).effet).toBe('avance');
    });

    it('selecting another own piece is not an error', () => {
        const e = etatInitial();
        const depuisPion = jouer(train6, e, '0,3', '1,3', 0);
        expect(depuisPion.effet).toBe('ignore');
        expect(depuisPion.etat).toEqual(e);
        expect(jouer(train6, e, '0,0', '0,0', 0).effet).toBe('ignore');
    });

    it('capturing an enemy target → prise, then the next target', () => {
        const r = jouer(train5, etatInitial(), '1,0', '1,4', 0);
        expect(r.effet).toBe('prise');
        expect(jouer(train5, r.etat, '1,4', '4,4', 0)).toEqual({ etat: { ...r.etat, coup: 2, atteintes: ['1,4', '4,4'], finie: 'seule' }, effet: 'finie' });
        // Avant la prise, la tour ne passe pas par-dessus le pion noir.
        expect(raisonRegle(train5, [], '1,0', '1,5')).toBe('tour.passe-pas');
        // Après la prise, la colonne est libre.
        expect(jouer(train5, r.etat, '1,4', '1,5', 0).effet).toBe('avance');
    });

    it('a robot touching random squares always finishes (3 errors or 6 wandering moves → demo)', () => {
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
                if (demoDue(e)) {
                    // La démonstration part de la position courante et se joue légalement.
                    const demo = solution(s, e.atteintes, pos);
                    expect(demo.length, `graine ${graine}`).toBeGreaterThan(0);
                    e = demontrer(s, e);
                    break;
                }
                const vers = `${hasard(s.taille[0])},${hasard(s.taille[1])}`;
                t += hasard(2000);
                const r = jouer(s, e, pos, vers, t);
                if (r.effet === 'avance' || r.effet === 'prise' || r.effet === 'finie') pos = vers;
                e = r.etat;
            }
            expect(e.finie, `graine ${graine}`).not.toBeNull();
            expect(e.erreurs, `graine ${graine}`).toBeLessThanOrEqual(3);
            expect(e.errance, `graine ${graine}`).toBeLessThanOrEqual(ERRANCE_DEMO);
            if (e.aideeUneFois) expect(e.finie).toBe('aidee');
        }
    });

    it("finishing without any error is 'seule'", () => {
        const { etat } = suite(rochers1, ['0,2', '5,2']);
        expect(etat).toEqual({ ...etatInitial(), coup: 2, atteintes: ['5,2'], finie: 'seule' });
    });
});

describe('pause', () => {
    it('is due after 10 situations or 10 minutes', () => {
        expect(pauseDue(9, 0, 9 * 60_000)).toBe(false);
        expect(pauseDue(10, 0, 1000)).toBe(true);
        expect(pauseDue(1, 0, 10 * 60_000)).toBe(true);
    });
});

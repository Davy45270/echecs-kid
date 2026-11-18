// Gabarit Deplacer : logique pure d'une situation (une pièce à amener sur des cibles), aide graduée.
// L'horloge est injectée (`maintenant`, en ms) : aucun Date ici.
// Un coup LÉGAL n'est jamais une erreur : il est joué. Les cibles s'attrapent dans n'importe quel ordre.
import type { Situation } from '../content/situations';
import { fromLayout } from '../engine/board';
import { slidingMoves } from '../engine/sliding';
import { key, type Board, type Square } from '../engine/types';

export type Etat = {
    /** Coups légaux joués. */
    coup: number;
    /** Cibles déjà attrapées (étoiles cueillies, pièces adverses prises), dans l'ordre où elles l'ont été. */
    atteintes: string[];
    /** Toutes les pièces adverses prises, cibles ou non : elles ne reviennent jamais sur le plateau. */
    prises: string[];
    /** Coups illégaux depuis la dernière cible attrapée. */
    erreurs: number;
    aide: 0 | 1 | 2 | 3;
    /** Coups légaux de suite qui n'attrapent rien. */
    errance: number;
    /** Une aide a été donnée (erreur ou errance) : la situation finira « avec aide ». */
    aideeUneFois: boolean;
    verrouJusqua: number /* ms */;
    finie: null | 'seule' | 'aidee';
};
export type Effet = 'ignore' | 'avance' | 'prise' | 'passe-pas' | 'erreur-regle' | 'finie';

/** Après une erreur, les touchers sont ignorés pendant 1,5 s. */
export const VERROU_MS = 1500;
/** Après 3 coups légaux de suite qui n'attrapent rien, le chemin vers la cible la plus proche s'éclaire. */
export const ERRANCE_TRAJET = 3;
/** Après 6, la démonstration se joue. */
export const ERRANCE_DEMO = 6;
/** Pause proposée après 10 situations ou 10 minutes de séance. */
export const PAUSE_SITUATIONS = 10;
export const PAUSE_MS = 10 * 60_000;

export const etatInitial = (): Etat => ({ coup: 0, atteintes: [], prises: [], erreurs: 0, aide: 0, errance: 0, aideeUneFois: false, verrouJusqua: 0, finie: null });

export const versCase = (k: string): Square => {
    const [file = 0, rank = 0] = k.split(',').map(Number);
    return { file, rank };
};

/** Case de départ de la pièce que l'enfant déplace (la tour blanche). */
export function depart(s: Situation): string {
    const k = Object.keys(s.pieces).find(c => s.pieces[c] === 'wR');
    if (k === undefined) throw new Error(`situation sans tour : ${s.id}`);
    return k;
}

/** Les cibles qui restent à attraper. */
export const restantes = (s: Situation, e: Pick<Etat, 'atteintes'>): string[] => s.cibles.filter(c => !e.atteintes.includes(c));

/** La démonstration est due : 3e erreur, ou 6 coups d'errance. */
export const demoDue = (e: Etat): boolean => e.finie === null && (e.aide === 3 || e.errance >= ERRANCE_DEMO);

/** Le plateau, la tour posée sur `position` ; toute pièce prise (`prises`, cibles atteintes comprises) a disparu. */
export function plateauCourant(s: Situation, prises: string[], position: string): Board {
    const tour = depart(s);
    const layout: Record<string, string> = {};
    for (const [k, p] of Object.entries(s.pieces)) if (k !== tour && !prises.includes(k)) layout[k] = p;
    layout[position] = 'wR';
    return fromLayout(s.taille[0], s.taille[1], layout, s.rochers);
}

export const coupsLegaux = (s: Situation, prises: string[], position: string): string[] =>
    slidingMoves(plateauCourant(s, prises, position), versCase(position)).map(key);

/** Cases strictement entre deux cases d'une même ligne ou colonne (vide sinon). */
function entre(de: string, vers: string): string[] {
    const a = versCase(de), b = versCase(vers);
    if (a.file !== b.file && a.rank !== b.rank) return [];
    const df = Math.sign(b.file - a.file), dr = Math.sign(b.rank - a.rank);
    const out: string[] = [];
    for (let f = a.file + df, r = a.rank + dr; f !== b.file || r !== b.rank; f += df, r += dr) out.push(key({ file: f, rank: r }));
    return out;
}

/** Les cases parcourues par une suite de coups (cases d'arrivée) partie de `depuis`. */
function parcourues(depuis: string, coups: string[]): string[] {
    const out: string[] = [];
    let pos = depuis;
    for (const q of coups) { out.push(...entre(pos, q), q); pos = q; }
    return out;
}

/** Phrase de rappel pour un coup illégal : sur la ligne mais bloqué → « ne passe pas », sinon la règle de la tour. */
export function raisonRegle(s: Situation, prises: string[], de: string, vers: string): 'tour.regle' | 'tour.passe-pas' {
    const a = versCase(de), b = versCase(vers);
    if (de === vers || (a.file !== b.file && a.rank !== b.rank)) return 'tour.regle';
    const board = plateauCourant(s, prises, de);
    const bloque = (k: string): boolean => board.blocked.has(k) || board.pieces.has(k);
    return entre(de, vers).some(bloque) || board.blocked.has(vers) || board.pieces.get(vers)?.color === 'w' ? 'tour.passe-pas' : 'tour.regle';
}

export function jouer(s: Situation, e: Etat, de: string, vers: string, maintenant: number): { etat: Etat; effet: Effet } {
    const ignore = { etat: e, effet: 'ignore' as const };
    if (e.finie !== null || maintenant < e.verrouJusqua || de === vers) return ignore;
    // Toucher une autre pièce à soi, c'est changer de sélection, jamais une erreur.
    if (de !== depart(s) && s.pieces[de]?.startsWith('w')) return ignore;
    const board = plateauCourant(s, [...e.atteintes, ...e.prises], de);
    // Poser la tour sur sa propre pièce : « la tour ne passe pas par-dessus », la tour revient, sans erreur ni verrou.
    if (board.pieces.get(vers)?.color === 'w') return { etat: e, effet: 'passe-pas' };

    const legal = slidingMoves(board, versCase(de)).some(q => key(q) === vers);
    if (!legal) {
        const erreurs = Math.min(3, e.erreurs + 1);
        return {
            etat: { ...e, erreurs, aide: erreurs as 1 | 2 | 3, aideeUneFois: true, verrouJusqua: maintenant + VERROU_MS },
            effet: 'erreur-regle'
        };
    }
    const coup = e.coup + 1;
    const prises = board.pieces.get(vers)?.color === 'b' ? [...e.prises, vers] : e.prises;
    if (!restantes(s, e).includes(vers)) {
        // Coup légal qui n'attrape rien : joué. Au 3e de suite, le chemin s'éclaire et la situation comptera « avec aide ».
        const errance = e.errance + 1;
        return { etat: { ...e, coup, prises, errance, aideeUneFois: e.aideeUneFois || errance >= ERRANCE_TRAJET }, effet: 'avance' };
    }
    // Une cible attrapée : les compteurs d'aide repartent de zéro.
    const atteintes = [...e.atteintes, vers];
    const suite: Etat = { ...e, coup, atteintes, prises, erreurs: 0, aide: 0, errance: 0 };
    if (atteintes.length === s.cibles.length) return { etat: { ...suite, finie: e.aideeUneFois ? 'aidee' : 'seule' }, effet: 'finie' };
    return { etat: suite, effet: board.pieces.get(vers)?.color === 'b' ? 'prise' : 'avance' };
}

/** Plus court chemin (cases d'arrivée) vers la cible restante la plus proche : BFS sur le moteur depuis `depuis`. */
function cheminProche(s: Situation, atteintes: string[], depuis: string, prises: string[] = []): string[] {
    const reste = s.cibles.filter(c => !atteintes.includes(c));
    const otees = [...atteintes, ...prises];
    const parent = new Map<string, string>([[depuis, '']]);
    let front = [depuis];
    while (front.length > 0) {
        const suivant: string[] = [];
        for (const p of front) {
            for (const q of coupsLegaux(s, otees, p)) {
                if (parent.has(q)) continue;
                parent.set(q, p);
                if (reste.includes(q)) {
                    const chemin = [q];
                    for (let x = p; x !== depuis; x = parent.get(x) ?? depuis) chemin.unshift(x);
                    return chemin;
                }
                suivant.push(q);
            }
        }
        front = suivant;
    }
    return [];
}

/**
 * Démonstration : depuis `depuis`, la cible restante la plus proche, puis la suivante la plus proche, etc.
 * Son premier tronçon est exactement le chemin éclairé (`trajet`).
 */
export function solution(s: Situation, atteintes: string[], depuis: string, prises: string[] = []): string[] {
    const out: string[] = [];
    let pos = depuis;
    const faites = [...atteintes];
    while (faites.length < s.cibles.length) {
        const troncon = cheminProche(s, faites, pos, prises);
        const fin = troncon.at(-1);
        if (fin === undefined) break;
        out.push(...troncon);
        faites.push(fin);
        pos = fin;
    }
    return out;
}

/** Cases parcourues jusqu'à la cible restante la plus proche, depuis la position courante (errance). */
export const trajetProche = (s: Situation, atteintes: string[], depuis: string, prises: string[] = []): string[] =>
    parcourues(depuis, cheminProche(s, atteintes, depuis, prises));

/** Aide 2 : le même chemin, celui que la démonstration prendra en premier. */
export const trajet = trajetProche;

/** Après la démonstration (jouée depuis la position courante), la situation est terminée « avec aide ». */
export function demontrer(s: Situation, e: Etat): Etat {
    const reste = restantes(s, e);
    const prises = [...e.prises, ...reste.filter(c => s.pieces[c]?.startsWith('b'))];
    return { ...e, atteintes: [...e.atteintes, ...reste], prises, aideeUneFois: true, finie: 'aidee' };
}

export const pauseDue = (faites: number, debut: number, maintenant: number): boolean =>
    faites >= PAUSE_SITUATIONS || maintenant - debut >= PAUSE_MS;

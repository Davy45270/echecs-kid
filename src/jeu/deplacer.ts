// Gabarit Deplacer : logique pure d'une situation (une pièce à amener sur des cibles), aide graduée.
// L'horloge est injectée (`maintenant`, en ms) : aucun Date ici.
import type { Situation } from '../content/situations';
import { fromLayout } from '../engine/board';
import { slidingMoves } from '../engine/sliding';
import { key, type Board, type Square } from '../engine/types';

export type Etat = { coup: number; erreurs: number; aide: 0 | 1 | 2 | 3; verrouJusqua: number /* ms */; finie: null | 'seule' | 'aidee' };
export type Effet = 'ignore' | 'avance' | 'prise' | 'erreur-regle' | 'erreur-but' | 'finie';

/** Après une erreur, les touchers sont ignorés pendant 1,5 s. */
export const VERROU_MS = 1500;
/** Pause proposée après 10 situations ou 10 minutes de séance. */
export const PAUSE_SITUATIONS = 10;
export const PAUSE_MS = 10 * 60_000;

export const etatInitial = (): Etat => ({ coup: 0, erreurs: 0, aide: 0, verrouJusqua: 0, finie: null });

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

/** Indice de la cible visée au coup `coup` : une cible est atteinte au coup dont les cases acceptées la contiennent. */
export function cibleCourante(s: Situation, coup: number): number {
    let j = 0;
    for (let k = 0; k < coup && k < s.acceptes.length; k++) if (s.acceptes[k]?.includes(s.cibles[j] ?? '')) j++;
    return j;
}

/** Le plateau au coup `coup`, la tour posée sur `position` ; les cibles déjà atteintes ont été prises. */
export function plateauCourant(s: Situation, coup: number, position: string): Board {
    const prises = new Set(s.cibles.slice(0, cibleCourante(s, coup)));
    const tour = depart(s);
    const layout: Record<string, string> = {};
    for (const [k, p] of Object.entries(s.pieces)) if (k !== tour && !prises.has(k)) layout[k] = p;
    layout[position] = 'wR';
    return fromLayout(s.taille[0], s.taille[1], layout, s.rochers);
}

export const coupsLegaux = (s: Situation, coup: number, position: string): string[] =>
    slidingMoves(plateauCourant(s, coup, position), versCase(position)).map(key);

/** Cases strictement entre deux cases d'une même ligne ou colonne (vide sinon). */
function entre(de: string, vers: string): string[] {
    const a = versCase(de), b = versCase(vers);
    if (a.file !== b.file && a.rank !== b.rank) return [];
    const df = Math.sign(b.file - a.file), dr = Math.sign(b.rank - a.rank);
    const out: string[] = [];
    for (let f = a.file + df, r = a.rank + dr; f !== b.file || r !== b.rank; f += df, r += dr) out.push(key({ file: f, rank: r }));
    return out;
}

/** Phrase de rappel pour un coup illégal : sur la ligne mais bloqué → « ne passe pas », sinon la règle de la tour. */
export function raisonRegle(s: Situation, coup: number, de: string, vers: string): 'tour.regle' | 'tour.passe-pas' {
    const a = versCase(de), b = versCase(vers);
    if (de === vers || (a.file !== b.file && a.rank !== b.rank)) return 'tour.regle';
    const board = plateauCourant(s, coup, de);
    const bloque = (k: string): boolean => board.blocked.has(k) || board.pieces.has(k);
    return entre(de, vers).some(bloque) || board.blocked.has(vers) || board.pieces.get(vers)?.color === 'w' ? 'tour.passe-pas' : 'tour.regle';
}

export function jouer(s: Situation, e: Etat, de: string, vers: string, maintenant: number): { etat: Etat; effet: Effet } {
    const ignore = { etat: e, effet: 'ignore' as const };
    if (e.finie !== null || maintenant < e.verrouJusqua || de === vers || e.coup >= s.acceptes.length) return ignore;
    // Toucher une autre pièce à soi, c'est changer de sélection, jamais une erreur.
    if (de !== depart(s) && s.pieces[de]?.startsWith('w')) return ignore;
    const board = plateauCourant(s, e.coup, de);
    if (board.pieces.get(vers)?.color === 'w') return ignore;

    const legal = slidingMoves(board, versCase(de)).some(q => key(q) === vers);
    if (!legal || !s.acceptes[e.coup]?.includes(vers)) {
        const erreurs = Math.min(3, e.erreurs + 1);
        return {
            etat: { ...e, erreurs, aide: erreurs as 1 | 2 | 3, verrouJusqua: maintenant + VERROU_MS },
            effet: legal ? 'erreur-but' : 'erreur-regle'
        };
    }
    const coup = e.coup + 1;
    if (coup === s.acceptes.length) return { etat: { ...e, coup, finie: e.aide === 0 ? 'seule' : 'aidee' }, effet: 'finie' };
    const prise = board.pieces.get(vers)?.color === 'b';
    return { etat: { ...e, coup }, effet: prise ? 'prise' : 'avance' };
}

/** Cases d'arrivée qui terminent la situation depuis `depuis`, en partant du coup `coup`. */
export function solution(s: Situation, coup: number, depuis: string): string[] {
    const out: string[] = [];
    let pos = depuis;
    for (let i = coup; i < s.acceptes.length; i++) {
        const legaux = coupsLegaux(s, i, pos);
        const suivant = (s.acceptes[i] ?? []).find(q => legaux.includes(q));
        if (suivant === undefined) break;
        out.push(suivant);
        pos = suivant;
    }
    return out;
}

/** Les cases parcourues jusqu'à la prochaine cible (aide 2 : le trajet s'éclaire). */
export function trajet(s: Situation, coup: number, depuis: string): string[] {
    const j = cibleCourante(s, coup);
    const out: string[] = [];
    let pos = depuis;
    for (const q of solution(s, coup, depuis)) {
        out.push(...entre(pos, q), q);
        pos = q;
        if (q === s.cibles[j]) break;
    }
    return out;
}

/** Après la démonstration (aide 3), la situation est terminée « avec aide ». */
export const demontrer = (s: Situation, e: Etat): Etat => ({ ...e, coup: s.acceptes.length, finie: 'aidee' });

export const pauseDue = (faites: number, debut: number, maintenant: number): boolean =>
    faites >= PAUSE_SITUATIONS || maintenant - debut >= PAUSE_MS;

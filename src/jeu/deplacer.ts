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

export const etatInitial = (): Etat => ({ coup: 0, atteintes: [], erreurs: 0, aide: 0, errance: 0, aideeUneFois: false, verrouJusqua: 0, finie: null });

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

/** Le plateau, la tour posée sur `position` ; les pièces adverses déjà prises (`atteintes`) ont disparu. */
export function plateauCourant(s: Situation, atteintes: string[], position: string): Board {
    const tour = depart(s);
    const layout: Record<string, string> = {};
    for (const [k, p] of Object.entries(s.pieces)) if (k !== tour && !atteintes.includes(k)) layout[k] = p;
    layout[position] = 'wR';
    return fromLayout(s.taille[0], s.taille[1], layout, s.rochers);
}

export const coupsLegaux = (s: Situation, atteintes: string[], position: string): string[] =>
    slidingMoves(plateauCourant(s, atteintes, position), versCase(position)).map(key);

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
export function raisonRegle(s: Situation, atteintes: string[], de: string, vers: string): 'tour.regle' | 'tour.passe-pas' {
    const a = versCase(de), b = versCase(vers);
    if (de === vers || (a.file !== b.file && a.rank !== b.rank)) return 'tour.regle';
    const board = plateauCourant(s, atteintes, de);
    const bloque = (k: string): boolean => board.blocked.has(k) || board.pieces.has(k);
    return entre(de, vers).some(bloque) || board.blocked.has(vers) || board.pieces.get(vers)?.color === 'w' ? 'tour.passe-pas' : 'tour.regle';
}

export function jouer(s: Situation, e: Etat, de: string, vers: string, maintenant: number): { etat: Etat; effet: Effet } {
    const ignore = { etat: e, effet: 'ignore' as const };
    if (e.finie !== null || maintenant < e.verrouJusqua || de === vers) return ignore;
    // Toucher une autre pièce à soi, c'est changer de sélection, jamais une erreur.
    if (de !== depart(s) && s.pieces[de]?.startsWith('w')) return ignore;
    const board = plateauCourant(s, e.atteintes, de);
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
    if (!restantes(s, e).includes(vers)) {
        // Coup légal qui n'attrape rien : joué. Au 3e de suite, le chemin s'éclaire et la situation comptera « avec aide ».
        const errance = e.errance + 1;
        return { etat: { ...e, coup, errance, aideeUneFois: e.aideeUneFois || errance >= ERRANCE_TRAJET }, effet: 'avance' };
    }
    // Une cible attrapée : les compteurs d'aide repartent de zéro.
    const atteintes = [...e.atteintes, vers];
    const suite: Etat = { ...e, coup, atteintes, erreurs: 0, aide: 0, errance: 0 };
    if (atteintes.length === s.cibles.length) return { etat: { ...suite, finie: e.aideeUneFois ? 'aidee' : 'seule' }, effet: 'finie' };
    return { etat: suite, effet: board.pieces.get(vers)?.color === 'b' ? 'prise' : 'avance' };
}

/** Si l'enfant suit la solution de référence (même case, mêmes cibles attrapées), ce qu'il en reste ; sinon undefined. */
function resteReference(s: Situation, atteintes: string[], depuis: string): string[] | undefined {
    const voulu = [...atteintes].sort().join(' ');
    let pos = depart(s);
    const prises: string[] = [];
    for (let k = 0; k <= s.acceptes.length; k++) {
        if (pos === depuis && [...prises].sort().join(' ') === voulu) return s.acceptes.slice(k);
        const q = s.acceptes[k];
        if (q === undefined) break;
        if (s.cibles.includes(q) && !prises.includes(q)) prises.push(q);
        pos = q;
    }
    return undefined;
}

/** Plus court chemin (cases d'arrivée) vers la cible restante la plus proche : BFS sur le moteur depuis `depuis`. */
function cheminProche(s: Situation, atteintes: string[], depuis: string): string[] {
    const reste = s.cibles.filter(c => !atteintes.includes(c));
    const parent = new Map<string, string>([[depuis, '']]);
    let front = [depuis];
    while (front.length > 0) {
        const suivant: string[] = [];
        for (const p of front) {
            for (const q of coupsLegaux(s, atteintes, p)) {
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

/** Plus courte partie (cases d'arrivée) qui attrape toutes les cibles restantes, dans le meilleur ordre (BFS). */
function cheminComplet(s: Situation, atteintes: string[], depuis: string): string[] {
    type Noeud = { pos: string; prises: string[]; chemin: string[] };
    const cle = (n: Noeud): string => `${n.pos}|${[...n.prises].sort().join(' ')}`;
    let front: Noeud[] = [{ pos: depuis, prises: atteintes, chemin: [] }];
    const vus = new Set(front.map(cle));
    while (front.length > 0) {
        const suivant: Noeud[] = [];
        for (const n of front) {
            if (n.prises.length === s.cibles.length) return n.chemin;
            for (const q of coupsLegaux(s, n.prises, n.pos)) {
                const prises = s.cibles.includes(q) && !n.prises.includes(q) ? [...n.prises, q] : n.prises;
                const m = { pos: q, prises, chemin: [...n.chemin, q] };
                if (vus.has(cle(m))) continue;
                vus.add(cle(m));
                suivant.push(m);
            }
        }
        front = suivant;
    }
    return [];
}

/** Cases d'arrivée qui terminent la situation depuis `depuis` : la référence si l'enfant la suit, sinon un BFS. */
export const solution = (s: Situation, atteintes: string[], depuis: string): string[] =>
    resteReference(s, atteintes, depuis) ?? cheminComplet(s, atteintes, depuis);

/** Cases parcourues jusqu'à la cible restante la plus proche, depuis la position courante (errance). */
export const trajetProche = (s: Situation, atteintes: string[], depuis: string): string[] =>
    parcourues(depuis, cheminProche(s, atteintes, depuis));

/** Aide 2 : les cases parcourues jusqu'à la prochaine cible (la référence si l'enfant la suit, sinon la plus proche). */
export function trajet(s: Situation, atteintes: string[], depuis: string): string[] {
    const ref = resteReference(s, atteintes, depuis);
    if (ref === undefined) return trajetProche(s, atteintes, depuis);
    const i = ref.findIndex(q => s.cibles.includes(q) && !atteintes.includes(q));
    return parcourues(depuis, ref.slice(0, i + 1));
}

/** Après la démonstration (jouée depuis la position courante), la situation est terminée « avec aide ». */
export const demontrer = (s: Situation, e: Etat): Etat => ({ ...e, atteintes: [...e.atteintes, ...restantes(s, e)], aideeUneFois: true, finie: 'aidee' });

export const pauseDue = (faites: number, debut: number, maintenant: number): boolean =>
    faites >= PAUSE_SITUATIONS || maintenant - debut >= PAUSE_MS;

// Catalogue des situations du gabarit Deplacer : types, et lecture défensive du JSON écrit à la main.
import tour from '../../public/contenu/tour.json';

export interface Situation {
    id: string;
    jeu: 'train' | 'rochers';
    taille: [number, number];
    pieces: Record<string, string>;
    rochers: string[];
    /** Étoiles, ou cases de pièces adverses à prendre ; elles s'attrapent dans n'importe quel ordre. */
    cibles: string[];
    /**
     * Solution de référence écrite à la main : les cases d'arrivée, coup après coup. Elle sert au tracé de l'aide 2
     * et à la démonstration tant que l'enfant la suit ; tout autre coup légal reste accepté.
     */
    acceptes: string[];
    decouverte: boolean;
    /** Id de phrase (public/voix/phrases.json). */
    consigne: string;
}

const CASE = /^\d+,\d+$/;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const cases = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string' && CASE.test(x));

function lire(v: unknown): Situation {
    if (!isRecord(v)) throw new Error('situation invalide');
    const { id, jeu, taille, pieces, rochers, cibles, acceptes, decouverte, consigne } = v;
    if (typeof id !== 'string' || (jeu !== 'train' && jeu !== 'rochers') || typeof consigne !== 'string' || typeof decouverte !== 'boolean'
        || !Array.isArray(taille) || taille.length !== 2 || !taille.every(n => Number.isInteger(n) && (n as number) > 0)
        || !isRecord(pieces) || !Object.entries(pieces).every(([k, p]) => CASE.test(k) && typeof p === 'string')
        || !cases(rochers) || !cases(cibles) || cibles.length === 0
        || !cases(acceptes) || acceptes.length === 0) {
        throw new Error(`situation invalide : ${String(id)}`);
    }
    return { id, jeu, taille: [taille[0] as number, taille[1] as number], pieces: pieces as Record<string, string>, rochers, cibles, acceptes, decouverte, consigne };
}

export function chargerSituations(data: unknown): Situation[] {
    if (!isRecord(data) || !Array.isArray(data.situations)) throw new Error('catalogue invalide');
    return data.situations.map(lire);
}

export const situationsTour: Situation[] = chargerSituations(tour);

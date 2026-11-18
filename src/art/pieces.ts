import type { Kind, Piece } from '../engine/types';

// Pièces Staunton dessinées pour un enfant de 5 ans : silhouettes grasses, un signe distinctif par type, aucun visage.
// Chaque signe porte data-signe pour que les tests (et les captures) retrouvent ce qui distingue la pièce.

const BOIS = {
    w: { clair: '#f6e3c3', base: '#e8c99b', ombre: '#c79d62', trait: '#5a3a1c', creux: '#5a3a1c' },
    b: { clair: '#80583a', base: '#5b3a1e', ombre: '#3a2410', trait: '#1f1208', creux: '#d9b98a' }
} as const;

// Pied commun, posé sur y = 80..91.
const PIED = 'M17 91 Q17 82 27 80 L73 80 Q83 82 83 91 Z';

interface Dessin {
    corps: string;
    signe: (creux: string) => string;
}

const signe = (nom: string, contenu: string): string => `<g data-signe="${nom}">${contenu}</g>`;

const DESSINS: Record<Kind, Dessin> = {
    // Tour : un fût droit et un haut à trois créneaux.
    R: {
        corps: 'M29 80 L33 46 L27 41 L27 30 L73 30 L73 41 L67 46 L71 80 Z',
        signe: () => signe('creneaux', '<path class="piece" d="M25 12 H38 V23 H44 V12 H56 V23 H62 V12 H75 V33 H25 Z"/>')
    },
    // Fou : mitre arrondie, boule au sommet, fente en biais.
    B: {
        corps: 'M31 80 Q40 63 42 52 Q29 46 29 33 Q29 17 50 11 Q71 17 71 33 Q71 46 58 52 Q60 63 69 80 Z',
        signe: creux => signe('fente', `<path d="M45 24 L58 38" fill="none" stroke="${creux}" stroke-width="5.5" stroke-linecap="round"/>`)
            + '<circle class="piece" cx="50" cy="9" r="6"/>'
    },
    // Dame : couronne à trois billes.
    Q: {
        corps: 'M31 80 Q39 63 41 50 Q29 46 28 36 L28 32 H72 V36 Q71 46 59 50 Q61 63 69 80 Z',
        signe: () => signe('couronne',
            '<path class="piece" d="M24 34 L22 19 L38 28 L50 11 L62 28 L78 19 L76 34 Z"/>'
            + ['22,16', '50,9', '78,16'].map(p => `<circle class="piece" cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="6.5"/>`).join(''))
    },
    // Roi : sommet arrondi, grande croix pleine.
    K: {
        corps: 'M31 80 Q39 63 41 50 Q29 46 28 38 Q28 26 50 26 Q72 26 72 38 Q71 46 59 50 Q61 63 69 80 Z',
        signe: () => signe('croix', '<path class="piece" d="M45 2 H55 V9 H62 V18 H55 V27 H45 V18 H38 V9 H45 Z"/>')
    },
    // Cavalier : tête de cheval de profil, museau à gauche.
    N: {
        corps: 'M27 80 Q29 62 38 50 Q28 52 22 58 L12 54 Q11 42 26 30 L30 13 L39 22 Q50 14 61 19 Q78 30 77 52 Q76 67 73 80 Z',
        signe: creux => signe('crinière',
            `<path d="M44 22 L52 29 L58 22 L66 35 L69 30 L71 46 L74 58" fill="none" stroke="${creux}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`)
    },
    // Pion : grosse boule, petit col, corps évasé.
    P: {
        corps: 'M31 80 Q40 66 42 52 H58 Q60 66 69 80 Z',
        signe: () => signe('boule', '<circle class="piece" cx="50" cy="30" r="17"/><path class="piece" d="M34 45 H66 V54 H34 Z"/>')
    }
};

let compteur = 0;

export function pieceSvg(piece: Piece, size: number): string {
    const bois = BOIS[piece.color];
    const dessin = DESSINS[piece.kind];
    const id = `bois-${++compteur}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-hidden="true" focusable="false">`
        + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">`
        + `<stop offset="0" stop-color="${bois.base}"/><stop offset="0.35" stop-color="${bois.clair}"/><stop offset="1" stop-color="${bois.ombre}"/>`
        + '</linearGradient>'
        + `<style>#${id}-g .piece{fill:url(#${id});stroke:${bois.trait};stroke-width:2.5;stroke-linejoin:round}</style></defs>`
        + '<ellipse cx="50" cy="91" rx="36" ry="5" fill="#000" fill-opacity="0.22"/>'
        + `<g id="${id}-g">`
        + `<path class="piece" d="${dessin.corps}"/>`
        + dessin.signe(bois.creux)
        + `<path class="piece" d="${PIED}"/>`
        + '</g></svg>';
}

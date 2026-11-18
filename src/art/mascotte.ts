// Mascotte : une petite chouette ronde, sans lien avec les pièces. Quatre poses, aucun texte.
export type Pose = 'accueil' | 'bravo' | 'reflechit' | 'baille';

const PLUME = '#7a8fd6';
const VENTRE = '#f4ead2';
const TRAIT = '#2f3a6b';
const BEC = '#f2a93b';

const oeil = (cx: number, ouvert: boolean, regard: number): string => ouvert
    ? `<circle cx="${cx}" cy="46" r="11" fill="#fff" stroke="${TRAIT}" stroke-width="3"/><circle cx="${cx + regard}" cy="${46 + (regard ? -2 : 0)}" r="5.5" fill="${TRAIT}"/>`
    : `<path d="M${cx - 9} 47 Q${cx} 38 ${cx + 9} 47" fill="none" stroke="${TRAIT}" stroke-width="4" stroke-linecap="round"/>`;

export function mascotteSvg(pose: Pose, size: number): string {
    const content = {
        accueil: { gauche: 'M24 62 Q10 50 8 36 Q22 44 30 56 Z', droite: 'M76 62 Q86 70 90 82 Q76 78 70 66 Z', yeux: oeil(38, true, 0) + oeil(62, true, 0), bouche: `<path d="M50 54 L44 62 L56 62 Z" fill="${BEC}" stroke="${TRAIT}" stroke-width="2.5" stroke-linejoin="round"/>`, extra: '' },
        bravo: { gauche: 'M24 62 Q8 48 8 30 Q22 40 30 54 Z', droite: 'M76 62 Q92 48 92 30 Q78 40 70 54 Z', yeux: oeil(38, false, 0) + oeil(62, false, 0), bouche: `<path d="M50 54 L44 62 L56 62 Z" fill="${BEC}" stroke="${TRAIT}" stroke-width="2.5" stroke-linejoin="round"/>`, extra: '<path d="M50 4 L53 12 L62 12 L55 17 L58 25 L50 20 L42 25 L45 17 L38 12 L47 12 Z" fill="#ffd54a" stroke="#c98f00" stroke-width="2" stroke-linejoin="round"/>' },
        reflechit: { gauche: 'M24 62 Q12 72 14 84 Q28 80 32 68 Z', droite: 'M76 62 Q66 54 56 66 Q68 76 76 70 Z', yeux: oeil(38, true, 4) + oeil(62, true, 4), bouche: `<path d="M50 54 L45 60 L55 60 Z" fill="${BEC}" stroke="${TRAIT}" stroke-width="2.5" stroke-linejoin="round"/>`, extra: `<circle cx="84" cy="18" r="3" fill="${TRAIT}"/><circle cx="90" cy="9" r="4.5" fill="${TRAIT}"/>` },
        baille: { gauche: 'M24 62 Q14 72 14 84 Q28 80 32 68 Z', droite: 'M76 62 Q86 72 86 84 Q72 80 68 68 Z', yeux: oeil(38, false, 0) + oeil(62, false, 0), bouche: `<ellipse cx="50" cy="62" rx="8" ry="10" fill="#7a2a3a" stroke="${TRAIT}" stroke-width="3"/>`, extra: '' }
    }[pose];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-hidden="true" focusable="false">`
        + '<ellipse cx="50" cy="94" rx="30" ry="4" fill="#000" fill-opacity="0.2"/>'
        + `<path d="${content.gauche}" fill="${PLUME}" stroke="${TRAIT}" stroke-width="3" stroke-linejoin="round"/>`
        + `<path d="${content.droite}" fill="${PLUME}" stroke="${TRAIT}" stroke-width="3" stroke-linejoin="round"/>`
        + `<path d="M22 34 L18 12 L36 24 Q50 20 64 24 L82 12 L78 34 Q86 50 80 70 Q74 92 50 92 Q26 92 20 70 Q14 50 22 34 Z" fill="${PLUME}" stroke="${TRAIT}" stroke-width="3" stroke-linejoin="round"/>`
        + `<ellipse cx="50" cy="76" rx="20" ry="15" fill="${VENTRE}"/>`
        + `<path d="M40 70 Q44 74 48 70 M52 70 Q56 74 60 70 M46 80 Q50 84 54 80" fill="none" stroke="${PLUME}" stroke-width="2.5" stroke-linecap="round"/>`
        + content.yeux + content.bouche + content.extra
        + `<path d="M40 92 L36 97 M46 92 L44 97 M54 92 L56 97 M60 92 L64 97" stroke="${BEC}" stroke-width="3" stroke-linecap="round"/>`
        + '</svg>';
}

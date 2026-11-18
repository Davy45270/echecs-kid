// Icônes PWA : la tour blanche sur fond vert, rastérisée depuis son SVG. À lancer à la main (outil de création, pas de la CI) :
//   node --experimental-strip-types scripts/make-icons.js   (nécessite rsvg-convert)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pieceSvg } from '../src/art/pieces.ts';

const tour = pieceSvg({ color: 'w', kind: 'R' }, 100).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
// `marge` : part du côté laissée vide autour de la tour (la version « maskable » garde la tour dans la zone sûre de 80 %).
const icone = (marge) => {
    const echelle = (1 - 2 * marge) * 0.9;
    const decalage = (100 - 100 * echelle) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#426c50"/>`
        + `<g transform="translate(${decalage} ${decalage + 2}) scale(${echelle})">${tour}</g></svg>`;
};
mkdirSync('public/icons', { recursive: true });
for (const [nom, taille, marge] of [['192', 192, 0.06], ['512', 512, 0.06], ['maskable-512', 512, 0.14]]) {
    execFileSync('rsvg-convert', ['-w', String(taille), '-h', String(taille), '-o', `public/icons/echecs-${nom}.png`], { input: icone(marge) });
}

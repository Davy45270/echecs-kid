// Accueil : la mascotte, une grande carte « tour », un bouton parent discret. Aucun texte visible.
import { mascotteSvg } from '../art/mascotte';
import { pieceSvg } from '../art/pieces';
import { go } from '../shell/router';
import { bindAction } from '../shell/activation';
import { unlockSound } from '../shell/sound';
import { dire } from '../shell/voix';
import { iconeRouage } from './icones';

let salue = false;

/** Premier toucher n'importe où : déverrouille l'audio et joue l'accueil, une seule fois. */
function armerSalutation(): void {
    if (salue) return;
    document.addEventListener('pointerdown', () => {
        if (salue) return;
        salue = true;
        unlockSound();
        void dire('accueil');
    }, { once: true });
}

export function renderAccueil(root: HTMLElement): void {
    root.innerHTML = `<section class="ecran accueil">`
        + `<button class="bouton-icone parent-btn" id="parent" aria-label="Espace parent">${iconeRouage()}</button>`
        + `<div class="mascotte">${mascotteSvg('accueil', 180)}</div>`
        + `<button class="carte" id="tour" aria-label="Tour">${pieceSvg({ color: 'w', kind: 'R' }, 160)}</button>`
        + `</section>`;
    bindAction(root.querySelector<HTMLElement>('#tour')!, () => go('jeu', 'tour'), 'accueil:tour');
    bindAction(root.querySelector<HTMLElement>('#parent')!, () => go('parent'), 'accueil:parent');
    armerSalutation();
}

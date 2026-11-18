// Écran « jeu » provisoire, remplacé par la tâche 6 (voir `screens` dans router.ts).
import { mascotteSvg } from '../art/mascotte';
import { go } from '../shell/router';
import { iconeMaison } from './icones';

export function renderJeuProvisoire(root: HTMLElement): void {
    root.innerHTML = `<section class="ecran jeu-provisoire">${mascotteSvg('reflechit', 160)}<button class="bouton-icone" id="retour" aria-label="Accueil">${iconeMaison()}</button></section>`;
    root.querySelector<HTMLElement>('#retour')!.onclick = () => go('accueil');
}

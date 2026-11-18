// Routeur minimal : un écran à la fois dans #app. Les écrans se branchent dans `screens`.
import { renderAccueil } from '../ui/accueil';
import { renderParent } from '../ui/parent';
import { renderJeu } from '../ui/jeu';

export type Screen = 'accueil' | 'jeu' | 'parent';
export type Renderer = (root: HTMLElement, arg?: string) => void;

export const screens: Record<Screen, Renderer> = {
    accueil: renderAccueil,
    jeu: renderJeu,
    parent: renderParent
};

export function go(screen: Screen, arg?: string): void {
    const root = document.getElementById('app');
    if (!root) return;
    root.replaceChildren();
    root.dataset.screen = screen;
    screens[screen](root, arg);
}

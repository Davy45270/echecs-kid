// Icônes sans texte pour les boutons de l'enfant (le sens est porté par aria-label).
const svg = (d: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const iconeRouage = (): string => svg('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.500 4 8l-1 3 2 1v2l-2 1 1 3 2-.5L7.500 19l-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.500-1.500 2 .5 1-3-2-1z');
export const iconeMaison = (): string => svg('M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10');
export const iconeOreille = (): string => svg('M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5.500S14 18 11.500 19 8 18 8 16M9 9a3 3 0 0 1 6 0c0 1.500-1 2-1.500 2.500');
/** Grand triangle « continuer », plein, pour le bouton de reprise après la pause. */
export const iconeContinuer = (taille: number): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${taille}" height="${taille}" aria-hidden="true" focusable="false"><path d="M8 5.500v13l10.500-6.500z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

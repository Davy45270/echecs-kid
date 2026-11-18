# Travailler sur « Mes premiers échecs »

Guide pour tout agent de code (et tout humain) qui modifie ce dépôt. Les contraintes qui suivent font foi ;
la conception détaillée et les plans de travail sont tenus hors de ce dépôt. Outillage repris d'Opencadkid.

## Contraintes à respecter

- **Aucun texte visible côté enfant** : pas de nœud texte non vide hors de `.parent` et des `aria-label`.
- **Aucune dépendance d'exécution** : `dependencies` reste vide dans `package.json`.
- **Moteur pur** : `src/engine/**` n'utilise ni `window`, ni `document`, ni `navigator`, ni `Date`, ni `localStorage`,
  ni `fetch`, ni `Math.random` (imposé par oxlint).
- **Garde de marque** : aucun nom commercial de jeu ni identifiant de ticket (majuscules, tiret, chiffres) dans les
  fichiers suivis par git (`tests/brand-guard.test.ts`). Aucun prénom ni photo de l'enfant.
- **Licence MIT.** Aucun art sous GPL ou CC BY-SA.
- **Tailles** : case de plateau réduit (4x4 à 6x6) 56 px CSS au moins ; case de 8x8 44 px au moins avec 12 px de marge
  latérale ; bouton 48 px au moins.
- **Aide** : 1,5 s de touchers ignorés après une erreur ; l'inactivité (~8 s) ne fait que relancer la consigne ;
  démonstration à la 3e erreur ; « réussie seule » et « terminée avec aide » sont distincts.
- **Jamais de cases légales allumées au premier toucher**, sauf situations `decouverte: true`.
- **Le son ne se coupe pas** : volume réglable de 30 % à 100 %.

## Tests : ciblés, jamais la suite complète

En local : `npx vitest run tests/<fichier>.test.ts` seulement. Playwright : des specs explicites, après
`npm run build`. La CI joue tout.

## Commandes

`npm run dev` · `build` (typecheck + vite) · `lint` (oxlint, zéro avertissement) · `typecheck` · `test` (CI) ·
`test:e2e` · `check:precache` (après un build).

## Commits

Auteur du dépôt ; message en français terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
Jamais `git add -A` : ajouter par chemins.

## CI

Woodpecker : `.woodpecker/checks.yml` (npm ci, lint, typecheck, test, build avec l'empreinte `empreinte dist`,
check:precache) puis `.woodpecker/e2e.yml`.

# Relecture du jalon 1 (palier Tour) — Antigravity

Relecture indépendante faite par Google Antigravity sur les phrases du palier, `public/contenu/tour.json` et les captures.
Consigne : juger l'exactitude des règles, la compréhension à 5 ans et la reconnaissance des pièces à 44 px.
Les constats sont recopiés tels quels ; les liens vers des fichiers locaux ont été remplacés par des chemins relatifs à la
racine du dépôt. Les numéros de ligne renvoient au code relu, avant corrections.

### Vérification manuelle des règles (situations de `public/contenu/tour.json`)
- `tour.train.1` (4×4) : `wR` en `0,0` → `0,3` (colonne 0). Légal.
- `tour.train.5` (6×6) : `wR` en `1,0` prend `bP` en `1,4` (colonne 1), puis `1,4` → `4,4` (rangée 4). Légal.
- `tour.train.6` (6×6) : `wR` en `0,0` (`wP` bloque `0,3`) → `4,0` (rangée 0) → `4,5` (colonne 4). Légal.
- `tour.rochers.1` à `4` (6×6) : `0,0→0,2→5,2` (rocher `3,0`), `0,5→3,5→3,0` (rocher `0,2`), `5,0→1,0→1,5` (rocher `5,3`), `1,1→4,1→4,4` (rocher `1,3`). Tous les coups de `acceptes` sont orthogonaux et sans saut.

---

### Constats

1. **BLOQUANT — Punition des contournements légaux sans cible visible**
   - **Fichiers** : `public/contenu/tour.json` (lignes 16-23) (`tour.rochers.1` à `4`) et `src/jeu/deplacer.ts` (lignes 79-85) (`jouer`).
   - **Pourquoi** : Dans `rochers.1..4`, la case pivot (`0,2`, `3,5`, `1,0`, `4,1`) n'est pas dans `cibles` : aucune étoile ne la signale. À 5 ans, l'enfant qui contourne légalement le rocher en passant par `0,4` ou en s'approchant en `2,0` subit un refus (secousse + verrou 1,5 s) et finit en démonstration forcée à la 3e tentative, alors qu'elle respecte la règle de la tour. Elle va décrocher ou pleurer d'injustice.
   - **Correction** : Soit poser une étoile intermédiaire sur la case pivot (`cibles: ["0,2", "5,2"]`), soit accepter tout coup légal de la tour et ne valider que l'atteinte finale de la cible.

2. **BLOQUANT — Consigne vocale contradictoire lors de la prise**
   - **Fichiers** : `public/contenu/tour.json` (lignes 12-13) (`tour.train.5`), `public/voix/phrases.json` (lignes 3-5) (`train.consigne`, `prise.regle`), `src/ui/jeu.ts` (lignes 127-131).
   - **Pourquoi** : Au début de `tour.train.5`, la voix dit *« Avec la tour, va prendre l'étoile »* alors que la 1re cible (`1,4`) est un pion noir entouré d'un anneau et qu'une vraie étoile est visible en `4,4`. L'enfant qui vise l'étoile est punie ; `prise.regle` n'est dite qu'après la capture.
   - **Correction** : Créer une consigne dédiée (*« Prends le pion noir, puis va sur l'étoile »*) dite dès l'ouverture de `tour.train.5`.

3. **IMPORTANT — Reconnaissance du Roi, de la Dame et du Fou à 44 px**
   - **Fichier** : `docs/captures/pieces-mobile.png` (`src/art/pieces.ts`).
   - **Pourquoi** : À 44 px (haut de l'image), Tour, Cavalier et Pion sont bien distincts en clair comme en foncé. En revanche, le **Fou** ressemble à un gros pion (fente mitre trop fine, silhouettée comme un col), et le **Roi** et la **Dame** ont le même corps en calice (la croix du Roi touche le bord supérieur et se distingue mal à 44 px). De plus, le brun foncé sur case brune manque de contraste.
   - **Correction** : Élargir l'entaille du Fou, différencier franchement la couronne pointue de la Dame du dôme à croix du Roi, et éclaircir le contour des pièces noires sur case foncée.

4. **IMPORTANT — Pièce amie bloquante muette (code mort)**
   - **Fichier** : `src/jeu/deplacer.ts` (lignes 67-76) (`raisonRegle`, `jouer`) et `tour.train.6`.
   - **Pourquoi** : Ligne 76, viser la case du pion blanc (`0,3`) renvoie `'ignore'` avant d'atteindre `raisonRegle` (qui prévoyait pourtant `'tour.passe-pas'` ligne 67). Si l'enfant glisse la tour sur son pion, rien ne se passe : elle croit à un bug tactile.
   - **Correction** : En glisser (`de !== vers`), déclencher `tour.passe-pas` (sans compter d'erreur ou avec rappel doux) quand `vers` contient une pièce amie.

5. **IMPORTANT — Vocabulaire spatial et stéréotype dans les phrases**
   - **Fichier** : `public/voix/phrases.json` (lignes 2-12).
   - **Pourquoi** : Sur un écran à plat, *« devant, derrière »* (`tour.regle`) est ambigu à 5 ans (confondu avec en haut / en bas) et *« tout droit »* n'exclut pas clairement les diagonales. Dans `train.consigne`, *« prendre l'étoile »* emploie le même verbe que la prise d'une pièce (`prise.regle`). Enfin, *« Va montrer la tour à papa ! »* (`pause`) exclut maman ou les autres proches.
   - **Correction** : Dire *« en haut, en bas, sur les côtés »*, *« attraper l'étoile »*, et une formule neutre (*« Tu peux montrer comment bouge la tour ! »*).

6. **MINEUR — Compteur d'erreurs non réinitialisé entre deux étapes et monotonie**
   - **Fichiers** : `src/jeu/deplacer.ts` (lignes 86-89) et `public/contenu/tour.json`.
   - **Pourquoi** : `erreurs` reste cumulé sur toute la situation : 2 erreurs au 1er coup + 1 erreur au 2e déclenchent la démo alors que l'enfant a avancé. Par ailleurs, `train.1..4` puis `rochers.1..4` répètent exactement le même schéma géométrique en L (risque d'ennui).
   - **Correction** : Remettre `erreurs` (et `aide`) à `0` quand un coup intermédiaire réussit, et varier `rochers.3/4` (deux rochers ou prise + rocher).

**Verdict :** Les règles d'échecs sont exactes, mais le jalon 1 n'est pas jouable en l'état à 5 ans sans corriger les étapes invisibles des rochers (`rochers.1..4`) et la consigne trompeuse de `train.5`.

## Suite donnée

1. **BLOQUANT, contournements légaux punis** : corrigé, par la seconde voie proposée. Tout coup légal de la tour est
   joué (`src/jeu/deplacer.ts`) ; seule l'atteinte de toutes les cibles termine la situation. `acceptes` n'est plus que
   la solution de référence (aide 2, démonstration), vérifiée légale, complète et minimale par
   `tests/situations.test.ts`. Après 3 coups légaux sans rien attraper, le chemin vers la cible la plus proche
   s'éclaire depuis la tour, sans compter d'erreur ; après 6, la démonstration se joue ; la situation finit alors
   « avec aide ».
2. **BLOQUANT, consigne contradictoire dans `tour.train.5`** : corrigé. Nouvelle phrase `prise.consigne`, « Avec la tour,
   prends le pion noir ! », dite dès l'ouverture de `tour.train.5`. De plus, l'étoile et le pion se prennent dans
   n'importe quel ordre : viser l'étoile d'abord n'est plus puni.
3. **IMPORTANT, roi, dame et fou à 44 px** : corrigé dans `src/art/pieces.ts`. Fou : mitre en amande nettement pointue,
   entaille élargie et plus grasse. Roi : corps droit, bandeau et dôme lisse, haute croix épaisse dressée au-dessus.
   Dame : trois billes sur une couronne à pointes profondes. Pièces foncées : liseré clair autour de la silhouette pour
   garder le contraste sur case foncée. Capture `docs/captures/pieces-mobile.png` régénérée.
4. **IMPORTANT, pièce amie bloquante muette** : corrigé. Poser la tour sur sa propre pièce (le pion blanc de
   `tour.train.6`) fait dire `tour.passe-pas`, sans erreur comptée ni verrou ; la tour revient. Toucher sa pièce reste
   une sélection, comme avant. Test de bout en bout ajouté.
5. **IMPORTANT, vocabulaire spatial et stéréotype** : en partie. `train.consigne` dit désormais « attraper l'étoile ».
   `tour.regle` (« devant, derrière, sur les côtés ») est gardée : c'est une formulation imposée par la spécification
   (§8) et validée par le parent. « Va montrer la tour à papa » est gardé : c'est le père qui joue avec l'enfant.
6. **MINEUR, compteur d'erreurs non réinitialisé, monotonie** : compteur corrigé, erreurs et aide repartent de zéro à
   chaque cible attrapée. La variété des situations (deux rochers, prise et rocher) est reportée au jalon suivant.

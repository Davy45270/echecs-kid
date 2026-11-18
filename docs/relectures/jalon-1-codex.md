# Relecture du jalon 1 (palier Tour) — Codex

Relecture indépendante faite par Codex (bac à sable en lecture seule) sur les phrases du palier, `public/contenu/tour.json`
et les captures. Consigne : juger l'exactitude des règles, la compréhension à 5 ans et la reconnaissance des pièces à 44 px.
Les constats sont recopiés tels quels ; seuls les chemins ont été ramenés à la racine du dépôt.

## Constats

- **BLOQUANT — `public/contenu/tour.json`, `tour.rochers.1` à `4`** : plusieurs détours légaux sont refusés alors qu’un seul est attendu. Par exemple, dans `rochers.1`, la tour peut aller de `0,0` à `5,0` ? Non, le rocher bloque ; mais `0,0 → 1,0 → 1,2 → 5,2` est légal. Le refuser risque d’enseigner qu’un coup correct est faux. Accepter les détours légaux qui permettent encore d’atteindre la cible, ou guider explicitement vers un trajet présenté comme un défi.

- **IMPORTANT — `public/contenu/tour.json`, `train.2` à `5`** : une seule cible est acceptée à chaque étape. Si plusieurs étoiles sont visibles, l’enfant peut choisir une étoile accessible et recevoir une erreur malgré un déplacement légal. Afficher seulement la cible courante ou distinguer clairement l’ordre, et expliquer l’objectif sans qualifier le coup de faux.

- **IMPORTANT — `src/jeu/deplacer.ts`, `jouer`** : les erreurs s’accumulent sur toute la situation, y compris après un coup réussi. Deux erreurs au début puis une hésitation plus tard déclenchent la démonstration, qui termine l’exercice à la place de l’enfant. Remettre le compteur à zéro après chaque réussite et laisser l’enfant réessayer après une démonstration.

- **IMPORTANT — `public/voix/phrases.json`, `tour.regle`, `prise.regle`, `tour.passe-pas`** : les règles sont justes mais incomplètes ou ambiguës. « Tout droit » peut évoquer seulement l’avant ; « prendre » peut vouloir dire toucher ; « ne passe pas par-dessus » ne nomme pas l’obstacle. Proposer : « La tour avance en ligne : en haut, en bas ou sur les côtés » ; « Pour prendre une pièce de l’autre couleur, la tour va sur sa case » ; « La tour ne saute pas par-dessus une pièce ou un rocher. »

- **IMPORTANT — `public/voix/phrases.json`, `train.consigne` et `rochers.consigne`** : « prendre l’étoile » devient trompeur dans `train.5`, dont la première cible est un pion adverse ; « fais le tour » ne dit pas qu’il faut plusieurs déplacements de tour. Adapter la consigne à la cible et montrer un détour en plusieurs coups.

- **IMPORTANT — `docs/captures/pieces-mobile.png`, pièces à 44 px** : la tour et le cavalier sont reconnaissables dans les deux couleurs ; le pion est simple, mais son petit sommet peut se confondre avec celui du roi. Roi et dame se ressemblent beaucoup, surtout en foncé ; le fou, avec sa petite fente, peut être pris pour un pion. Renforcer les silhouettes et les attributs, puis les tester auprès d’enfants à taille réelle.

- **MINEUR — `public/contenu/tour.json`, progression** : vérification manuelle : `train.1` (`0,0 → 0,3`), `train.2` (`0,0 → 3,0 → 3,3`), `train.5` (`1,0 → 1,4 → 4,4`, capture légale) et `rochers.1` (`0,0 → 0,2 → 5,2`) sont légaux ; les autres trajets attendus le sont aussi. Les rochers sont une convention de jeu, pas une règle des échecs : les présenter comme tels.

- **MINEUR — `public/contenu/tour.json` et `docs/captures/mascotte.png`** : six trains puis quatre détours très semblables peuvent lasser ; la mascotte expressive offre une occasion de varier les encouragements et les petites surprises. Introduire une variation ludique et une pause facultative avant la fin.

- **MINEUR — `public/voix/phrases.json`, `pause`** : « Va montrer la tour à papa » suppose la présence d’un père et peut mettre l’enfant mal à l’aise. Dire « Tu peux montrer ta tour à quelqu’un ! » Les salutations et félicitations restantes sont courtes et adaptées.

**Verdict : base visuelle accueillante et trajets prévus légaux, mais les coups légaux refusés doivent être corrigés avant utilisation.**

## Suite donnée

- **BLOQUANT, détours refusés (`tour.rochers.1` à `4`)** : corrigé. Un coup légal n'est plus jamais une erreur dans le
  gabarit Deplacer (`src/jeu/deplacer.ts`) : il est joué, et la situation se termine quand toutes les cibles sont
  attrapées. `acceptes` devient la solution de référence écrite à la main (l'aide et la démonstration se calculent depuis la tour), vérifiée
  par `tests/situations.test.ts` : légale, complète, et de longueur minimale sur tous les ordres de cibles. Si l'enfant
  erre (3 coups légaux de suite sans rien attraper), le chemin vers la cible la plus proche s'éclaire, calculé depuis la
  tour ; après 6, la démonstration se joue depuis la position courante. Ce n'est pas compté comme une erreur, mais la
  situation finit « avec aide ».
- **IMPORTANT, une seule cible acceptée à chaque étape (`train.2` à `5`)** : corrigé. Les étoiles et les pièces
  adverses cibles s'attrapent dans n'importe quel ordre ; toutes les cibles restantes brillent pareil.
- **IMPORTANT, erreurs cumulées sur toute la situation** : corrigé. Erreurs et niveau d'aide repartent de zéro à chaque
  cible attrapée ; le statut final reste « avec aide » dès qu'une aide a été donnée. La démonstration part désormais de
  la position courante. Elle termine toujours la situation (« avec aide ») : rejouer la même situation après coup est
  laissé au jalon suivant.
- **IMPORTANT, `tour.regle`, `prise.regle`, `tour.passe-pas`** : gardées. Les deux règles sont des formulations exactes
  imposées par la spécification (§8) et validées par le parent ; « La tour ne passe pas par-dessus » est dite avec le
  plateau sous les yeux, au moment où la tour bute sur l'obstacle.
- **IMPORTANT, `train.consigne` et `rochers.consigne`** : corrigé pour `train.consigne`, qui devient « Avec la tour, va
  attraper l'étoile. » ; `tour.train.5` dit une consigne dédiée, « Avec la tour, prends le pion noir ! ».
  `rochers.consigne` est gardée : comme tout détour légal est maintenant accepté, l'enfant n'a plus besoin de deviner
  la case de passage.
- **IMPORTANT, pièces à 44 px** : corrigé dans `src/art/pieces.ts`. Le fou a une mitre en amande nettement pointue et une
  entaille large ; le roi a un corps droit, un bandeau, un dôme lisse et une haute croix épaisse ; la dame garde ses trois
  billes sur une couronne à pointes profondes ; les pièces foncées ont un liseré clair. Capture
  `docs/captures/pieces-mobile.png` régénérée. Le test auprès d'enfants à taille réelle reste à faire avec l'enfant.
- **MINEUR, vérification des trajets** : rien à corriger. Les rochers restent une convention de jeu, présentée comme
  telle (jeu « rochers », distinct du jeu « train »).
- **MINEUR, monotonie et variété des situations** : reporté au jalon suivant.
- **MINEUR, « papa » dans `pause`** : gardé. C'est le père qui joue avec l'enfant.

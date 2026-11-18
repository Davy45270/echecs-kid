// Écran de jeu du palier Tour : enchaîne les situations du gabarit Deplacer, l'aide graduée et la pause.
// Aucun texte visible : tout passe par la voix, les icônes et les aria-label.
import { situationsTour, type Situation } from '../content/situations';
import {
    coupsLegaux, demoDue, demontrer, depart, ERRANCE_TRAJET, etatInitial, jouer, pauseDue, raisonRegle, restantes, solution, trajet, trajetProche, type Etat
} from '../jeu/deplacer';
import { mascotteSvg, type Pose } from '../art/mascotte';
import { bindAction } from '../shell/activation';
import { go } from '../shell/router';
import { chime } from '../shell/sound';
import { browserStorage, readSave, writeSave } from '../shell/storage';
import { dire, reecouter } from '../shell/voix';
import { creerPlateau, etoileSvg, taillesCase, type Plateau } from './plateau';
import { iconeContinuer, iconeMaison, iconeOreille } from './icones';

const INACTIVITE_MS = 8000;
const PAS_DEMO_MS = 750;
const PALIER = 'tour';

// Séance : remise à zéro à chaque entrée dans l'écran de jeu et à chaque pause acceptée ;
// le temps passé sur l'accueil ne compte pas.
const seance = { debut: 0, faites: 0 };
let priseExpliquee = false;
let generation = 0;

const attendre = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const mouvementReduit = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderJeu(root: HTMLElement): void {
    const situations = situationsTour;
    const moi = ++generation;
    const vivant = (): boolean => moi === generation && root.isConnected && root.dataset.screen === 'jeu';
    seance.debut = Date.now();
    seance.faites = 0;
    const storage = browserStorage();
    const courante = readSave(storage).progress.courante[PALIER] ?? 0;
    let index = courante >= 0 && courante < situations.length ? courante : 0;

    root.innerHTML = '<section class="ecran jeu">'
        + '<header class="barre">'
        + `<button class="bouton-icone" id="retour" aria-label="Accueil">${iconeMaison()}</button>`
        + '<div class="avancee" role="img" aria-label="Avancée"></div>'
        + `<button class="bouton-icone" id="ecouter" aria-label="Réécouter">${iconeOreille()}</button>`
        + '</header>'
        + '<div class="scene"></div>'
        + '<div class="mascotte-jeu" aria-hidden="true"></div>'
        + '</section>';
    const scene = root.querySelector<HTMLElement>('.scene')!;
    const mascotte = root.querySelector<HTMLElement>('.mascotte-jeu')!;
    const avancee = root.querySelector<HTMLElement>('.avancee')!;
    let pose: Pose | undefined;
    const poser = (p: Pose): void => {
        if (p === pose) return;
        pose = p;
        mascotte.innerHTML = mascotteSvg(p, 112);
        mascotte.classList.remove('saute'); void mascotte.offsetWidth; mascotte.classList.add('saute');
    };

    let s: Situation = situations[index]!;
    let etat: Etat = etatInitial();
    let position = depart(s);
    let plateau: Plateau | undefined;
    let occupe = false; // démonstration ou fête en cours
    let minuterie: ReturnType<typeof setTimeout> | undefined;

    const relancer = (): void => {
        clearTimeout(minuterie);
        minuterie = setTimeout(() => { if (vivant() && !occupe) void dire(s.consigne); }, INACTIVITE_MS);
    };
    const taille = (): number => taillesCase(window.innerWidth, window.innerHeight, Math.max(...s.taille));
    const surRedim = (): void => { if (vivant()) plateau?.redimensionner(taille()); else quitter(); };
    window.addEventListener('resize', surRedim);

    const dessinerAvancee = (): void => {
        const p = readSave(storage).progress;
        avancee.innerHTML = situations.map((x, i) => {
            const faite = (p.seule[x.id] ?? 0) + (p.aidee[x.id] ?? 0) > 0;
            return `<span class="${faite ? 'faite' : ''}${i === index ? ' en-cours' : ''}">${etoileSvg(18)}</span>`;
        }).join('');
    };

    const legauxSiDecouverte = (): string[] => s.decouverte ? coupsLegaux(s, etat.atteintes, position) : [];

    const commencer = (i: number): void => {
        index = i;
        s = situations[i]!;
        etat = etatInitial();
        position = depart(s);
        occupe = false;
        plateau?.detruire();
        plateau = creerPlateau(s, taille(), {
            actif: () => vivant() && !occupe && etat.finie === null && Date.now() >= etat.verrouJusqua,
            choisie: k => { if (k === position) plateau?.selectionner(k, legauxSiDecouverte()); },
            coup: (de, vers) => { void tenter(de, vers); },
            toucher: relancer
        });
        plateau.element.dataset.situation = s.id;
        scene.replaceChildren(plateau.element);
        dessinerAvancee();
        poser('accueil');
        void dire(s.consigne);
        relancer();
    };

    const cibleAtteinte = (vers: string): void => {
        if (!plateau) return;
        plateau.cueillir(vers);
        chime(true);
    };

    /** Le chemin éclairé : après 3 coups d'errance, vers la cible la plus proche ; à l'aide 2, le trajet conseillé. */
    const eclairage = (): string[] => {
        if (etat.finie !== null) return [];
        if (etat.errance >= ERRANCE_TRAJET) return trajetProche(s, etat.atteintes, position);
        return etat.aide >= 2 ? trajet(s, etat.atteintes, position) : [];
    };

    async function tenter(de: string, vers: string): Promise<void> {
        // Seule la tour se déplace : un geste parti d'une autre pièce n'est pas un coup.
        if (!plateau || de !== position) return;
        const avant = position;
        const avantes = etat.atteintes.length;
        const r = jouer(s, etat, avant, vers, Date.now());
        if (r.effet === 'ignore') return;
        etat = r.etat;
        if (r.effet === 'passe-pas') {
            // Tour posée sur sa propre pièce : elle revient, sans erreur ni verrou.
            void dire('tour.passe-pas');
            return;
        }
        if (r.effet === 'erreur-regle') {
            plateau.secouer(avant);
            poser('reflechit');
            if (demoDue(etat)) { await montrer(); return; }
            void dire(raisonRegle(s, etat.atteintes, avant, vers));
            plateau.eclairer(eclairage());
            return;
        }
        // Coup légal : toujours joué.
        const etaitCible = etat.atteintes.length > avantes;
        let expliquee = false;
        if (etaitCible && s.pieces[vers]?.startsWith('b')) {
            plateau.prendre(vers);
            // R4 : la première prise de la séance s'explique.
            if (!priseExpliquee) { priseExpliquee = true; expliquee = true; void dire('prise.regle'); }
        }
        plateau.deplacer(avant, vers);
        position = vers;
        if (etaitCible) cibleAtteinte(vers);
        plateau.eclairer(eclairage());
        plateau.viser(restantes(s, etat));
        plateau.selectionner(position, legauxSiDecouverte());
        poser(etaitCible ? 'bravo' : 'accueil');
        if (r.effet === 'finie') await terminer(etat.finie ?? 'aidee', expliquee);
        else if (demoDue(etat)) await montrer();
    }

    /** Démonstration : jouée depuis la position courante, vers toutes les cibles restantes. */
    async function montrer(): Promise<void> {
        const p = plateau;
        if (!p) return;
        occupe = true;
        p.selectionner(undefined);
        p.eclairer(trajet(s, etat.atteintes, position));
        void dire('regarde');
        await attendre(mouvementReduit() ? 400 : PAS_DEMO_MS + 400);
        const reste = new Set(restantes(s, etat));
        for (const q of solution(s, etat.atteintes, position)) {
            if (!vivant()) return;
            const cible = reste.delete(q);
            if (cible && s.pieces[q]?.startsWith('b')) p.prendre(q);
            p.deplacer(position, q);
            position = q;
            if (cible) { cibleAtteinte(q); p.viser([...reste]); }
            await attendre(PAS_DEMO_MS);
        }
        p.eclairer([]);
        etat = demontrer(s, etat);
        await terminer('aidee', false);
    }

    let bravo = 0;
    async function terminer(statut: 'seule' | 'aidee', priseDite: boolean): Promise<void> {
        occupe = true;
        clearTimeout(minuterie);
        const save = readSave(storage);
        const compteur = statut === 'seule' ? save.progress.seule : save.progress.aidee;
        compteur[s.id] = (compteur[s.id] ?? 0) + 1;
        const suivante = (index + 1) % situations.length;
        save.progress.courante[PALIER] = suivante;
        writeSave(storage, save);
        seance.faites++;
        dessinerAvancee();
        poser('bravo');
        plateau?.element.classList.add('fete');
        if (priseDite) await attendre(2600);
        if (!vivant()) return;
        bravo = bravo % 3 + 1;
        await dire(`bravo.${bravo}`);
        await attendre(500);
        if (!vivant()) return;
        if (pauseDue(seance.faites, seance.debut, Date.now())) pause(suivante);
        else commencer(suivante);
    }

    function pause(suivante: number): void {
        clearTimeout(minuterie);
        plateau?.detruire();
        plateau = undefined;
        pose = undefined;
        mascotte.replaceChildren();
        scene.innerHTML = `<div class="pause"><div class="mascotte-pause">${mascotteSvg('baille', 200)}</div>`
            + `<button class="bouton-continuer" id="continuer" aria-label="Continuer">${iconeContinuer(64)}</button></div>`;
        void dire('pause');
        bindAction(scene.querySelector<HTMLElement>('#continuer')!, () => {
            seance.debut = Date.now();
            seance.faites = 0;
            commencer(suivante);
        }, 'jeu:continuer');
    }

    function quitter(): void {
        clearTimeout(minuterie);
        window.removeEventListener('resize', surRedim);
        plateau?.detruire();
        plateau = undefined;
    }
    bindAction(root.querySelector<HTMLElement>('#retour')!, () => {
        quitter();
        seance.debut = Date.now();
        seance.faites = 0;
        go('accueil');
    }, 'jeu:retour');
    bindAction(root.querySelector<HTMLElement>('#ecouter')!, () => { reecouter(); relancer(); }, 'jeu:ecouter');

    commencer(index);
}

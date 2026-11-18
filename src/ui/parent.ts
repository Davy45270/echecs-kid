// Espace parent minimal : le seul écran avec du texte, tout à l'intérieur de `.parent`.
import { go } from '../shell/router';
import { bindAction } from '../shell/activation';
import { browserStorage, fresh, readSave, writeSave } from '../shell/storage';
import { checkParental, parentalQuestion } from '../shell/parental';
import { regler } from '../shell/voix';

const VERROU_MS = 5000;
let verrouJusqu = 0;
/** Après une mauvaise réponse, le bouton parent reste inerte 5 s. */
export function parentVerrouille(): boolean { return Date.now() < verrouJusqu; }

const compter = (m: Record<string, number>, prefixe: string): number => Object.keys(m).filter(k => k.startsWith(prefixe)).length;

/** Question d'adulte (une multiplication) avant d'ouvrir les réglages. */
export function gate(root: HTMLElement): void {
    const question = parentalQuestion(Date.now() % 100000);
    root.innerHTML = `<section class="ecran parent"><h1>Espace parent</h1><p>${question.a} × ${question.b} = ?</p>`
        + `<div class="reponses">${question.choices.map(n => `<button data-choix="${n}">${n}</button>`).join('')}</div>`
        + `<button id="fermer">Fermer</button></section>`;
    root.querySelectorAll<HTMLElement>('[data-choix]').forEach(b => bindAction(b, () => {
        if (checkParental(question, Number(b.dataset.choix))) reglages(root); else { verrouJusqu = Date.now() + VERROU_MS; go('accueil'); }
    }, `parent:choix:${b.dataset.choix}`));
    bindAction(root.querySelector<HTMLElement>('#fermer')!, () => go('accueil'), 'parent:fermer');
}

function reglages(root: HTMLElement): void {
    const storage = browserStorage();
    const save = readSave(storage);
    const seules = compter(save.progress.seule, 'tour.'), aidees = compter(save.progress.aidee, 'tour.');
    root.innerHTML = `<section class="ecran parent"><h1>Espace parent</h1>`
        + `<label>Volume : <output id="volume-val">${Math.round(save.volume * 100)}</output> %<input id="volume" type="range" min="30" max="100" step="5" value="${Math.round(save.volume * 100)}"></label>`
        + `<h2>Palier Tour</h2><p id="statut-tour">${seules} situation(s) réussie(s) seule, ${aidees} terminée(s) avec aide.</p>`
        + `<h2>Crédits</h2><p>Voix : Piper, voix siwis (base SIWIS), licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p><p>Code : licence MIT.</p>`
        + `<button id="effacer">Effacer la progression</button><div id="confirmation"></div>`
        + `<button id="fermer">Fermer</button></section>`;
    const volume = root.querySelector<HTMLInputElement>('#volume')!;
    volume.oninput = () => {
        const v = Number(volume.value) / 100;
        writeSave(storage, { ...readSave(storage), volume: v });
        regler(v);
        root.querySelector('#volume-val')!.textContent = String(Math.round(Number(volume.value)));
    };
    bindAction(root.querySelector<HTMLElement>('#effacer')!, () => {
        const zone = root.querySelector<HTMLElement>('#confirmation')!;
        zone.innerHTML = `<p>Effacer toute la progression ?</p><button id="oui">Oui, effacer</button><button id="non">Non</button>`;
        bindAction(zone.querySelector<HTMLElement>('#oui')!, () => {
            const garde = readSave(storage);
            writeSave(storage, { ...fresh(), volume: garde.volume });
            reglages(root);
        }, 'parent:oui');
        bindAction(zone.querySelector<HTMLElement>('#non')!, () => { zone.replaceChildren(); }, 'parent:non');
    }, 'parent:effacer');
    bindAction(root.querySelector<HTMLElement>('#fermer')!, () => go('accueil'), 'parent:fermer');
}

export function renderParent(root: HTMLElement): void { gate(root); }

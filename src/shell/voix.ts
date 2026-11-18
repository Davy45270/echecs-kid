// Lecteur de voix : joue les consignes pré-générées (public/voix/<id>.ogg), sans jamais lever d'erreur.
const MIN = 0.3;
const MAX = 1;
const GARDE_DEFAUT = 8000;

let niveau = MAX;
let derniere: string | undefined;
let encours: HTMLAudioElement | undefined;

export const volume = (): number => niveau;

export function regler(v: number): void {
    if (Number.isNaN(v)) return;
    niveau = Math.min(MAX, Math.max(MIN, v));
}

// Journal de test : les tests de bout en bout lisent window.__voix.
function journaliser(id: string): void {
    const w = window as unknown as { __voix?: string[] };
    (w.__voix ??= []).push(id);
}

export function dire(id: string): Promise<void> {
    derniere = id;
    journaliser(id);
    return new Promise<void>(resolve => {
        let fini = false;
        let minuterie: ReturnType<typeof setTimeout> | undefined;
        let audio: HTMLAudioElement | undefined;
        const evenements = ['ended', 'error', 'pause'];
        const finir = (): void => {
            if (fini) return;
            fini = true;
            clearTimeout(minuterie);
            for (const e of evenements) audio?.removeEventListener(e, finir);
            audio?.removeEventListener('loadedmetadata', armer);
            resolve();
        };
        // Garde : une lecture qui ne signale jamais sa fin (chargement bloqué) ne doit pas suspendre l'appelant.
        const armer = (): void => {
            clearTimeout(minuterie);
            const duree = audio !== undefined && Number.isFinite(audio.duration) ? audio.duration * 1000 + 1500 : GARDE_DEFAUT;
            minuterie = setTimeout(finir, duree);
        };
        try {
            encours?.pause();
            audio = new Audio(`voix/${id}.ogg`);
            encours = audio;
            audio.volume = niveau;
            for (const e of evenements) audio.addEventListener(e, finir);
            audio.addEventListener('loadedmetadata', armer);
            minuterie = setTimeout(finir, GARDE_DEFAUT);
            audio.play().catch(finir);
        } catch {
            finir();
        }
    });
}

export function reecouter(): void {
    if (derniere !== undefined) void dire(derniere);
}

// Lecteur de voix : joue les consignes pré-générées (public/voix/<id>.ogg), sans jamais lever d'erreur.
const MIN = 0.3;
const MAX = 1;

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
        try {
            encours?.pause();
            const audio = new Audio(`voix/${id}.ogg`);
            encours = audio;
            audio.volume = niveau;
            for (const evenement of ['ended', 'error', 'pause']) audio.addEventListener(evenement, () => resolve());
            audio.play().catch(() => resolve());
        } catch {
            resolve();
        }
    });
}

export function reecouter(): void {
    if (derniere !== undefined) void dire(derniere);
}

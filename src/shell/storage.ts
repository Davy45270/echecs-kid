// Repris d'Opencadkid (src/shell/storage.ts) : même forme de lecture défensive, autre contenu.
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** Clé = id de situation (ex. `tour.train.1`) ou de jeu. */
export interface Progress { seule: Record<string, number>; aidee: Record<string, number>; courante: Record<string, number> }
export interface Save { version: 1; volume: number; progress: Progress; decouvertes: string[] }
export const SAVE_KEY = 'echecs.v1';
const VOLUME_MIN = 0.3;
export function fresh(): Save { return { version: 1, volume: 1, progress: { seule: {}, aidee: {}, courante: {} }, decouvertes: [] }; }
export function browserStorage(): StoragePort | undefined { try { return window.localStorage; } catch { return undefined; } }
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function counts(v: unknown): Record<string, number> {
    const out: Record<string, number> = {};
    if (!isRecord(v)) return out;
    for (const [key, n] of Object.entries(v)) if (typeof n === 'number' && Number.isInteger(n) && n >= 0) out[key] = n;
    return out;
}
export function readSave(storage?: StoragePort): Save {
    try {
        const data: unknown = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
        if (!isRecord(data) || data.version !== 1 || typeof data.volume !== 'number' || Number.isNaN(data.volume) || !isRecord(data.progress)) return fresh();
        const p = data.progress;
        return {
            version: 1,
            volume: Math.min(1, Math.max(VOLUME_MIN, data.volume)),
            progress: { seule: counts(p.seule), aidee: counts(p.aidee), courante: counts(p.courante) },
            decouvertes: Array.isArray(data.decouvertes) ? data.decouvertes.filter((x): x is string => typeof x === 'string') : []
        };
    } catch { return fresh(); }
}
export function writeSave(storage: StoragePort | undefined, save: Save): void { try { storage?.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* Le jeu reste jouable si le stockage est plein ou bloqué. */ } }

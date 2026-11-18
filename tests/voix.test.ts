// @vitest-environment happy-dom
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dire, reecouter, regler, volume } from '../src/shell/voix';

const phrases = JSON.parse(readFileSync('public/voix/phrases.json', 'utf8')) as Record<string, string>;
const empreintes = JSON.parse(readFileSync('scripts/voix/empreintes.json', 'utf8')) as Record<string, string>;

type Ecouteur = () => void;
class FauxAudio {
    static instances: FauxAudio[] = [];
    static mode: 'fin' | 'erreur' = 'fin';
    volume = 1;
    ecouteurs: Record<string, Ecouteur[]> = {};
    constructor(public src: string) { FauxAudio.instances.push(this); }
    addEventListener(nom: string, f: Ecouteur) { (this.ecouteurs[nom] ??= []).push(f); }
    emettre(nom: string) { for (const f of this.ecouteurs[nom] ?? []) f(); }
    pause() { this.emettre('pause'); }
    play() {
        queueMicrotask(() => this.emettre(FauxAudio.mode === 'erreur' ? 'error' : 'ended'));
        return Promise.resolve();
    }
}

beforeEach(() => {
    FauxAudio.instances = [];
    FauxAudio.mode = 'fin';
    (globalThis as unknown as { Audio: unknown }).Audio = FauxAudio;
    delete (window as unknown as { __voix?: string[] }).__voix;
    regler(1);
});
afterEach(() => { vi.restoreAllMocks(); });

it('every phrase has an audio file and a matching fingerprint', () => {
    const ids = Object.keys(phrases).sort();
    expect(ids).toHaveLength(11);
    for (const id of ids) {
        expect(existsSync(`public/voix/${id}.ogg`), id).toBe(true);
        expect(empreintes[id], id).toMatch(/^[0-9a-f]{16}$/);
    }
    expect(Object.keys(empreintes).sort()).toEqual(ids);
});
it('volume is clamped to 0.3..1', () => {
    regler(0); expect(volume()).toBe(0.3);
    regler(-5); expect(volume()).toBe(0.3);
    regler(7); expect(volume()).toBe(1);
    regler(0.6); expect(volume()).toBe(0.6);
    regler(Number.NaN); expect(volume()).toBe(0.6);
});
it('dire plays voix/<id>.ogg at the set volume and logs the id', async () => {
    regler(0.5);
    await dire('bravo.1');
    expect(FauxAudio.instances).toHaveLength(1);
    expect(FauxAudio.instances[0]!.src).toBe('voix/bravo.1.ogg');
    expect(FauxAudio.instances[0]!.volume).toBe(0.5);
    expect((window as unknown as { __voix: string[] }).__voix).toEqual(['bravo.1']);
});
it('dire resolves even when the file fails to load', async () => {
    FauxAudio.mode = 'erreur';
    await expect(dire('regarde')).resolves.toBeUndefined();
    expect((window as unknown as { __voix: string[] }).__voix).toEqual(['regarde']);
});
it('dire resolves when Audio cannot be built or play rejects', async () => {
    (globalThis as unknown as { Audio: unknown }).Audio = function () { throw new Error('non'); };
    await expect(dire('accueil')).resolves.toBeUndefined();
    (globalThis as unknown as { Audio: unknown }).Audio = class extends FauxAudio { override play() { return Promise.reject(new Error('refus')); } };
    await expect(dire('pause')).resolves.toBeUndefined();
    expect((window as unknown as { __voix: string[] }).__voix).toEqual(['accueil', 'pause']);
});
it('reecouter replays the last instruction', async () => {
    await dire('train.consigne');
    reecouter();
    expect(FauxAudio.instances.map(a => a.src)).toEqual(['voix/train.consigne.ogg', 'voix/train.consigne.ogg']);
});

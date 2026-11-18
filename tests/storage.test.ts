import { it, expect } from 'vitest';
import { readSave, writeSave, fresh, SAVE_KEY } from '../src/shell/storage';
const port = (raw: string | null) => ({ getItem: () => raw, setItem: () => undefined });
it('corrupt or obsolete save returns fresh', () => {
    for (const value of [null, '', '{', 'null', '[]', '42', '{"version":2}', '{"version":1}', '{"version":1,"volume":"x","progress":{}}']) expect(readSave(port(value))).toEqual(fresh());
    expect(readSave()).toEqual(fresh());
    const blocked = { getItem: (): null => { throw new Error('blocked'); }, setItem: (): void => { throw new Error('full'); } };
    expect(readSave(blocked)).toEqual(fresh()); expect(() => writeSave(blocked, fresh())).not.toThrow();
});
it('volume is clamped on read', () => {
    const at = (volume: number) => readSave(port(JSON.stringify({ ...fresh(), volume }))).volume;
    expect(at(0)).toBe(0.3); expect(at(-4)).toBe(0.3); expect(at(7)).toBe(1); expect(at(0.6)).toBe(0.6);
});
it('round trips and drops invalid counters', () => {
    let raw = '';
    const storage = { getItem: () => raw, setItem: (k: string, v: string) => { expect(k).toBe(SAVE_KEY); raw = v; } };
    const save = { ...fresh(), volume: 0.5, decouvertes: ['tour'], progress: { seule: { 'tour.train.1': 2 }, aidee: { 'tour.train.2': 1 }, courante: { tour: 3 } } };
    writeSave(storage, save); expect(readSave(storage)).toEqual(save);
    raw = JSON.stringify({ ...save, progress: { seule: { a: 1, b: -1, c: 1.5, d: '2' }, aidee: [], courante: null }, decouvertes: ['x', 4] });
    const r = readSave(storage);
    expect(r.progress).toEqual({ seule: { a: 1 }, aidee: {}, courante: {} }); expect(r.decouvertes).toEqual(['x']);
});
it('courante resumes the situation index', () => {
    let raw = '';
    const storage = { getItem: () => raw, setItem: (_k: string, v: string) => { raw = v; } };
    writeSave(storage, { ...fresh(), progress: { seule: {}, aidee: {}, courante: { tour: 4 } } });
    expect(readSave(storage).progress.courante.tour).toBe(4);
    writeSave(storage, { ...readSave(storage), progress: { ...readSave(storage).progress, courante: { tour: 5 } } });
    expect(readSave(storage).progress.courante.tour).toBe(5);
});

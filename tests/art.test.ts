// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { pieceSvg } from '../src/art/pieces';
import { mascotteSvg } from '../src/art/mascotte';
import type { Color, Kind } from '../src/engine/types';

const kinds: Kind[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
const colors: Color[] = ['w', 'b'];
const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');
const fills = (svg: string) => new Set([...svg.matchAll(/(?:fill|stop-color)="(#[0-9a-f]{3,6})"/gi)].map(m => m[1]!.toLowerCase()));

it('every piece renders a well-formed svg', () => {
    for (const color of colors) for (const kind of kinds) {
        const svg = pieceSvg({ color, kind }, 56);
        const doc = parse(svg);
        expect(doc.querySelector('parsererror')).toBeNull();
        const root = doc.documentElement;
        expect(root.tagName).toBe('svg');
        expect(root.getAttribute('viewBox')).toBe('0 0 100 100');
        expect(root.getAttribute('width')).toBe('56');
    }
});
it('uses unique gradient ids on every call', () => {
    const a = pieceSvg({ color: 'w', kind: 'R' }, 56);
    const b = pieceSvg({ color: 'w', kind: 'R' }, 56);
    const id = (s: string) => /id="([^"]+)"/.exec(s)![1];
    expect(id(a)).not.toBe(id(b));
});
it('light and dark wood differ', () => {
    for (const kind of kinds) {
        const w = fills(pieceSvg({ color: 'w', kind }, 56));
        const b = fills(pieceSvg({ color: 'b', kind }, 56));
        expect([...w]).toContain('#e8c99b');
        expect([...b]).toContain('#5b3a1e');
        expect([...w]).not.toContain('#5b3a1e');
        expect([...b]).not.toContain('#e8c99b');
    }
});
it('distinguishing marks exist', () => {
    const signe: Record<Kind, string> = { B: 'fente', Q: 'couronne', K: 'croix', R: 'creneaux', N: 'crinière', P: 'boule' };
    for (const color of colors) for (const kind of kinds) {
        const doc = parse(pieceSvg({ color, kind }, 56));
        expect(doc.querySelector(`[data-signe="${signe[kind]}"]`), `${color}${kind}`).not.toBeNull();
        for (const other of kinds) if (other !== kind)
            expect(doc.querySelector(`[data-signe="${signe[other]}"]`), `${color}${kind} sans ${signe[other]}`).toBeNull();
    }
});
it('has no face', () => {
    for (const color of colors) for (const kind of kinds)
        expect(parse(pieceSvg({ color, kind }, 56)).querySelector('[data-signe="yeux"]')).toBeNull();
});
it('renders the mascot in four poses without visible text', () => {
    for (const pose of ['accueil', 'bravo', 'reflechit', 'baille'] as const) {
        const doc = parse(mascotteSvg(pose, 120));
        expect(doc.querySelector('parsererror')).toBeNull();
        expect(doc.documentElement.textContent.trim()).toBe('');
    }
    expect(mascotteSvg('bravo', 120)).not.toBe(mascotteSvg('baille', 120));
});

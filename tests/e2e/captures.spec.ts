// Captures des pièces et de la mascotte (docs/captures). Activé par CAPTURES=1 ; sans, la spec est ignorée.
import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pieceSvg } from '../../src/art/pieces';
import { mascotteSvg } from '../../src/art/mascotte';
import type { Kind } from '../../src/engine/types';

const kinds: Kind[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
const page12 = (size: number): string => (['w', 'b'] as const).map(color =>
    `<div class="rang">${kinds.map((kind, i) => `<span style="background:${(i + (color === 'w' ? 0 : 1)) % 2 ? '#b58863' : '#f0d9b5'}">${pieceSvg({ color, kind }, size)}</span>`).join('')}</div>`).join('');
const css = '<style>body{margin:0;padding:12px;background:#fff;width:max-content}.rang{display:flex;margin-bottom:8px}span{display:block;line-height:0}</style>';

test.skip(!process.env.CAPTURES, 'CAPTURES=1 pour écrire les captures');

test('captures des pièces et de la mascotte', async ({ page }) => {
    mkdirSync('docs/captures', { recursive: true });
    await page.setContent(`${css}<div id="c">${page12(44)}<hr>${page12(56)}</div>`);
    await page.locator('#c').screenshot({ path: 'docs/captures/pieces-mobile.png' });
    await page.setContent(`${css}<div id="c"><div class="rang">${(['accueil', 'bravo', 'reflechit', 'baille'] as const).map(p => mascotteSvg(p, 120)).join('')}</div></div>`);
    await page.locator('#c').screenshot({ path: 'docs/captures/mascotte.png' });
});

test('captures de la première situation, téléphone étroit et grand écran', async ({ page }) => {
    for (const [nom, width, height] of [['jeu-360x740', 360, 740], ['jeu-1280x800', 1280, 800]] as const) {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        await page.locator('#tour').click();
        await page.locator('.plateau').waitFor();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `docs/captures/${nom}.png` });
    }
});

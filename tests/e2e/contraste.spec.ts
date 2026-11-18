import { test, expect, chromium, type Page } from '@playwright/test';
import { entrer } from './jeu-outils';

/** Luminance relative moyenne (WCAG) d'une capture PNG, lue dans la page via un canvas. */
async function luminance(page: Page, png: Buffer): Promise<number> {
    const url = `data:image/png;base64,${png.toString('base64')}`;
    return page.evaluate(async src => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d')!;
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        let somme = 0;
        for (let i = 0; i < d.length; i += 4) somme += 0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!);
        return somme / (d.length / 4);
    }, url);
}

/** Les deux cases sont prises sans pièce, étoile ni indice : on masque tout sauf le fond de case. */
async function mesurer(page: Page): Promise<{ clair: number; fonce: number; ratio: number }> {
    await entrer(page);
    await page.addStyleTag({ content: '.plateau > :not(.case) { visibility: hidden !important; }' });
    const clair = await luminance(page, await page.locator('.case.clair').first().screenshot());
    const fonce = await luminance(page, await page.locator('.case.fonce').first().screenshot());
    const [a, b] = [Math.max(clair, fonce), Math.min(clair, fonce)];
    console.log(`luminance clair=${clair.toFixed(3)} fonce=${fonce.toFixed(3)} ratio=${((a + 0.05) / (b + 0.05)).toFixed(2)}`);
    return { clair, fonce, ratio: (a + 0.05) / (b + 0.05) };
}

function verifier(m: { clair: number; fonce: number; ratio: number }): void {
    expect(m.clair).toBeGreaterThan(0.5);
    expect(m.clair).toBeGreaterThan(m.fonce);
    expect(m.ratio).toBeGreaterThanOrEqual(2);
}

test.describe('sombre forcé par le navigateur', () => {
    test('le plateau garde ses cases claires et un fort contraste', async ({ baseURL }) => {
        const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-features=WebContentsForceDark'] });
        const ctx = await browser.newContext({ baseURL, colorScheme: 'dark', viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try { verifier(await mesurer(page)); } finally { await browser.close(); }
    });
});

test.describe('mode clair normal', () => {
    test('le plateau a un fort contraste', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        verifier(await mesurer(page));
    });
});

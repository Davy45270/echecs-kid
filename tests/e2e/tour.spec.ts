import { test, expect } from '@playwright/test';
import { entrer, tour, toucher, voix } from './jeu-outils';

const progres = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('echecs.v1') ?? '{}') as { progress?: { seule: Record<string, number>; aidee: Record<string, number>; courante: Record<string, number> } }).progress);

test('finishes the first train situation by tap-tap', async ({ page }, info) => {
    await entrer(page);
    await expect(page.locator('.plateau')).toHaveAttribute('data-situation', 'tour.train.1');
    await expect.poll(() => voix(page)).toContain('train.consigne');
    await toucher(page, info, '0,0');
    // Situation de découverte : les cases légales s'allument au premier toucher.
    await expect(page.locator('.case.legale')).toHaveCount(6);
    await toucher(page, info, '0,3');
    await expect(tour(page)).toHaveAttribute('data-case', '0,3');
    await expect.poll(() => voix(page)).toContain('bravo.1');
    await expect(page.locator('.plateau')).toHaveAttribute('data-situation', 'tour.train.2', { timeout: 15_000 });
    const p = await progres(page);
    expect(p?.seule['tour.train.1']).toBe(1);
    expect(p?.courante.tour).toBe(1);
    // Hors découverte, aucune case ne s'allume.
    await toucher(page, info, '0,0');
    await expect(page.locator('.piece.choisie')).toHaveCount(1);
    await expect(page.locator('.case.legale')).toHaveCount(0);
});

test('an illegal move triggers the rule voice and the 1.5 s lock', async ({ page }, info) => {
    await entrer(page);
    await toucher(page, info, '0,0');
    await toucher(page, info, '1,1');
    await expect.poll(() => voix(page)).toContain('tour.regle');
    const t0 = Date.now();
    await toucher(page, info, '0,3');
    expect(Date.now() - t0).toBeLessThan(1500);
    await page.waitForTimeout(300);
    await expect(tour(page)).toHaveAttribute('data-case', '0,0');
    await page.waitForTimeout(1500);
    await toucher(page, info, '0,3');
    await expect(tour(page)).toHaveAttribute('data-case', '0,3');
    // Une erreur a été faite : la situation compte « avec aide ».
    await expect.poll(async () => (await progres(page))?.aidee['tour.train.1']).toBe(1);
});

test('third error shows the demo', async ({ page }, info) => {
    await entrer(page);
    await toucher(page, info, '0,0');
    for (const k of ['1,1', '2,2', '3,3']) {
        await toucher(page, info, k);
        await page.waitForTimeout(1600);
    }
    await expect.poll(() => voix(page)).toContain('regarde');
    await expect(tour(page)).toHaveAttribute('data-case', '0,3', { timeout: 5000 });
    await expect.poll(async () => (await progres(page))?.aidee['tour.train.1']).toBe(1);
    expect((await progres(page))?.seule['tour.train.1']).toBeUndefined();
});

test('cells measure ≥ 56 px at 360×740 with no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrer(page, 3); // tour.train.4 : 6x6
    await expect(page.locator('.plateau')).toHaveAttribute('data-situation', 'tour.train.4');
    await expect(page.locator('.case')).toHaveCount(36);
    for (const k of ['0,0', '5,5']) {
        const box = await page.locator(`.case[data-case="${k}"]`).boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(56);
        expect(box!.height).toBeGreaterThanOrEqual(56);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    }
    const defile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(defile).toBeLessThanOrEqual(0);
    for (const id of ['#retour', '#ecouter']) {
        const b = await page.locator(id).boundingBox();
        expect(b!.width).toBeGreaterThanOrEqual(48); expect(b!.height).toBeGreaterThanOrEqual(48);
    }
});

test('dragging the rook onto the star also plays the move', async ({ page }) => {
    await entrer(page);
    const de = (await page.locator('.case[data-case="0,0"]').boundingBox())!;
    const vers = (await page.locator('.case[data-case="0,3"]').boundingBox())!;
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
    await page.mouse.down();
    await page.mouse.move(de.x + de.width / 2, (de.y + vers.y) / 2 + de.height / 2, { steps: 5 });
    await page.mouse.move(vers.x + vers.width / 2, vers.y + vers.height / 2, { steps: 5 });
    // Le contour entoure la case sous le doigt et dépasse de 24 px vers le haut.
    const contour = (await page.locator('.contour').boundingBox())!;
    expect(Math.round(contour.y)).toBe(Math.round(vers.y - 24));
    await page.mouse.up();
    await expect(tour(page)).toHaveAttribute('data-case', '0,3');
    await expect.poll(() => voix(page)).toContain('bravo.1');
});

test('a press released off the board does not freeze it', async ({ page }, info) => {
    await entrer(page);
    const vide = (await page.locator('.case[data-case="2,1"]').boundingBox())!;
    const plateau = (await page.locator('.plateau').boundingBox())!;
    await page.mouse.move(vide.x + vide.width / 2, vide.y + vide.height / 2);
    await page.mouse.down();
    await page.mouse.move(plateau.x + plateau.width / 2, plateau.y + plateau.height + 60, { steps: 5 });
    await page.mouse.up();
    await toucher(page, info, '0,0');
    await toucher(page, info, '0,3');
    await expect(tour(page)).toHaveAttribute('data-case', '0,3');
    await expect.poll(() => voix(page)).toContain('bravo.1');
});

test('a legal detour is played, never refused', async ({ page }, info) => {
    await entrer(page);
    await toucher(page, info, '0,0');
    await toucher(page, info, '1,0');
    await expect(tour(page)).toHaveAttribute('data-case', '1,0');
    await toucher(page, info, '1,3');
    await expect(tour(page)).toHaveAttribute('data-case', '1,3');
    await toucher(page, info, '0,3');
    await expect(tour(page)).toHaveAttribute('data-case', '0,3');
    await expect.poll(() => voix(page)).toContain('bravo.1');
    expect(await voix(page)).not.toContain('tour.regle');
    await expect.poll(async () => (await progres(page))?.seule['tour.train.1']).toBe(1);
});

test('dropping the rook on its own pawn says passe-pas and the rook goes back', async ({ page }, info) => {
    await entrer(page, 5); // tour.train.6 : pion blanc en 0,3
    await expect(page.locator('.plateau')).toHaveAttribute('data-situation', 'tour.train.6');
    const de = (await page.locator('.case[data-case="0,0"]').boundingBox())!;
    const vers = (await page.locator('.case[data-case="0,3"]').boundingBox())!;
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
    await page.mouse.down();
    await page.mouse.move(vers.x + vers.width / 2, vers.y + vers.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => voix(page)).toContain('tour.passe-pas');
    await expect(tour(page)).toHaveAttribute('data-case', '0,0');
    // Ni erreur ni verrou : le coup suivant est joué aussitôt.
    await toucher(page, info, '0,0');
    await toucher(page, info, '4,0');
    await expect(tour(page)).toHaveAttribute('data-case', '4,0');
    expect(await voix(page)).not.toContain('tour.regle');
});

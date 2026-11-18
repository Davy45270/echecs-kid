// Modèle : la spec hors ligne d'Opencadkid.
import { test, expect } from '@playwright/test';
import { tour, toucher, voix } from './jeu-outils';

test('after first load, reload offline still plays a situation with its voice', async ({ page, context }, info) => {
    await page.goto('/');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await context.setOffline(true);
    await page.reload();
    await page.locator('#tour').click();
    await expect(page.locator('.plateau')).toHaveAttribute('data-situation', 'tour.train.1');
    await expect.poll(() => voix(page)).toContain('train.consigne');
    // La phrase est servie par le précache, sans réseau.
    const servie = await page.evaluate(async () => {
        const r = await caches.match('voix/train.consigne.ogg', { ignoreSearch: true });
        return r ? { status: r.status, octets: (await r.arrayBuffer()).byteLength } : undefined;
    });
    expect(servie?.status).toBe(200);
    expect(servie?.octets).toBeGreaterThan(1000);
    await toucher(page, info, '0,0');
    await toucher(page, info, '0,3');
    await expect(tour(page)).toHaveAttribute('data-case', '0,3');
    await expect.poll(() => voix(page)).toContain('bravo.1');
    await context.setOffline(false);
});

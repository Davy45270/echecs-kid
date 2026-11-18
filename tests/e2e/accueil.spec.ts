import { test, expect } from '@playwright/test';

test('accueil : carte tour, aucun texte côté enfant, bouton parent de 48 px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tour')).toBeVisible();
    const texte = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.getElementById('app')!, NodeFilter.SHOW_TEXT);
        const trouves: string[] = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (n.textContent?.trim() && !n.parentElement?.closest('.parent, style, script')) trouves.push(n.textContent.trim());
        }
        return trouves;
    });
    expect(texte).toEqual([]);
    const box = await page.locator('#parent').boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48);
    await page.mouse.click(20, 400);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __voix?: string[] }).__voix)).toEqual(['accueil']);
});

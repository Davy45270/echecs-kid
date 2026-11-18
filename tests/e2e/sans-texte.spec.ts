import { test, expect, type Page } from '@playwright/test';
import { entrer } from './jeu-outils';

const textesVisibles = (page: Page): Promise<string[]> => page.evaluate(() => {
    const walker = document.createTreeWalker(document.getElementById('app')!, NodeFilter.SHOW_TEXT);
    const trouves: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.textContent?.trim() && !n.parentElement?.closest('.parent, style, script')) trouves.push(n.textContent.trim());
    }
    return trouves;
});

test('no visible text outside .parent on accueil and jeu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tour')).toBeVisible();
    expect(await textesVisibles(page)).toEqual([]);
    await entrer(page);
    expect(await textesVisibles(page)).toEqual([]);
    // Un plateau avec rocher et un autre avec pion adverse.
    for (const i of [4, 6]) {
        await entrer(page, i);
        expect(await textesVisibles(page)).toEqual([]);
    }
});

// Outils partagés des specs de jeu : entrer dans le palier, toucher une case, lire le journal des voix.
import { expect, type Page, type TestInfo } from '@playwright/test';

export const voix = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __voix?: string[] }).__voix ?? []);

/** Ouvre l'application sur la situation `index` du palier Tour (0 = la première). */
export async function entrer(page: Page, index = 0): Promise<void> {
    await page.goto('/');
    if (index > 0) {
        await page.evaluate(i => localStorage.setItem('echecs.v1', JSON.stringify({ version: 1, volume: 1, progress: { seule: {}, aidee: {}, courante: { tour: i } }, decouvertes: [] })), index);
        await page.reload();
    }
    await page.locator('#tour').click();
    await expect(page.locator('.plateau')).toBeVisible();
}

/** Toucher une case : un vrai toucher sur les projets tactiles, un clic sinon. */
export async function toucher(page: Page, info: TestInfo, k: string): Promise<void> {
    const cell = page.locator(`.case[data-case="${k}"]`);
    if (info.project.use.hasTouch) await cell.tap(); else await cell.click();
}

export const tour = (page: Page) => page.locator('.piece.a-moi[aria-label="Tour blanche"]');

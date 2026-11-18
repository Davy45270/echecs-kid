// Repris d'Opencadkid (playwright.config.ts), sans les exclusions propres à Kid.
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: 'tests/e2e',
    workers: 1,
    fullyParallel: false,
    timeout: 60_000,
    forbidOnly: Boolean(process.env.CI),
    use: { locale: 'fr-FR', baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
    projects: [
        { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
        { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
        // Téléphone étroit en portrait : le plateau 6x6 doit garder des cases de 56 px.
        { name: 'telephone-etroit', use: { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, userAgent: devices['Pixel 5'].userAgent } }
    ],
    webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});

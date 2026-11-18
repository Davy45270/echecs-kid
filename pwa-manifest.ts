// Repris d'Opencadkid (pwa-manifest.ts).
import type { ManifestOptions } from 'vite-plugin-pwa';
export const manifest: Partial<ManifestOptions> = {
    name: 'Mes premiers échecs',
    short_name: 'Échecs',
    lang: 'fr',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#426c50',
    background_color: '#fffaf0',
    start_url: './',
    scope: './',
    icons: [
        { src: 'icons/echecs-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/echecs-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/echecs-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
};

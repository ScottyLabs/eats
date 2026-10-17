import { defineConfig, loadEnv } from 'vite';
import { checker } from 'vite-plugin-checker';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react-swc';
import svgrPlugin from 'vite-plugin-svgr';
import { z } from 'zod';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const manifestForPlugin: Partial<VitePWAOptions> = {
    registerType: 'prompt',
    includeAssets: ['favicon.ico', '/favicons/apple-touch-icon.png'],
    manifest: {
        short_name: 'CMUEats',
        name: 'CMUEats',
        icons: [
            {
                src: '/favicons/android-chrome-192x192.png',
                type: 'image/png',
                sizes: '192x192',
                purpose: 'any',
            },
            {
                src: '/favicons/android-chrome-512x512.png',
                type: 'image/png',
                sizes: '512x512',
                purpose: 'any',
            },
            {
                src: '/favicons/android-chrome-192x192-maskable.png',
                type: 'image/png',
                sizes: '192x192',
                purpose: 'maskable',
            },
            {
                src: '/favicons/android-chrome-512x512-maskable.png',
                type: 'image/png',
                sizes: '512x512',
                purpose: 'maskable',
            },
        ],
        scope: '/',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
    },
};

export default defineConfig({
    plugins: [
        react(),
        svgrPlugin(),
        VitePWA({
            // WARNING! Removing this library means that all clients with the VitePWA service worker installed *will never have it uninstalled*. (see https://github.com/ScottyLabs/cmueats/pull/642 for more details)
            manifest: manifestForPlugin,
            registerType: 'autoUpdate',
            // Enables autoupdate (uses new version after user quits and reloads app)
            workbox: {
                cleanupOutdatedCaches: true,
                skipWaiting: true,
            },
            selfDestroying: true, // remove previously-registered service worker (if it exists)
        }),
        checker({
            typescript: true,
        }),
    ],
    logLevel: 'info',
});

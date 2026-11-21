import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react-swc';
import svgrPlugin from 'vite-plugin-svgr';

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

export default defineConfig(({ command }) => {
    return {
        plugins: [
            react(),
            svgrPlugin(),
            VitePWA({
                // Unregisters the service worker from when the site was a PWA
                manifest: manifestForPlugin,
                registerType: 'autoUpdate',
                // Enables autoupdate (uses new version after user quits and reloads app)
                workbox: {
                    cleanupOutdatedCaches: true,
                    skipWaiting: true,
                },
                selfDestroying: true, // remove previously-registered service worker (if it exists)
            }),
            ...(command === 'serve' ? [checker({ typescript: true })] : []),
        ],
        build: {
            target: 'es2022',
        },
        logLevel: 'info',
    };
});

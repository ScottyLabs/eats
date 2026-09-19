import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: ['apps/web/vitest.config.ts', 'apps/dining-api/vitest.config.ts'],
    },
});

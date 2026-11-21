import { expect, afterEach } from 'vitest';

import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) =>
    String(input) === '/_kennel/env.json'
        ? Response.json({ PUBLIC_API_URL: 'https://fake-url.com' })
        : await realFetch(input, init);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});

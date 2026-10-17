TODO:

- VITE_API_URL=local breaks local map
- deploy previous origin problem?
- no warning on the fronend when key sign fails in the backend
- add testing for backend key signing
Cleanup:
- apps/web/vite.config.ts:1-8 — loadEnv, zod, and createRequire/require are now unused after removing preInitEnvSchema. Remove them.
- apps/web/.env.test:1 — stale VITE_AUTO_GENERATED_MAPKITJS_TOKEN=NA; the schema no longer reads it.
- .env.example — add MAPKIT_JS_TTL= (optional, documents the 3600 default). The MAPKIT vars were correctly moved to the dining-api section.
- apps/web/package.json — netlify-plugin-mapkitjs-token is now dead weight; consider removing it.
- apps/web/src/pages/MapPage.tsx:8 — import uses '../util/mapkit.ts'; the rest of the codebase uses extensionless imports. Minor consistency issue.
- secretspec.toml — removing the MapKit secrets from [scopes.build] is correct for the web build, but verify the API runtime still receives them (previously they were build-scope only). That's the one deployment step I can't validate from this repo.

# CMUEats™

This is the monorepo for CMUEats™, an app that keep track of the statuses of various dining locations across the Pittsburgh campus of Carnegie Mellon University.

Visit the site at [https://cmueats.com], and the staging version at [https://staging.cmueats.com].

Visit the api at [https://api.cmueats.com/], and the staging version at [https://api.staging.cmueats.com/].

## Monorepo

This monorepo consists of two projects: the frontend and a backend named *Dining API*, all written in TypeScript and managed by [pnpm](https://pnpm.io/).

Install packages using
```sh
pnpm install
```

## Other Documentations

Other important documentations about CMUEats are written in markdown and located at `./docs`.

TODO:
important items to be documented:
1. testing
1. monorepo
1. backend (rating system?)
1. db management
1. deploying
1. frontend code structure
1. everything else on notion

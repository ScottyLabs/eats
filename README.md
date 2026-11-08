# CMU Eats™

This is the monorepo for CMU Eats™, an app that keeps track of the statuses of various dining locations across the Pittsburgh campus of Carnegie Mellon University.

Visit the site at <https://cmueats.com>. The dining API is served from the same host, for example <https://cmueats.com/v2/locations>.

## Monorepo

This monorepo consists of two projects: the frontend and a backend named *Dining API*, all written in TypeScript and managed as a [Deno](https://deno.com/) workspace.

[Join the CMU Eats team through governance](https://git.cmu.dev/ScottyLabs/governance#joining-a-team) to read the development secrets. Install Lix and log in to OpenBao by following kennel's [local development](https://docs.kennel.scottylabs.org/guides/local-development/#installing-nix) and [secrets](https://docs.kennel.scottylabs.org/guides/secrets/#local-development) guides, then enter the dev shell with `nix develop`, which installs the workspace packages. Start the database, the API and the frontend with `pitchfork start --local`.

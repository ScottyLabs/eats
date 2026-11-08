# Dining API

The API is served at [https://cmueats.com](https://cmueats.com/v2/locations), next to the web app.

Welcome! We're excited to have you join CMU Eats! (alternatively spelled cmueats). Documentation can be found on our [Notion page](https://app.notion.com/p/wiki-scottylabs/CMU-Eats-27496192554c80faa3fdce530494bb77). All communication will happen on the ScottyLabs Slack under the cmueats channel.

This Dining API scrapes location data from the CMU dining sites and distributes it as a RESTful API.

The API lives in the CMU Eats monorepo. Install Lix and log in to OpenBao by following kennel's [local development](https://docs.kennel.scottylabs.org/guides/local-development/#installing-nix) and [secrets](https://docs.kennel.scottylabs.org/guides/secrets/#local-development) guides, then clone the repository by running

```
git clone https://git.cmu.dev/ScottyLabs/eats.git
```

after making sure you have [git](https://git-scm.com/downloads) downloaded.

Enter the dev shell from the repository root with `nix develop`, which installs the dependencies. Start the local database and the API with

```bash
pitchfork start --local
```

The API applies the migrations in `drizzle` when it starts.

To see the contents of the database, I recommend using DBeaver. You can also run `deno task db:studio` in `apps/dining-api` to start up drizzle studio

## Database schema changes (important!)

When you make changes to the database schema, be sure to run `deno task db:push` to keep your local db in sync.

Before merging your PR, be sure to run `deno task db:generate` to generate a migration file, which the API applies to the staging and production databases when it starts. (You should do this before running tests as well!)

## Under the hood

We get the entire list of locations from `DINING_URL`, fetch location specifics under their corresponding `CONCEPT_BASE_LINK`, and retrieve soups and specials from `DINING_SOUPS_URL` and `DINING_SPECIALS_URL`, respectively. See the `process()` method in `diningParser.ts` for more details.

## Before submitting a PR

- Make sure all tests pass with `deno task test` or `deno task test --watch` for watch mode. Each database test creates and drops its own database on the local Postgres, so start it first with `pitchfork start postgres`.

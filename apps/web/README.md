# CMU Eats

<img width="516"  alt="image" src="https://github.com/user-attachments/assets/e9b9b726-223c-4a3d-b46c-b4c6121c52b9" />

Visit the site [here](http://cmueats.com/).

Welcome! We're excited to have you join CMU Eats! (alternatively spelled cmueats). Documentation can be found on our [Notion page](https://app.notion.com/p/wiki-scottylabs/CMU-Eats-27496192554c80faa3fdce530494bb77). All communication will happen on the ScottyLabs Slack under the cmueats channel.

## Developers

1. Join CMU Eats' Slack channel (`#tech-22-cmueats`) in the ScottyLabs Slack. Feel free to also put questions in there.

1. [Join the CMU Eats team through governance](https://git.cmu.dev/ScottyLabs/governance#joining-a-team) so you can push branches and read the development secrets.

1. To start developing, you'll need to install [Git](https://git-scm.com/download/win) and an IDE (I recommend [VSCode](https://code.visualstudio.com)), and install Lix by following kennel's [local development guide](https://docs.kennel.scottylabs.org/guides/local-development/#installing-nix). I recommend checking out [Learn Git Branching](https://learngitbranching.js.org) later.

1. If you're using VSCode, also download the Oxc extension for inline linting and auto-formatting.

1. Any of the following steps where you type something (i.e. git clone, nix develop, etc.) should be done in your IDE's terminal.

1. Then, clone this repository to your computer by running `git clone https://git.cmu.dev/ScottyLabs/eats.git` after making sure you have [git](https://git-scm.com/downloads) downloaded. The repository holds both the web app and the dining API.

1. Log in to OpenBao as described in kennel's [secrets guide](https://docs.kennel.scottylabs.org/guides/secrets/#local-development), then enter the dev shell from the repository root with `nix develop`. The shell installs the dependencies and loads the development secrets.

1. Start the database, the dining API and the web app with `pitchfork start --local`, then open the link the web app prints.

1. To find bootcamp issues you can work on, visit the [bootcamp issues page](https://git.cmu.dev/ScottyLabs/eats/issues?labels=130).

1. For every new issue or change you work on, first make sure your local repo is up-to-date with the ScottyLabs repo with `git pull origin main`. Create a new branch off of your current one with `git switch -c <branch-name>` (the normies use `git checkout -b <branch-name>`. that was a joke. don't kill me plz.)

1. When you want to commit changes, first stage changes with `git add .`. Then, use `git commit -m "commit message"`, where the message follows [Conventional Commits](https://www.conventionalcommits.org/) as kennel's [git hooks](https://docs.kennel.scottylabs.org/guides/local-development/#git-hooks) check. To undo commits, use `git reset --hard (HEAD~# or commit-id)` (`--hard` removes staged and unstaged changes after commit chosen to reset to; `--soft` keeps changes in working directory and keeps reset commits in staging area). Replace `#` with the number of commits you want to go back by. Similarly, using `@{#}` instead of `~#` undos the reset (not necessarily just simplified). When you are ready to push changes, use `git push -u origin branch-name`. To push new commits after this, use `git push -f` instead.

1. When you want to create a pull request for your changes, go to the [eats repo on git.cmu.dev](https://git.cmu.dev/ScottyLabs/eats) and click on `Pull Requests`. Click on `New Pull Request`. On the right side, click on your repo's branch you want to merge from, and, on the left side, make sure you have ScottyLabs' `main` branch selected. Create a description then create the pull request. Feel free to request reviewers or ask a tech lead directly, so they can review your pull requests and requests changes or merge it. If the tech lead(s) are doing their job, you should get a response within 1 to 2 days. Assuming it's not midterm or finals season. But if it is, shouldn't you be studying instead of working on cmueats anyways?

Note that nixbot will automatically run checks on your PR. This includes code linting (with tsc and oxlint) and verifying that all unit tests in `/tests` pass with vitest.

![Example checks](/public/checks_example.png)

16. To run unit tests locally, type `deno task test`.

Note: To add new dependencies, use `deno add npm:dependency-name`. To remove dependencies, use `deno remove dependency-name`. Run `deno outdated` to see what dependencies are outdated and `deno outdated --update` to update them.

## Accessing historical API data

<https://web.archive.org/web/20250000000000*/https://dining.apis.scottylabs.org/locations>
(Thanks @GhostOf0days)

Archives of the official dining site can be found on <https://web.archive.org/web/20250000000000*/https://apps.studentaffairs.cmu.edu/dining/conceptinfo/>.
Individual concept pages are also scraped (ex. <https://web.archive.org/web/20250000000000*/https://apps.studentaffairs.cmu.edu/dining/conceptinfo/Concept/113>), although accuracy may vary since the dining site sometimes glitches and returns a CLOSED status for a day that has opening times.

## CSS, the way it was meant to be written™

CMU Eats is in the process of transitioning from CSS-in-JS components to pure CSS. Most class names follow the [BEM](https://csswizardry.com/2013/01/mindbemding-getting-your-head-round-bem-syntax/) (Block, Element, Modifier) convention and strongly limit nested selectors (eg. .block-1 .block-2), but some legacy code may not. (PRs to fix these or remove CSS components are strongly encouraged!)

![image](https://github.com/user-attachments/assets/6292992f-c599-4203-ae0c-9983599d6bde)

## Local Development

### Method 1: use dummy data

In `public/_kennel/env.json`, set `PUBLIC_API_URL` to `local`.
This will use the mock data in `src/mockLocations.ts`.
E.g.:

```json
{ "PUBLIC_API_URL": "local" }
```

### Method 2: setup backend server

Run `pitchfork start --local` from the repository root. This starts PostgreSQL, the dining API on port 5010 and the Vite dev server on port 5173.

## Production/Deployment

[Kennel](https://docs.kennel.scottylabs.org/guides/deploying/) deploys the dining API from `flake.nix`. The API also serves the built web app.

## Updating the OpenAPI spec types

Update the `api.yaml` file, and run

```shell
deno task api-update
```

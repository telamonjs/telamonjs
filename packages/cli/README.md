# @telamonjs/cli

Scaffolding for TelamonJS apps: create a ready-to-run Next.js admin wired to
`@telamonjs/ui`, generate CRUD modules from your Prisma schema, lint admin
modules against the framework conventions and manage database dumps.

<!-- generated:entries -->
- `create-telamonjs-app`
- `telamonjs`
<!-- /generated:entries -->

## Create an app

```bash
npx -p @telamonjs/cli create-telamonjs-app my-admin
# or, with the CLI installed globally
pnpm add -g @telamonjs/cli && telamonjs create my-admin
```

`create-telamonjs-app <name>` is the same as `telamonjs create <name>`. Run
`create-telamonjs-app` or `telamonjs` with no arguments (or `telamonjs wizard`)
to get the **wizard**: it asks for the name, the database, the port, single app
or monorepo, and whether to install dependencies and initialize git.

| Option | Default | What it does |
| --- | --- | --- |
| `-p, --provider <provider>` | `postgresql` | Database provider: `postgresql` or `mysql` |
| `--port <port>` | `3001` | Development server port |
| `--monorepo` | off | pnpm monorepo (`apps/web`, `apps/api`, `apps/jobs`, `packages/shared`) instead of a single Next.js app |
| `--skip-install` | off | Skip dependency installation |
| `--skip-git` | off | Skip git initialization |

You get a reference `CrudConfig` module, the `AdminShell` layout with a typed
menu, NextAuth v5 sign-in, a Prisma schema with docker-compose for the
database, the Tailwind preset and pt-BR (default), en and es messages with a
language switcher. The CLI prints the remaining steps (database, env, seed)
when it finishes. The app pins `@telamonjs/cli` as a devDependency, so the
commands below also run locally, for example `pnpm telamonjs lint`.

## Generate CRUD from Prisma

```bash
telamonjs generate crud products --model Product
```

Reads `schema.prisma`, maps the fields to the field system and writes
`config.tsx`, the list `page.tsx`, a detail component for the view dialog, a
REST client and its route handlers, plus the module's i18n messages. Create,
edit and view open in dialogs, with no extra routes. It also adds the module to
the menu. Missing arguments are asked interactively. Options: `-m, --model`,
`-p, --path` (default `src/app/admin/<name>`), `--no-prisma-schema`,
`--no-update-menu`, `-f, --force` (overwrite the module's messages block).
`telamonjs g` is an alias of `generate`.

## Lint admin modules

```bash
telamonjs lint [dir]     # default: src/app/admin when it exists, else .
```

Checks admin modules against the list/dialog/hub conventions. `--json` prints
the report as JSON. Exits 1 on errors. The rules live in
[`rules.ts`](https://github.com/telamonjs/telamonjs/blob/main/packages/cli/src/commands/lint/rules.ts).

## Link a local TelamonJS checkout

```bash
telamonjs link [--ui <path>] [--package <path>]   # @telamonjs/ui from the checkout
telamonjs unlink [--package <path>]               # back to the published range
pnpm install                                      # neither command installs
```

`link` points `@telamonjs/ui` at a checkout's `packages/ui` as an injected `file:`
dependency and adds the required `pnpm.overrides["@telamonjs/logger"]` (a `link:`
to the checkout's `packages/logger`) to the workspace root's `package.json`.
`unlink` removes both and restores the range committed at `HEAD`, else `^` plus the
latest published version, never the checkout's own version. The edited
`package.json` is `apps/web/package.json` when it exists, else `./package.json`;
`--ui` defaults to `$TELAMONJS_UI`, else `../telamonjs/packages/ui` next to the
workspace root. Monorepo apps wrap both in `pnpm telamonjs:link` /
`pnpm telamonjs:unlink`, and their husky hooks unlink before each commit and
relink after it.

## Other commands

| Command | What it does |
| --- | --- |
| `telamonjs db dump [name]` | Dump the database into `database/dumps/` with a timestamp |
| `telamonjs db restore` | Restore a dump, picked interactively |
| `telamonjs analyze` | Check a project's TelamonJS setup (version, Prisma, NextAuth, Docker, scripts) and suggest fixes. `-v`, `--json` |
| `telamonjs stats` | Git repository statistics. `-v`, `--json`, `-p, --path <path>` |

Requires Node ≥ 22. The package manager is detected from the launcher
(`pnpm dlx`, `yarn dlx`) or the lockfile, with npm as the fallback.

**Full docs →** [the docs site sources](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs)
(MDX, readable on GitHub).

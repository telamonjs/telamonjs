#!/usr/bin/env node
// Entry for the `create-telamonjs-app` bin, run as
// `npx -p @telamonjs/cli create-telamonjs-app <name>` (there is no
// unscoped `create-telamonjs-app` package, so `pnpm create telamonjs-app` does not
// resolve). `create-telamonjs-app my-app --monorepo` means `telamonjs create my-app
// --monorepo`; without arguments the CLI falls back to the wizard, as `telamonjs` does.
if (process.argv.length > 2) process.argv.splice(2, 0, 'create')
void import('./cli.js')

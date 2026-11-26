#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { createApp } from './commands/create.js'
import { runWizard } from './commands/wizard.js'
import { runStats } from './commands/stats.js'
import { generateCommand } from './commands/generate/index.js'
import { dbCommand } from './commands/db/index.js'
import { analyzeCommand } from './commands/analyze/index.js'
import { lintCommand } from './commands/lint/index.js'
import { addCommand } from './commands/add/index.js'
import { runLink, runUnlink } from './commands/link.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
)
const version = packageJson.version

const program = new Command()

program
  .name('telamonjs')
  .description('CLI for creating admin applications with Next.js')
  .version(version)

// Interactive wizard (default)
program
  .command('wizard')
  .alias('init')
  .description('Interactive setup wizard (default)')
  .action(runWizard)

// Create new project
program
  .command('create')
  .alias('new')
  .description('Create a new admin application')
  .argument('[project-name]', 'Name of the project')
  .option(
    '-p, --provider <provider>',
    'Database provider (postgresql, mysql)',
    'postgresql'
  )
  .option('--port <port>', 'Development server port', '3001')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-git', 'Skip git initialization')
  .option(
    '--monorepo',
    'Generate a pnpm monorepo (apps/web, apps/api, apps/jobs, packages/shared) instead of a single Next.js app'
  )
  .action(createApp)

// Generate CRUD modules
program.addCommand(generateCommand)

// Database operations
program.addCommand(dbCommand)

// Project analysis
program.addCommand(analyzeCommand)

// Convention lint (CrudConfig / dialogs / hubs)
program.addCommand(lintCommand)

// Admin kit: audit, parameters
program.addCommand(addCommand)

// Link mode: @telamonjs/ui from a local TelamonJS checkout
program
  .command('link')
  .description('Point @telamonjs/ui at a local TelamonJS checkout (injected file: + overrides for its workspace packages)')
  .option('--ui <path>', 'The checkout\'s packages/ui (default: $TELAMONJS_UI, else ../telamonjs/packages/ui from the workspace root)')
  .option('--package <path>', 'The package.json to edit (default: apps/web/package.json, else package.json)')
  .action(runLink)

program
  .command('unlink')
  .description('Restore the published @telamonjs/ui range and remove the link-mode entries')
  .option('--package <path>', 'The package.json to edit (default: apps/web/package.json, else package.json)')
  .action(runUnlink)

// Git repository statistics
program
  .command('stats')
  .description('Analyze git repository statistics')
  .option('-v, --verbose', 'Show detailed output')
  .option('--json', 'Output as JSON')
  .option(
    '-p, --path <path>',
    'Path to repository (default: current directory)'
  )
  .action(runStats)

// Global error handler
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`))
  console.log('See --help for a list of available commands.')
  process.exit(1)
})

// Show help if no command provided
if (!process.argv.slice(2).length) {
  // Run wizard by default
  runWizard()
} else {
  program.parse()
}

/**
 * Generate command - scaffolding tools
 */

import { Command } from 'commander'
import { generateCrud } from './crud.js'

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate CRUD modules, pages, and components')

// CRUD subcommand
generateCommand
  .command('crud')
  .description('Generate a complete CRUD module')
  .argument('[name]', 'Module name (plural)')
  .option('-m, --model <model>', 'Prisma model name (singular)')
  .option('--no-prisma-schema', 'Skip Prisma schema detection')
  .option('-p, --path <path>', 'Module path (default: src/app/admin/[name])')
  .option('--no-update-menu', 'Skip menu update')
  .option('-f, --force', 'Overwrite this module\'s i18n messages block if it already exists')
  .action(async (name, options) => {
    await generateCrud({
      name,
      ...options,
    })
  })

export { generateCrud }

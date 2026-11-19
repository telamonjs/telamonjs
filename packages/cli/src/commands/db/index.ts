import { Command } from 'commander'
import { runDump } from './dump.js'
import { runRestore } from './restore.js'

export const dbCommand = new Command('db').description('Database operations')

dbCommand
  .command('dump')
  .description('Create database dump with timestamp')
  .argument('[name]', 'Custom dump name (optional)')
  .action(runDump)

dbCommand
  .command('restore')
  .description('Restore database from dump (interactive)')
  .action(runRestore)

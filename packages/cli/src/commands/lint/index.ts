import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Command } from 'commander'
import chalk from 'chalk'
import { lintProject, printReport } from './lint.js'

export { lintProject, findFiles, printReport, type LintReport } from './lint.js'
export type { Finding } from './rules.js'

const DEFAULT_DIR = 'src/app/admin'

export const lintCommand = new Command('lint')
  .description('Check admin modules against the telamonjs list/dialog/hub conventions')
  .argument('[dir]', `Directory to lint (default: ${DEFAULT_DIR} when it exists, else .)`)
  .option('--json', 'Output the report as JSON')
  .action((dir: string | undefined, options: { json?: boolean }) => {
    const target = resolve(dir ?? (existsSync(DEFAULT_DIR) ? DEFAULT_DIR : '.'))
    if (!existsSync(target)) {
      console.error(chalk.red(`Directory not found: ${target}`))
      process.exit(2)
    }
    const report = lintProject(target)
    if (options.json) console.log(JSON.stringify(report, null, 2))
    else printReport(report)
    process.exit(report.errors ? 1 : 0)
  })

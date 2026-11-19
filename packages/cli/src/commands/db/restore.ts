import execa from 'execa'
import { existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

// Simple logger for db commands
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export async function runRestore() {
  logger.info('♻️  Database Restore Tool')
  console.log()

  const projectRoot = process.cwd()

  // Check if dumps directory exists
  const dumpsDir = join(projectRoot, 'database/dumps')
  if (!existsSync(dumpsDir)) {
    logger.error('Database dumps directory not found')
    logger.info('  Expected: database/dumps/')
    console.log()
    logger.info('💡 Create your first dump:')
    logger.info('   telamonjs db dump')
    console.log()
    process.exit(1)
  }

  // Execute script directly from CLI templates
  const scriptPath = join(__dirname, '../../templates/database/restore.sh')

  if (!existsSync(scriptPath)) {
    logger.error('Restore script not found in CLI')
    logger.info(`Expected: ${scriptPath}`)
    process.exit(1)
  }

  // Execute script (interactive mode)
  logger.info('Starting interactive restore...')
  console.log()

  try {
    await execa('bash', [scriptPath], {
      cwd: projectRoot,
      stdio: 'inherit', // Interactive CLI needs full stdio
    })
  } catch (error) {
    logger.error('Failed to restore database')
    if (error instanceof Error) {
      logger.error(error.message)
    }
    process.exit(1)
  }
}

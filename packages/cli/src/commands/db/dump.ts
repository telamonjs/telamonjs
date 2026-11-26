import execa from 'execa'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export async function runDump(name?: string) {
  logger.info('📦 Database Dump Tool')
  console.log()

  const projectRoot = process.cwd()

  // Ensure database/dumps directory exists
  const dumpsDir = join(projectRoot, 'database/dumps')
  if (!existsSync(dumpsDir)) {
    mkdirSync(dumpsDir, { recursive: true })
    logger.info('Created database/dumps directory')
  }
  // A dump is the whole database: keep it out of git whatever the app's
  // .gitignore says (older apps' rules do not match *.sql.gz)
  const dumpsIgnore = join(dumpsDir, '.gitignore')
  if (!existsSync(dumpsIgnore)) writeFileSync(dumpsIgnore, '*\n')

  // Execute script directly from CLI templates
  const scriptPath = join(__dirname, '../../templates/database/dump.sh')

  if (!existsSync(scriptPath)) {
    logger.error('Dump script not found in CLI')
    logger.info(`Expected: ${scriptPath}`)
    process.exit(1)
  }

  // Execute script with project root as working directory
  logger.info('Creating database dump...')
  try {
    const args = name ? [scriptPath, name] : [scriptPath]
    await execa('bash', args, {
      cwd: projectRoot,
      stdio: 'inherit',
    })
  } catch (error) {
    logger.error('Failed to create database dump')
    if (error instanceof Error) {
      logger.error(error.message)
    }
    process.exit(1)
  }
}

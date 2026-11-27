import execa from 'execa'
import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'
import { spinner } from './spinner.js'
import { openBrowser } from './browser.js'

// Simple logger for CLI
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
  newLine: () => console.log(),
}

/**
 * Copy .env.example to .env
 */
export async function setupEnvFile(projectPath: string): Promise<void> {
  const envExamplePath = path.join(projectPath, '.env.example')
  const envPath = path.join(projectPath, '.env')

  try {
    // Check if .env.example exists
    if (!(await fs.pathExists(envExamplePath))) {
      logger.warning('No .env.example found, skipping .env creation')
      return
    }

    // Copy to .env
    await fs.copy(envExamplePath, envPath)
    logger.success('Created .env file')
  } catch (error) {
    throw new Error(`Failed to setup .env file: ${error}`)
  }
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execa('docker', ['--version'])
    return true
  } catch {
    return false
  }
}

/**
 * Start Docker database service only
 */
export async function startDockerDatabase(projectPath: string): Promise<void> {
  const spin = spinner.start('Starting Docker database...')

  try {
    // Check if Docker is available
    if (!(await isDockerAvailable())) {
      spin.fail('Docker is not installed or not running')
      throw new Error('Docker is not installed or not running')
    }

    // Start only the db service in detached mode
    await execa('docker', ['compose', 'up', '-d', 'db'], {
      cwd: projectPath,
    })

    spin.succeed('Docker database started')
  } catch (error) {
    spin.fail('Failed to start Docker database')
    throw new Error(`Failed to start Docker database: ${error}`)
  }
}

/**
 * Wait for database to be ready by checking container health
 */
export async function waitForDatabase(
  projectPath: string,
  provider: 'postgresql' | 'mysql',
  timeoutSeconds: number = 60
): Promise<void> {
  const spin = spinner.start(`Waiting for ${provider} to be ready...`)
  const startTime = Date.now()
  const timeoutMs = timeoutSeconds * 1000

  try {
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check container health status
        const { stdout } = await execa(
          'docker',
          ['compose', 'ps', '--format', 'json', 'db'],
          {
            cwd: projectPath,
          }
        )

        // Parse JSON output
        const containers = stdout
          .trim()
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))

        // Check if db container is healthy
        const dbContainer = containers.find(c => c.Service === 'db')
        if (dbContainer && dbContainer.Health === 'healthy') {
          spin.succeed(`${provider} is ready`)
          return
        }

        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch {
        // Container might not be fully started yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Timeout reached
    spin.fail(`Database did not become ready within ${timeoutSeconds} seconds`)
    throw new Error(
      `Database did not become ready within ${timeoutSeconds} seconds`
    )
  } catch (error) {
    spin.fail('Failed to wait for database')
    throw error
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(
  projectPath: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'pnpm'
): Promise<void> {
  const spin = spinner.start('Running database migrations...')

  try {
    const command = packageManager === 'npm' ? 'npm' : packageManager
    // Runs without a terminal, so `prisma migrate dev` can't ask for a name
    // when it has to create the first migration (a MySQL app): give it one
    const args =
      packageManager === 'npm'
        ? ['run', 'db:migrate', '--', '--name', 'init']
        : ['db:migrate', '--name', 'init']

    await execa(command, args, {
      cwd: projectPath,
      stdio: 'pipe', // Capture output instead of inherit
    })

    spin.succeed('Migrations completed')
  } catch (error) {
    spin.fail('Failed to run migrations')
    throw new Error(`Failed to run migrations: ${error}`)
  }
}

/**
 * Run database seed
 */
export async function runSeed(
  projectPath: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'pnpm'
): Promise<void> {
  const spin = spinner.start('Seeding database...')

  try {
    const command = packageManager === 'npm' ? 'npm' : packageManager
    const args = packageManager === 'npm' ? ['run', 'db:seed'] : ['db:seed']

    await execa(command, args, {
      cwd: projectPath,
      stdio: 'pipe',
    })

    spin.succeed('Database seeded')
  } catch (error) {
    spin.fail('Failed to seed database')
    throw new Error(`Failed to seed database: ${error}`)
  }
}

/**
 * Complete setup orchestration for app template. Throws on the first failing
 * step; the caller (`telamonjs create`) reports it with the manual steps.
 */
export async function setupAppTemplate(
  projectPath: string,
  provider: 'postgresql' | 'mysql',
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'pnpm',
  appPort: number = 3001
): Promise<void> {
  logger.newLine()
  logger.info('🚀 Setting up your app...')
  logger.newLine()

  // 1. Setup .env file
  await setupEnvFile(projectPath)

  // 2. Start Docker database
  await startDockerDatabase(projectPath)

  // 3. Wait for database to be ready
  await waitForDatabase(projectPath, provider, 60)

  // 4. Run migrations
  await runMigrations(projectPath, packageManager)

  // 5. Run seed
  await runSeed(projectPath, packageManager)

  logger.newLine()
  logger.success('✨ App setup completed successfully!')
  logger.newLine()

  // 6. Open browser with instructions
  logger.info('📝 Next steps:')
  logger.step(`cd ${path.basename(projectPath)}`)
  logger.step(`${packageManager} dev`)
  logger.newLine()
  logger.info(`🌐 The app will be available at: http://localhost:${appPort}`)
  logger.newLine()

  // Open browser after a short delay to show messages first
  setTimeout(async () => {
    await openBrowser(`http://localhost:${appPort}`)
  }, 2000)
}

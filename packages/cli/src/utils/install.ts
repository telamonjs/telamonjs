import execa from 'execa'
import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'

// Simple logger for CLI
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
}

export async function installDependencies(
  projectPath: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm',
  retries: number = 1
): Promise<void> {
  try {
    logger.step(`Installing dependencies with ${packageManager}...`)
    logger.info(
      'This may take a few minutes depending on your internet connection...'
    )

    // Package-manager-specific arguments
    const installArgs = ['install']

    // For pnpm, add flags to improve reliability
    if (packageManager === 'pnpm') {
      // Fetch timeout of 10 minutes (600000ms)
      installArgs.push('--fetch-timeout', '600000')
      // Use the cache when possible to speed things up
      installArgs.push('--prefer-offline')
    }

    // Try to install with a 10-minute timeout
    await execa(packageManager, installArgs, {
      cwd: projectPath,
      stdio: 'inherit',
      timeout: 600000, // 10 minutes
    })

    // Check that the Prisma Client was generated (postinstall hook)
    const prismaClientPath = path.join(
      projectPath,
      'node_modules/.prisma/client'
    )
    const prismaClientExists = await fs.pathExists(prismaClientPath)

    if (!prismaClientExists) {
      logger.warning('Prisma client not generated, running manually...')
      const command = packageManager === 'npm' ? 'npm' : packageManager
      const args =
        packageManager === 'npm' ? ['run', 'postinstall'] : ['postinstall']

      await execa(command, args, {
        cwd: projectPath,
        stdio: 'inherit',
        timeout: 300000, // 5 minutes for postinstall
      })
    }

    logger.success('Dependencies installed successfully')
  } catch (error: unknown) {
    const timedOut = error instanceof Error && 'timedOut' in error && (error as { timedOut?: boolean }).timedOut === true

    // Timed out and we still have retries left
    if (timedOut && retries > 0) {
      logger.warning(
        `Installation timed out. Retrying... (${retries} attempts remaining)`
      )
      return installDependencies(projectPath, packageManager, retries - 1)
    }

    // Timed out with no retries left
    if (timedOut) {
      logger.error('Installation timed out after multiple attempts')
      logger.info('Try running the installation manually:')
      logger.step(`cd ${projectPath}`)
      logger.step(`${packageManager} install`)
      throw new Error(
        'Installation timed out. Your internet connection may be slow or unstable.'
      )
    }

    logger.error(`Failed to install dependencies: ${error}`)
    throw error
  }
}

export function detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
  // Internal dev (a checkout of the framework itself) is an explicit opt-in
  // via env var — never inferred from the path.
  if (process.env.TELAMONJS_DEV === 'true') return 'pnpm'

  // `pnpm dlx` / `pnpm create` / `yarn dlx` say who launched us ("pnpm/9.15.9 …").
  // npm/npx is not trusted here: it's also the fallback, so lockfiles get a say.
  const userAgent = process.env.npm_config_user_agent ?? ''
  if (userAgent.startsWith('pnpm/')) return 'pnpm'
  if (userAgent.startsWith('yarn/')) return 'yarn'

  // Check for lock files in current directory (fs-extra already imported at the top)
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm'
  if (fs.existsSync('yarn.lock')) return 'yarn'
  if (fs.existsSync('package-lock.json')) return 'npm'

  // Default to npm (most widely available)
  // Note: Removed require.resolve() checks as they're not ESM-compatible
  // Lock file detection is more reliable anyway
  return 'npm'
}

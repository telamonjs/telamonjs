import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import {
  validateProjectName,
  validateProjectPath,
  installDependencies,
  initGit,
  copyTemplate,
  detectPackageManager,
  setupAppTemplate,
  type TemplateData,
} from '../utils/index.js'
import { createMonorepoApp } from './create-monorepo.js'

export interface CreateOptions {
  provider?: 'postgresql' | 'mysql'
  port?: number
  skipInstall?: boolean
  skipGit?: boolean
  // Generate a pnpm monorepo (apps/web + apps/api + apps/jobs + packages/shared)
  // instead of the single-package Next.js template. Left undefined when the
  // flag was not passed, so createApp knows to ask about it interactively.
  monorepo?: boolean
}

// Simple logger for CLI
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
  banner: (msg: string) => {
    console.log()
    console.log(chalk.bold.cyan(`╔${'═'.repeat(msg.length + 2)}╗`))
    console.log(chalk.bold.cyan(`║ ${msg} ║`))
    console.log(chalk.bold.cyan(`╚${'═'.repeat(msg.length + 2)}╝`))
    console.log()
  },
  newLine: () => console.log(),
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// @telamonjs/ui version pinned into generated apps' package.json
// (fills the {{uiVersion}} placeholder in templates/app/package.json).
// Bump this with telamonjs-ui minors too: the templates follow the latest API.
export const DEFAULT_UI_VERSION = '^1.11.0'

// This CLI's own version, pinned as devDependency of generated apps so
// `pnpm lint:telamonjs` (`telamonjs lint`) works without a global install.
const CLI_VERSION: string = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
).version

export async function createApp(
  projectName?: string,
  options: CreateOptions = {}
): Promise<void> {
  try {
    logger.banner('Create TelamonJS App')

    // Internal dev environment (a checkout of the framework itself) is an
    // explicit opt-in via env var — never inferred from the path, which does
    // not exist outside the framework monorepo.
    const isLocalDev = process.env.TELAMONJS_DEV === 'true'

    // Get project name if not provided
    if (!projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project name?',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Project name is required'
            }
            const validation = validateProjectName(input.trim())
            if (!validation.valid) {
              return `Invalid project name: ${validation.problems?.join(', ')}`
            }
            return true
          },
        },
      ])
      projectName = answers.projectName.trim()
    }

    // Validate project name
    const nameValidation = validateProjectName(projectName!)
    if (!nameValidation.valid) {
      logger.error(
        `Invalid project name: ${nameValidation.problems?.join(', ')}`
      )
      process.exit(1)
    }

    // Get database provider and port
    let { provider } = options
    let appPort = options.port || 3001

    if (!provider) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which database would you like to use?',
          choices: [
            { name: 'PostgreSQL (Recommended)', value: 'postgresql' },
            { name: 'MySQL', value: 'mysql' },
          ],
          default: 'postgresql',
        },
        {
          type: 'number',
          name: 'appPort',
          message: 'Which port for development server?',
          default: 3001,
          validate: (value: number) => {
            if (value < 1024 || value > 65535) {
              return 'Port must be between 1024 and 65535'
            }
            return true
          },
        },
      ])
      provider = answers.provider
      appPort = answers.appPort
    }

    // Fall back to the default provider when none was specified
    if (!provider) {
      provider = 'postgresql'
    }

    // Monorepo vs. single-package template — only asked when the flag was
    // not passed (undefined, not false) and there is a terminal to ask on;
    // non-interactive runs (CI, scripts, piped stdin) keep the 2.4 behavior:
    // single-package, no prompt (inquirer's confirm crashes on a closed stdin).
    let monorepo = options.monorepo
    if (monorepo === undefined && !process.stdin.isTTY) {
      monorepo = false
    }
    if (monorepo === undefined) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'monorepo',
          message: 'Monorepo (web + api + jobs)?',
          default: false,
        },
      ])
      monorepo = answers.monorepo
    }

    const projectPath = path.resolve(process.cwd(), projectName!)

    // Validate project path
    const pathValidation = validateProjectPath(projectPath)
    if (!pathValidation.valid) {
      logger.error(pathValidation.error!)
      process.exit(1)
    }

    logger.info(`Creating project: ${projectName}`)
    logger.info(`Database: ${provider}`)
    logger.info(`Port: ${appPort}`)
    logger.info(`Location: ${projectPath}`)
    logger.newLine()

    if (monorepo) {
      await createMonorepoApp(projectName!, projectPath, {
        provider: provider as 'postgresql' | 'mysql',
        // commander leaves --port as a string; Number() it here so
        // createMonorepoApp's `appPort + 1000` is arithmetic, not concatenation.
        appPort: Number(appPort),
        skipInstall: options.skipInstall,
        skipGit: options.skipGit,
        isLocalDev,
        cliVersion: CLI_VERSION,
      })
      return
    }

    // Create project directory
    await fs.ensureDir(projectPath)

    // Prepare template data
    const isPostgres = provider === 'postgresql'
    const dbPort = isPostgres ? 5432 : 3306

    const templateData: TemplateData = {
      projectName: projectName!,
      projectSlug: projectName!.replace(/-/g, '_'),
      appName: projectName!
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      databaseProvider: provider,
      uiVersion: DEFAULT_UI_VERSION,
      cliVersion: `^${CLI_VERSION}`,
      appPort: appPort,
      dbPort: dbPort,
      dbImage: isPostgres ? 'postgres:16-alpine' : 'mysql:8.0',
      dbVolumePath: isPostgres ? 'postgresql' : 'mysql',
      databaseName: isPostgres ? 'PostgreSQL' : 'MySQL',
      databaseUrl: isPostgres
        ? `postgresql://postgres:password@localhost:${dbPort}/${projectName!.replace(/-/g, '_')}`
        : `mysql://root:password@localhost:${dbPort}/${projectName!.replace(/-/g, '_')}`,
      dockerDatabaseUrl: isPostgres
        ? `postgresql://postgres:password@db:${dbPort}/${projectName!.replace(/-/g, '_')}`
        : `mysql://root:password@db:${dbPort}/${projectName!.replace(/-/g, '_')}`,
    }

    // Docker compose environment variables
    if (isPostgres) {
      templateData.dbEnvironment = `      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ${templateData.projectSlug}`
      templateData.dbHealthCheck = `['CMD-SHELL', 'pg_isready -U postgres']`
    } else {
      templateData.dbEnvironment = `      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: ${templateData.projectSlug}`
      templateData.dbHealthCheck = `['CMD', 'mysqladmin', 'ping', '-h', 'localhost']`
    }

    // Copy template files
    const templatePath = path.join(__dirname, '../../templates/app')
    await copyTemplate(templatePath, projectPath, templateData)

    if (isLocalDev) {
      logger.info(
        'Local development detected - configured for local telamonjs packages'
      )
    }

    // Detect package manager
    const packageManager = detectPackageManager()

    // Install dependencies if not skipped
    if (!options.skipInstall && !isLocalDev) {
      await installDependencies(projectPath, packageManager)
    }

    // Initialize git if not skipped
    if (!options.skipGit) {
      await initGit(projectPath)
    }

    // Automatic setup (EXCEPT in local dev environment)
    if (!isLocalDev && !options.skipInstall) {
      try {
        await setupAppTemplate(
          projectPath,
          provider as 'postgresql' | 'mysql',
          packageManager,
          appPort
        )
      } catch {
        // On failure, keep going and show the manual instructions
        logger.warning(
          'Automatic setup failed, please follow manual steps below'
        )
      }
    }

    // Success message
    logger.newLine()
    logger.success(`Project ${projectName} created successfully!`)
    logger.newLine()

    // Next steps
    logger.info('Next steps:')
    logger.step(`cd ${projectName}`)

    if (options.skipInstall || isLocalDev) {
      logger.step(`${packageManager} install`)

      if (isLocalDev) {
        logger.newLine()
        logger.info('Local development setup:')
        logger.step(
          'For local development of the framework, use pnpm link with the path to your checkout'
        )
      }
    }

    if (isLocalDev || options.skipInstall) {
      // Show manual instructions
      logger.newLine()
      logger.info('💻 Local Development (Recommended):')
      logger.step('docker compose up -d  # Start database only')
      logger.step('cp .env.example .env')
      logger.step('pnpm db:migrate')
      logger.step('pnpm db:seed')
      logger.newLine()
      logger.info('🐳 Production with Docker:')
      logger.step('docker compose -f docker-compose.prod.yml up --build')
      logger.step(`Access http://localhost:${appPort}`)
    } else {
      // Automatic setup has already run
      logger.newLine()
      logger.info('🎉 Your app is ready to use!')
      logger.info(`Access: http://localhost:${appPort}`)
      logger.newLine()
      logger.info('🐳 Production with Docker:')
      logger.step('docker compose -f docker-compose.prod.yml up --build')
    }

    logger.newLine()
    logger.info('👤 Default credentials:')
    logger.step('Email: admin@example.com')
    logger.step('Password: 12345')
    logger.newLine()
    logger.step('pnpm dev')
    logger.newLine()
  } catch (error) {
    logger.error(`Failed to create project: ${error}`)
    process.exit(1)
  }
}

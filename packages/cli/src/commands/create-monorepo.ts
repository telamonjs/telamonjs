import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import execa from 'execa'
import {
  copyTemplate,
  renderTemplatePlaceholders,
  restoreDotfiles,
  initGit,
  type TemplateData,
} from '../utils/index.js'
import { DEFAULT_UI_VERSION } from './create.js'

// Simple logger for CLI — mirrors create.ts (kept local, not worth sharing
// a module for four one-line wrappers).
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
  newLine: () => console.log(),
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export interface MonorepoCreateOptions {
  provider: 'postgresql' | 'mysql'
  appPort: number
  skipInstall?: boolean
  skipGit?: boolean
  isLocalDev: boolean
  cliVersion: string
}

// Paths removed from the copied apps/web tree (single-package template) —
// they move to packages/shared (prisma, src/rbac.ts — moved below) or
// apps/api (the usuarios/roles route handlers), or are simply redundant with
// the root's own file.
const WEB_PATHS_TO_REMOVE = [
  'prisma',
  'src/lib/prisma.ts',
  'src/app/api/usuarios',
  'src/app/api/roles',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  '.env.example',
  // Superseded by the root README, which documents the whole monorepo
  // (single-package commands like `db:migrate` don't apply to apps/web here).
  'README.md',
]

/**
 * Generates the pnpm monorepo layout (apps/web, apps/api, apps/jobs,
 * packages/shared) instead of the single-package Next.js template.
 * apps/web starts from the same templates/app used by the single-package
 * flow, then has the monorepo-only files removed and an overlay
 * (templates/monorepo/apps/web-overlay) applied on top — the two flows
 * never diverge on the underlying CrudConfig/AdminShell app itself.
 */
export async function createMonorepoApp(
  projectName: string,
  projectPath: string,
  options: MonorepoCreateOptions
): Promise<void> {
  const { provider, appPort, skipInstall, skipGit, isLocalDev, cliVersion } = options
  const isPostgres = provider === 'postgresql'
  const dbPort = isPostgres ? 5432 : 3306
  // apps/api's port: web port + 1000 (e.g. 3001 -> 4001), shown in the
  // summary below and used as the default in .env.example/docker-compose.
  const apiPort = appPort + 1000
  // ponytail: no wizard prompt for this — Redis has no reason to collide
  // with anything else on a dev machine at its own default port. Add a
  // prompt if that ever stops being true.
  const redisPort = 6379
  const projectSlug = projectName.replace(/-/g, '_')
  const scope = `@${projectName}`
  const appName = projectName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const templateData: TemplateData = {
    projectName,
    projectSlug,
    appName,
    scope,
    databaseProvider: provider,
    databaseName: isPostgres ? 'PostgreSQL' : 'MySQL',
    uiVersion: DEFAULT_UI_VERSION,
    cliVersion: `^${cliVersion}`,
    appPort,
    apiPort,
    dbPort,
    redisPort,
    dbImage: isPostgres ? 'postgres:16-alpine' : 'mysql:8.0',
    dbVolumePath: isPostgres ? 'postgresql' : 'mysql',
    databaseUrl: isPostgres
      ? `postgresql://postgres:password@localhost:${dbPort}/${projectSlug}`
      : `mysql://root:password@localhost:${dbPort}/${projectSlug}`,
    dbEnvironment: isPostgres
      ? `      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: password\n      POSTGRES_DB: ${projectSlug}`
      : `      MYSQL_ROOT_PASSWORD: password\n      MYSQL_DATABASE: ${projectSlug}`,
    dbHealthCheck: isPostgres
      ? `['CMD-SHELL', 'pg_isready -U postgres']`
      : `['CMD', 'mysqladmin', 'ping', '-h', 'localhost']`,
  }

  await fs.ensureDir(projectPath)

  const templatesRoot = path.join(__dirname, '../../templates')
  const appTemplate = path.join(templatesRoot, 'app')
  const monorepoTemplate = path.join(templatesRoot, 'monorepo')

  // apps/web — the single-package template, pruned and overlaid.
  const webPath = path.join(projectPath, 'apps/web')
  await copyTemplate(appTemplate, webPath)
  for (const rel of WEB_PATHS_TO_REMOVE) {
    await fs.remove(path.join(webPath, rel))
  }
  await fs.copy(path.join(monorepoTemplate, 'apps/web-overlay'), webPath)

  // packages/shared — Prisma schema/seed from the same template, plus the
  // shared package scaffolding (package.json, tsconfig, prisma client).
  const sharedPath = path.join(projectPath, 'packages/shared')
  await fs.copy(path.join(monorepoTemplate, 'packages/shared'), sharedPath)
  await fs.copy(path.join(appTemplate, 'prisma'), path.join(sharedPath, 'prisma'))
  // The RBAC catalog + loadAccess serve apps/web (sign-in), apps/api (guard)
  // and the seed: `{{scope}}/shared/rbac`. Same relative path for the seed
  // (`../src/rbac`) in both layouts.
  await fs.move(path.join(webPath, 'src/rbac.ts'), path.join(sharedPath, 'src/rbac.ts'))

  // apps/api and apps/jobs — no equivalent in the single-package template.
  await fs.copy(path.join(monorepoTemplate, 'apps/api'), path.join(projectPath, 'apps/api'))
  await fs.copy(path.join(monorepoTemplate, 'apps/jobs'), path.join(projectPath, 'apps/jobs'))

  // Root files (pnpm-workspace.yaml, root package.json, tsconfig.base.json,
  // .env.example, docker-compose.yml, traefik/, CLAUDE.md, README.md).
  await fs.copy(path.join(monorepoTemplate, 'root'), projectPath)

  // One pass resolves every {{placeholder}} across the whole tree (web,
  // shared, api, jobs, root) — see renderTemplatePlaceholders in copy.ts.
  await restoreDotfiles(projectPath)
  await renderTemplatePlaceholders(projectPath, templateData)

  // apps/web and packages/shared read `.env` from their own directory
  // (Next.js) or their own cwd (Prisma) — a symlink to the root .env avoids
  // three copies of the same secrets. Dangling until `.env` is created
  // (see the manual steps below) is fine for a symlink.
  await fs.symlink('../../.env', path.join(webPath, '.env')).catch(() => {})
  await fs.symlink('../../.env', path.join(sharedPath, '.env')).catch(() => {})

  if (!skipGit) {
    await initGit(projectPath)
  }

  // pnpm workspace (`workspace:*`): npm/yarn can't install it. Through
  // corepack so the root's pinned `packageManager` wins over a global pnpm.
  if (!skipInstall && !isLocalDev) {
    logger.step('Installing dependencies with pnpm (corepack)...')
    await execa('corepack', ['pnpm', 'install'], {
      cwd: projectPath,
      stdio: 'inherit',
      timeout: 600000,
    })
  }

  logger.newLine()
  logger.success(`Project ${projectName} created successfully! (monorepo)`)
  logger.newLine()

  logger.info('Next steps:')
  logger.step(`cd ${projectName}`)
  // Scripts nest `pnpm --filter`: that inner pnpm must also be the pinned one.
  logger.step('corepack enable pnpm  # once per machine')
  if (skipInstall || isLocalDev) {
    logger.step('pnpm install')
  }
  logger.step('cp .env.example .env  # fill NEXTAUTH_SECRET (openssl rand -base64 32)')
  logger.step('docker compose up -d  # postgres + redis')
  logger.step('pnpm db:push')
  logger.step('pnpm db:seed')
  logger.newLine()

  logger.info(`Web: http://localhost:${appPort}`)
  logger.info(`API: http://localhost:${apiPort}/v1`)
  logger.newLine()

  logger.step('pnpm dev       # apps/web')
  logger.step('pnpm dev:api   # apps/api')
  logger.step('pnpm worker    # apps/jobs')
  logger.newLine()

  logger.info('Default credentials:')
  logger.step('Email: admin@example.com')
  logger.step('Password: 12345')
  logger.newLine()

  if (isLocalDev) {
    logger.warning(
      'Local development detected — link @telamonjs/ui / telamonjs-queue with pnpm link from apps/web and apps/jobs.'
    )
  }
}

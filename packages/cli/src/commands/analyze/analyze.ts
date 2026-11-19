import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

// Package scope of the framework — single source of truth so a scope
// rename only touches this line.
const FRAMEWORK_SCOPE = 'telamonjs'

// Simple logger for CLI
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
}

interface PackageJson {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

interface AnalyzeOptions {
  verbose?: boolean
  json?: boolean
}

interface AnalysisResult {
  projectName: string
  hasTelamonjs: boolean
  telamonjsVersion?: string
  missingScripts: string[]
  recommendations: string[]
  databaseProvider?: string
  hasPrisma: boolean
  hasNextAuth: boolean
  hasDocker: boolean
}

export async function runAnalyze(options: AnalyzeOptions = {}) {
  const projectRoot = process.cwd()
  const packageJsonPath = join(projectRoot, 'package.json')

  // Check if package.json exists
  if (!existsSync(packageJsonPath)) {
    logger.error('No package.json found in current directory')
    logger.info('Are you in a valid Node.js project?')
    process.exit(1)
  }

  // Read package.json
  let packageJson: PackageJson
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  } catch {
    logger.error('Failed to parse package.json')
    process.exit(1)
  }

  // Perform analysis
  const result = await analyzeProject(projectRoot, packageJson)

  // Output results
  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printAnalysis(result, options.verbose || false)
  }
}

async function analyzeProject(
  projectRoot: string,
  packageJson: PackageJson
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    projectName: packageJson.name || 'unknown',
    hasTelamonjs: false,
    missingScripts: [],
    recommendations: [],
    hasPrisma: false,
    hasNextAuth: false,
    hasDocker: false,
  }

  // Check for telamonjs packages
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const telamonjsPackages = Object.keys(allDeps).filter(dep =>
    dep.startsWith(FRAMEWORK_SCOPE)
  )

  if (telamonjsPackages.length > 0) {
    result.hasTelamonjs = true
    result.telamonjsVersion = allDeps[`${FRAMEWORK_SCOPE}-ui`]
  }

  // Check for Prisma
  result.hasPrisma = 'prisma' in allDeps || '@prisma/client' in allDeps

  // Detect database provider
  if (result.hasPrisma) {
    const prismaSchemaPath = join(projectRoot, 'prisma/schema.prisma')
    if (existsSync(prismaSchemaPath)) {
      const schemaContent = readFileSync(prismaSchemaPath, 'utf-8')
      if (schemaContent.includes('provider = "postgresql"')) {
        result.databaseProvider = 'postgresql'
      } else if (schemaContent.includes('provider = "mysql"')) {
        result.databaseProvider = 'mysql'
      } else if (schemaContent.includes('provider = "sqlite"')) {
        result.databaseProvider = 'sqlite'
      }
    }
  }

  // Check for NextAuth
  result.hasNextAuth = 'next-auth' in allDeps

  // Check for Docker
  result.hasDocker = existsSync(join(projectRoot, 'docker-compose.yml'))

  // Check scripts
  const scripts = packageJson.scripts || {}
  const recommendedScripts = getRecommendedScripts(result)

  for (const scriptName of Object.keys(recommendedScripts)) {
    if (!(scriptName in scripts)) {
      result.missingScripts.push(scriptName)
    }
  }

  // Generate recommendations
  if (result.hasTelamonjs && result.missingScripts.length > 0) {
    result.recommendations.push(
      `Add ${result.missingScripts.length} missing scripts to package.json`
    )
  }

  if (result.hasPrisma && !scripts['db:migrate']) {
    result.recommendations.push('Add database migration scripts')
  }

  if (result.hasPrisma && !scripts['db:seed']) {
    result.recommendations.push('Add database seed script')
  }

  if (!result.hasDocker && result.databaseProvider) {
    result.recommendations.push(
      'Consider adding docker-compose.yml for local development'
    )
  }

  if (result.hasTelamonjs && !scripts['dev']) {
    result.recommendations.push('Add dev script for development server')
  }

  if (result.hasTelamonjs && !scripts['build']) {
    result.recommendations.push('Add build script for production builds')
  }

  // Database dump/restore scripts
  if (
    result.hasPrisma &&
    result.databaseProvider === 'postgresql' &&
    !scripts['db:dump']
  ) {
    result.recommendations.push(
      'Add database dump/restore scripts via telamonjs CLI'
    )
  }

  return result
}

function getRecommendedScripts(result: AnalysisResult): Record<string, string> {
  const scripts: Record<string, string> = {}

  if (result.hasTelamonjs) {
    scripts['dev'] = 'next dev --turbo'
    scripts['build'] = 'next build'
    scripts['start'] = 'next start'
    scripts['lint'] = 'next lint'
  }

  if (result.hasPrisma) {
    scripts['postinstall'] = 'prisma generate'
    scripts['db:migrate'] = 'prisma migrate dev'
    scripts['db:seed'] = 'prisma db seed'
    scripts['db:studio'] = 'prisma studio'
    scripts['db:reset'] = 'prisma migrate reset'

    // Database dump/restore
    if (result.databaseProvider === 'postgresql') {
      scripts['db:dump'] = 'telamonjs db dump'
      scripts['db:restore'] = 'telamonjs db restore'
      scripts['db:backup'] = 'telamonjs db dump backup'
      scripts['db:snapshot'] = 'telamonjs db dump snapshot'
    }
  }

  return scripts
}

function printAnalysis(result: AnalysisResult, verbose: boolean) {
  console.log()
  console.log(chalk.bold.cyan('📊 Project Analysis'))
  console.log()

  // Basic info
  console.log(chalk.bold('Project Information:'))
  console.log(`  Name: ${result.projectName}`)
  if (result.hasTelamonjs) {
    console.log(
      `  ${chalk.green('✓')} TelamonJS: ${result.telamonjsVersion || 'installed'}`
    )
  } else {
    console.log(`  ${chalk.dim('✗')} TelamonJS: not installed`)
  }

  console.log(
    `  ${result.hasPrisma ? chalk.green('✓') : chalk.dim('✗')} Prisma`
  )
  if (result.databaseProvider) {
    console.log(`    Provider: ${result.databaseProvider}`)
  }

  console.log(
    `  ${result.hasNextAuth ? chalk.green('✓') : chalk.dim('✗')} NextAuth`
  )
  console.log(
    `  ${result.hasDocker ? chalk.green('✓') : chalk.dim('✗')} Docker`
  )
  console.log()

  // Missing scripts
  if (result.missingScripts.length > 0) {
    console.log(
      chalk.bold.yellow(
        `⚠️  Missing Scripts (${result.missingScripts.length}):`
      )
    )
    const recommendedScripts = getRecommendedScripts(result)
    for (const script of result.missingScripts) {
      console.log(`  ${chalk.yellow('•')} ${script}`)
      if (verbose) {
        console.log(chalk.dim(`    ${recommendedScripts[script]}`))
      }
    }
    console.log()
  } else {
    console.log(chalk.bold.green('✓ All recommended scripts present'))
    console.log()
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log(
      chalk.bold.blue(`💡 Recommendations (${result.recommendations.length}):`)
    )
    for (const rec of result.recommendations) {
      console.log(`  ${chalk.blue('•')} ${rec}`)
    }
    console.log()
  }

  // Quick fix suggestion
  if (result.missingScripts.length > 0) {
    console.log(chalk.bold('Quick Fix:'))
    console.log(
      chalk.cyan('  Add the following to your package.json scripts section:')
    )
    console.log()
    console.log(chalk.dim('  {'))
    console.log(chalk.dim('    "scripts": {'))

    const recommendedScripts = getRecommendedScripts(result)
    for (const script of result.missingScripts.slice(0, 5)) {
      console.log(
        chalk.dim(`      "${script}": `) +
          chalk.green(`"${recommendedScripts[script]}"`) +
          chalk.dim(',')
      )
    }

    if (result.missingScripts.length > 5) {
      console.log(
        chalk.dim(`      ... ${result.missingScripts.length - 5} more`)
      )
    }

    console.log(chalk.dim('    }'))
    console.log(chalk.dim('  }'))
    console.log()
  }

  // Database specific recommendations
  if (result.hasPrisma && result.databaseProvider === 'postgresql') {
    console.log(chalk.bold('Database Utilities:'))
    logger.info('Use telamonjs CLI for database operations:')
    logger.step('telamonjs db dump [name]     - Create database dump')
    logger.step('telamonjs db restore         - Restore from dump (interactive)')
    console.log()
  }

  // Summary
  if (
    result.recommendations.length === 0 &&
    result.missingScripts.length === 0
  ) {
    logger.success('🎉 Project is well configured!')
  } else {
    logger.warning(
      `Found ${result.recommendations.length + result.missingScripts.length} improvement opportunities`
    )
  }
  console.log()
}

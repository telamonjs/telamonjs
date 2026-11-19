import chalk from 'chalk'
import ora from 'ora'
import { resolve } from 'path'
import {
  analyzeRepository,
  isGitRepository,
  pathExists,
  type GitStats,
} from '../utils/git-stats.js'

// Simple logger for CLI
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
}

// ============================================================================
// TYPES
// ============================================================================

interface StatsOptions {
  verbose?: boolean
  json?: boolean
  path?: string
}

// ============================================================================
// FORMATTERS
// ============================================================================

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function printSeparator() {
  console.log(
    chalk.dim(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    )
  )
}

function printSection(title: string, icon: string) {
  console.log()
  console.log(chalk.bold(`${icon}  ${title}`))
  console.log()
}

// ============================================================================
// OUTPUT FUNCTIONS
// ============================================================================

function printPeriod(stats: GitStats) {
  printSection('Development Period', '⏱️')

  console.log(`  Start:         ${formatDate(stats.period.start)}`)
  console.log(`  Last commit:   ${formatDate(stats.period.end)}`)
  console.log(
    `  Total time:    ${chalk.green(stats.period.hours + ' hours')} (~${stats.period.minutes} minutes | ${stats.period.days} days)`
  )
}

function printLines(stats: GitStats) {
  printSection('Lines of Code', '📝')

  console.log(`  Lines added:         ${formatNumber(stats.lines.added)}`)
  console.log(`  Lines removed:       ${formatNumber(stats.lines.removed)}`)
  console.log(
    chalk.bold(`  Net total:           ${formatNumber(stats.lines.net)}`)
  )

  if (stats.files.typescript > 0 || stats.files.prisma > 0) {
    console.log()
    console.log('  By File Type:')
    if (stats.files.typescript > 0) {
      console.log(
        `    TypeScript/TSX:    ${formatNumber(stats.files.typescript)} lines`
      )
    }
    if (stats.files.prisma > 0) {
      console.log(
        `    Prisma Schema:     ${formatNumber(stats.files.prisma)} lines`
      )
    }
  }
}

function printProductivity(stats: GitStats) {
  printSection('Productivity', '🚀')

  console.log(
    chalk.bold(
      `  Lines per hour:        ${formatNumber(stats.lines.perHour)} lines/h`
    )
  )
  console.log(
    `  Lines per minute:      ${(stats.lines.perHour / 60).toFixed(1)} lines/min`
  )
  console.log(`  Commits:               ${stats.commits.total} commits`)
  console.log(`  Commits per hour:      ${stats.commits.perHour} commits/h`)
  console.log(
    `  Avg lines/commit:      ${formatNumber(stats.lines.perCommit)} lines/commit`
  )
}

function printStructure(stats: GitStats) {
  printSection('Repository Structure', '📂')

  console.log(`  Total files:           ${stats.files.total} files`)

  if (stats.files.byType.length > 0) {
    console.log()
    console.log('  Top 10 by type:')
    for (const { extension, count } of stats.files.byType) {
      console.log(`    ${count} .${extension} files`)
    }
  }
}

function printAuthors(stats: GitStats) {
  printSection('Authors', '👨‍💻')

  for (const author of stats.authors) {
    console.log(
      `  ${author.name}: ${author.commits} commits (${author.percentage}%)`
    )
  }
}

function printDistribution(stats: GitStats) {
  printSection('Commit Distribution by Time of Day', '⏰')

  for (const { period, commits, percentage } of stats.distribution) {
    console.log(`  ${period}`)
    console.log(`    ${commits} commits (${percentage}%)`)
  }
}

function printTopCommits(stats: GitStats) {
  printSection('Top 5 Commits by Code Volume', '🏆')

  stats.topCommits.forEach((commit, index) => {
    console.log(`  ${index + 1}. ${commit.hash} - ${commit.message}`)
    console.log(`     ${formatNumber(commit.changes)} changes`)
  })
}

function printAnalysis(stats: GitStats) {
  printSection('Efficiency Analysis', '🎯')

  console.log(chalk.green('  Implementation Speed:'))
  console.log(
    `    • ${formatNumber(stats.lines.perHour)} lines/hour is`
  )

  if (stats.insights.productivityLevel === 'exceptional') {
    console.log(chalk.bold('      exceptional productivity! 🚀'))
  } else if (stats.insights.productivityLevel === 'very-high') {
    console.log(chalk.bold('      very high productivity!'))
  } else {
    console.log(chalk.bold('      good productivity!'))
  }

  console.log()
  console.log('  Compared to industry averages:')
  console.log('    • Typical developers: 200-400 lines/day')
  console.log(
    chalk.bold(`    • You: ${formatNumber(stats.lines.net)} lines`) +
      ` in ${stats.period.hours}h`
  )
}

function printInsights(stats: GitStats) {
  printSection('Interesting Insights', '💡')

  if (stats.insights.dawnCommits && stats.insights.dawnCommits.count > 0) {
    console.log(
      `  • Productive late nights: ${stats.insights.dawnCommits.count} commits (${stats.insights.dawnCommits.percentage}%)`
    )
  }

  if (stats.insights.nightCommits && stats.insights.nightCommits.count > 0) {
    console.log(
      `  • Evening work: ${stats.insights.nightCommits.count} commits (${stats.insights.nightCommits.percentage}%)`
    )
  }

  console.log(
    `  • Atomic commits: average of ${formatNumber(stats.lines.perCommit)} lines/commit`
  )

  if (stats.insights.removalPercentage > 0) {
    console.log(
      `  • Removal rate: ${stats.insights.removalPercentage}% of added lines`
    )
  }

  if (stats.insights.typescriptPercentage > 0) {
    console.log(
      `  • TypeScript: ${stats.insights.typescriptPercentage}% of total code`
    )
  }
}

function printStats(stats: GitStats, verbose: boolean) {
  console.clear()
  console.log()
  printSeparator()
  console.log(chalk.bold('📊 Complete Project Statistics'))
  printSeparator()

  printPeriod(stats)
  printLines(stats)
  printProductivity(stats)
  printStructure(stats)
  printAuthors(stats)

  if (verbose) {
    printDistribution(stats)
    printTopCommits(stats)
  }

  printAnalysis(stats)
  printInsights(stats)

  console.log()
  printSeparator()
  console.log()
  logger.success('Report generated successfully!')
  console.log()
}

function printJson(stats: GitStats) {
  console.log(JSON.stringify(stats, null, 2))
}

// ============================================================================
// COMMAND
// ============================================================================

export async function runStats(options: StatsOptions) {
  const cwd = options.path ? resolve(options.path) : process.cwd()

  // Validate path
  if (!pathExists(cwd)) {
    logger.error(`Path does not exist: ${cwd}`)
    process.exit(1)
  }

  // Validate git repository
  if (!(await isGitRepository(cwd))) {
    logger.error('Not a git repository')
    process.exit(1)
  }

  // Analyze repository
  const spinner = ora('Analyzing repository...').start()

  try {
    const stats = await analyzeRepository(cwd)
    spinner.stop()

    if (options.json) {
      printJson(stats)
    } else {
      printStats(stats, options.verbose || false)
    }
  } catch (error) {
    spinner.stop()
    logger.error(
      `Failed to analyze repository: ${error instanceof Error ? error.message : String(error)}`
    )
    if (options.verbose) {
      console.error(error)
    }
    process.exit(1)
  }
}

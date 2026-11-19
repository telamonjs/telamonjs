import execa from 'execa'
import chalk from 'chalk'

// Simple logger for CLI
const logger = {
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
}

export async function initGit(projectPath: string): Promise<void> {
  try {
    logger.step('Initializing git repository...')

    // Initialize git
    await execa('git', ['init'], {
      cwd: projectPath,
      stdio: 'pipe',
    })

    // Add initial commit
    await execa('git', ['add', '.'], {
      cwd: projectPath,
      stdio: 'pipe',
    })

    await execa('git', ['commit', '-m', 'Initial commit from telamonjs CLI'], {
      cwd: projectPath,
      stdio: 'pipe',
    })

    logger.success('Git repository initialized')
  } catch (error) {
    logger.warning(`Git initialization failed: ${error}`)
    // Don't throw - git init is optional
  }
}

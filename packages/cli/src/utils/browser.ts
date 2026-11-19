import { exec } from 'child_process'
import { promisify } from 'util'
import chalk from 'chalk'

const execAsync = promisify(exec)

// Simple logger for CLI
const logger = {
  success: (msg: string) => console.log(chalk.green(msg)),
  warning: (msg: string) => console.log(chalk.yellow(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
}

/**
 * Open URL in default browser
 */
export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform

  try {
    logger.step('Opening browser...')

    if (platform === 'darwin') {
      // macOS
      await execAsync(`open "${url}"`)
    } else if (platform === 'win32') {
      // Windows
      await execAsync(`start "" "${url}"`)
    } else {
      // Linux
      await execAsync(`xdg-open "${url}"`)
    }

    logger.success(`Browser opened at ${url}`)
  } catch {
    // Not critical if it fails
    logger.warning(`Could not open browser automatically. Please visit: ${url}`)
  }
}

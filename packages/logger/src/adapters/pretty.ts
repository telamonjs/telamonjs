/**
 * Pretty logger (CLI, colorful)
 */

import chalk from 'chalk'
import type { LogContext, LogLevel, LoggerConfig } from '../core/types.js'
import { BaseLogger } from './base.js'

/**
 * Pretty logger (CLI-friendly with colors and emojis)
 */
export class PrettyLogger extends BaseLogger {
  constructor(config?: LoggerConfig) {
    const { level = 3, context = {} } = config || {}
    super(typeof level === 'number' ? level : 3, context)
  }

  protected logMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    const parts: string[] = []

    // Icon + colored message based on level
    switch (level) {
      case 0: // FATAL
        parts.push(chalk.red.bold('💀'), chalk.red.bold(message))
        break
      case 1: // ERROR
        parts.push(chalk.red('✗'), chalk.red(message))
        break
      case 2: // WARN
        parts.push(chalk.yellow('⚠'), chalk.yellow(message))
        break
      case 3: // INFO
        // Check for special contexts
        if (context?.level === 'success') {
          parts.push(
            chalk.green('✓'),
            chalk.green(message.replace(/^✓\s*/, ''))
          )
        } else if (context?.level === 'perf') {
          parts.push(
            chalk.magenta('⏱'),
            chalk.magenta(message.replace(/^\[PERF\]\s*/, ''))
          )
        } else if (context?.level === 'audit') {
          parts.push(
            chalk.cyan('📋'),
            chalk.cyan(message.replace(/^\[AUDIT\]\s*/, ''))
          )
        } else {
          parts.push(chalk.blue('ℹ'), message)
        }
        break
      case 4: // DEBUG
        parts.push(chalk.gray('→'), chalk.gray(message))
        break
      case 5: // TRACE
        parts.push(chalk.gray('·'), chalk.gray(message))
        break
    }

    // Context (if present)
    if (context && Object.keys(context).length > 0) {
      const { level: _level, ...restContext } = context
      if (Object.keys(restContext).length > 0) {
        const contextStr = JSON.stringify(restContext, null, 2)
        parts.push(chalk.gray(contextStr))
      }
    }

    console.log(parts.join(' '))
  }

  // ──────────────────────────────────────────────────────────────────────
  // CLI-specific helpers
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Print a banner
   */
  banner(message: string): void {
    console.log()
    console.log(chalk.bold.blue('🚀 ' + message))
    console.log()
  }

  /**
   * Print a new line
   */
  newLine(): void {
    console.log()
  }

  /**
   * Print a step (for CLI workflows)
   */
  step(message: string, context?: LogContext): void {
    this.info(message, { ...context, level: 'step' })
  }
}

/**
 * Pretty logger (CLI, colorful)
 */

import type { LogContext, LogLevel, LoggerConfig } from '../core/types.js'
import { BaseLogger } from './base.js'
import { cleanContext } from '../core/context.js'

// ponytail: raw ANSI codes instead of chalk (ESM-only, and the barrel made
// every consumer load it). Only the styles below are used.
const ANSI = {
  bold: [1, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  gray: [90, 39],
} as const

type Style = keyof typeof ANSI

/** The default chalk used to apply: colors only on a TTY, never with NO_COLOR. */
function supportsColor(): boolean {
  return (
    typeof process !== 'undefined' &&
    !process.env.NO_COLOR &&
    process.stdout?.isTTY === true
  )
}

/**
 * Pretty logger (CLI-friendly with colors and emojis)
 */
export class PrettyLogger extends BaseLogger {
  private colorize: boolean

  constructor(config?: LoggerConfig) {
    const { level = 3, context = {}, colorize = supportsColor() } = config || {}
    super(typeof level === 'number' ? level : 3, context)
    this.colorize = colorize
  }

  private paint(text: string, ...styles: Style[]): string {
    if (!this.colorize) return text
    return styles.reduce(
      (out, style) => `\x1b[${ANSI[style][0]}m${out}\x1b[${ANSI[style][1]}m`,
      text
    )
  }

  protected logMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    const parts: string[] = []
    const paint = this.paint.bind(this)

    // Icon + colored message based on level
    switch (level) {
      case 0: // FATAL
        parts.push(paint('💀', 'red', 'bold'), paint(message, 'red', 'bold'))
        break
      case 1: // ERROR
        parts.push(paint('✗', 'red'), paint(message, 'red'))
        break
      case 2: // WARN
        parts.push(paint('⚠', 'yellow'), paint(message, 'yellow'))
        break
      case 3: // INFO
        // Check for special contexts
        if (context?.level === 'success') {
          parts.push(
            paint('✓', 'green'),
            paint(message.replace(/^✓\s*/, ''), 'green')
          )
        } else if (context?.level === 'perf') {
          parts.push(
            paint('⏱', 'magenta'),
            paint(message.replace(/^\[PERF\]\s*/, ''), 'magenta')
          )
        } else if (context?.level === 'audit') {
          parts.push(
            paint('📋', 'cyan'),
            paint(message.replace(/^\[AUDIT\]\s*/, ''), 'cyan')
          )
        } else {
          parts.push(paint('ℹ', 'blue'), message)
        }
        break
      case 4: // DEBUG
        parts.push(paint('→', 'gray'), paint(message, 'gray'))
        break
      case 5: // TRACE
        parts.push(paint('·', 'gray'), paint(message, 'gray'))
        break
    }

    // Context (if present)
    if (context && Object.keys(context).length > 0) {
      const { level: _level, ...restContext } = context
      const cleaned = cleanContext(restContext)
      if (Object.keys(cleaned).length > 0) {
        const contextStr = JSON.stringify(cleaned, null, 2)
        parts.push(paint(contextStr, 'gray'))
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
    console.log(this.paint('🚀 ' + message, 'blue', 'bold'))
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

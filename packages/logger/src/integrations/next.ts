/**
 * Next.js integration for @telamonjs/logger
 */

import { createLogger, type LoggerConfig } from '../core/factory.js'
import type { ILogger } from '../core/types.js'

/**
 * Create logger for Next.js Server Components
 *
 * @example
 * ```ts
 * import { createServerLogger } from '@telamonjs/logger'
 *
 * export default async function Page() {
 *   const logger = createServerLogger()
 *   logger.info('Rendering page')
 *   return <div>...</div>
 * }
 * ```
 */
export function createServerLogger(config?: LoggerConfig): ILogger {
  return createLogger({
    format: 'json',
    colorize: false,
    ...config,
  })
}

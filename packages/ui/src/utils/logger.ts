/**
 * Unified logger for @telamonjs/ui
 *
 * Automatically selects appropriate logger based on environment:
 * - Browser: BrowserLogger with buffering
 * - Server/SSR: Default logger (Console in dev, Winston in prod)
 *
 * @example
 * ```ts
 * import { logger } from '@/utils/logger'
 *
 * logger.info('Component rendered', { component: 'DataTable', rows: 10 })
 * logger.error('Failed to load data', { error: err.message })
 * ```
 */

import {
  createLogger,
  createBrowserLogger,
  type ILogger,
} from '@telamonjs/logger'

/**
 * Create logger instance based on environment
 */
function createUILogger(): ILogger {
  // Check if running in browser environment
  if (typeof window !== 'undefined') {
    return createBrowserLogger({
      context: { package: '@telamonjs/ui' },
    })
  }

  // Server environment (SSR, Node.js)
  return createLogger({
    context: { package: '@telamonjs/ui' },
  })
}

/**
 * Singleton logger instance
 */
export const logger = createUILogger()

/**
 * Create child logger with component context
 *
 * @example
 * ```ts
 * const log = withComponent('DataTable')
 * log.info('Rendering table', { rows: data.length })
 * ```
 */
export function withComponent(componentName: string): ILogger {
  return logger.child({ component: componentName })
}

/**
 * Create child logger with user context
 *
 * @example
 * ```ts
 * const log = withUser({ id: '123', email: 'user@example.com' })
 * log.audit('user.delete', { resource: 'user', resourceId: '456' })
 * ```
 */
export function withUser(user: {
  id: string
  email?: string
  role?: string
}): ILogger {
  return logger.withUser(user)
}

/**
 * Create child logger with route context
 *
 * @example
 * ```ts
 * const log = withRoute('/admin/users')
 * log.info('Page loaded')
 * ```
 */
export function withRoute(route: string): ILogger {
  return logger.child({ route })
}

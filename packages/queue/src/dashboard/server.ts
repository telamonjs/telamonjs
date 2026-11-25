import type { Server } from 'node:http'
import express, { type Express } from 'express'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import basicAuth from 'express-basic-auth'
import type { QueueManager } from '../core/QueueManager.js'
import { ConfigurationError } from '../utils/errors.js'

export interface DashboardConfig {
  /**
   * Port to run dashboard on
   * @default 3005
   */
  port?: number

  /**
   * QueueManager instance
   */
  queueManager: QueueManager

  /**
   * HTTP basic auth for the board. With `enabled: true`, both `username`
   * and `password` must be non-empty, or the dashboard throws a
   * `ConfigurationError` at startup.
   */
  auth?: {
    enabled?: boolean
    username?: string
    password?: string
  }

  /**
   * Dashboard title
   * @default 'TelamonJS Queue Dashboard'
   */
  title?: string

  /**
   * Base path for dashboard
   * @default '/'
   */
  basePath?: string

  /**
   * Board logo (Bull Board uiConfig.boardLogo). Omit for no logo.
   */
  logo?: { path: string; width?: number; height?: number }

  /**
   * Extra links rendered in the board header. Omit for none.
   */
  links?: Array<{ text: string; url: string }>
}

/**
 * Mounts `express-basic-auth` on `basePath` when `auth.enabled`. Enabled
 * without both credentials is a misconfiguration: it throws instead of
 * silently serving the board unprotected.
 */
function applyAuth(
  app: Express,
  basePath: string,
  auth: DashboardConfig['auth']
): void {
  if (!auth?.enabled) return
  if (!auth.username || !auth.password) {
    throw new ConfigurationError(
      'Dashboard auth.enabled is true but auth.username or auth.password is missing or empty'
    )
  }
  app.use(
    basePath,
    basicAuth({
      users: { [auth.username]: auth.password },
      challenge: true,
      realm: 'TelamonJS Queue Dashboard',
    })
  )
}

/**
 * Start Bull Board dashboard server
 *
 * Provides a web UI for monitoring queues, jobs, and workers.
 *
 * Returns the Express app (as before) with the listening `server` attached.
 * The app owns shutdown: this function installs no signal handlers, so call
 * `dashboard.server.close()` from your own SIGTERM/shutdown sequence.
 *
 * @throws {ConfigurationError} when `auth.enabled` is true without a
 * non-empty `username` and `password`.
 *
 * @example
 * ```ts
 * import { startDashboard } from '@telamonjs/queue/dashboard'
 *
 * const dashboard = startDashboard({
 *   port: 3005,
 *   queueManager,
 *   auth: {
 *     enabled: true,
 *     username: 'admin',
 *     password: process.env.DASHBOARD_PASSWORD!
 *   }
 * })
 *
 * process.on('SIGTERM', () => dashboard.server.close())
 * ```
 */
export function startDashboard(
  config: DashboardConfig
): Express & { server: Server } {
  const {
    port = 3005,
    queueManager,
    auth,
    title = 'TelamonJS Queue Dashboard',
    basePath = '/',
    logo,
    links,
  } = config

  const app = express()
  applyAuth(app, basePath, auth)

  // Setup Bull Board
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath(basePath)

  // Get all queues from QueueManager
  const queues = Array.from(queueManager['queues'].values())
  const bullAdapters = queues.map(
    queue => new BullMQAdapter(queue.getRawQueue())
  )

  createBullBoard({
    queues: bullAdapters,
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: title,
        ...(logo ? { boardLogo: { width: 100, height: 100, ...logo } } : {}),
        ...(links ? { miscLinks: links } : {}),
        favIcon: {
          default: 'static/images/logo.svg',
          alternative: 'static/favicon.ico',
        },
      },
    },
  })

  // Mount Bull Board routes
  app.use(basePath, serverAdapter.getRouter())

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queues: queues.map(q => q.name),
    })
  })

  const server = app.listen(port, () => {
    console.log(`🎛️  Dashboard running at http://localhost:${port}${basePath}`)
    if (auth?.enabled) console.log('🔒 Dashboard authentication enabled')
  })

  return Object.assign(app, { server })
}

/**
 * Create dashboard without starting server (for integration)
 *
 * Honors `auth` exactly like `startDashboard`: with `auth.enabled`, every
 * request under `basePath` needs HTTP basic credentials.
 *
 * @throws {ConfigurationError} when `auth.enabled` is true without a
 * non-empty `username` and `password`.
 *
 * @example
 * ```ts
 * const app = express()
 * const dashboardRouter = createDashboardRouter({
 *   queueManager,
 *   auth: { enabled: true, username: 'admin', password: process.env.DASHBOARD_PASSWORD! },
 * })
 * app.use('/admin/queue', dashboardRouter)
 * ```
 */
export function createDashboardRouter(
  config: Omit<DashboardConfig, 'port'>
): Express {
  const { queueManager, basePath = '/', title = 'Queue Dashboard', auth } = config

  const app = express()
  applyAuth(app, basePath, auth)

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath(basePath)

  const queues = Array.from(queueManager['queues'].values())
  const bullAdapters = queues.map(
    queue => new BullMQAdapter(queue.getRawQueue())
  )

  createBullBoard({
    queues: bullAdapters,
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: title,
      },
    },
  })

  app.use(basePath, serverAdapter.getRouter())

  return app
}

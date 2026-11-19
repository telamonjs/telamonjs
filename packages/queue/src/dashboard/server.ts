import express, { type Express } from 'express'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import basicAuth from 'express-basic-auth'
import type { QueueManager } from '../core/QueueManager.js'

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
   * Authentication config
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
 * Start Bull Board dashboard server
 *
 * Provides a web UI for monitoring queues, jobs, and workers
 *
 * @example
 * ```ts
 * import { startDashboard } from '@telamonjs/queue/dashboard'
 *
 * startDashboard({
 *   port: 3005,
 *   queueManager,
 *   auth: {
 *     enabled: true,
 *     username: 'admin',
 *     password: process.env.DASHBOARD_PASSWORD!
 *   }
 * })
 * ```
 */
export function startDashboard(config: DashboardConfig): Express {
  const {
    port = 3005,
    queueManager,
    auth = { enabled: false },
    title = 'TelamonJS Queue Dashboard',
    basePath = '/',
    logo,
    links,
  } = config

  const app = express()

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

  // Apply authentication if enabled
  if (auth.enabled && auth.username && auth.password) {
    app.use(
      basePath,
      basicAuth({
        users: { [auth.username]: auth.password },
        challenge: true,
        realm: 'TelamonJS Queue Dashboard',
      })
    )
    console.log('🔒 Dashboard authentication enabled')
  }

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

  // Start server
  const server = app.listen(port, () => {
    console.log(`🎛️  Dashboard running at http://localhost:${port}${basePath}`)
    if (auth.enabled) {
      console.log(`   Username: ${auth.username}`)
    }
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down dashboard server...')
    server.close(() => {
      console.log('✅ Dashboard server closed')
      process.exit(0)
    })
  })

  return app
}

/**
 * Create dashboard without starting server (for integration)
 *
 * @example
 * ```ts
 * const app = express()
 * const dashboardRouter = createDashboardRouter({ queueManager })
 * app.use('/admin/queue', dashboardRouter)
 * ```
 */
export function createDashboardRouter(
  config: Omit<DashboardConfig, 'port'>
): Express {
  const { queueManager, basePath = '/', title = 'Queue Dashboard' } = config

  const app = express()
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

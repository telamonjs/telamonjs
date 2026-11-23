'use client'

/**
 * QueueTabbedDashboard - Main tabbed dashboard for queue monitoring
 *
 * 4 lazy-loaded tabs: Real Time, Configuration, Redis, History
 * Uses ShellPage, AdminHeader, AdminTabs from telamonjs-ui shell.
 *
 * Features:
 * - Auto-provider: creates NestJS adapter if no QueueApiProvider exists
 * - syncTabWithUrl: reads/writes active tab to URL searchParams
 */

import { useState, useMemo, lazy, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { getSession } from 'next-auth/react'
import { Radio, Settings, Database, History } from 'lucide-react'
import { ShellPage } from '../../layouts/shell/ShellPage'
import { AdminHeader } from '../../layouts/shell/AdminHeader'
import { AdminTabs } from '../../layouts/shell/AdminTabs'
import { PageSkeleton } from '../../components/skeletons'
import { useTelamonjsT } from '../../i18n/use-t'
import { QueueApiProvider, useQueueApiOptional } from '../api/provider'
import { createNestJSAdapter } from '../api/adapters/nestjs-adapter'
import type { TabItem } from '../../layouts/content-tabs'
import { QueueReadOnlyContext } from './read-only-context'
import type { IconComponent } from '../../types/menu'

// Lazy-loaded tabs (heavy components)
const TempoRealTab = lazy(() => import('./tabs/TempoRealTab'))
const ConfiguracaoTab = lazy(() => import('./tabs/ConfiguracaoTab'))
const RedisTab = lazy(() => import('./tabs/RedisTab'))
const HistoricoTab = lazy(() => import('./tabs/HistoricoTab'))

type TabId = 'tempo-real' | 'configuracao' | 'redis' | 'historico'

const VALID_TABS: TabId[] = ['tempo-real', 'configuracao', 'redis', 'historico']

export interface QueueTabbedDashboardProps {
  /** Initial active tab */
  initialTab?: TabId
  /** Which tabs to show (default: all 4) */
  tabs?: TabId[]
  /** Dashboard title */
  title?: string
  /** Dashboard description */
  description?: string
  /** Header icon component */
  icon?: IconComponent
  /** Module icons (module name → emoji) for the real-time queues table and ConfiguracaoTab */
  moduleIcons?: Record<string, string>
  /** Enable SSE real-time updates (default: true) */
  enableSSE?: boolean
  /**
   * Real-time timeline poll interval in ms while SSE is down (default: 2000).
   * With SSE connected it polls every 30s; off the Real-time tab, not at all.
   */
  pollInterval?: number
  /** Callback when tab changes (for URL sync) */
  onTabChange?: (tab: string) => void
  /** Sync active tab with URL searchParams (default: false) */
  syncTabWithUrl?: boolean
  /** API URL override (default: process.env.NEXT_PUBLIC_API_URL ?? '' for relative URLs) */
  apiUrl?: string
  /**
   * Monitoring only: hides every action that changes a queue or a job —
   * pause/resume, retry, remove, promote, clean, drain, dispatch, clear
   * history, enable/disable jobs and modules, edit job config (default: false)
   */
  readOnly?: boolean
}

type CoreProps = Omit<
  QueueTabbedDashboardProps,
  'syncTabWithUrl' | 'apiUrl' | 'readOnly'
>

/**
 * Core dashboard UI — no URL hooks, no provider logic
 */
function QueueTabbedDashboardCore({
  initialTab,
  tabs: visibleTabs,
  title,
  description,
  icon,
  moduleIcons,
  enableSSE = true,
  pollInterval,
  onTabChange
}: CoreProps) {
  const t = useTelamonjsT()
  const resolvedTitle = title ?? t('queue.dashboard.title')
  const resolvedDescription = description ?? t('queue.dashboard.description')
  const [activeTab, setActiveTab] = useState<string>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'tempo-real'
  )

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value)
      onTabChange?.(value)
    },
    [onTabChange]
  )

  const allTabs: TabItem[] = useMemo(
    () => [
      {
        value: 'tempo-real',
        label: t('queue.tabs.realtime'),
        shortLabel: t('queue.tabs.realtimeShort'),
        icon: Radio,
        content: (
          <Suspense fallback={<PageSkeleton.TabContent />}>
            <TempoRealTab
              enableSSE={enableSSE}
              moduleIcons={moduleIcons}
              active={activeTab === 'tempo-real'}
              pollInterval={pollInterval}
            />
          </Suspense>
        )
      },
      {
        value: 'configuracao',
        label: t('queue.tabs.config'),
        shortLabel: t('queue.tabs.configShort'),
        icon: Settings,
        content: (
          <Suspense fallback={<PageSkeleton.TabContent />}>
            <ConfiguracaoTab moduleIcons={moduleIcons} />
          </Suspense>
        )
      },
      {
        value: 'redis',
        label: t('queue.tabs.redis'),
        shortLabel: t('queue.tabs.redis'),
        icon: Database,
        content: (
          <Suspense fallback={<PageSkeleton.TabContent />}>
            <RedisTab />
          </Suspense>
        )
      },
      {
        value: 'historico',
        label: t('queue.tabs.history'),
        shortLabel: t('queue.tabs.historyShort'),
        icon: History,
        content: (
          <Suspense fallback={<PageSkeleton.TabContent />}>
            <HistoricoTab />
          </Suspense>
        )
      }
    ],
    [moduleIcons, enableSSE, pollInterval, activeTab, t]
  )

  const filteredTabs = useMemo(() => {
    if (!visibleTabs) return allTabs
    return allTabs.filter((tab) => visibleTabs.includes(tab.value as TabId))
  }, [allTabs, visibleTabs])

  // Use the custom icon or default to Radio
  const HeaderIcon = icon || Radio

  return (
    <ShellPage>
      <AdminHeader
        title={resolvedTitle}
        description={resolvedDescription}
        icon={HeaderIcon}
      />
      <AdminTabs
        tabs={filteredTabs}
        value={activeTab}
        onValueChange={handleTabChange}
      />
    </ShellPage>
  )
}

/**
 * URL sync wrapper — reads tab from searchParams, writes on change
 * Must be used within a Suspense boundary (due to useSearchParams)
 */
function QueueTabbedDashboardWithUrlSync(props: CoreProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tabFromUrl = searchParams.get('tab') as TabId | null
  const { onTabChange } = props

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      onTabChange?.(value)
    },
    [router, pathname, searchParams, onTabChange]
  )

  return (
    <QueueTabbedDashboardCore
      {...props}
      initialTab={(tabFromUrl as TabId) || props.initialTab}
      onTabChange={handleTabChange}
    />
  )
}

/**
 * Auto-provider wrapper — creates NestJS adapter with defaults
 */
function WithAutoProvider({
  apiUrl,
  children
}: {
  apiUrl?: string
  children: React.ReactNode
}) {
  const adapter = useMemo(
    () =>
      createNestJSAdapter({
        baseUrl:
          apiUrl ??
          process.env.NEXT_PUBLIC_API_URL ??
          '',
        getAuthToken: async () => {
          const session = await getSession()
          const user = session?.user as { accessToken?: string } | undefined
          return user?.accessToken ?? null
        },
        parseResponse: async (res) => {
          const data = await res.json()
          // Auto-detect superjson format ({ json: ..., meta: ... })
          if (data && typeof data === 'object' && 'json' in data) {
            return data.json
          }
          return data
        }
      }),
    [apiUrl]
  )

  return <QueueApiProvider adapter={adapter}>{children}</QueueApiProvider>
}

/**
 * Main export — auto-provider + conditional URL sync
 *
 * @example Zero-config usage (auto-provider + URL sync):
 * ```tsx
 * <Suspense>
 *   <QueueTabbedDashboard syncTabWithUrl />
 * </Suspense>
 * ```
 *
 * @example With external provider (backward compatible):
 * ```tsx
 * <QueueApiProvider adapter={myAdapter}>
 *   <QueueTabbedDashboard />
 * </QueueApiProvider>
 * ```
 */
export default function QueueTabbedDashboard(props: QueueTabbedDashboardProps) {
  const { syncTabWithUrl, apiUrl, readOnly = false, ...rest } = props
  const existingAdapter = useQueueApiOptional()

  const dashboard = (
    <QueueReadOnlyContext.Provider value={readOnly}>
      {syncTabWithUrl ? (
        <QueueTabbedDashboardWithUrlSync {...rest} />
      ) : (
        <QueueTabbedDashboardCore {...rest} />
      )}
    </QueueReadOnlyContext.Provider>
  )

  if (existingAdapter) return dashboard

  return <WithAutoProvider apiUrl={apiUrl}>{dashboard}</WithAutoProvider>
}

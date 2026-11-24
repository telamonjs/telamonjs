import type { useTelamonjsT } from '../../i18n/use-t'
import type { ActionResponse, QueueActionParams } from '../api/types'

const DONE_KEY = {
  pause: 'pause',
  resume: 'resume',
  clean: 'clean',
  drain: 'drain',
  'retry-all': 'retryAll',
} as const satisfies Record<QueueActionParams['type'], string>

/**
 * Success toast for a queue action, in the active locale. The backend's
 * `message` is plain English (`"Queue x: 1 waiting jobs removed"`), so it is
 * not shown; `removed` (drain/clean) feeds the plural. `queueLabel` is the
 * name already resolved by `useQueueLabels().jobLabel` — never the raw key.
 */
export function actionDoneMessage(
  t: ReturnType<typeof useTelamonjsT>,
  action: QueueActionParams,
  result: ActionResponse,
  queueLabel: string
): string {
  return t(`queue.dashboard.actionDone.${DONE_KEY[action.type]}`, {
    queue: queueLabel,
    count: result.removed ?? 0,
  })
}

import { describe, expect, it } from 'vitest'
import { t } from '../../test/i18n'
import { actionDoneMessage } from './action-message'

// The test translator is typed for createTranslator; the helper takes useTelamonjsT's
type T = Parameters<typeof actionDoneMessage>[0]

describe('actionDoneMessage', () => {
  it('drain: translated plural from `removed`, not the backend English message', () => {
    const msg = actionDoneMessage(
      t as unknown as T,
      { type: 'drain', queueName: 'sync_sync-tipos' },
      {
        success: true,
        removed: 1,
        message: 'Queue sync_sync-tipos: 1 waiting jobs removed',
      }
    )
    expect(msg).toBe('1 job em espera removido de sync_sync-tipos')
  })

  it('drain with nothing waiting', () => {
    expect(
      actionDoneMessage(
        t as unknown as T,
        { type: 'drain', queueName: 'q' },
        { success: true, removed: 0 }
      )
    ).toBe('Nenhum job em espera em q')
  })

  it('maps retry-all to its key', () => {
    expect(
      actionDoneMessage(
        t as unknown as T,
        { type: 'retry-all', queueName: 'q' },
        { success: true }
      )
    ).toBe('Falhas de q reenviadas para processamento')
  })
})

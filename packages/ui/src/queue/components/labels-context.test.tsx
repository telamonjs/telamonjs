import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { msg } from '../../i18n/msg'
import { withAppMessages } from '../../test/intl'
import { QueueLabelsContext, useQueueLabels, type QueueLabels } from './labels-context'

function resolvers(labels: QueueLabels, app: Record<string, unknown> = {}) {
  const Intl = withAppMessages(app)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Intl>
      <QueueLabelsContext.Provider value={labels}>{children}</QueueLabelsContext.Provider>
    </Intl>
  )
  return renderHook(() => useQueueLabels(), { wrapper }).result.current
}

describe('useQueueLabels', () => {
  describe('jobLabel', () => {
    it('falls back to formatQueueName without labels', () => {
      expect(resolvers({}).jobLabel('manutencao_limpar-audit-logs')).toBe('Limpar Audit Logs')
    })

    it('prefers the contract displayName, passed in or from the context', () => {
      const r = resolvers({ displayNames: { 'manutencao_limpar-audit-logs': 'Clean audit logs' } })
      expect(r.jobLabel('manutencao_limpar-audit-logs')).toBe('Clean audit logs')
      expect(r.jobLabel('manutencao_limpar-audit-logs', 'Purge audit logs')).toBe('Purge audit logs')
    })

    it('ignores a displayName equal to the raw name (backend fallback)', () => {
      const r = resolvers({ displayNames: { 'sync_sync-tipos': 'sync_sync-tipos' } })
      expect(r.jobLabel('sync_sync-tipos')).toBe('Sync Tipos')
    })

    it('jobLabel override wins; undefined falls through; msg() resolves', () => {
      const r = resolvers(
        {
          jobLabel: name =>
            name === 'a_one' ? 'One' : name === 'a_two' ? msg('jobs.two') : undefined,
          displayNames: { a_three: 'Three' },
        },
        { jobs: { two: 'Two' } }
      )
      expect(r.jobLabel('a_one', 'ignored')).toBe('One')
      expect(r.jobLabel('a_two')).toBe('Two')
      expect(r.jobLabel('a_three')).toBe('Three')
    })
  })

  describe('jobDescription', () => {
    it('is the contract description; undefined when empty or unknown', () => {
      const r = resolvers({ descriptions: { a_one: 'Does one thing', a_two: '' } })
      expect(r.jobDescription('a_one')).toBe('Does one thing')
      expect(r.jobDescription('a_two')).toBeUndefined()
      expect(r.jobDescription('a_three')).toBeUndefined()
    })
  })

  describe('moduleLabel', () => {
    it('is undefined without an entry, resolves literals and msg()', () => {
      const r = resolvers(
        { moduleLabels: { comms: 'Communications', ops: msg('mods.ops') } },
        { mods: { ops: 'Operations' } }
      )
      expect(r.moduleLabel('comms')).toBe('Communications')
      expect(r.moduleLabel('ops')).toBe('Operations')
      expect(r.moduleLabel('other')).toBeUndefined()
    })
  })

  describe('orderModules', () => {
    it('sorts alphabetically by key without labels', () => {
      expect(resolvers({}).orderModules(['sync', 'core', 'mail'])).toEqual(['core', 'mail', 'sync'])
    })

    it('moduleLabels key order first, then the rest alphabetically by label', () => {
      const r = resolvers({ moduleLabels: { sync: 'Sync', mail: 'Zed mail', other: 'Unused' } })
      expect(r.orderModules(['core', 'zeta', 'mail', 'sync'])).toEqual(['sync', 'mail', 'core', 'zeta'])
    })
  })
})

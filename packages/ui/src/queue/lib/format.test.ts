import { describe, it, expect } from 'vitest'
import { formatQueueName } from './format'

describe('formatQueueName', () => {
  it('strips the module prefix (text up to the first underscore)', () => {
    expect(formatQueueName('gateway_process_data')).toBe('Process Data')
  })

  it('collapses multiple underscores into single spaces', () => {
    expect(formatQueueName('imports_sync_records')).toBe('Sync Records')
  })

  it('turns hyphens into spaces too', () => {
    expect(formatQueueName('gateway_processar-ids')).toBe('Processar Ids')
  })

  it('leaves a name with no prefix untouched (only title-cased)', () => {
    expect(formatQueueName('standalone')).toBe('Standalone')
  })

  it('returns an empty string unchanged', () => {
    expect(formatQueueName('')).toBe('')
  })
})

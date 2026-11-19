import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import JobConfigDialog from './JobConfigDialog'
import type { JobConfig } from '../types'

const job = {
  jobName: 'gateway_process-data',
  module: 'gateway',
  enabled: true,
  orphan: true,
  cronPattern: '*/5 * * * *',
  priority: 5,
} as unknown as JobConfig

describe('JobConfigDialog (consumer QA 7.3.1)', () => {
  it('closes with Escape', () => {
    const onClose = vi.fn()
    render(<JobConfigDialog job={job} onClose={onClose} onUpdate={vi.fn()} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('translated labels (no "Cron Pattern" / "orphan")', () => {
    render(<JobConfigDialog job={job} onClose={vi.fn()} onUpdate={vi.fn()} />)
    expect(screen.getByText('Expressão cron')).toBeInTheDocument()
    expect(screen.getByText('órfão')).toBeInTheDocument()
    expect(screen.queryByText('orphan')).not.toBeInTheDocument()
  })
})

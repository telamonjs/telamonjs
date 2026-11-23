import { describe, it, expect, vi } from 'vitest'

// The real Badge: the variant check below reads its classes
vi.unmock('../../ui/badge')
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

  // Issue #7: the theme's `secondary` badge is blue; inactive must look neutral
  it('renders the inactive badge neutral, not with the blue secondary variant', () => {
    render(<JobConfigDialog job={{ ...job, enabled: false }} onClose={vi.fn()} onUpdate={vi.fn()} />)
    const badge = screen.getByText('Inativo')
    expect(badge).toHaveClass('bg-muted', 'text-muted-foreground')
    expect(badge).not.toHaveClass('bg-secondary')
  })
})

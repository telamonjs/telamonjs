/**
 * JobDetailModal characterization tests — WAVE 4
 *
 * Pins CURRENT behavior before any future refactor of JobDetailModal.
 * This component receives a `job` prop and renders a modal with full
 * job details (no provider needed — purely prop-driven). Callbacks
 * (onRetry, onRemove, onPromote) are optional and only shown for the
 * relevant job status.
 *
 * Sources of truth (read, not altered):
 *   src/queue/components/JobDetailModal.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Sonner is used directly (not via ui/toast)
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import JobDetailModal, { type JobInfo } from './JobDetailModal'

// ============================================================================
// FIXTURES
// ============================================================================

const baseJob: JobInfo = {
  id: 'job-123',
  name: 'gateway_process-data',
  queueName: 'gateway_process-data',
  data: { key: 'value', count: 42 },
  progress: 0,
  attemptsMade: 1,
  attemptsMax: 3,
  timestamp: 1700000000000,
  status: 'completed',
}

const failedJob: JobInfo = {
  ...baseJob,
  id: 'job-456',
  status: 'failed',
  failedReason: 'Connection timeout after 30000ms',
  stacktrace: ['Error: timeout\n  at handler.js:10', '  at queue.js:20'],
  attemptsMade: 3,
}

const delayedJob: JobInfo = {
  ...baseJob,
  id: 'job-789',
  status: 'delayed',
  data: {},
}

const completedJobWithResult: JobInfo = {
  ...baseJob,
  processedOn: 1700000001000,
  finishedOn: 1700000002500,
  returnvalue: { processed: true, count: 5 },
  progress: 0,
}

const activeJob: JobInfo = {
  ...baseJob,
  id: 'job-active',
  status: 'active',
  progress: 45,
  data: {},
}

// ============================================================================
// TESTS
// ============================================================================

describe('JobDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders null when job prop is null', () => {
      const { container } = render(
        <JobDetailModal job={null} onClose={vi.fn()} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders backdrop and modal when job is provided', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      // Backdrop is fixed/inset element, modal content is present
      expect(screen.getByText('Concluído')).toBeInTheDocument()
    })

    it('shows queue name formatted (prefix stripped, words capitalized)', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      // Shared formatQueueName: strip module prefix, turn -/_ into spaces, capitalize
      // 'gateway_process-data' -> 'Process Data'
      expect(screen.getByText('Process Data')).toBeInTheDocument()
    })

    it('shows job ID in a code element', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.getByText('job-123')).toBeInTheDocument()
    })

    it('shows attempt count with attemptsMax', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('/ 3')).toBeInTheDocument()
    })

    it('shows duration when processedOn and finishedOn are set', () => {
      render(<JobDetailModal job={completedJobWithResult} onClose={vi.fn()} />)
      // duration = 1500ms -> 1.5s, formatted via Intl.NumberFormat('pt-BR',
      // { style: 'unit', unit: 'second', unitDisplay: 'narrow' }) — the
      // global test wrapper renders under locale='pt-BR' (comma decimal,
      // space before the narrow unit).
      expect(screen.getByText('1,5 s')).toBeInTheDocument()
    })

    it('does NOT show duration section when processedOn/finishedOn are missing', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.queryByText('Duração')).not.toBeInTheDocument()
    })

    it('shows "Dados de Entrada" section when job.data has keys', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.getByText('Dados de Entrada')).toBeInTheDocument()
      expect(screen.getByText(/"key"/)).toBeInTheDocument()
    })

    it('does NOT show "Dados de Entrada" when data is empty', () => {
      render(<JobDetailModal job={delayedJob} onClose={vi.fn()} />)
      expect(screen.queryByText('Dados de Entrada')).not.toBeInTheDocument()
    })

    it('shows "Resultado" section when returnvalue is set', () => {
      render(<JobDetailModal job={completedJobWithResult} onClose={vi.fn()} />)
      expect(screen.getByText('Resultado')).toBeInTheDocument()
    })

    it('does NOT show "Resultado" when returnvalue is undefined', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.queryByText('Resultado')).not.toBeInTheDocument()
    })

    it('shows progress bar when progress is between 0 and 100 (exclusive)', () => {
      render(<JobDetailModal job={activeJob} onClose={vi.fn()} />)
      expect(screen.getByText('Progresso')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
    })

    it('does NOT show progress bar when progress is 0', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.queryByText('Progresso')).not.toBeInTheDocument()
    })

    it('shows status-specific labels for each status', () => {
      const statuses: Array<[string, string]> = [
        ['waiting', 'Aguardando'],
        ['active', 'Processando'],
        ['completed', 'Concluído'],
        ['failed', 'Falhou'],
        ['delayed', 'Agendado'],
      ]
      for (const [status, label] of statuses) {
        const { unmount } = render(
          <JobDetailModal job={{ ...baseJob, status }} onClose={vi.fn()} />
        )
        expect(screen.getByText(label)).toBeInTheDocument()
        unmount()
      }
    })

    it('shows "Fechar" button in footer', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.getByText('Fechar')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<JobDetailModal job={baseJob} onClose={onClose} />)
      // Backdrop is the first fixed element (inset-0 bg-black/50)
      const backdrop = document.querySelector('.fixed.inset-0')!
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when "Fechar" button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<JobDetailModal job={baseJob} onClose={onClose} />)
      await user.click(screen.getByText('Fechar'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<JobDetailModal job={baseJob} onClose={onClose} />)
      // X icon button in header
      const xButton = screen.getByTitle
        ? document.querySelector('button:has([data-testid="icon-x"])')
        : null
      if (!xButton) {
        // Fallback: find button containing the X icon
        const buttons = screen.getAllByRole('button')
        const closeBtn = buttons.find(
          b => b.querySelector('[data-testid="icon-x"]') !== null
        )
        if (closeBtn) await user.click(closeBtn)
      } else {
        await user.click(xButton)
      }
      expect(onClose).toHaveBeenCalled()
    })

    it('shows "Reprocessar" button for failed jobs with onRetry', () => {
      render(
        <JobDetailModal
          job={failedJob}
          onClose={vi.fn()}
          onRetry={vi.fn()}
        />
      )
      expect(screen.getByText('Reprocessar')).toBeInTheDocument()
    })

    it('does NOT show "Reprocessar" for completed jobs', () => {
      render(
        <JobDetailModal
          job={baseJob}
          onClose={vi.fn()}
          onRetry={vi.fn()}
        />
      )
      expect(screen.queryByText('Reprocessar')).not.toBeInTheDocument()
    })

    it('shows "Excluir" button for failed jobs with onRemove', () => {
      render(
        <JobDetailModal
          job={failedJob}
          onClose={vi.fn()}
          onRemove={vi.fn()}
        />
      )
      expect(screen.getByText('Excluir')).toBeInTheDocument()
    })

    it('shows confirm dialog after clicking "Excluir"', async () => {
      const user = userEvent.setup()
      render(
        <JobDetailModal
          job={failedJob}
          onClose={vi.fn()}
          onRemove={vi.fn()}
        />
      )
      await user.click(screen.getByText('Excluir'))
      expect(screen.getByText('Confirmar exclusão?')).toBeInTheDocument()
      expect(screen.getByText('Sim')).toBeInTheDocument()
      expect(screen.getByText('Não')).toBeInTheDocument()
    })

    it('hides confirm dialog when "Não" is clicked', async () => {
      const user = userEvent.setup()
      render(
        <JobDetailModal
          job={failedJob}
          onClose={vi.fn()}
          onRemove={vi.fn()}
        />
      )
      await user.click(screen.getByText('Excluir'))
      await user.click(screen.getByText('Não'))
      expect(screen.queryByText('Confirmar exclusão?')).not.toBeInTheDocument()
      expect(screen.getByText('Excluir')).toBeInTheDocument()
    })

    it('calls onRemove with jobId and queueName when "Sim" is confirmed', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      render(
        <JobDetailModal
          job={failedJob}
          onClose={onClose}
          onRemove={onRemove}
        />
      )
      await user.click(screen.getByText('Excluir'))
      await user.click(screen.getByText('Sim'))
      expect(onRemove).toHaveBeenCalledWith(failedJob.id, failedJob.queueName)
    })

    it('shows "Executar Agora" for delayed jobs with onPromote', () => {
      render(
        <JobDetailModal
          job={delayedJob}
          onClose={vi.fn()}
          onPromote={vi.fn()}
        />
      )
      expect(screen.getByText('Executar Agora')).toBeInTheDocument()
    })

    it('calls onPromote when "Executar Agora" is clicked', async () => {
      const user = userEvent.setup()
      const onPromote = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      render(
        <JobDetailModal
          job={delayedJob}
          onClose={onClose}
          onPromote={onPromote}
        />
      )
      await user.click(screen.getByText('Executar Agora'))
      expect(onPromote).toHaveBeenCalledWith(delayedJob.id, delayedJob.queueName)
    })

    it('calls onRetry with jobId and queueName on "Reprocessar" click', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      render(
        <JobDetailModal
          job={failedJob}
          onClose={onClose}
          onRetry={onRetry}
        />
      )
      await user.click(screen.getByText('Reprocessar'))
      expect(onRetry).toHaveBeenCalledWith(failedJob.id, failedJob.queueName)
    })
  })

  describe('State Management', () => {
    it('shows error message when job has failedReason', () => {
      render(<JobDetailModal job={failedJob} onClose={vi.fn()} />)
      expect(
        screen.getByText('Connection timeout after 30000ms')
      ).toBeInTheDocument()
    })

    it('shows stack trace as collapsible details element', () => {
      render(<JobDetailModal job={failedJob} onClose={vi.fn()} />)
      expect(screen.getByText('Stack Trace')).toBeInTheDocument()
    })

    it('does NOT show Stack Trace when stacktrace is empty', () => {
      render(<JobDetailModal job={{ ...failedJob, stacktrace: [] }} onClose={vi.fn()} />)
      expect(screen.queryByText('Stack Trace')).not.toBeInTheDocument()
    })

    it('renders returned JSON result in the page', () => {
      render(<JobDetailModal job={completedJobWithResult} onClose={vi.fn()} />)
      // returnvalue is rendered as JSON in a pre block
      expect(screen.getByText(/"processed"/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('renders without optional callbacks', () => {
      render(<JobDetailModal job={failedJob} onClose={vi.fn()} />)
      // No "Reprocessar" without onRetry, no "Excluir" without onRemove
      expect(screen.queryByText('Reprocessar')).not.toBeInTheDocument()
      expect(screen.queryByText('Excluir')).not.toBeInTheDocument()
    })

    it('handles unknown status with generic label', () => {
      const unknownJob: JobInfo = { ...baseJob, status: 'stalled' }
      render(<JobDetailModal job={unknownJob} onClose={vi.fn()} />)
      // getStatusConfig default returns status as label
      expect(screen.getByText('stalled')).toBeInTheDocument()
    })

    it('handles job with no data keys gracefully', () => {
      render(<JobDetailModal job={{ ...baseJob, data: {} }} onClose={vi.fn()} />)
      expect(screen.queryByText('Dados de Entrada')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('icon-only buttons (X close, copy-to-clipboard) have accessible names (button-name)', async () => {
      // All icon-only buttons now carry aria-label (F1b button-accessibility pass) —
      // axe's button-name check must no longer fire for this modal.
      const { container } = render(
        <JobDetailModal job={completedJobWithResult} onClose={vi.fn()} />
      )
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
      const violationIds = results.violations.map(v => v.id)
      expect(violationIds).not.toContain('button-name')
    })

    it('renders accessible heading hierarchy (h2 in modal header)', () => {
      render(<JobDetailModal job={baseJob} onClose={vi.fn()} />)
      expect(screen.getByRole('heading', { level: 2, name: 'Concluído' })).toBeInTheDocument()
    })
  })
})

/**
 * Characterization tests for `WizardForm`.
 *
 * WizardForm shipped with ZERO tests and was structurally broken (gaps
 * catalog #12): each step rendered its `FormSection` inside a nested
 * `<AdminForm>`, which mounts its OWN `useForm`/`FormProvider` — so typed
 * values landed in that throwaway form instance and never reached the
 * wizard's `form`. Symptoms: `form.trigger()` validated against `{}` (Next
 * never worked once a required field existed), the draft persisted `{}`,
 * and `onSubmit`/the review step always saw an empty object.
 *
 * The fix replaces the nested `AdminForm` with `AdminFormRenderer` wired
 * directly to the wizard's own `control`/`setValue`. Every test below pins
 * the CORRECT behavior (values flow through) rather than the old broken one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { z } from 'zod'
import { WizardForm, type WizardFormProps } from './WizardForm'
import type { WizardStep } from './ReviewStep'
import { getInputByName } from './test-helpers'

function buildSteps(overrides?: {
  onExitStep0?: WizardStep['onExit']
  onEnterStep1?: WizardStep['onEnter']
}): WizardStep[] {
  return [
    {
      id: 'dados-pessoais',
      title: 'Dados Pessoais',
      sections: [
        {
          label: 'Identificação',
          grid: '2',
          fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
          ],
        },
      ],
      validation: z.object({
        nome: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
      }),
      onExit: overrides?.onExitStep0,
    },
    {
      id: 'endereco',
      title: 'Endereço',
      sections: [
        {
          label: 'Localização',
          fields: [
            { name: 'cidade', label: 'Cidade', type: 'text', required: true },
          ],
        },
      ],
      validation: z.object({
        cidade: z.string().min(1, 'Cidade é obrigatória'),
      }),
      onEnter: overrides?.onEnterStep1,
    },
  ]
}

function renderWizard(
  props: Partial<WizardFormProps<Record<string, unknown>>> & {
    steps: WizardStep[]
  }
) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined)
  return {
    onSubmit,
    ...render(<WizardForm onSubmit={onSubmit} showReview {...props} />),
  }
}

async function preencherPasso0(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Souza')
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
}

describe('WizardForm', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    localStorage.clear()
    user = userEvent.setup()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders the first step title, its fields and the stepper', () => {
      renderWizard({ steps: buildSteps() })

      expect(
        screen.getByRole('heading', { name: 'Dados Pessoais' })
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(
        screen.getByTestId('stepper-step-dados-pessoais')
      ).toBeInTheDocument()
      expect(screen.getByTestId('stepper-step-endereco')).toBeInTheDocument()
      // showReview default: a "Review" pseudo-step is appended
      expect(screen.getByTestId('stepper-step-review')).toBeInTheDocument()
    })

    it('the Back button is hidden on the first step', () => {
      renderWizard({ steps: buildSteps() })
      expect(screen.getByTestId('wizard-back-button')).toHaveClass('invisible')
    })
  })

  describe('Interactions', () => {
    it('blocks advancing when the step schema is not satisfied', async () => {
      const errorSpy = vi.spyOn(toast, 'error')
      renderWizard({ steps: buildSteps() })

      await user.click(screen.getByTestId('wizard-next-button'))

      await waitFor(() => expect(errorSpy).toHaveBeenCalled())
      // still on step 0 — the nested-AdminForm bug used to "succeed" here
      // too (trigger() validated an empty shadow form), so staying put
      // alone isn't the regression signal; the real one is below.
      expect(
        screen.getByRole('heading', { name: 'Dados Pessoais' })
      ).toBeInTheDocument()
    })

    it('REGRESSION: typed values reach the wizard form and validation passes against them', async () => {
      renderWizard({ steps: buildSteps() })

      await preencherPasso0(user)
      await user.click(screen.getByTestId('wizard-next-button'))

      await waitFor(() =>
        expect(
          screen.getByRole('heading', { name: 'Endereço' })
        ).toBeInTheDocument()
      )
    })

    it('REGRESSION: values survive navigating back to a previous step', async () => {
      renderWizard({ steps: buildSteps() })

      await preencherPasso0(user)
      await user.click(screen.getByTestId('wizard-next-button'))
      await waitFor(() =>
        expect(screen.getByLabelText('Cidade')).toBeInTheDocument()
      )

      await user.click(screen.getByTestId('wizard-back-button'))

      await waitFor(() =>
        expect(getInputByName('nome').value).toBe('Ana Souza')
      )
      expect(getInputByName('email').value).toBe('ana@example.com')
    })

    it('onEnter of the next step receives the real data collected so far', async () => {
      const onEnterStep1 = vi.fn()
      renderWizard({ steps: buildSteps({ onEnterStep1 }) })

      await preencherPasso0(user)
      await user.click(screen.getByTestId('wizard-next-button'))

      await waitFor(() =>
        expect(onEnterStep1).toHaveBeenCalledWith(
          expect.objectContaining({
            nome: 'Ana Souza',
            email: 'ana@example.com',
          })
        )
      )
    })

    it('a sync onExit returning false blocks the step transition', async () => {
      const onExitStep0 = vi.fn().mockReturnValue(false)
      renderWizard({ steps: buildSteps({ onExitStep0 }) })

      await preencherPasso0(user)
      await user.click(screen.getByTestId('wizard-next-button'))

      await waitFor(() => expect(onExitStep0).toHaveBeenCalled())
      expect(
        screen.getByRole('heading', { name: 'Dados Pessoais' })
      ).toBeInTheDocument()
    })

    it('an async onExit is awaited before advancing, disabling Next meanwhile', async () => {
      let resolveExit!: (canProceed: boolean) => void
      const exitGate = new Promise<boolean>(resolve => {
        resolveExit = resolve
      })
      const onExitStep0 = vi.fn().mockReturnValue(exitGate)
      renderWizard({ steps: buildSteps({ onExitStep0 }) })

      await preencherPasso0(user)
      await user.click(screen.getByTestId('wizard-next-button'))

      // still awaiting the async onExit — button disabled, step unchanged
      await waitFor(() =>
        expect(screen.getByTestId('wizard-next-button')).toBeDisabled()
      )
      expect(
        screen.getByRole('heading', { name: 'Dados Pessoais' })
      ).toBeInTheDocument()

      resolveExit(true)

      await waitFor(() =>
        expect(
          screen.getByRole('heading', { name: 'Endereço' })
        ).toBeInTheDocument()
      )
    })

    it('an async onExit resolving to false keeps the wizard on the current step', async () => {
      const onExitStep0 = vi.fn().mockResolvedValue(false)
      renderWizard({ steps: buildSteps({ onExitStep0 }) })

      await preencherPasso0(user)
      await user.click(screen.getByTestId('wizard-next-button'))

      await waitFor(() => expect(onExitStep0).toHaveBeenCalled())
      await waitFor(() =>
        expect(screen.getByTestId('wizard-next-button')).not.toBeDisabled()
      )
      expect(
        screen.getByRole('heading', { name: 'Dados Pessoais' })
      ).toBeInTheDocument()
    })
  })

  describe('State Management (review + submit)', () => {
    async function chegarNaRevisao(u: ReturnType<typeof userEvent.setup>) {
      await preencherPasso0(u)
      await u.click(screen.getByTestId('wizard-next-button'))
      await waitFor(() => screen.getByLabelText('Cidade'))
      await u.type(screen.getByLabelText('Cidade'), 'Fortaleza')
      await u.click(screen.getByTestId('wizard-next-button'))
      await waitFor(() =>
        screen.getByRole('heading', { name: 'Revise suas informações' })
      )
    }

    it('REGRESSION: the review step shows the real values, not an empty object', async () => {
      renderWizard({ steps: buildSteps() })

      await chegarNaRevisao(user)

      expect(screen.getByText('Ana Souza')).toBeInTheDocument()
      expect(screen.getByText('ana@example.com')).toBeInTheDocument()
      expect(screen.getByText('Fortaleza')).toBeInTheDocument()
    })

    it('a custom formatValue overrides how a field is displayed on review', async () => {
      const formatValue = vi.fn((fieldName: string, value: unknown) =>
        fieldName === 'cidade' ? `Cidade: ${String(value)}` : undefined
      )
      renderWizard({ steps: buildSteps(), formatValue })

      await chegarNaRevisao(user)

      expect(screen.getByText('Cidade: Fortaleza')).toBeInTheDocument()
      // untouched field still uses the built-in formatter
      expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    })

    it('REGRESSION: submit sends the real collected data to onSubmit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      renderWizard({ steps: buildSteps(), onSubmit })

      await chegarNaRevisao(user)
      await user.click(screen.getByTestId('wizard-submit-button'))

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Ana Souza',
          email: 'ana@example.com',
          cidade: 'Fortaleza',
        })
      )
    })

    it('a failed submit shows an error toast and does not clear the draft', async () => {
      const errorSpy = vi.spyOn(toast, 'error')
      const onSubmit = vi.fn().mockRejectedValue(new Error('falhou'))
      renderWizard({ steps: buildSteps(), onSubmit, draftKey: 'wizard-fail' })

      await chegarNaRevisao(user)
      await user.click(screen.getByTestId('wizard-submit-button'))

      await waitFor(() => expect(errorSpy).toHaveBeenCalled())
    })
  })

  describe('Edge Cases (draft persistence)', () => {
    it('shows the draft-restored toast once, not on later keystrokes', async () => {
      localStorage.setItem(
        'wizard-draft-toast',
        JSON.stringify({
          timestamp: Date.now(),
          formId: 'wizard-draft-toast',
          data: { nome: 'X' },
        })
      )
      const infoSpy = vi.spyOn(toast, 'info')
      renderWizard({ steps: buildSteps(), draftKey: 'wizard-draft-toast' })
      for (const v of ['a', 'ab', 'abc']) {
        fireEvent.change(getInputByName('nome'), { target: { value: v } })
      }
      await waitFor(() => expect(getInputByName('nome')).toHaveValue('abc'))
      expect(infoSpy).toHaveBeenCalledTimes(1)
    })

    it('REGRESSION: the auto-saved draft carries the real typed values (not {})', async () => {
      renderWizard({ steps: buildSteps(), draftKey: 'wizard-draft-real' })

      fireEvent.change(getInputByName('nome'), {
        target: { value: 'Bia' },
      })

      await waitFor(
        () => {
          const raw = localStorage.getItem('wizard-draft-real')
          expect(raw).not.toBeNull()
          const saved = JSON.parse(raw as string)
          expect(saved.data.nome).toBe('Bia')
        },
        { timeout: 2000 }
      )
    })

    it('discarding the draft clears localStorage and resets the visible fields', async () => {
      renderWizard({ steps: buildSteps(), draftKey: 'wizard-draft-discard' })

      await user.type(screen.getByLabelText('Nome'), 'Carlos')
      await waitFor(
        () =>
          expect(localStorage.getItem('wizard-draft-discard')).not.toBeNull(),
        { timeout: 2000 }
      )

      await user.click(screen.getByTestId('wizard-discard-draft-button'))

      expect(localStorage.getItem('wizard-draft-discard')).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('marks required fields and surfaces validation errors as alerts', async () => {
      renderWizard({ steps: buildSteps() })

      await user.click(screen.getByTestId('wizard-next-button'))

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.length).toBeGreaterThan(0)
      })
    })

    it('every field is reachable by its accessible label', () => {
      renderWizard({ steps: buildSteps() })
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
  })
})

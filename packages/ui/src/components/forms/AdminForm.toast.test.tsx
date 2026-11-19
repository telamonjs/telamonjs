/**
 * Lacuna 11 (consumer QA): saving through useCrudMutations showed TWO error toasts —
 * useCrudMutations.onError toasts, then mutateAsync rejects and AdminForm's catch
 * toasts the same error again. Errors already toasted are marked; AdminForm skips them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'
import type { ReactNode } from 'react'
import { AdminForm } from './AdminForm'
import type { FormField } from './AdminForm'
import { useCrudMutations } from '../../hooks/useCrudMutations'
import type { CrudConfig } from '../../types/crud'

const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: (...args: unknown[]) => toastError(...args) },
}))

const fields: FormField[] = [{ name: 'nome', label: 'Nome', type: 'text' }]

beforeEach(() => toastError.mockClear())

describe('AdminForm + useCrudMutations: one error toast', () => {
  it('an error thrown by a useCrudMutations mutation is toasted exactly once', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const config = {
      module: { name: 'u', title: 'U', description: 'U', route: '/u' },
      list: { title: 'U', description: 'U', columns: [] },
      form: { sections: [], validation: z.object({}) },
      query: { queryKey: ['u'], queryFn: vi.fn() },
      mutations: { update: { mutationFn: () => Promise.reject(new Error('Placa duplicada')) } },
    } as unknown as CrudConfig<{ id: string }>
    const { result } = renderHook(() => useCrudMutations({ config }), { wrapper })

    const user = userEvent.setup()
    render(
      <AdminForm
        fields={fields}
        onSubmitValues={values => result.current.updateMutation.mutateAsync({ id: '1', data: values })}
      />,
      { wrapper },
    )
    await act(() => user.click(screen.getByRole('button', { name: /salvar/i })))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Placa duplicada'))
    // let AdminForm's catch run
    await new Promise(r => setTimeout(r, 50))
    expect(toastError).toHaveBeenCalledTimes(1)
  })

  it('an ordinary thrown error is still toasted by AdminForm (legacy)', async () => {
    const user = userEvent.setup()
    render(<AdminForm fields={fields} onSubmitValues={() => Promise.reject(new Error('boom'))} />)
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('boom'))
    expect(toastError).toHaveBeenCalledTimes(1)
  })
})

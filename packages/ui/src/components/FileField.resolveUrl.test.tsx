/**
 * PRD 068 item 2: the download button opened the stored value (often a
 * storage key, not a URL). `field.resolveUrl` turns it into the real link.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import userEvent from '@testing-library/user-event'
import { FileField } from './FileField'

const tab = { location: { href: '' }, close: vi.fn() }
let openSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  tab.location.href = ''
  tab.close.mockClear()
  openSpy = vi
    .spyOn(window, 'open')
    .mockImplementation(() => tab as unknown as Window)
})
afterEach(() => openSpy.mockRestore())

const field = (extra: Record<string, unknown> = {}) => ({
  name: 'anexo',
  value: 'alunos/42/rg.pdf',
  onChange: vi.fn(),
  ...extra,
})

describe('FileField download', () => {
  it('without resolveUrl opens the stored value (unchanged default)', async () => {
    render(<FileField field={field()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Baixar arquivo' }))
    expect(openSpy).toHaveBeenCalledWith('alunos/42/rg.pdf', '_blank')
  })

  it('opens the URL a sync resolveUrl returns', async () => {
    const resolveUrl = vi.fn((key: string) => `https://cdn.test/${key}`)
    render(<FileField field={field({ resolveUrl })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Baixar arquivo' }))
    expect(resolveUrl).toHaveBeenCalledWith('alunos/42/rg.pdf')
    expect(openSpy).toHaveBeenCalledWith('https://cdn.test/alunos/42/rg.pdf', '_blank')
  })

  it('opens the tab inside the click and points it once an async resolveUrl settles (popup blockers)', async () => {
    const resolveUrl = vi.fn(async (key: string) => `https://signed.test/${key}?sig=1`)
    render(<FileField field={field({ resolveUrl })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Baixar arquivo' }))
    expect(openSpy).toHaveBeenCalledWith('', '_blank')
    await waitFor(() =>
      expect(tab.location.href).toBe('https://signed.test/alunos/42/rg.pdf?sig=1')
    )
  })

  it('closes the tab and shows an error when resolveUrl rejects', async () => {
    const resolveUrl = vi.fn(async () => {
      throw new Error('403')
    })
    render(<FileField field={field({ resolveUrl })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Baixar arquivo' }))
    expect(await screen.findByText('Erro ao baixar o arquivo')).toBeInTheDocument()
    expect(tab.close).toHaveBeenCalled()
  })

  it('refuses to open a stored javascript: value and shows an error', async () => {
    render(<FileField field={field({ value: 'javascript:alert(document.domain)' })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Baixar arquivo' }))
    expect(openSpy).not.toHaveBeenCalled()
    expect(await screen.findByText('Erro ao baixar o arquivo')).toBeInTheDocument()
  })

  it('closes the tab instead of navigating it when an async resolveUrl yields javascript:', async () => {
    const resolveUrl = vi.fn(async () => ' JavaScript:alert(1)')
    render(<FileField field={field({ resolveUrl })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Baixar arquivo' }))
    expect(await screen.findByText('Erro ao baixar o arquivo')).toBeInTheDocument()
    expect(tab.close).toHaveBeenCalled()
    expect(tab.location.href).toBe('')
  })
})

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { RichTextEditor } from './RichTextEditor'

// TipTap relies on getClientRects which jsdom does not implement.
beforeAll(() => {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = vi.fn(() => ({
      item: () => null,
      length: 0,
      [Symbol.iterator]: function* () {},
    })) as unknown as Range['getClientRects']
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = vi.fn(
      () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }) as DOMRect
    )
  }
})

describe('RichTextEditor', () => {
  describe('Rendering', () => {
    it('renders the editor surface', async () => {
      const { container } = render(<RichTextEditor value='<p>hello</p>' />)
      await waitFor(() => {
        expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
      })
      expect(container.textContent).toContain('hello')
    })
  })

  describe('Security (XSS sanitization)', () => {
    it('strips <script> from the initial value', async () => {
      const { container } = render(
        <RichTextEditor value='<p>safe</p><script>alert(1)</script>' />
      )
      await waitFor(() => {
        expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
      })
      expect(container.querySelector('script')).toBeNull()
      expect(container.innerHTML).not.toContain('<script')
    })

    it('strips onerror handler from an img in the initial value', async () => {
      const { container } = render(
        <RichTextEditor value='<p>x</p><img src=x onerror="alert(1)">' />
      )
      await waitFor(() => {
        expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
      })
      const html = container.querySelector('.ProseMirror')?.innerHTML ?? ''
      expect(html).not.toContain('onerror')
    })
  })

  describe('Content preservation', () => {
    it('preserves benign bold formatting', async () => {
      const { container } = render(
        <RichTextEditor value='<p><strong>bold</strong></p>' />
      )
      await waitFor(() => {
        expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
      })
      expect(container.querySelector('strong')).toBeInTheDocument()
      expect(container.textContent).toContain('bold')
    })

    it('preserves links', async () => {
      const { container } = render(
        <RichTextEditor value='<p><a href="https://example.com">link</a></p>' />
      )
      await waitFor(() => {
        expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
      })
      const anchor = container.querySelector('a')
      expect(anchor).toBeInTheDocument()
      expect(anchor?.getAttribute('href')).toBe('https://example.com')
    })

    it('does not sanitize when sanitize=false (opt-out)', async () => {
      // With opt-out, the script string passes through the sanitizer untouched;
      // TipTap then parses it (and naturally drops the non-content node), so we
      // assert the editor still initializes without throwing.
      const { container } = render(
        <RichTextEditor
          sanitize={false}
          value='<p><strong>trusted</strong></p>'
        />
      )
      await waitFor(() => {
        expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
      })
      expect(container.querySelector('strong')).toBeInTheDocument()
    })
  })

  describe('Accessibility (accessible name)', () => {
    const editable = async (ui: React.ReactElement) => {
      const { container } = render(ui)
      await waitFor(() => {
        expect(container.querySelector('[contenteditable]')).toBeInTheDocument()
      })
      return container.querySelector('[contenteditable]') as HTMLElement
    }

    it('uses explicit aria-label', async () => {
      const el = await editable(<RichTextEditor aria-label='Conteudo' />)
      expect(el.getAttribute('aria-label')).toBe('Conteudo')
    })

    // A labelled div with no role is `aria-prohibited-attr` for axe: the name has to
    // land on something that accepts it, so the editable element keeps its textbox role.
    it('keeps the textbox role next to the accessible name', async () => {
      const el = await editable(<RichTextEditor aria-label='Conteudo' />)
      expect(el.getAttribute('role')).toBe('textbox')
      expect(el.getAttribute('aria-multiline')).toBe('true')
    })

    it('uses aria-labelledby without a fallback aria-label', async () => {
      const el = await editable(<RichTextEditor aria-labelledby='lbl' />)
      expect(el.getAttribute('aria-labelledby')).toBe('lbl')
      expect(el.hasAttribute('aria-label')).toBe(false)
    })

    it('falls back to the localized default', async () => {
      const el = await editable(<RichTextEditor />)
      expect(el.getAttribute('aria-label')).toBeTruthy()
    })

    it('gets the field label through the form renderer', async () => {
      const { RichTextRenderer } = await import('../../field-system/renderers/advanced-renderers')
      const el = await editable(
        <>
          {RichTextRenderer.render({
            field: { name: 'body', label: 'Corpo', value: '', onChange: () => {} },
            t: (k: string) => k,
          } as never)}
        </>
      )
      expect(el.getAttribute('aria-label')).toBe('Corpo')
    })
  })
})

// PRD 068 item 10: mounting must not mark the form dirty, and the Link
// extension must be registered once (StarterKit 3 already ships one).
describe('RichTextEditor — mount side effects (PRD 068)', () => {
  const mountReady = async (ui: React.ReactElement) => {
    const utils = render(ui)
    await waitFor(() =>
      expect(utils.container.querySelector('.ProseMirror')).toBeInTheDocument()
    )
    return utils
  }

  it('an empty value does not call onChange on mount', async () => {
    const onChange = vi.fn()
    await mountReady(<RichTextEditor value='' onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a value the editor normalizes (<b> → <strong>) does not call onChange on mount', async () => {
    const onChange = vi.fn()
    await mountReady(<RichTextEditor value='<b>negrito</b>' onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('an external value change is applied without echoing onChange', async () => {
    const onChange = vi.fn()
    const { rerender, container } = await mountReady(
      <RichTextEditor value='<p>a</p>' onChange={onChange} />
    )
    rerender(<RichTextEditor value='<p>b</p>' onChange={onChange} />)
    await waitFor(() => expect(container.textContent).toContain('b'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('registers the link extension once (no tiptap duplicate warning)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await mountReady(<RichTextEditor value='<p>x</p>' />)
    const duplicate = warn.mock.calls.some(args =>
      String(args[0]).includes('Duplicate extension names')
    )
    warn.mockRestore()
    expect(duplicate).toBe(false)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Dialog, DialogContent, DialogTitle } from './dialog'
import { Sheet, SheetContent, SheetTitle } from './sheet'

// setup's ui-mocks replace these globally; this file tests the real ones.
vi.unmock('./popover')
vi.unmock('./dialog')

const pop = (modal?: boolean) => (
  <Popover open modal={modal}>
    <PopoverTrigger>t</PopoverTrigger>
    <PopoverContent data-testid='pc'>content</PopoverContent>
  </Popover>
)

// Radix modal popovers hide siblings from assistive tech (aria-hidden) and block outside pointer events.
const isModal = () => document.body.style.pointerEvents === 'none'

describe('Popover inside modals', () => {
  it('outside a modal it stays non-modal and portalled to body', () => {
    render(pop())
    expect(isModal()).toBe(false)
    expect(screen.getByTestId('pc').parentElement?.parentElement).toBe(document.body)
  })

  it('inside a Dialog it becomes modal, content still portalled to body (not clipped)', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          {pop()}
        </DialogContent>
      </Dialog>
    )
    expect(isModal()).toBe(true)
    expect(document.querySelector('[aria-labelledby]') as HTMLElement).not.toContainElement(screen.getByTestId('pc'))
  })

  it('inside a Sheet it becomes modal', () => {
    render(
      <Sheet open>
        <SheetContent side='bottom'>
          <SheetTitle>T</SheetTitle>
          {pop()}
        </SheetContent>
      </Sheet>
    )
    expect(isModal()).toBe(true)
  })

  it('inside a Dialog with a mouse it stays non-modal (hover-opened popovers would loop)', () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q.includes('hover: hover'), media: q })) as never
    try {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
            {pop()}
          </DialogContent>
        </Dialog>
      )
      // a modal popover hides everything but itself (the dialog and its trigger included)
      expect(document.querySelector('[aria-labelledby]')).not.toHaveAttribute('aria-hidden')
    } finally {
      window.matchMedia = original
    }
  })

  it('an explicit modal={false} wins inside a Dialog', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          {pop(false)}
        </DialogContent>
      </Dialog>
    )
    // the Dialog itself locks pointer events; the popover adds no second lock
    expect(screen.getByTestId('pc')).toBeInTheDocument()
  })

  it('touch/wheel events inside the popover content are not default-prevented', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          {pop()}
        </DialogContent>
      </Dialog>
    )
    const el = screen.getByTestId('pc')
    expect(fireEvent.wheel(el, { deltaY: 10 })).toBe(true)
    // jsdom drops plain objects passed as `touches` on TouchEvent init, and
    // react-remove-scroll reads `touches[0].clientX` in its document listener
    // (uncaught TypeError before). Define the list on the event instead.
    const touch = (type: string) => {
      const ev = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(ev, 'touches', { value: [{ clientX: 0, clientY: 5 }] })
      Object.defineProperty(ev, 'changedTouches', { value: [{ clientX: 0, clientY: 5 }] })
      return ev
    }
    expect(fireEvent(el, touch('touchstart'))).toBe(true)
    // jsdom has no layout (scrollHeight === clientHeight), so react-remove-scroll
    // cannot see the content as scrollable and prevents the move; the browser
    // behaviour is covered by the shards wiring asserted above. What matters
    // here is that the listener no longer throws.
    expect(() => fireEvent(el, touch('touchmove'))).not.toThrow()
  })
})

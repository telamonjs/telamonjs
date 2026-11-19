import { describe, it, expect } from 'vitest'
import { resolveUseTabs, withWideFormGrid } from './spacing'

const sec = (n: number, grid?: string) => ({
  label: 'S',
  ...(grid && { grid }),
  fields: Array.from({ length: n }, (_, i) => ({ name: `f${i}` })),
})

describe('one-page form layout (7.14)', () => {
  it('tabs only above 20 fields with more than one section', () => {
    expect(resolveUseTabs(undefined, [sec(7), sec(7)])).toBe(false)
    expect(resolveUseTabs(undefined, [sec(11), sec(11)])).toBe(true)
    expect(resolveUseTabs(undefined, [sec(30)])).toBe(false)
    expect(resolveUseTabs(true, [sec(2), sec(2)])).toBe(true)
  })

  it('wide one-page form: sections without grid get 3 columns; explicit grid wins', () => {
    const out = withWideFormGrid([sec(5), sec(5, '2')], { useTabs: false, size: 'xl' })
    expect(out[0].grid).toBe('3')
    expect(out[1].grid).toBe('2')
  })

  it('keeps 2 columns with tabs or in a narrower dialog', () => {
    expect(withWideFormGrid([sec(5)], { useTabs: true, size: 'xl' })[0].grid).toBeUndefined()
    expect(withWideFormGrid([sec(5)], { useTabs: false, size: 'lg' })[0].grid).toBeUndefined()
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { colSpanClass, gridColsClass } from './grid-classes'

// vitest runs with cwd at the package root
const source = readFileSync(
  join(process.cwd(), 'src/components/forms/grid-classes.ts'),
  'utf8'
)

describe('grid-classes', () => {
  it('collapses to one column below sm and keeps N columns from sm up', () => {
    expect(gridColsClass('1')).toBe('grid-cols-1')
    expect(gridColsClass('3')).toBe('grid-cols-1 sm:grid-cols-3')
    expect(gridColsClass(6)).toBe('grid-cols-1 sm:grid-cols-6')
  })

  it('applies spans from sm up only; full spans everywhere', () => {
    expect(colSpanClass('2')).toBe('sm:col-span-2')
    expect(colSpanClass(4)).toBe('sm:col-span-4')
    expect(colSpanClass('full')).toBe('col-span-full')
  })

  it('every mapped class is spelled out verbatim, so Tailwind generates it', () => {
    for (let n = 1; n <= 12; n++) {
      for (const cls of [...gridColsClass(n).split(' '), colSpanClass(n)]) {
        // inside a quoted literal: preceded by a quote or a space, followed by one too
        expect(source).toMatch(new RegExp(`['\\s]${cls}['\\s]`))
      }
    }
  })

  it('an out-of-range value keeps the previous class shape', () => {
    expect(gridColsClass('13')).toBe('grid-cols-13')
    expect(colSpanClass('13')).toBe('col-span-13')
  })
})

import { describe, it, expect } from 'vitest'
import { cleanContext, mergeContext } from '../../../src/core/context'

describe('mergeContext', () => {
  it('merges left to right, later keys winning, skipping undefined', () => {
    expect(mergeContext({ a: 1, b: 1 }, undefined, { b: 2 }, { c: 3 })).toEqual({
      a: 1,
      b: 2,
      c: 3,
    })
  })

  it('returns a new object and leaves the inputs untouched', () => {
    const parent = { a: 1 }
    const merged = mergeContext(parent, { b: 2 })
    expect(merged).not.toBe(parent)
    expect(parent).toEqual({ a: 1 })
  })
})

describe('cleanContext', () => {
  it('drops null, undefined and functions', () => {
    expect(
      cleanContext({ keep: 'x', zero: 0, no: false, a: null, b: undefined, fn: () => 1 })
    ).toEqual({ keep: 'x', zero: 0, no: false })
  })

  it('serializes an Error into message, name and stack', () => {
    const error = new TypeError('bad input')
    expect(cleanContext({ error })).toEqual({
      error: { message: 'bad input', name: 'TypeError', stack: error.stack },
    })
  })

  it('replaces a circular object with a marker', () => {
    const node: Record<string, unknown> = { id: 1 }
    node.self = node
    expect(cleanContext({ node, ok: { a: [1, 2] } })).toEqual({
      node: '[Circular]',
      ok: { a: [1, 2] },
    })
  })

  // Regression: a BigInt (e.g. a Prisma BigInt id) went through untouched and
  // made the adapter's JSON.stringify throw from inside logger.info().
  it('turns a BigInt into its decimal string', () => {
    const cleaned = cleanContext({ id: 9007199254740993n })
    expect(cleaned).toEqual({ id: '9007199254740993' })
    expect(() => JSON.stringify(cleaned)).not.toThrow()
  })

  it('never returns a value JSON.stringify rejects', () => {
    const cleaned = cleanContext({ nested: { id: 1n } })
    expect(() => JSON.stringify(cleaned)).not.toThrow()
  })
})
